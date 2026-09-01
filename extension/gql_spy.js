(function () {
  if (window.__CSX_GQL_SPY__) return;
  window.__CSX_GQL_SPY__ = true;
  try { document.documentElement.setAttribute('data-csx-spy', '1'); } catch (e) {}

  const store = {};

  function save() {
    try { sessionStorage.setItem('csx_gql_meta', JSON.stringify(store)); } catch (e) {}
  }

  function capture(url) {
    const m = String(url || '').match(/\/graphql\/([^/?]+)\/([^/?]+)/);
    if (!m) return;
    const entry = { queryId: m[1], operation: m[2] };
    try {
      const u = new URL(String(url), location.origin);
      const features = u.searchParams.get('features');
      if (features) entry.features = JSON.parse(features);
    } catch (e) {}
    store[m[2]] = entry;
    save();
  }

  const origFetch = window.fetch;
  window.fetch = function () {
    try {
      const input = arguments[0];
      capture(typeof input === 'string' ? input : (input && input.url));
    } catch (e) {}
    return origFetch.apply(this, arguments);
  };

  window.addEventListener('message', async (ev) => {
    if (ev.source !== window || !ev.data || ev.data.csx !== 'fetch') return;
    const id = ev.data.id;
    const url = ev.data.url;
    const opts = ev.data.opts || {};
    try {
      const res = await window.fetch(url, {
        method: opts.method || 'GET',
        headers: opts.headers || {},
        body: opts.body || undefined,
        credentials: 'include'
      });
      let data = null;
      try { data = await res.json(); } catch (e) {}
      window.postMessage({ csx: 'fetch-result', id: id, ok: res.ok, status: res.status, data: data }, '*');
    } catch (err) {
      window.postMessage({ csx: 'fetch-result', id: id, ok: false, status: 0, error: err.message }, '*');
    }
  });
})();
