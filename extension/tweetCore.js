(function (root) {
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

  const USER_BY_SCREEN_FEATURES = {
    hidden_profile_subscriptions_enabled: true,
    profile_label_improvements_pcf_label_in_post_enabled: true,
    responsive_web_profile_redirect_enabled: true,
    rweb_tipjar_consumption_enabled: false,
    verified_phone_label_enabled: false,
    subscriptions_verification_info_is_identity_verified_enabled: true,
    subscriptions_verification_info_verified_since_enabled: true,
    highlights_tweets_tab_ui_enabled: true,
    responsive_web_twitter_article_notes_tab_enabled: true,
    subscriptions_feature_can_gift_premium: true,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true
  };

  const FALLBACK_QUERY_IDS = {
    UserTweets: 'SXVCYB8XHSS25nzIljNtZA',
    UserTweetsAndReplies: 'qUpkZU6eN8MbtQb7rC_pYg',
    SearchTimeline: 'hyPfJYJ_XAtDYoslQc-Rgg',
    UserByScreenName: 'Gb-d6r0vxPOADdG62OEBpQ'
  };

  const FIELD_TOGGLES = { withArticlePlainText: false };

  function harvestQueryIds(text, ids) {
    const out = ids || {};
    if (!text) return out;
    const patterns = [
      [/queryId:"([^"]+)",operationName:"([^"]+)"/g, 1, 2],
      [/"queryId":"([^"]+)","operationName":"([^"]+)"/g, 1, 2],
      [/operationName:"([^"]+)",queryId:"([^"]+)"/g, 2, 1],
      [/"operationName":"([^"]+)","queryId":"([^"]+)"/g, 2, 1],
      [/queryId:\s*"([^"]+)"\s*,\s*operationName:\s*"([^"]+)"/g, 1, 2]
    ];
    for (let i = 0; i < patterns.length; i++) {
      const re = patterns[i][0];
      const idIdx = patterns[i][1];
      const nameIdx = patterns[i][2];
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        if (m[nameIdx] && m[idIdx]) out[m[nameIdx]] = m[idIdx];
      }
    }
    return out;
  }

  function harvestQueryIdsFromUrl(url, ids) {
    const out = ids || {};
    const m = String(url || '').match(/\/graphql\/([^/?]+)\/([^/?]+)/);
    if (m) out[m[2]] = m[1];
    return out;
  }

  function parseMissingFeatures(data) {
    const msgs = (data && data.errors ? data.errors : []).map((e) => e.message || '').join(' | ');
    const m = msgs.match(/required but were not provided:\s*([^\n]+)/i);
    if (!m) return [];
    return m[1].split(/[,;]/).map((s) => s.trim().replace(/[.'"]+$/g, '').replace(/^[.'"]+/g, '')).filter(Boolean);
  }

  function unwrapTweet(node) {
    if (!node || typeof node !== 'object') return null;
    let cur = node;
    for (let i = 0; i < 6; i++) {
      if (!cur || typeof cur !== 'object') return null;
      if (cur.__typename === 'TweetTombstone' || cur.tombstone) return null;
      if (cur.__typename === 'TweetWithVisibilityResults' && cur.tweet) { cur = cur.tweet; continue; }
      if (cur.tweet && (cur.tweet.legacy || cur.tweet.note_tweet || cur.tweet.rest_id)) { cur = cur.tweet; continue; }
      if (cur.result && typeof cur.result === 'object') { cur = cur.result; continue; }
      break;
    }
    if (cur.__typename === 'TweetTombstone' || cur.tombstone) return null;
    if (!cur.legacy && !cur.note_tweet && !(cur.full_text || cur.text)) return null;
    return cur;
  }

  function collectTweetNodes(root, out, depth) {
    if (!root || (depth || 0) > 16) return out;
    if (!out) out = [];
    if (Array.isArray(root)) {
      for (let i = 0; i < root.length; i++) collectTweetNodes(root[i], out, (depth || 0) + 1);
      return out;
    }
    if (typeof root !== 'object') return out;
    if (root.promotedMetadata) return out;
    const entryId = String(root.entryId || '');
    if (/cursor-|who-to-follow|promoted/i.test(entryId)) return out;

    const result = (root.tweet_results && root.tweet_results.result)
      || (root.tweet_result && root.tweet_result.result)
      || root.tweet;
    if (result) {
      const tweet = unwrapTweet(result);
      if (tweet) out.push(tweet);
    }

    const keys = ['instructions', 'entries', 'items', 'item', 'content', 'itemContent', 'moduleItems', 'itemContents'];
    for (let i = 0; i < keys.length; i++) {
      if (root[keys[i]]) collectTweetNodes(root[keys[i]], out, (depth || 0) + 1);
    }
    return out;
  }

  function timelineInstructions(data) {
    const known = (
      (data && data.data && data.data.user && data.data.user.result && data.data.user.result.timeline_v2 && data.data.user.result.timeline_v2.timeline && data.data.user.result.timeline_v2.timeline.instructions) ||
      (data && data.data && data.data.user && data.data.user.result && data.data.user.result.timeline && data.data.user.result.timeline.timeline && data.data.user.result.timeline.timeline.instructions) ||
      (data && data.data && data.data.user_result && data.data.user_result.result && data.data.user_result.result.timeline_v2 && data.data.user_result.result.timeline_v2.timeline && data.data.user_result.result.timeline_v2.timeline.instructions) ||
      (data && data.data && data.data.search_by_raw_query && data.data.search_by_raw_query.search_timeline && data.data.search_by_raw_query.search_timeline.timeline && data.data.search_by_raw_query.search_timeline.timeline.instructions) ||
      (data && data.data && data.data.search && data.data.search.search_timeline && data.data.search.search_timeline.timeline && data.data.search.search_timeline.timeline.instructions) ||
      null
    );
    if (known && known.length) return known;
    const found = [];
    function walk(obj, depth) {
      if (!obj || depth > 10 || found.length) return;
      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) walk(obj[i], depth + 1);
        return;
      }
      if (typeof obj !== 'object') return;
      if (Array.isArray(obj.instructions) && obj.instructions.some((i) => i && (i.entries || i.type))) {
        for (let i = 0; i < obj.instructions.length; i++) found.push(obj.instructions[i]);
        return;
      }
      const keys = ['data', 'user', 'result', 'timeline', 'timeline_v2', 'search_by_raw_query', 'search_timeline', 'search'];
      for (let i = 0; i < keys.length; i++) {
        if (obj[keys[i]]) walk(obj[keys[i]], depth + 1);
      }
    }
    walk(data, 0);
    return found;
  }

  function authorHandleOf(tweet) {
    const user = (tweet.core && tweet.core.user_results && tweet.core.user_results.result)
      || (tweet.core && tweet.core.user_result && tweet.core.user_result.result)
      || (tweet.legacy && tweet.legacy.user)
      || tweet.user
      || {};
    return String(
      (user.core && user.core.screen_name)
      || (user.legacy && user.legacy.screen_name)
      || user.screen_name
      || ''
    ).replace(/^@/, '').toLowerCase();
  }

  function authorIdOf(tweet) {
    const user = (tweet.core && tweet.core.user_results && tweet.core.user_results.result)
      || (tweet.core && tweet.core.user_result && tweet.core.user_result.result)
      || {};
    return String(user.rest_id || (tweet.legacy && tweet.legacy.user_id_str) || (tweet.user && tweet.user.id_str) || '');
  }

  function tweetTextOf(tweet) {
    const legacy = tweet.legacy || tweet;
    const note = tweet.note_tweet
      && tweet.note_tweet.note_tweet_results
      && tweet.note_tweet.note_tweet_results.result
      && tweet.note_tweet.note_tweet_results.result.text;
    return String(note || legacy.full_text || legacy.text || '').trim();
  }

  function tweetUrlEntities(tweet) {
    const legacy = tweet.legacy || tweet || {};
    const note = (tweet.note_tweet && tweet.note_tweet.note_tweet_results && tweet.note_tweet.note_tweet_results.result)
      || (tweet.note_tweet && tweet.note_tweet.result)
      || {};
    const urls = []
      .concat((legacy.entities && legacy.entities.urls) || [])
      .concat((tweet.entities && tweet.entities.urls) || [])
      .concat((note.entity_set && note.entity_set.urls) || [])
      .concat((note.entities && note.entities.urls) || []);
    const seen = {};
    const out = [];
    for (let i = 0; i < urls.length; i++) {
      const item = urls[i];
      const key = (item && (item.url || item.expanded_url || item.unwound_url)) || '';
      if (!key || seen[key]) continue;
      seen[key] = true;
      out.push(item);
    }
    return Object.assign({}, legacy.entities || tweet.entities || {}, { urls: out });
  }

  function expandUrlsInText(text, entities) {
    let out = String(text || '');
    const urls = (entities && entities.urls) || [];
    for (let i = 0; i < urls.length; i++) {
      const item = urls[i] || {};
      const full = String(item.expanded_url || item.unwound_url || '').trim();
      if (!full || /t\.co\//i.test(full)) continue;
      const short = item.url || item.short_url || '';
      if (short && out.indexOf(short) !== -1) out = out.split(short).join(full);
    }
    return out;
  }

  function toRawTweet(tweet) {
    const legacy = tweet.legacy || tweet;
    return {
      id_str: tweet.rest_id || legacy.id_str,
      rest_id: tweet.rest_id || legacy.id_str,
      full_text: tweetTextOf(tweet),
      created_at: legacy.created_at,
      favorite_count: legacy.favorite_count || 0,
      retweet_count: legacy.retweet_count || 0,
      reply_count: legacy.reply_count || 0,
      in_reply_to_status_id_str: legacy.in_reply_to_status_id_str || legacy.in_reply_to_status_id || null,
      in_reply_to_user_id_str: legacy.in_reply_to_user_id_str || null,
      in_reply_to_screen_name: legacy.in_reply_to_screen_name || null,
      conversation_id_str: legacy.conversation_id_str || null,
      display_text_range: legacy.display_text_range || null,
      self_thread: legacy.self_thread || null,
      is_quote_status: legacy.is_quote_status,
      retweeted_status: legacy.retweeted_status_result || legacy.retweeted_status || null,
      quoted_status: tweet.quoted_status_result || legacy.quoted_status || null,
      quoted_status_result: tweet.quoted_status_result || null,
      entities: tweetUrlEntities(tweet),
      extended_entities: legacy.extended_entities,
      user: {
        screen_name: authorHandleOf(tweet),
        id_str: authorIdOf(tweet)
      },
      _author: authorHandleOf(tweet),
      _authorId: authorIdOf(tweet)
    };
  }

  function tweetsFromGraphQL(data) {
    const instructions = timelineInstructions(data);
    const nodes = [];
    for (let i = 0; i < instructions.length; i++) {
      collectTweetNodes(instructions[i], nodes, 0);
    }
    const out = [];
    const seen = {};
    for (let i = 0; i < nodes.length; i++) {
      const raw = toRawTweet(nodes[i]);
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
    function walk(obj) {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) walk(obj[i]);
        return;
      }
      const content = obj.content || obj;
      const entryId = String(obj.entryId || '');
      if ((content.cursorType === 'Bottom' || entryId.indexOf('cursor-bottom') !== -1) && content.value) {
        cursor = content.value;
      }
      if (obj.entries) walk(obj.entries);
      if (obj.content) walk(obj.content);
    }
    walk(instructions);
    return cursor;
  }

  function formatExactActivityTime(createdAtStr) {
    if (!createdAtStr) return { text: 'Keine Beitrags-Vorschau', relativeText: 'Vorschau fehlt' };
    const tweetDate = new Date(createdAtStr);
    if (isNaN(tweetDate.getTime())) return { text: 'Keine Beitrags-Vorschau', relativeText: 'Vorschau fehlt' };
    const diffMs = Math.max(0, Date.now() - tweetDate.getTime());
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const dateStr = tweetDate.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
    let relativeText = '';
    if (diffHours < 1) relativeText = 'Vor ' + Math.max(1, Math.floor(diffMs / (1000 * 60))) + ' Min.';
    else if (diffHours < 24) relativeText = 'Vor ' + diffHours + ' Std.';
    else if (diffDays === 1) relativeText = 'Gestern';
    else if (diffDays < 30) relativeText = 'Vor ' + diffDays + ' Tagen';
    else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      relativeText = 'Vor ' + months + (months === 1 ? ' Monat' : ' Monaten');
    } else {
      const years = Math.floor(diffDays / 365);
      relativeText = 'Vor ' + years + (years === 1 ? ' Jahr' : ' Jahren');
    }
    return { text: relativeText + ' (' + dateStr + ')', relativeText };
  }

  function normalizeHandle(handle) {
    return String(handle || '').replace(/^@/, '').trim().toLowerCase();
  }

  function isRetweet(t) {
    const text = String(t.full_text || t.text || '');
    return Boolean(t.retweeted_status || t.retweeted_status_result || /^rt\s+@/i.test(text));
  }

  function isOwnTweet(t, handle, userId) {
    const lower = normalizeHandle(handle);
    const author = normalizeHandle(t._author || (t.user && t.user.screen_name));
    const authorId = String(t._authorId || (t.user && t.user.id_str) || '');
    if (author && lower && author !== lower) return false;
    if (userId && authorId && /^\d+$/.test(String(userId)) && authorId !== String(userId)) return false;
    return true;
  }

  function isReplyToOthers(t, handle, userId) {
    const lower = normalizeHandle(handle);
    const replyUser = normalizeHandle(t.in_reply_to_screen_name);
    const replyUid = t.in_reply_to_user_id_str ? String(t.in_reply_to_user_id_str) : '';
    const replyStatus = t.in_reply_to_status_id_str || t.in_reply_to_status_id || null;
    const hasReplyPtr = Boolean(replyStatus || replyUser || replyUid);
    if (hasReplyPtr) {
      const toSelf = (replyUser && lower && replyUser === lower)
        || (userId && replyUid && String(userId) === replyUid);
      if (!toSelf) return true;
    }
    const range = t.display_text_range;
    const mentions = (t.entities && t.entities.user_mentions) || [];
    if (Array.isArray(range) && range[0] > 0) {
      for (let i = 0; i < mentions.length; i++) {
        const m = mentions[i];
        if (!m || !Array.isArray(m.indices) || m.indices[0] !== 0) continue;
        const mention = normalizeHandle(m.screen_name);
        if (mention && mention !== lower) return true;
      }
    }
    return false;
  }

  function formatAndFilterTweets(rawTweets, handle, userId) {
    if (!Array.isArray(rawTweets)) return [];
    const seen = {};
    const out = [];
    for (let i = 0; i < rawTweets.length; i++) {
      const t = rawTweets[i];
      if (!t || !(t.full_text || t.text)) continue;
      if (!isOwnTweet(t, handle, userId)) continue;
      if (isRetweet(t)) continue;
      if (isReplyToOthers(t, handle, userId)) continue;
      const id = String(t.id_str || t.rest_id || t.id || '');
      if (id && seen[id]) continue;
      if (id) seen[id] = true;

      let text = String(t.full_text || t.text).trim();
      const mediaUrl = (t.entities && t.entities.media && t.entities.media[0] && t.entities.media[0].url)
        || (t.extended_entities && t.extended_entities.media && t.extended_entities.media[0] && t.extended_entities.media[0].url);
      if (mediaUrl && text.endsWith(mediaUrl)) text = text.replace(mediaUrl, '').trim();
      const entities = tweetUrlEntities(t);
      text = expandUrlsInText(text, entities);
      const act = formatExactActivityTime(t.created_at);
      const media = (t.extended_entities && t.extended_entities.media && t.extended_entities.media[0])
        || (t.entities && t.entities.media && t.entities.media[0]);
      out.push({
        id: id,
        text: text,
        createdAt: act.text,
        relativeTime: act.relativeText,
        likes: t.favorite_count || 0,
        retweets: t.retweet_count || 0,
        replies: t.reply_count || 0,
        image: (media && media.media_url_https) || '',
        isRT: false,
        isReply: false,
        isQuote: Boolean(t.is_quote_status || t.quoted_status || t.quoted_status_result),
        replyTo: null,
        entities: entities
      });
      if (out.length >= 3) break;
    }
    return out;
  }

  function userTweetsVariables(userId, cursor) {
    const v = {
      userId: String(userId),
      count: 40,
      includePromotedContent: false,
      withQuickPromoteEligibilityTweetFields: true,
      withVoice: true,
      withV2Timeline: true
    };
    if (cursor) v.cursor = cursor;
    return v;
  }

  function searchVariables(handle, cursor) {
    const v = {
      rawQuery: 'from:' + normalizeHandle(handle) + ' -filter:replies -filter:retweets',
      count: 20,
      querySource: 'typed_query',
      product: 'Latest'
    };
    if (cursor) v.cursor = cursor;
    return v;
  }

  function buildGqlUrl(origin, queryId, opName, variables, features) {
    const base = origin || '';
    return base + '/i/api/graphql/' + queryId + '/' + opName
      + '?variables=' + encodeURIComponent(JSON.stringify(variables))
      + '&features=' + encodeURIComponent(JSON.stringify(features))
      + '&fieldToggles=' + encodeURIComponent(JSON.stringify(FIELD_TOGGLES));
  }

  root.CSXTweetCore = {
    GQL_FEATURES: GQL_FEATURES,
    USER_BY_SCREEN_FEATURES: USER_BY_SCREEN_FEATURES,
    FALLBACK_QUERY_IDS: FALLBACK_QUERY_IDS,
    FIELD_TOGGLES: FIELD_TOGGLES,
    harvestQueryIds: harvestQueryIds,
    harvestQueryIdsFromUrl: harvestQueryIdsFromUrl,
    parseMissingFeatures: parseMissingFeatures,
    tweetsFromGraphQL: tweetsFromGraphQL,
    findBottomCursor: findBottomCursor,
    formatAndFilterTweets: formatAndFilterTweets,
    formatExactActivityTime: formatExactActivityTime,
    normalizeHandle: normalizeHandle,
    isReplyToOthers: isReplyToOthers,
    isRetweet: isRetweet,
    userTweetsVariables: userTweetsVariables,
    searchVariables: searchVariables,
    buildGqlUrl: buildGqlUrl
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
