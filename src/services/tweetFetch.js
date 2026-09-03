export function extensionInstalled() {
  return window.__CLEANSWEEP_EXTENSION_INSTALLED__ === true
    || document.documentElement?.getAttribute('data-csx-bridge') === '1';
}

function waitForExtensionMessage(matchFn, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMsg);
      clearTimeout(timer);
      fn();
    };
    const onMsg = (event) => {
      if (event.source !== window || event.data?.source !== 'CSX_EXTENSION') return;
      if (!matchFn(event.data)) return;
      finish(() => resolve(event.data));
    };
    const timer = setTimeout(() => {
      finish(() => reject(new Error('timeout')));
    }, timeoutMs);
    window.addEventListener('message', onMsg);
  });
}

let tweetReqSeq = 0;

export async function fetchTweetsFromExtension(handle, userId, force = false) {
  if (!extensionInstalled()) throw new Error('no_extension');
  const requestId = `tw_${++tweetReqSeq}_${handle}`;
  const pending = waitForExtensionMessage(
    (data) => data.type === 'USER_TWEETS_RESPONSE' && data.requestId === requestId,
    35000
  );
  window.postMessage({
    source: 'CSX_APP',
    type: 'FETCH_USER_TWEETS',
    handle,
    userId,
    force: !!force,
    requestId
  }, '*');
  const data = await pending;
  if (!data.success) throw new Error(data.error || 'extension_fetch_failed');
  return data.tweets || [];
}

export async function fetchTweetsBatchFromExtension(items, force = false) {
  if (!extensionInstalled()) throw new Error('no_extension');
  const pending = waitForExtensionMessage(
    (data) => data.type === 'BATCH_USER_TWEETS_RESPONSE',
    120000
  );
  window.postMessage({
    source: 'CSX_APP',
    type: 'BATCH_FETCH_USER_TWEETS',
    items,
    force: !!force
  }, '*');
  const data = await pending;
  if (!data.success) throw new Error(data.error || 'extension_batch_failed');
  return data.results || {};
}

async function fetchUserTweetsFromServer(handle, userId, force) {
  const params = new URLSearchParams({ handle, force: force ? 'true' : 'false' });
  if (userId) params.set('userId', userId);
  const r = await fetch(`/api/x/user_tweets?${params.toString()}`);
  const data = await r.json();
  return {
    tweets: data.tweets || [],
    rateLimited: !!data.rateLimited,
    success: r.ok && !data.rateLimited
  };
}

async function fetchTweetsBatchFromServer(items, force) {
  const r = await fetch('/api/x/batch_tweets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      handles: items.map((i) => i.handle),
      ids: Object.fromEntries(items.map((i) => [i.handle, i.userId])),
      force: !!force
    })
  });
  const data = await r.json();
  return data.results || {};
}

export async function fetchUserTweets(handle, { userId, force } = {}) {
  let tweets = [];
  try {
    tweets = await fetchTweetsFromExtension(handle, userId, force);
    if (Array.isArray(tweets) && tweets.length >= 3) {
      return { tweets, rateLimited: false, success: true };
    }
  } catch {
    tweets = [];
  }
  try {
    const serverRes = await fetchUserTweetsFromServer(handle, userId, force);
    if (serverRes.rateLimited) {
      return { tweets: tweets || [], rateLimited: true, success: false };
    }
    if (Array.isArray(serverRes.tweets) && serverRes.tweets.length > (tweets?.length || 0)) {
      return { tweets: serverRes.tweets, rateLimited: false, success: true };
    }
    return { tweets: serverRes.tweets || tweets || [], rateLimited: false, success: serverRes.success };
  } catch {}
  return { tweets: tweets || [], rateLimited: false, success: tweets.length > 0 };
}

export async function fetchTweetsBatch(items, { force } = {}) {
  let results = {};
  try {
    results = await fetchTweetsBatchFromExtension(items, force);
  } catch {
    results = {};
  }
  const missing = items.filter((i) => !Object.prototype.hasOwnProperty.call(results, i.handle));
  if (missing.length === 0) return results;
  try {
    const serverResults = await fetchTweetsBatchFromServer(missing, force);
    return { ...results, ...serverResults };
  } catch {
    return results;
  }
}
