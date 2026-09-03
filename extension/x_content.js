// CleanSweep X — Injected Bridge & Auto-Sync Component on x.com
// Triggers background worker sync without triggering PNA / browser permission popups

(function () {
  if (window.__CSX_X_CONTENT_SCRIPT_LOADED__) return;
  window.__CSX_X_CONTENT_SCRIPT_LOADED__ = true;

  console.log('⚡ CleanSweep X Extension active on x.com!');

  function getDOMUserProfile() {
    try {
      let name = '';
      let handle = '';
      let avatar = '';

      const btn = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
      if (btn) {
        const spans = Array.from(btn.querySelectorAll('span'));
        for (const span of spans) {
          const text = (span.textContent || '').trim();
          if (text.startsWith('@') && text.length > 1) {
            handle = text.replace(/^@/, '');
          } else if (text && text !== '…' && !name && !text.startsWith('@')) {
            name = text;
          }
        }
        const img = btn.querySelector('img');
        if (img && img.src) avatar = img.src;
      }

      if (!handle) {
        const profileLink = document.querySelector('[data-testid="AppTabBar_Profile_Link"]');
        if (profileLink && profileLink.href) {
          const parts = profileLink.href.split('/');
          handle = parts[parts.length - 1] || parts[parts.length - 2] || '';
        }
      }

      if (handle) {
        return {
          id_str: 'user_' + handle,
          name: name || handle,
          screen_name: handle,
          profile_image_url_https: avatar || '',
          description: 'Verified X Profile Session',
          followers_count: 0,
          friends_count: 0
        };
      }
    } catch (e) {}
    return null;
  }

  // Floating on-screen widget removed per user request (sync triggered via extension toolbar icon)

  const BEARER = 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
  const Core = globalThis.CSXTweetCore;
  if (!Core) {
    console.warn('CleanSweep X: tweetCore.js missing');
  }

  function getCt0() {
    return (document.cookie.match(/(^|;)\s*ct0\s*=\s*([^;]+)/) || [])[2] || '';
  }

  function apiHeaders() {
    return {
      'authorization': BEARER,
      'x-csrf-token': getCt0(),
      'x-twitter-auth-type': 'OAuth2Session',
      'x-twitter-active-user': 'yes',
      'x-twitter-client-language': 'de',
      'accept': '*/*'
    };
  }

  function readLiveGqlMeta() {
    try { return JSON.parse(sessionStorage.getItem('csx_gql_meta') || '{}'); } catch (e) { return {}; }
  }

  function liveQueryIds() {
    const ids = {};
    const meta = readLiveGqlMeta();
    Object.keys(meta).forEach((op) => {
      if (meta[op] && meta[op].queryId) ids[op] = meta[op].queryId;
    });
    return ids;
  }

  function liveFeatures() {
    const meta = readLiveGqlMeta();
    const from = (meta.UserTweets || {});
    const base = { ...((Core && Core.GQL_FEATURES) || {}) };
    if (from.features && typeof from.features === 'object') {
      return { ...base, ...from.features };
    }
    return base;
  }

  function spyReady() {
    try {
      return document.documentElement.getAttribute('data-csx-spy') === '1';
    } catch (e) {
      return false;
    }
  }

  function mainWorldFetch(url, opts) {
    return new Promise((resolve, reject) => {
      const id = 'csx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      let done = false;
      const finish = (fn) => {
        if (done) return;
        done = true;
        window.removeEventListener('message', onMsg);
        clearTimeout(timer);
        fn();
      };
      const onMsg = (ev) => {
        if (ev.source !== window || !ev.data || ev.data.csx !== 'fetch-result' || ev.data.id !== id) return;
        finish(() => resolve(ev.data));
      };
      const timer = setTimeout(() => finish(() => reject(new Error('main_fetch_timeout'))), 12000);
      window.addEventListener('message', onMsg);
      window.postMessage({
        csx: 'fetch',
        id,
        url,
        opts: {
          method: (opts && opts.method) || 'GET',
          headers: (opts && opts.headers) || {},
          body: (opts && opts.body) || undefined
        }
      }, '*');
    });
  }

  async function isolatedFetchJson(url, headers) {
    try {
      const res = await fetch(url, { headers, credentials: 'include' });
      let data = null;
      try { data = await res.json(); } catch (err) {}
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      return { ok: false, status: 0, data: null };
    }
  }

  async function pageFetchJson(url, headers) {
    if (spyReady()) {
      try {
        return await mainWorldFetch(url, { headers });
      } catch (e) {}
    }
    return isolatedFetchJson(url, headers);
  }

  async function gqlFetch(url, headers, features) {
    let feats = { ...features };
    for (let attempt = 0; attempt < 4; attempt++) {
      const built = url(feats);
      const result = await pageFetchJson(built, headers);
      const data = result.data;
      const missing = Core.parseMissingFeatures(data);
      if (missing.length) {
        missing.forEach((f) => { feats[f] = true; });
        continue;
      }
      return data;
    }
    return null;
  }

  let queryIdCache = null;

  async function harvestPageQueryIds() {
    const ids = {};
    try {
      performance.getEntriesByType('resource').forEach((entry) => {
        Core.harvestQueryIdsFromUrl(entry.name, ids);
      });
    } catch (e) {}
    Object.assign(ids, liveQueryIds());
    return ids;
  }

  async function scanBundleQueryIds(ids) {
    const scripts = Array.from(document.querySelectorAll('script[src]'))
      .map((s) => s.src)
      .filter((s) => /abs\.twimg\.com|\/responsive-web\//.test(s));
    scripts.sort((a, b) => {
      const score = (u) => (/main|api|graphql|bundle/i.test(u) ? 0 : 1);
      return score(a) - score(b);
    });
    for (let i = 0; i < Math.min(scripts.length, 16); i++) {
      try {
        const text = await (await fetch(scripts[i])).text();
        Core.harvestQueryIds(text, ids);
        if (ids.UserTweets && ids.UserByScreenName && ids.SearchTimeline) break;
      } catch (e) {}
    }
    return ids;
  }

  async function discoverAllQueryIds(scanBundles) {
    const pageIds = await harvestPageQueryIds();
    const ids = { ...(Core.FALLBACK_QUERY_IDS || {}), ...(queryIdCache || {}), ...pageIds };
    if (scanBundles) await scanBundleQueryIds(ids);
    Object.assign(ids, liveQueryIds());
    queryIdCache = ids;
    return ids;
  }

  async function resolveUserId(handle, headers, ids) {
    const qid = ids.UserByScreenName;
    if (!qid || !handle) return '';
    const data = await gqlFetch(
      (feats) => Core.buildGqlUrl('', qid, 'UserByScreenName', { screen_name: handle, withSafetyModeUserFields: true }, feats),
      headers,
      Core.USER_BY_SCREEN_FEATURES
    );
    return data?.data?.user?.result?.rest_id || '';
  }

  async function paginatePosts(headers, features, buildVars, queryId, opName, handle, uid, maxPages) {
    let cursor = '';
    const collected = [];
    const pages = maxPages || 5;
    for (let page = 0; page < pages; page++) {
      const data = await gqlFetch(
        (feats) => Core.buildGqlUrl('', queryId, opName, buildVars(cursor), feats),
        headers,
        features
      );
      if (!data) break;
      const before = collected.length;
      collected.push(...Core.tweetsFromGraphQL(data));
      if (page === 0 && collected.length === before) break;
      const posts = Core.formatAndFilterTweets(collected, handle, uid);
      if (posts.length >= 3) return posts;
      cursor = Core.findBottomCursor(data);
      if (!cursor) break;
    }
    return Core.formatAndFilterTweets(collected, handle, uid);
  }

  async function collectOriginalPosts(headers, features, ids, handle, uid) {
    let best = [];
    const take = (posts) => {
      if (Array.isArray(posts) && posts.length > best.length) best = posts;
      return best.length >= 3;
    };
    if (ids.UserTweets && uid) {
      const posts = await paginatePosts(
        headers, features,
        (cursor) => Core.userTweetsVariables(uid, cursor),
        ids.UserTweets, 'UserTweets', handle, uid, 5
      );
      if (take(posts)) return best;
    }
    if (ids.SearchTimeline && handle) {
      const posts = await paginatePosts(
        headers, features,
        (cursor) => Core.searchVariables(handle, cursor),
        ids.SearchTimeline, 'SearchTimeline', handle, uid, 3
      );
      if (take(posts)) return best;
    }
    const qs = uid ? `user_id=${encodeURIComponent(uid)}` : `screen_name=${encodeURIComponent(handle)}`;
    const url = `/i/api/1.1/statuses/user_timeline.json?${qs}&count=50&include_rts=false&exclude_replies=true&tweet_mode=extended`;
    const rest = await pageFetchJson(url, headers);
    if (rest.ok && Array.isArray(rest.data)) {
      take(Core.formatAndFilterTweets(rest.data, handle, uid));
    }
    return best;
  }

  async function fetchPreviewTweets(handle, userId) {
    if (!Core) return [];
    const headers = apiHeaders();
    const features = liveFeatures();
    let ids = queryIdCache || await discoverAllQueryIds(false);
    if (!ids.UserTweets || !ids.SearchTimeline) {
      ids = await discoverAllQueryIds(true);
    }
    let uid = userId && /^\d+$/.test(String(userId)) ? String(userId) : '';
    if (!uid) uid = await resolveUserId(handle, headers, ids);

    let posts = await collectOriginalPosts(headers, features, ids, handle, uid);
    if (posts.length) return posts;

    if (!queryIdCache || !queryIdCache.UserTweets) {
      ids = await discoverAllQueryIds(true);
      if (!uid) uid = await resolveUserId(handle, headers, ids);
      posts = await collectOriginalPosts(headers, features, ids, handle, uid);
    }
    return posts;
  }

  async function unfollowInPage(handle, userId) {
    const headers = apiHeaders();
    let uid = userId && /^\d+$/.test(String(userId)) ? String(userId) : '';
    const cleanH = String(handle || '').replace(/^@/, '').trim();

    // 1. Try v1.1 destroy.json with user_id or screen_name + include_profile_interstitial_type=1
    const bodyStr = uid
      ? `user_id=${encodeURIComponent(uid)}&include_profile_interstitial_type=1`
      : `screen_name=${encodeURIComponent(cleanH)}&include_profile_interstitial_type=1`;

    try {
      const res = await fetch('/i/api/1.1/friendships/destroy.json', {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/x-www-form-urlencoded' },
        body: bodyStr,
        credentials: 'include'
      });
      const data = await res.json().catch(() => null);
      const hasErrors = Array.isArray(data?.errors) && data.errors.length > 0;
      if (res.ok && data && !hasErrors && (data.id_str || data.screen_name || data.id)) {
        return { success: true, via: 'v1.1' };
      }
    } catch (e) {}

    // 2. Try GraphQL UnfollowUser mutation
    try {
      const ids = await discoverAllQueryIds();
      if (!uid && cleanH) uid = await resolveUserId(cleanH, headers, ids);
      const qid = ids.UnfollowUser || ids.Unfollow;
      if (qid && uid) {
        const gqlRes = await fetch(`/i/api/graphql/${qid}/UnfollowUser`, {
          method: 'POST',
          headers: { ...headers, 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            variables: { target_user_id: uid, user_id: uid },
            queryId: qid
          })
        });
        const gqlData = await gqlRes.json().catch(() => null);
        const hasGqlErrors = Array.isArray(gqlData?.errors) && gqlData.errors.length > 0;
        if (gqlRes.ok && gqlData && !hasGqlErrors && gqlData.data) {
          return { success: true, via: 'gql' };
        }
      }
    } catch (e) {}

    // 3. Fallback v1.1 destroy.json with screen_name only
    if (cleanH) {
      try {
        const res2 = await fetch('/i/api/1.1/friendships/destroy.json', {
          method: 'POST',
          headers: { ...headers, 'content-type': 'application/x-www-form-urlencoded' },
          body: `screen_name=${encodeURIComponent(cleanH)}`,
          credentials: 'include'
        });
        const is429 = res2.status === 429;
        const data2 = await res2.json().catch(() => null);
        const hasErrors2 = Array.isArray(data2?.errors) && data2.errors.length > 0;
        const errDesc = hasErrors2 ? data2.errors[0].message : `HTTP ${res2.status}`;
        if (is429 || /rate limit/i.test(errDesc)) {
          return { success: false, isRateLimit: true, status: 429, error: errDesc || 'HTTP 429 Rate Limit' };
        }
        if (res2.ok && data2 && !hasErrors2 && (data2.id_str || data2.screen_name || data2.id)) {
          return { success: true, via: 'v1.1_screen' };
        }
        return { success: false, error: errDesc };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    return { success: false, error: 'Unfollow failed across all endpoints' };
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'PING_X') {
      sendResponse({ ok: true, live: true, hasCt0: !!getCt0() });
      return;
    }
    if (request.type === 'UNFOLLOW_USER_INPAGE') {
      unfollowInPage(request.handle, request.userId)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    }
    if (request.type === 'FETCH_USER_TWEETS_INPAGE') {
      fetchPreviewTweets(request.handle, request.userId)
        .then((tweets) => sendResponse({ success: true, tweets }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    }
    if (request.type === 'BATCH_TWEETS_INPAGE') {
      (async () => {
        const results = {};
        const items = request.items || [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (!item?.handle) continue;
          if (i > 0) await new Promise((r) => setTimeout(r, 80));
          try {
            results[item.handle] = await fetchPreviewTweets(item.handle, item.userId);
          } catch (e) {}
        }
        sendResponse({ success: true, results });
      })();
      return true;
    }
  });

  // ── Auto-run Live Unfollow Queue In-Page Worker ──
  let inPageQueueBusy = false;
  async function pollAndExecuteQueueInPage() {
    if (inPageQueueBusy) return;
    inPageQueueBusy = true;
    try {
      const res = await fetch('http://localhost:3001/api/x/pending_unfollows');
      if (!res.ok) {
        inPageQueueBusy = false;
        return;
      }
      const data = await res.json();
      if (data.isPaused || data.rateLimited || !data.tasks || data.tasks.length === 0) {
        inPageQueueBusy = false;
        return;
      }

      const task = data.tasks[0];
      console.log(`⚡ [CleanSweep Live In-Page] Unfollowing @${task.handle}...`);
      const resUnfollow = await unfollowInPage(task.handle, task.userId);
      const isSuccess = !!resUnfollow?.success;
      const is429 = !!resUnfollow?.isRateLimit || resUnfollow?.status === 429;
      const errorMsg = resUnfollow?.error || (isSuccess ? '' : 'Failed');

      await fetch('http://localhost:3001/api/x/unfollow_result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: task.userId,
          handle: task.handle,
          success: isSuccess,
          error: errorMsg,
          isRateLimit: is429,
          clientVersion: 'v2.5'
        })
      });

      await new Promise(r => setTimeout(r, 1900 + Math.random() * 700));
    } catch (e) {
    } finally {
      inPageQueueBusy = false;
    }
  }

  setInterval(pollAndExecuteQueueInPage, 2500);

  setTimeout(() => {
    discoverAllQueryIds(true).catch(() => {});
  }, 1200);
})();
