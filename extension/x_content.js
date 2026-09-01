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

  // Inject floating sync widget into x.com bottom right corner
  function injectFloatingWidget() {
    if (document.getElementById('csx-floating-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'csx-floating-widget';
    widget.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 10px;
      background: #111318;
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.16);
      padding: 8px 16px;
      border-radius: 999px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 700;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
    `;

    widget.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
      <span>⚡ Sync mit CleanSweep X</span>
    `;

    widget.addEventListener('mouseenter', () => {
      widget.style.transform = 'translateY(-2px) scale(1.03)';
      widget.style.borderColor = '#1D9BF0';
    });

    widget.addEventListener('mouseleave', () => {
      widget.style.transform = 'none';
      widget.style.borderColor = 'rgba(255, 255, 255, 0.16)';
    });

    widget.addEventListener('click', () => {
      widget.style.opacity = '0.7';
      widget.style.background = '#111318';
      widget.innerHTML = `<span>⏳ Laden & Synchronisieren...</span>`;

      const domProfile = getDOMUserProfile();

      // Delegate sync to extension background worker (avoids browser PNA / mixed-content blocks)
      chrome.runtime.sendMessage({ type: 'RUN_X_SYNC', domProfile }, (result) => {
        if (result && result.success) {
          widget.style.background = '#059669';
          widget.style.opacity = '1';
          widget.innerHTML = `<span>✅ ${result.count} Profile gesendet!</span>`;
          setTimeout(() => {
            window.open('http://localhost:5173', '_blank');
            injectFloatingWidget();
          }, 1200);
        } else {
          widget.style.background = '#DC2626';
          widget.style.opacity = '1';
          widget.innerHTML = `<span>❌ ${result?.error || 'Fehler beim Sync'}</span>`;
          setTimeout(() => injectFloatingWidget(), 3500);
        }
      });
    });

    document.body.appendChild(widget);
  }

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
    const from = (meta.UserTweets || meta.HomeTimeline || meta.HomeLatestTimeline || meta.SearchTimeline || {});
    if (from.features && typeof from.features === 'object' && Object.keys(from.features).length > 5) {
      return { ...from.features };
    }
    return { ...((Core && Core.GQL_FEATURES) || {}) };
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
      collected.push(...Core.tweetsFromGraphQL(data));
      const posts = Core.formatAndFilterTweets(collected, handle, uid);
      if (posts.length >= 3) return posts;
      cursor = Core.findBottomCursor(data);
      if (!cursor) break;
    }
    return Core.formatAndFilterTweets(collected, handle, uid);
  }

  async function collectOriginalPosts(headers, features, ids, handle, uid) {
    if (ids.UserTweets && uid) {
      const posts = await paginatePosts(
        headers, features,
        (cursor) => Core.userTweetsVariables(uid, cursor),
        ids.UserTweets, 'UserTweets', handle, uid, 5
      );
      if (posts.length) return posts;
    }
    if (ids.SearchTimeline && handle) {
      const posts = await paginatePosts(
        headers, features,
        (cursor) => Core.searchVariables(handle, cursor),
        ids.SearchTimeline, 'SearchTimeline', handle, uid, 5
      );
      if (posts.length) return posts;
    }
    if (ids.UserTweetsAndReplies && uid) {
      const posts = await paginatePosts(
        headers, features,
        (cursor) => Core.userTweetsVariables(uid, cursor),
        ids.UserTweetsAndReplies, 'UserTweetsAndReplies', handle, uid, 5
      );
      if (posts.length) return posts;
    }
    const qs = uid ? `user_id=${encodeURIComponent(uid)}` : `screen_name=${encodeURIComponent(handle)}`;
    const url = `/i/api/1.1/statuses/user_timeline.json?${qs}&count=50&include_rts=false&exclude_replies=true&tweet_mode=extended`;
    const rest = await pageFetchJson(url, headers);
    if (rest.ok && Array.isArray(rest.data)) {
      return Core.formatAndFilterTweets(rest.data, handle, uid);
    }
    return [];
  }

  async function fetchPreviewTweets(handle, userId) {
    if (!Core) return [];
    const headers = apiHeaders();
    const features = liveFeatures();
    let ids = await discoverAllQueryIds(false);
    let uid = userId && /^\d+$/.test(String(userId)) ? String(userId) : '';
    if (!uid) uid = await resolveUserId(handle, headers, ids);

    let posts = await collectOriginalPosts(headers, features, ids, handle, uid);
    if (posts.length) return posts;

    ids = await discoverAllQueryIds(true);
    if (!uid) uid = await resolveUserId(handle, headers, ids);
    return collectOriginalPosts(headers, features, ids, handle, uid);
  }

  async function unfollowInPage(handle, userId) {
    const headers = apiHeaders();
    let uid = userId && /^\d+$/.test(String(userId)) ? String(userId) : '';
    const body = uid
      ? `user_id=${encodeURIComponent(uid)}`
      : `screen_name=${encodeURIComponent(handle)}`;
    const res = await fetch('/i/api/1.1/friendships/destroy.json', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/x-www-form-urlencoded' },
      body,
      credentials: 'include'
    });
    if (res.ok) return { success: true, via: 'v1.1' };

    const ids = await discoverAllQueryIds();
    if (!uid) uid = await resolveUserId(handle, headers, ids);
    const qid = ids.Unfollow || ids.UnfollowUser;
    if (qid && uid) {
      const gqlRes = await fetch(`/i/api/graphql/${qid}/Unfollow`, {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          variables: { user_id: uid, userId: uid },
          queryId: qid
        })
      });
      if (gqlRes.ok) return { success: true, via: 'gql' };
    }
    let errText = '';
    try { errText = await res.text(); } catch (e) {}
    return { success: false, error: errText || ('status ' + res.status) };
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

  // Auto-inject widget after page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectFloatingWidget);
  } else {
    injectFloatingWidget();
  }
})();
