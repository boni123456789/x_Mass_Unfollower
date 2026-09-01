if (globalThis.__CSX_CONTENT_LOADED__) {
  try { document.documentElement.setAttribute('data-csx-bridge', '1'); } catch (e) {}
} else {
  globalThis.__CSX_CONTENT_LOADED__ = true;

  try {
    document.documentElement.setAttribute('data-csx-bridge', '1');
  } catch (e) {}

  try {
    const script = document.createElement('script');
    script.textContent = 'window.__CLEANSWEEP_EXTENSION_INSTALLED__ = true;';
    (document.documentElement || document.head).appendChild(script);
    script.remove();
  } catch (e) {}

  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.source !== 'CSX_APP') return;

    const { type, handle, userId, items, force, requestId } = event.data;

    if (type === 'PING') {
      chrome.runtime.sendMessage({ type: 'PING' }, () => {
        window.postMessage({ source: 'CSX_EXTENSION', type: 'PONG', installed: true }, '*');
      });
      return;
    }

    if (type === 'CHECK_AUTH') {
      chrome.runtime.sendMessage({ type: 'CHECK_AUTH' }, (response) => {
        window.postMessage({ source: 'CSX_EXTENSION', type: 'AUTH_STATUS', ...(response || {}) }, '*');
      });
      return;
    }

    if (type === 'UNFOLLOW_USER') {
      chrome.runtime.sendMessage({ type: 'UNFOLLOW_USER', handle, userId }, (response) => {
        const payload = response || { success: false, error: chrome.runtime.lastError?.message || 'no_response' };
        window.postMessage({ source: 'CSX_EXTENSION', type: 'UNFOLLOW_RESPONSE', handle, ...payload }, '*');
      });
      return;
    }

    if (type === 'TRIGGER_EXTENSION_IMPORT') {
      chrome.runtime.sendMessage({ type: 'TRIGGER_EXTENSION_IMPORT' }, (response) => {
        window.postMessage({ source: 'CSX_EXTENSION', type: 'EXTENSION_IMPORT_RESPONSE', ...(response || {}) }, '*');
      });
      return;
    }

    if (type === 'FETCH_X_DATA') {
      chrome.runtime.sendMessage({ type: 'FETCH_X_DATA' }, (response) => {
        window.postMessage({ source: 'CSX_EXTENSION', type: 'X_DATA_RESPONSE', ...(response || {}) }, '*');
      });
      return;
    }

    if (type === 'FETCH_USER_TWEETS') {
      chrome.runtime.sendMessage({ type: 'FETCH_USER_TWEETS', handle, userId, force, requestId }, (response) => {
        const payload = response || { success: false, error: chrome.runtime.lastError?.message || 'no_response' };
        window.postMessage({ source: 'CSX_EXTENSION', type: 'USER_TWEETS_RESPONSE', handle, requestId, ...payload }, '*');
      });
      return;
    }

    if (type === 'BATCH_FETCH_USER_TWEETS') {
      chrome.runtime.sendMessage({ type: 'BATCH_FETCH_USER_TWEETS', items, force }, (response) => {
        const payload = response || { success: false, error: chrome.runtime.lastError?.message || 'no_response' };
        window.postMessage({ source: 'CSX_EXTENSION', type: 'BATCH_USER_TWEETS_RESPONSE', ...payload }, '*');
      });
    }
  });
}
