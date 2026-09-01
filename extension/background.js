// CleanSweep X — Extension Service Worker (Manifest V3)
importScripts('tweetCore.js');

const BEARER_TOKEN = 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
const Core = self.CSXTweetCore;

// Multi-domain cookie search for x.com & twitter.com
async function getXCookies() {
  const getCookie = async (name) => {
    let c = await chrome.cookies.get({ url: 'https://x.com', name });
    if (!c) c = await chrome.cookies.get({ url: 'https://twitter.com', name });
    if (!c) {
      const all = await chrome.cookies.getAll({ name });
      if (all && all.length > 0) c = all[0];
    }
    return c ? c.value : '';
  };

  const ct0 = await getCookie('ct0');
  const authToken = await getCookie('auth_token');

  return { ct0, authToken };
}

function isAppUrl(url) {
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(url || '');
}

function tabMessage(tabId, msg, timeoutMs = 35000) {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        resolve(null);
      }
    }, timeoutMs);
    try {
      chrome.tabs.sendMessage(tabId, msg, (response) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (chrome.runtime.lastError) resolve(null);
        else resolve(response || null);
      });
    } catch {
      if (!done) {
        done = true;
        clearTimeout(timer);
        resolve(null);
      }
    }
  });
}

async function getXTab() {
  const tabs = await chrome.tabs.query({ url: ['https://x.com/*', 'https://twitter.com/*'] });
  return tabs.find((t) => t.id && t.url && !t.url.includes('/i/flow/')) || tabs[0] || null;
}

async function ensureXContent(tab) {
  if (!tab?.id) return null;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      files: ['gql_spy.js']
    });
  } catch (e) {}
  const ping = await tabMessage(tab.id, { type: 'PING_X' }, 1500);
  if (ping?.ok) return tab;
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['tweetCore.js', 'x_content.js'] });
    await new Promise((r) => setTimeout(r, 250));
  } catch (e) {}
  return tab;
}

async function sendToXTab(msg, timeoutMs = 35000) {
  const tab = await getXTab();
  if (!tab) return null;
  await ensureXContent(tab);
  let res = await tabMessage(tab.id, msg, timeoutMs);
  if (res) return res;
  await ensureXContent(tab);
  return tabMessage(tab.id, msg, timeoutMs);
}

async function injectAppBridge(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        window.__CLEANSWEEP_EXTENSION_INSTALLED__ = true;
        document.documentElement.setAttribute('data-csx-bridge', '1');
      }
    });
  } catch (e) {}
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
  } catch (e) {}
}

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === 'complete' && isAppUrl(tab?.url)) injectAppBridge(tabId);
});

function usableUserId(id) {
  if (!id) return '';
  const s = String(id);
  if (/^(acc_|user_|dom_|id_)/.test(s)) return '';
  if (!/^\d+$/.test(s)) return '';
  return s;
}

async function fetchTweetsViaXTab(handle, userId) {
  return sendToXTab({ type: 'FETCH_USER_TWEETS_INPAGE', handle, userId }, 35000);
}

async function gqlJson(url, headers) {
  const response = await fetch(url, { headers });
  let data = null;
  try { data = await response.json(); } catch (e) {}
  return { ok: response.ok, status: response.status, data };
}

async function gqlWithRetry(buildUrl, headers, features) {
  let feats = { ...features };
  for (let attempt = 0; attempt < 4; attempt++) {
    const result = await gqlJson(buildUrl(feats), headers);
    const missing = Core.parseMissingFeatures(result.data);
    if (missing.length) {
      missing.forEach((f) => { feats[f] = true; });
      continue;
    }
    return result.data;
  }
  return null;
}

async function resolveUserIdWithCookies(handle, headers) {
  const qid = Core.FALLBACK_QUERY_IDS.UserByScreenName;
  const data = await gqlWithRetry(
    (feats) => Core.buildGqlUrl('https://x.com', qid, 'UserByScreenName', { screen_name: handle, withSafetyModeUserFields: true }, feats),
    headers,
    Core.USER_BY_SCREEN_FEATURES
  );
  return data?.data?.user?.result?.rest_id || '';
}

async function paginateWithCookies(headers, features, buildVars, queryId, opName, handle, uid) {
  let cursor = '';
  const collected = [];
  for (let page = 0; page < 5; page++) {
    const data = await gqlWithRetry(
      (feats) => Core.buildGqlUrl('https://x.com', queryId, opName, buildVars(cursor), feats),
      headers,
      features
    );
    if (!data) break;
    collected.push(...Core.tweetsFromGraphQL(data));
    const posts = Core.formatAndFilterTweets(collected, handle, uid);
    if (posts.length >= 3) return posts;
    cursor = Core.findBottomCursor(data);
    if (!cursor) break;
  }
  return Core.formatAndFilterTweets(collected, handle, uid);
}

async function fetchTweetsWithCookies(handle, userId) {
  const cookies = await getXCookies();
  if (!cookies.ct0 || !cookies.authToken) return null;
  const headers = {
    'authorization': BEARER_TOKEN,
    'x-csrf-token': cookies.ct0,
    'x-twitter-active-user': 'yes',
    'x-twitter-auth-type': 'OAuth2Session',
    'cookie': `auth_token=${cookies.authToken}; ct0=${cookies.ct0}`
  };
  let uid = usableUserId(userId);
  if (!uid) uid = await resolveUserIdWithCookies(handle, headers);
  const features = Core.GQL_FEATURES;
  const ids = Core.FALLBACK_QUERY_IDS;

  if (ids.UserTweets && uid) {
    const posts = await paginateWithCookies(
      headers, features,
      (cursor) => Core.userTweetsVariables(uid, cursor),
      ids.UserTweets, 'UserTweets', handle, uid
    );
    if (posts.length) return posts;
  }
  if (ids.SearchTimeline && handle) {
    const posts = await paginateWithCookies(
      headers, features,
      (cursor) => Core.searchVariables(handle, cursor),
      ids.SearchTimeline, 'SearchTimeline', handle, uid
    );
    if (posts.length) return posts;
  }

  const qs = uid ? `user_id=${encodeURIComponent(uid)}` : `screen_name=${encodeURIComponent(handle)}`;
  const url = `https://x.com/i/api/1.1/statuses/user_timeline.json?${qs}&count=50&include_rts=false&exclude_replies=true&tweet_mode=extended`;
  const response = await fetch(url, { headers });
  if (!response.ok) return [];
  return Core.formatAndFilterTweets(await response.json(), handle, uid);
}

async function fetchPreviewTweets(handle, userId) {
  const inPage = await fetchTweetsViaXTab(handle, userId);
  if (inPage?.success && Array.isArray(inPage.tweets) && inPage.tweets.length > 0) {
    return inPage.tweets;
  }
  const viaCookies = await fetchTweetsWithCookies(handle, userId);
  if (viaCookies && viaCookies.length > 0) return viaCookies;
  if (inPage?.success && Array.isArray(inPage.tweets)) return inPage.tweets;
  if (viaCookies) return viaCookies;
  throw new Error('tweet_fetch_failed');
}

// ── Background Auto-Sync Engine ──
async function performBackgroundSync(passedDomProfile = null) {
  const cookies = await getXCookies();
  if (!cookies.ct0 || !cookies.authToken) {
    return { 
      success: false, 
      error: '🔑 Session-Cookies (auth_token & ct0) nicht gefunden.\n\nBitte öffne x.com in einem neuen Tab, logge dich ein und lade die Seite einmal neu.' 
    };
  }

  const baseHeaders = {
    'authorization': BEARER_TOKEN,
    'x-csrf-token': cookies.ct0,
    'x-twitter-active-user': 'yes',
    'x-twitter-auth-type': 'OAuth2Session',
    'cookie': `auth_token=${cookies.authToken}; ct0=${cookies.ct0}`
  };

  // 1. Fetch current user profile using multiple endpoint fallbacks
  let profile = passedDomProfile && passedDomProfile.screen_name ? passedDomProfile : null;
  
  if (!profile) {
    const profileUrls = [
      'https://api.twitter.com/1.1/account/verify_credentials.json',
      'https://x.com/i/api/1.1/account/verify_credentials.json',
      'https://api.x.com/1.1/account/verify_credentials.json',
      'https://x.com/i/api/1.1/account/settings.json'
    ];

    for (const url of profileUrls) {
      try {
        const verifyRes = await fetch(url, { headers: baseHeaders });
        if (verifyRes.ok) {
          const u = await verifyRes.json();
          const screenName = u.screen_name || u.user?.screen_name;
          if (screenName) {
            profile = {
              id_str: u.id_str || u.user?.id_str || 'id_' + screenName,
              name: u.name || u.user?.name || screenName,
              screen_name: screenName,
              profile_image_url_https: u.profile_image_url_https || u.user?.profile_image_url_https || '',
              profile_banner_url: u.profile_banner_url || u.user?.profile_banner_url || '',
              description: u.description || u.user?.description || '',
              followers_count: u.followers_count || u.user?.followers_count || 0,
              friends_count: u.friends_count || u.user?.friends_count || 0
            };
            break;
          }
        }
      } catch (e) {
        console.error('Profile fetch error:', e);
      }
    }
  }

  // 2. Fetch following list using multiple domain fallbacks
  let allFollowing = [];
  let cursor = '-1';
  let page = 0;

  const getFollowingPage = async (c) => {
    const urls = [
      `https://api.twitter.com/1.1/friends/list.json?count=200&cursor=${encodeURIComponent(c)}&skip_status=false&include_user_entities=true`,
      `https://x.com/i/api/1.1/friends/list.json?count=200&cursor=${encodeURIComponent(c)}&skip_status=false&include_user_entities=true`,
      `https://api.x.com/1.1/friends/list.json?count=200&cursor=${encodeURIComponent(c)}&skip_status=false&include_user_entities=true`
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url, { headers: baseHeaders });
        if (res.ok) {
          return await res.json();
        }
      } catch (e) {}
    }
    return null;
  };

  while (page < 25) {
    page++;
    const data = await getFollowingPage(cursor);
    if (!data) break;

    const users = data.users || [];
    if (users.length === 0) break;

    for (const u of users) {
      allFollowing.push({
        id_str: u.id_str,
        name: u.name,
        screen_name: u.screen_name,
        profile_image_url_https: u.profile_image_url_https,
        profile_banner_url: u.profile_banner_url,
        description: u.description,
        followers_count: u.followers_count || 0,
        friends_count: u.friends_count || 0,
        created_at: u.created_at,
        location: u.location,
        url: u.url || '',
        verified: u.verified || false,
        followed_by: u.followed_by || false,
        status: u.status || null,
        entities: u.entities || null
      });
    }

    if (!data.next_cursor_str || data.next_cursor_str === '0') break;
    cursor = data.next_cursor_str;
    await new Promise(r => setTimeout(r, 150));
  }

  // Fallback profile if verify_credentials fails but following list is loaded
  if (!profile) {
    if (allFollowing.length > 0) {
      profile = {
        id_str: 'user_live_session',
        name: 'X Account',
        screen_name: 'x_user',
        profile_image_url_https: '',
        description: 'Live Session Import',
        followers_count: 0,
        friends_count: allFollowing.length
      };
    } else {
      return { 
        success: false, 
        error: 'Konnte X-Profil & Following-Liste nicht über API laden.\n\nStelle sicher, dass du auf x.com eingeloggt bist und klicke auf x.com unten rechts "⚡ Sync mit CleanSweep X".' 
      };
    }
  }

  const payload = {
    profile,
    following: allFollowing,
    bearer: BEARER_TOKEN,
    auth_token: cookies.authToken,
    ct0: cookies.ct0
  };

  // POST payload to localhost:3001 from background service worker
  try {
    const postRes = await fetch('http://localhost:3001/api/x/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!postRes.ok) {
      const errData = await postRes.json();
      return { success: false, error: errData.error || 'Server (localhost:3001) lehnte Import ab.' };
    }

    return { success: true, count: allFollowing.length, profile };
  } catch (err) {
    return { success: false, error: 'Server (http://localhost:3001) nicht erreichbar. Läuft node server.js?' };
  }
}

// Listen to messages from content.js (CleanSweep X web app) and x_content.js (x.com)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PING') {
    sendResponse({ status: 'PONG', installed: true });
    return true;
  }

  if (request.type === 'CHECK_AUTH') {
    getXCookies().then(cookies => {
      sendResponse({
        isLoggedIn: !!(cookies.ct0 && cookies.authToken),
        hasCt0: !!cookies.ct0,
        hasAuthToken: !!cookies.authToken
      });
    });
    return true;
  }

  if (request.type === 'UNFOLLOW_USER') {
    const { handle, userId } = request;
    if (!handle && !userId) {
      sendResponse({ success: false, error: 'Missing handle or userId' });
      return true;
    }

    (async () => {
      const inPage = await sendToXTab({ type: 'UNFOLLOW_USER_INPAGE', handle, userId }, 15000);
      if (inPage?.success) {
        console.log(`✅ CleanSweep live unfollow @${handle} via x.com tab`);
        sendResponse({ success: true, handle, userId, via: 'x_tab' });
        return;
      }

      const cookies = await getXCookies();
      if (!cookies.ct0 || !cookies.authToken) {
        sendResponse({ success: false, error: inPage?.error || 'Kein x.com-Tab / keine Session-Cookies. Öffne x.com und lade neu.' });
        return;
      }

      try {
        const uid = usableUserId(userId);
        const bodyStr = uid
          ? `user_id=${encodeURIComponent(uid)}`
          : `screen_name=${encodeURIComponent(handle)}`;
        const response = await fetch('https://x.com/i/api/1.1/friendships/destroy.json', {
          method: 'POST',
          headers: {
            'authorization': BEARER_TOKEN,
            'content-type': 'application/x-www-form-urlencoded',
            'x-csrf-token': cookies.ct0,
            'x-twitter-active-user': 'yes',
            'x-twitter-auth-type': 'OAuth2Session',
            'cookie': `auth_token=${cookies.authToken}; ct0=${cookies.ct0}`,
            'origin': 'https://x.com',
            'referer': 'https://x.com/'
          },
          body: bodyStr
        });
        if (response.ok) {
          console.log(`✅ CleanSweep live unfollow @${handle} via cookies`);
          sendResponse({ success: true, handle, userId, via: 'cookies' });
        } else {
          const errText = await response.text();
          console.error(`❌ Unfollow @${handle}:`, response.status, errText);
          sendResponse({ success: false, handle, status: response.status, error: errText });
        }
      } catch (err) {
        sendResponse({ success: false, handle, error: err.message });
      }
    })();

    return true;
  }

  // Handle direct 1-click sync requests (from Web App or x.com floating button)
  if (request.type === 'TRIGGER_EXTENSION_IMPORT' || request.type === 'RUN_X_SYNC') {
    performBackgroundSync(request.domProfile).then(result => {
      sendResponse(result);
    });
    return true; // Keep async response channel open
  }

  if (request.type === 'FETCH_X_DATA') {
    performBackgroundSync(request.domProfile).then(result => {
      sendResponse(result);
    });
    return true;
  }

  if (request.type === 'FETCH_USER_TWEETS') {
    const { handle, userId } = request;
    fetchPreviewTweets(handle, userId)
      .then((tweets) => sendResponse({ success: true, tweets: tweets || [] }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.type === 'BATCH_FETCH_USER_TWEETS') {
    const items = request.items || [];
    (async () => {
      const inPage = await sendToXTab({ type: 'BATCH_TWEETS_INPAGE', items }, 90000);
      if (inPage?.success && inPage.results) {
        sendResponse({ success: true, results: inPage.results });
        return;
      }
      const results = {};
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item?.handle) continue;
        if (i > 0) await new Promise((r) => setTimeout(r, 90));
        try {
          results[item.handle] = await fetchPreviewTweets(item.handle, item.userId);
        } catch {}
      }
      sendResponse({ success: true, results });
    })();
    return true;
  }
});

setInterval(async () => {
  try {
    const res = await fetch('http://localhost:3001/api/x/pending_tweet_fetches');
    if (!res.ok) return;
    const data = await res.json();
    const tasks = data.tasks || [];
    for (const task of tasks) {
      let tweets = [];
      try {
        tweets = await fetchPreviewTweets(task.handle, task.userId);
      } catch (e) {}
      await fetch('http://localhost:3001/api/x/tweet_fetch_result', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ handle: task.handle, tweets, requestId: task.requestId })
      });
    }
  } catch (e) {}
}, 900);
