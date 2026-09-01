import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ─── In-Memory Session Store & Live Bridge Queue ──────────────────────────────
let importedSession = null;
let pendingUnfollows = [];
let unfollowResults = [];

// ─── Token Sanitization ─────────────────────────────────────────────────────────
const cleanToken = (token) => {
  if (!token) return '';
  let cleaned = String(token).trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned.replace(/\s+/g, '');
};

// ─── Dynamic Bearer + Headers ───────────────────────────────────────────────────
const FALLBACK_BEARER = 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

const buildHeaders = (authToken, ct0, bearer = null) => ({
  'authorization': bearer || importedSession?.bearer || FALLBACK_BEARER,
  'x-csrf-token': ct0,
  'cookie': `auth_token=${authToken}; ct0=${ct0}`,
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'x-twitter-active-user': 'yes',
  'x-twitter-auth-type': 'OAuth2Session',
  'x-twitter-client-language': 'en',
  'accept': '*/*',
  'accept-language': 'en-US,en;q=0.9',
  'origin': 'https://x.com',
  'referer': 'https://x.com/'
});

// ─── Multi-URL X API Request ────────────────────────────────────────────────────
async function makeXRequest(endpointPath, method = 'GET', body = null, rawAuthToken, rawCt0) {
  const authToken = cleanToken(rawAuthToken);
  const ct0 = cleanToken(rawCt0);
  const baseUrls = ['https://api.twitter.com', 'https://x.com/i/api', 'https://api.x.com'];

  let lastStatus = 500;
  let lastErrText = '';

  for (const baseUrl of baseUrls) {
    try {
      const url = `${baseUrl}${endpointPath}`;
      const fetchOpts = { method, headers: buildHeaders(authToken, ct0) };
      if (body && typeof body === 'string') {
        fetchOpts.body = body;
        fetchOpts.headers['content-type'] = 'application/x-www-form-urlencoded';
      }

      const response = await fetch(url, fetchOpts);
      if (response.ok) return { ok: true, data: await response.json() };

      lastStatus = response.status;
      lastErrText = await response.text();
      if (response.status !== 404) break;
    } catch (err) {
      lastErrText = err.message;
    }
  }

  let msg = lastErrText;
  try { const j = JSON.parse(lastErrText); if (j.errors?.[0]) msg = j.errors[0].message; } catch (e) {}
  return { ok: false, status: lastStatus, error: msg };
}

// ═════════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═════════════════════════════════════════════════════════════════════════════════

// ─── IMPORT: Receive pre-fetched data from browser-context script on x.com ─────
app.post('/api/x/import', async (req, res) => {
  const { profile, following, bearer, auth_token, ct0 } = req.body;

  if (!profile || !following) {
    return res.status(400).json({ error: 'Missing profile or following data' });
  }

  importedSession = {
    profile,
    following,
    bearer: bearer || FALLBACK_BEARER,
    auth_token: cleanToken(auth_token),
    ct0: cleanToken(ct0),
    queryIds: req.body.queryIds || {},
    importedAt: Date.now()
  };

  console.log(`\n✅ IMPORT: @${profile.screen_name} — ${following.length} following accounts`);
  console.log(`   Bearer: ${(bearer || 'fallback').substring(0, 40)}...`);

  return res.json({ success: true, handle: profile.screen_name, count: following.length });
});

function formatExactActivityTime(createdAtStr) {
  if (!createdAtStr) return { text: 'Keine Beitrags-Vorschau', relativeText: 'Vorschau fehlt', dateStr: '', timestamp: 0 };

  let tweetDate = new Date(createdAtStr);
  if (isNaN(tweetDate.getTime())) {
    tweetDate = new Date(Date.parse(createdAtStr));
  }
  if (isNaN(tweetDate.getTime())) return { text: 'Keine Beitrags-Vorschau', relativeText: 'Vorschau fehlt', dateStr: '', timestamp: 0 };

  const timestamp = tweetDate.getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - timestamp);
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  const dateOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  const dateStr = tweetDate.toLocaleDateString('de-DE', dateOptions);

  let relativeText = '';
  if (diffHours < 1) {
    const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    relativeText = `Vor ${mins} Min.`;
  } else if (diffHours < 24) {
    relativeText = `Vor ${diffHours} Std.`;
  } else if (diffDays === 1) {
    relativeText = `Gestern`;
  } else if (diffDays < 30) {
    relativeText = `Vor ${diffDays} Tagen`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    relativeText = `Vor ${months} ${months === 1 ? 'Monat' : 'Monaten'}`;
  } else {
    const years = Math.floor(diffDays / 365);
    relativeText = `Vor ${years} ${years === 1 ? 'Jahr' : 'Jahren'}`;
  }

  return {
    text: `${relativeText} (${dateStr})`,
    relativeText,
    dateStr,
    timestamp
  };
}

// ─── IMPORTED: Return stored import data to the frontend ────────────────────────
app.get('/api/x/imported', async (req, res) => {
  if (!importedSession) {
    return res.status(404).json({ error: 'No imported session. Run the import script on x.com first.' });
  }

  function expandUrlsInText(text, urlEntities) {
    if (!text) return '';
    let out = String(text);
    const urls = Array.isArray(urlEntities) ? [...urlEntities] : [];
    urls.sort((a, b) => String(b?.url || '').length - String(a?.url || '').length);
    for (const item of urls) {
      const full = item?.expanded_url || item?.unwound_url || (item?.display_url ? `https://${String(item.display_url).replace(/^https?:\/\//i, '')}` : '');
      if (!full) continue;
      const candidates = new Set();
      if (item.url) {
        candidates.add(item.url);
        candidates.add(String(item.url).replace(/^https?:\/\//i, ''));
      }
      const tco = String(item.url || item.display_url || '').match(/t\.co\/([A-Za-z0-9]+)/i);
      if (tco) {
        candidates.add(`t.co/${tco[1]}`);
        candidates.add(`https://t.co/${tco[1]}`);
        candidates.add(`http://t.co/${tco[1]}`);
      }
      for (const shortUrl of candidates) {
        if (shortUrl && out.includes(shortUrl)) out = out.split(shortUrl).join(full);
      }
    }
    return out;
  }

  function pickUrlEntity(entities) {
    const list = entities?.url?.urls || entities?.url || [];
    return Array.isArray(list) ? list[0] : null;
  }

  function formatJoinedDate(raw) {
    if (!raw) return '';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw);
    return d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  }

  const profile = importedSession.profile || {};
  const formattedAccounts = (importedSession.following || []).map((u) => {
    const legacy = u.legacy || {};
    const core = u.core || legacy.core || {};
    const name = u.name || legacy.name || core.name || u.screen_name || legacy.screen_name || 'Unbekannt';
    const handle = u.screen_name || legacy.screen_name || core.screen_name || u.name || legacy.name || 'user';
    const lastTweet = u.status || legacy.status || null;
    const activityInfo = formatExactActivityTime(lastTweet?.created_at);
    const entities = legacy.entities || u.entities || {};
    const bioRaw = legacy.description || u.description || '';
    const bio = expandUrlsInText(bioRaw, entities.description?.urls || entities.urls);
    const urlEnt = pickUrlEntity(entities);
    let website = urlEnt?.expanded_url || urlEnt?.unwound_url || '';
    if (!website) {
      const rawUrl = legacy.url || u.url || '';
      if (rawUrl && !/t\.co\//i.test(rawUrl)) website = rawUrl;
    }
    const websiteDisplay = urlEnt?.display_url || (website ? website.replace(/^https?:\/\//i, '').replace(/\/$/, '') : '');
    const location = legacy.location || u.location || core.location || u.location_data?.location || '';
    const joinedRaw = legacy.created_at || u.created_at || core.created_at || '';
    return {
      id: u.id_str || u.rest_id || legacy.id_str || `acc_${Math.random().toString(36).substr(2, 9)}`,
      name: name,
      handle: handle,
      avatar: (legacy.profile_image_url_https || u.profile_image_url_https || '').replace('_normal', '_400x400') || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png',
      banner: legacy.profile_banner_url || u.profile_banner_url || '',
      bio: bio,
      followersCount: legacy.followers_count || u.followers_count || 0,
      followingCount: legacy.friends_count || u.friends_count || 0,
      joinedDate: formatJoinedDate(joinedRaw),
      location: location,
      website: website,
      websiteDisplay: websiteDisplay,
      verified: legacy.verified || u.verified || u.is_blue_verified || false,
      followsYou: legacy.followed_by || u.followed_by || false,
      lastActive: activityInfo.text,
      lastActiveRelative: activityInfo.relativeText,
      lastActiveDate: activityInfo.dateStr,
      lastActiveTimestamp: activityInfo.timestamp,
      isFollowing: true,
      category: !(legacy.followed_by || u.followed_by) ? 'No Follow Back' : (legacy.followers_count || u.followers_count || 0) < 100 ? 'Low Followers' : 'Active',
      interactions: {
        likesCount: 0,
        retweetsCount: 0,
        repliesCount: 0,
        lastInteraction: null,
        dataUnavailable: true
      },
      tweets: [],
      tweetSource: 'none',
      entities: entities
    };
  });

  const rawHandle = profile.screen_name || profile.handle || '';
  const rawName = profile.name || '';
  const cleanHandle = (rawHandle && rawHandle !== 'x_live_user') ? rawHandle : 'x_user';
  const cleanName = (rawName && rawName !== 'Mein X-Account') ? rawName : (cleanHandle !== 'x_user' ? `@${cleanHandle}` : 'Angemeldeter X-User');

  return res.json({
    user: {
      id: profile.id_str || 'user_session',
      name: cleanName,
      handle: cleanHandle,
      avatar: profile.profile_image_url_https?.replace('_normal', '_400x400') || '',
      banner: profile.profile_banner_url || '',
      bio: profile.description || 'Aktive X.com Browser-Sitzung',
      followingCount: profile.friends_count || formattedAccounts.length,
      followersCount: profile.followers_count || 0,
      joined: profile.created_at || '',
      verified: profile.verified || false,
      isRealSession: true,
      authToken: importedSession.auth_token,
      ct0: importedSession.ct0
    },
    accounts: formattedAccounts
  });
});

// ─── LOGOUT / CLEAR CACHE ENDPOINTS ──────────────────────────────────────────────
app.post('/api/x/logout', (req, res) => {
  importedSession = null;
  Object.keys(tweetCacheServer).forEach(k => delete tweetCacheServer[k]);
  console.log('🧹 [SERVER] Session and tweet cache purged via logout.');
  return res.json({ success: true, message: 'Session and server cache successfully cleared.' });
});

app.post('/api/x/expand_tco', async (req, res) => {
  const codes = Array.isArray(req.body?.codes) ? req.body.codes : [];
  const urls = {};
  for (const code of codes.slice(0, 8)) {
    if (!/^[A-Za-z0-9]+$/.test(String(code))) continue;
    try {
      const r = await fetch(`https://t.co/${code}`, { method: 'GET', redirect: 'manual' });
      const loc = r.headers.get('location');
      if (loc && !/t\.co\//i.test(loc)) urls[code] = loc;
      else {
        const r2 = await fetch(`https://t.co/${code}`, { redirect: 'follow' });
        if (r2.url && !/t\.co\//i.test(r2.url)) urls[code] = r2.url;
      }
    } catch {}
  }
  return res.json({ urls });
});

app.post('/api/x/clear_cache', (req, res) => {
  Object.keys(tweetCacheServer).forEach(k => delete tweetCacheServer[k]);
  console.log('🧹 [SERVER] Tweet cache cleared.');
  return res.json({ success: true, message: 'Tweet cache cleared.' });
});

// ─── SERVER-SIDE TWEET CACHE + BROWSER BRIDGE ──────────────────────────────────
let tweetCacheServer = {};
let pendingTweetFetches = [];
const tweetFetchResults = {};

const GQL_FEATURES = {
  rweb_video_screen_enabled: false,
  rweb_cashtags_enabled: true,
  profile_label_improvements_pcf_label_in_post_enabled: true,
  responsive_web_profile_redirect_enabled: true,
  rweb_tipjar_consumption_enabled: false,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  premium_content_api_read_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  responsive_web_grok_analyze_button_fetch_trends_enabled: false,
  responsive_web_grok_analyze_post_followups_enabled: false,
  rweb_cashtags_composer_attachment_enabled: true,
  responsive_web_jetfuel_frame: true,
  responsive_web_grok_share_attachment_enabled: true,
  responsive_web_grok_annotations_enabled: true,
  articles_preview_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  content_disclosure_indicator_enabled: true,
  content_disclosure_ai_generated_indicator_enabled: true,
  responsive_web_grok_show_grok_translated_post: true,
  responsive_web_grok_analysis_button_from_backend: true,
  post_ctas_fetch_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: false,
  responsive_web_grok_image_annotation_enabled: true,
  responsive_web_grok_imagine_annotation_enabled: true,
  responsive_web_grok_community_note_auto_translation_is_enabled: true,
  responsive_web_enhance_cards_enabled: false
};

const FALLBACK_QUERY_IDS = {
  UserTweets: 'SXVCYB8XHSS25nzIljNtZA',
  UserTweetsAndReplies: 'qUpkZU6eN8MbtQb7rC_pYg',
  SearchTimeline: 'hyPfJYJ_XAtDYoslQc-Rgg',
  UserByScreenName: 'Gb-d6r0vxPOADdG62OEBpQ'
};

const FIELD_TOGGLES = { withArticlePlainText: false };

function normalizeHandle(handle) {
  return String(handle || '').replace(/^@/, '').trim().toLowerCase();
}

function parseMissingFeatures(data) {
  const msgs = (data?.errors || []).map((e) => e.message || '').join(' | ');
  const m = msgs.match(/required but were not provided:\s*([^\n]+)/i);
  if (!m) return [];
  return m[1].split(/[,;]/).map((s) => s.trim().replace(/[.'"]+/g, '')).filter(Boolean);
}

function unwrapTweet(node) {
  if (!node || typeof node !== 'object') return null;
  let cur = node;
  if (cur.__typename === 'TweetTombstone' || cur.tombstone) return null;
  if (cur.tweet) cur = cur.tweet;
  if (cur.result && (cur.result.legacy || cur.result.tweet || cur.result.note_tweet)) cur = cur.result;
  if (cur.tweet) cur = cur.tweet;
  if (cur.__typename === 'TweetTombstone' || cur.tombstone) return null;
  if (!cur.legacy && !cur.note_tweet) return null;
  return cur;
}

function collectTweetNodes(root, out = [], depth = 0) {
  if (!root || depth > 14) return out;
  if (Array.isArray(root)) {
    for (const item of root) collectTweetNodes(item, out, depth + 1);
    return out;
  }
  if (typeof root !== 'object') return out;
  if (root.promotedMetadata) return out;
  const entryId = String(root.entryId || '');
  if (/cursor-|who-to-follow|promoted/i.test(entryId)) return out;
  const result = root.tweet_results?.result || root.tweet_result?.result;
  if (result) {
    const tweet = unwrapTweet(result);
    if (tweet) out.push(tweet);
  }
  for (const k of ['instructions', 'entries', 'items', 'item', 'content', 'itemContent', 'moduleItems']) {
    if (root[k]) collectTweetNodes(root[k], out, depth + 1);
  }
  return out;
}

function timelineInstructions(data) {
  return (
    data?.data?.user?.result?.timeline_v2?.timeline?.instructions ||
    data?.data?.user?.result?.timeline?.timeline?.instructions ||
    data?.data?.search_by_raw_query?.search_timeline?.timeline?.instructions ||
    data?.data?.search?.search_timeline?.timeline?.instructions ||
    []
  );
}

function authorHandleOf(tweet) {
  const user = tweet.core?.user_results?.result || tweet.core?.user_result?.result || tweet.legacy?.user || tweet.user || {};
  return String(user.core?.screen_name || user.legacy?.screen_name || user.screen_name || '').replace(/^@/, '').toLowerCase();
}

function authorIdOf(tweet) {
  const user = tweet.core?.user_results?.result || tweet.core?.user_result?.result || {};
  return String(user.rest_id || tweet.legacy?.user_id_str || tweet.user?.id_str || '');
}

function toRawTweet(tweet) {
  const legacy = tweet.legacy || {};
  const note = tweet.note_tweet?.note_tweet_results?.result?.text;
  return {
    id_str: tweet.rest_id || legacy.id_str,
    full_text: String(note || legacy.full_text || legacy.text || '').trim(),
    created_at: legacy.created_at,
    favorite_count: legacy.favorite_count || 0,
    retweet_count: legacy.retweet_count || 0,
    reply_count: legacy.reply_count || 0,
    in_reply_to_status_id_str: legacy.in_reply_to_status_id_str || null,
    in_reply_to_user_id_str: legacy.in_reply_to_user_id_str || null,
    in_reply_to_screen_name: legacy.in_reply_to_screen_name || null,
    is_quote_status: legacy.is_quote_status,
    retweeted_status: legacy.retweeted_status_result || legacy.retweeted_status || null,
    quoted_status: tweet.quoted_status_result || legacy.quoted_status || null,
    quoted_status_result: tweet.quoted_status_result || null,
    entities: legacy.entities,
    extended_entities: legacy.extended_entities,
    user: { screen_name: authorHandleOf(tweet), id_str: authorIdOf(tweet) },
    _author: authorHandleOf(tweet),
    _authorId: authorIdOf(tweet)
  };
}

function tweetsFromGraphQL(data) {
  const instructions = timelineInstructions(data);
  const nodes = [];
  for (const inst of instructions) {
    if (inst?.type === 'TimelinePinEntry') continue;
    collectTweetNodes(inst, nodes, 0);
  }
  const out = [];
  const seen = {};
  for (const node of nodes) {
    const raw = toRawTweet(node);
    const id = String(raw.id_str || '');
    if (!id || !raw.full_text || seen[id]) continue;
    seen[id] = true;
    out.push(raw);
  }
  return out;
}

function findBottomCursor(data) {
  const instructions = timelineInstructions(data);
  let cursor = '';
  const walk = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach(walk); return; }
    const content = obj.content || obj;
    if ((content.cursorType === 'Bottom' || String(obj.entryId || '').includes('cursor-bottom')) && content.value) {
      cursor = content.value;
    }
    if (obj.entries) walk(obj.entries);
    if (obj.content) walk(obj.content);
  };
  walk(instructions);
  return cursor;
}

function isRetweet(t) {
  return Boolean(t.retweeted_status || t.retweeted_status_result || /^rt\s+@/i.test(String(t.full_text || t.text || '')));
}

function isOwnTweet(t, handle) {
  const lower = normalizeHandle(handle);
  const author = normalizeHandle(t._author || t.user?.screen_name);
  if (author && lower && author !== lower) return false;
  return true;
}

function isReplyToOthers(t, handle) {
  const lower = normalizeHandle(handle);
  const replyStatus = t.in_reply_to_status_id_str || t.in_reply_to_status_id || null;
  const replyUser = normalizeHandle(t.in_reply_to_screen_name);
  if (!replyStatus && !replyUser && !t.in_reply_to_user_id_str) return false;
  if (replyUser && replyUser === lower) return false;
  if (replyUser && replyUser !== lower) return true;
  return Boolean(replyStatus);
}

function formatAndFilterTweets(rawTweets, handle) {
  if (!Array.isArray(rawTweets)) return [];
  const seen = {};
  const out = [];
  for (const t of rawTweets) {
    if (!t || !(t.full_text || t.text)) continue;
    if (!isOwnTweet(t, handle)) continue;
    if (isRetweet(t)) continue;
    if (isReplyToOthers(t, handle)) continue;
    const id = String(t.id_str || t.rest_id || t.id || '');
    if (id && seen[id]) continue;
    if (id) seen[id] = true;
    let text = String(t.full_text || t.text).trim();
    const mediaUrl = t.entities?.media?.[0]?.url || t.extended_entities?.media?.[0]?.url;
    if (mediaUrl && text.endsWith(mediaUrl)) text = text.replace(mediaUrl, '').trim();
    const act = formatExactActivityTime(t.created_at);
    const media = t.extended_entities?.media?.[0] || t.entities?.media?.[0];
    out.push({
      id,
      text,
      createdAt: act.text,
      relativeTime: act.relativeText,
      likes: t.favorite_count || 0,
      retweets: t.retweet_count || 0,
      replies: t.reply_count || 0,
      image: media?.media_url_https || '',
      isRT: false,
      isReply: false,
      isQuote: Boolean(t.is_quote_status || t.quoted_status || t.quoted_status_result),
      replyTo: null
    });
    if (out.length >= 3) break;
  }
  return out;
}

function buildGqlUrl(queryId, opName, variables, features) {
  return `https://x.com/i/api/graphql/${queryId}/${opName}?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${encodeURIComponent(JSON.stringify(features))}&fieldToggles=${encodeURIComponent(JSON.stringify(FIELD_TOGGLES))}`;
}

function findImportedUserId(handle) {
  const h = (handle || '').toLowerCase();
  const u = (importedSession?.following || []).find((x) =>
    String(x.screen_name || x.legacy?.screen_name || '').toLowerCase() === h
  );
  if (!u) return '';
  return u.id_str || u.rest_id || u.legacy?.id_str || '';
}

async function xAuthedFetch(url) {
  if (!importedSession?.auth_token || !importedSession?.ct0) return null;
  try {
    const response = await fetch(url, {
      headers: buildHeaders(importedSession.auth_token, importedSession.ct0)
    });
    let data = null;
    try { data = await response.json(); } catch {}
    return { ok: response.ok, status: response.status, data };
  } catch {
    return null;
  }
}

async function gqlAuthed(url) {
  const result = await xAuthedFetch(url);
  if (!result) return null;
  return result;
}

async function gqlAuthedWithRetry(buildUrl, features) {
  let feats = { ...features };
  for (let attempt = 0; attempt < 4; attempt++) {
    const result = await gqlAuthed(buildUrl(feats));
    const data = result?.data;
    const missing = parseMissingFeatures(data);
    if (missing.length) {
      missing.forEach((f) => { feats[f] = true; });
      continue;
    }
    if (result?.ok) return data;
    return data || null;
  }
  return null;
}

async function paginateDirect(buildVars, queryId, opName, handle, uid) {
  let cursor = '';
  const collected = [];
  for (let page = 0; page < 5; page++) {
    const data = await gqlAuthedWithRetry(
      (feats) => buildGqlUrl(queryId, opName, buildVars(cursor), feats),
      GQL_FEATURES
    );
    if (!data) break;
    collected.push(...tweetsFromGraphQL(data));
    const posts = formatAndFilterTweets(collected, handle);
    if (posts.length >= 3) return posts;
    cursor = findBottomCursor(data);
    if (!cursor) break;
  }
  return formatAndFilterTweets(collected, handle);
}

async function fetchTweetsDirect(handle, userId) {
  const uid = (userId && /^\d+$/.test(String(userId)) ? String(userId) : '') || findImportedUserId(handle);
  const queryIds = { ...FALLBACK_QUERY_IDS, ...(importedSession?.queryIds || {}) };

  if (queryIds.UserTweets && uid) {
    const posts = await paginateDirect(
      (cursor) => {
        const v = {
          userId: String(uid),
          count: 40,
          includePromotedContent: false,
          withQuickPromoteEligibilityTweetFields: true,
          withVoice: true,
          withV2Timeline: true
        };
        if (cursor) v.cursor = cursor;
        return v;
      },
      queryIds.UserTweets,
      'UserTweets',
      handle,
      uid
    );
    if (posts.length) return posts;
  }

  if (queryIds.SearchTimeline && handle) {
    const posts = await paginateDirect(
      (cursor) => {
        const v = {
          rawQuery: `from:${normalizeHandle(handle)} -filter:replies -filter:retweets`,
          count: 20,
          querySource: 'typed_query',
          product: 'Latest'
        };
        if (cursor) v.cursor = cursor;
        return v;
      },
      queryIds.SearchTimeline,
      'SearchTimeline',
      handle,
      uid
    );
    if (posts.length) return posts;
  }

  const qs = uid
    ? `user_id=${encodeURIComponent(uid)}`
    : `screen_name=${encodeURIComponent(handle)}`;
  const restUrl = `https://x.com/i/api/1.1/statuses/user_timeline.json?${qs}&count=50&include_rts=false&exclude_replies=true&tweet_mode=extended`;
  const rest = await xAuthedFetch(restUrl);
  if (rest?.ok && Array.isArray(rest.data)) {
    return formatAndFilterTweets(rest.data, handle);
  }

  return null;
}

function queueBrowserTweetFetch(handle, userId, force) {
  const requestId = `${handle}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  pendingTweetFetches.push({ handle, userId: userId || '', force: !!force, requestId });
  return requestId;
}

async function waitForBrowserTweets(requestId, timeoutMs = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (Object.prototype.hasOwnProperty.call(tweetFetchResults, requestId)) {
      const tweets = tweetFetchResults[requestId];
      delete tweetFetchResults[requestId];
      return tweets;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

async function fetchTweetsForHandle(handle, forceRefresh = false, userId = '') {
  if (forceRefresh) delete tweetCacheServer[handle];
  if (!forceRefresh && tweetCacheServer[handle] !== undefined) {
    return tweetCacheServer[handle];
  }

  const direct = await fetchTweetsDirect(handle, userId);
  if (direct) {
    tweetCacheServer[handle] = direct;
    return direct;
  }

  const requestId = queueBrowserTweetFetch(handle, userId, forceRefresh);
  const bridged = await waitForBrowserTweets(requestId, forceRefresh ? 15000 : 8000);
  if (bridged) {
    tweetCacheServer[handle] = bridged;
    return bridged;
  }

  return null;
}

app.get('/api/x/user_tweets', async (req, res) => {
  const handle = req.query.handle;
  const force = req.query.force === 'true';
  const userId = req.query.userId || '';

  if (!handle) {
    return res.status(400).json({ error: 'Missing handle parameter' });
  }

  const tweets = await fetchTweetsForHandle(handle, force, userId);
  return res.json({ handle, tweets: tweets || [] });
});

app.post('/api/x/batch_tweets', async (req, res) => {
  const { handles, ids = {}, force } = req.body;
  if (!handles || !Array.isArray(handles)) {
    return res.status(400).json({ error: 'Missing handles array' });
  }

  const batch = handles.slice(0, 25);
  const results = {};
  const needBridge = [];
  let fetchedCount = 0;

  for (const handle of batch) {
    if (force) delete tweetCacheServer[handle];
    if (!force && tweetCacheServer[handle] !== undefined) {
      results[handle] = tweetCacheServer[handle];
      continue;
    }
    if (fetchedCount > 0) await new Promise((r) => setTimeout(r, 80));
    const direct = await fetchTweetsDirect(handle, ids[handle] || '');
    fetchedCount++;
    if (direct) {
      tweetCacheServer[handle] = direct;
      results[handle] = direct;
    } else {
      needBridge.push(handle);
    }
  }

  if (needBridge.length > 0) {
    const requestIds = {};
    needBridge.forEach((handle) => {
      requestIds[handle] = queueBrowserTweetFetch(handle, ids[handle] || '', !!force);
    });
    const start = Date.now();
    while (Date.now() - start < 20000) {
      let pending = 0;
      for (const handle of needBridge) {
        if (results[handle]) continue;
        const rid = requestIds[handle];
        if (Object.prototype.hasOwnProperty.call(tweetFetchResults, rid)) {
          const tweets = tweetFetchResults[rid];
          delete tweetFetchResults[rid];
          tweetCacheServer[handle] = tweets;
          results[handle] = tweets;
        } else {
          pending++;
        }
      }
      if (pending === 0) break;
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  if (fetchedCount > 0) {
    console.log(`📦 Batch prefetch: ${Object.keys(results).length}/${batch.length} ready`);
  }
  return res.json({ results });
});

app.get('/api/x/pending_tweet_fetches', (req, res) => {
  const list = pendingTweetFetches.splice(0, pendingTweetFetches.length);
  return res.json({ tasks: list });
});

app.post('/api/x/tweet_fetch_result', (req, res) => {
  const { handle, tweets, requestId } = req.body;
  const formatted = Array.isArray(tweets) ? tweets : [];
  if (handle) tweetCacheServer[handle] = formatted;
  if (requestId) tweetFetchResults[requestId] = formatted;
  return res.json({ ok: true });
});

// ─── VERIFY: Still available but will likely fail due to TLS fingerprinting ─────
app.post('/api/x/verify', async (req, res) => {
  const { authToken, ct0 } = req.body;
  const auth = cleanToken(authToken);
  const csrf = cleanToken(ct0);

  if (!auth || !csrf) {
    return res.status(400).json({ error: 'Bitte beide Tokens (auth_token & ct0) eingeben.' });
  }

  console.log('\n🔐 VERIFY REQUEST (proxy mode)');

  // Try multiple endpoints
  const endpoints = [
    'https://api.twitter.com/1.1/account/verify_credentials.json?include_email=false',
    'https://x.com/i/api/1.1/account/verify_credentials.json?include_email=false',
    'https://api.twitter.com/1.1/account/settings.json'
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, { headers: buildHeaders(auth, csrf) });
      if (response.ok) {
        const data = await response.json();
        if (data.screen_name) {
          return res.json({
            id: data.id_str, name: data.name, handle: data.screen_name,
            avatar: data.profile_image_url_https?.replace('_normal', '_400x400') || '',
            banner: data.profile_banner_url || '', bio: data.description || '',
            followingCount: data.friends_count || 0, followersCount: data.followers_count || 0,
            joined: data.created_at || '', verified: data.verified || false
          });
        }
      }
    } catch (e) {}
  }

  return res.status(401).json({
    error: 'Proxy-Login fehlgeschlagen (X blockiert Server-Anfragen per TLS-Fingerprinting). Bitte nutze stattdessen die "Browser-Import" Methode — Skript direkt auf x.com ausführen.'
  });
});

// ─── DEBUG: Show what X returns for given tokens ────────────────────────────────
app.post('/api/x/debug', async (req, res) => {
  const { authToken, ct0 } = req.body;
  const auth = cleanToken(authToken);
  const csrf = cleanToken(ct0);

  const results = [];
  const endpoints = [
    { url: 'https://api.twitter.com/1.1/account/verify_credentials.json', name: 'verify_credentials' },
    { url: 'https://api.twitter.com/1.1/account/settings.json', name: 'settings' }
  ];

  for (const ep of endpoints) {
    try {
      const response = await fetch(ep.url, { headers: buildHeaders(auth, csrf) });
      results.push({ endpoint: ep.name, status: response.status, body: (await response.text()).substring(0, 200) });
    } catch (e) {
      results.push({ endpoint: ep.name, status: 'ERROR', body: e.message });
    }
  }

  return res.json({
    success: false,
    tokenInfo: { authLen: auth.length, ct0Len: csrf.length },
    endpointResults: results,
    hint: 'X blockiert Server-Anfragen per TLS-Fingerprinting. Nutze die Browser-Import Methode.'
  });
});

// ─── FOLLOWING: Fetch following list via proxy ──────────────────────────────────
app.post('/api/x/following', async (req, res) => {
  const { authToken, ct0, cursor = '-1' } = req.body;
  const result = await makeXRequest(
    `/1.1/friends/following/list.json?count=200&cursor=${cursor}&skip_status=false&include_user_entities=true`,
    'GET', null, authToken, ct0
  );
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json({ accounts: result.data.users || [], nextCursor: result.data.next_cursor_str || '0' });
});

// ─── LIVE BRIDGE: Queue & execute real-time unfollow actions ────────────────
app.post('/api/x/queue_unfollow', (req, res) => {
  const { userId, handle } = req.body;
  if (!userId && !handle) return res.status(400).json({ error: 'Missing userId or handle' });

  const exists = pendingUnfollows.find((item) =>
    (userId && item.userId && String(item.userId) === String(userId)) ||
    (handle && item.handle && String(item.handle).toLowerCase() === String(handle).toLowerCase())
  );
  if (!exists) {
    pendingUnfollows.push({ userId: userId ? String(userId) : '', handle, timestamp: Date.now() });
    console.log(`📌 Queued Live Unfollow for @${handle} (${userId || 'no-id'})`);
  }
  return res.json({ success: true, queueLength: pendingUnfollows.length });
});

app.get('/api/x/pending_unfollows', (req, res) => {
  const list = [...pendingUnfollows];
  pendingUnfollows = []; // Clear queue after handing over to browser daemon
  return res.json({ tasks: list });
});

app.post('/api/x/unfollow_result', (req, res) => {
  const { userId, handle, success, error } = req.body;
  unfollowResults.push({ userId, handle, success, error, timestamp: Date.now() });
  console.log(`${success ? '✅' : '❌'} Live Unfollow Result @${handle}: ${success ? 'OK' : error}`);
  return res.json({ ok: true });
});

// ─── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n⚡ CleanSweep X Proxy Server running on http://localhost:${PORT}`);
  console.log('   Endpoints:');
  console.log('     POST /api/x/import    — Receive browser-imported data');
  console.log('     GET  /api/x/imported  — Fetch imported session');
  console.log('     POST /api/x/verify    — Proxy verify (may be blocked)');
  console.log('     POST /api/x/unfollow  — Proxy unfollow');
  console.log('');
});
