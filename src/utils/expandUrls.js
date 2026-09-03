export function collectUrlEntities(entities) {
  if (!entities) return [];
  let ent = entities;
  if (typeof ent === 'string') {
    try { ent = JSON.parse(ent); } catch { return []; }
  }
  const out = [];
  const add = (v) => {
    if (!v) return;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item && typeof item === 'object') out.push(item);
      }
      return;
    }
    if (Array.isArray(v.urls)) add(v.urls);
  };
  add(ent.description?.urls);
  add(ent.description);
  add(ent.url?.urls);
  add(ent.url);
  add(ent.urls);
  if (Array.isArray(ent)) add(ent);
  return out;
}

export function fullUrlFromEntity(item) {
  if (!item || typeof item !== 'object') return '';
  const expanded = String(item.expanded_url || item.unwound_url || '').trim();
  if (expanded && !/t\.co\//i.test(expanded)) return expanded;
  const display = String(item.display_url || '').trim();
  if (display && !/t\.co\//i.test(display) && !display.includes('…') && !display.endsWith('...')) {
    return /^https?:\/\//i.test(display) ? display : `https://${display.replace(/^https?:\/\//i, '')}`;
  }
  return expanded;
}

export function tcoCode(value) {
  const m = String(value || '').match(/t\.co\/([A-Za-z0-9]+)/i);
  return m ? m[1] : '';
}

export function extractTcoCodes(text) {
  return [...String(text || '').matchAll(/t\.co\/([A-Za-z0-9]+)/gi)].map((m) => m[1]);
}

export function expandUrlsInText(text, entities, extraMap = {}) {
  let out = String(text || '');
  if (!out) return '';

  const items = collectUrlEntities(entities);

  const indexed = items
    .map((item) => {
      const indices = Array.isArray(item.indices) && item.indices.length >= 2
        ? item.indices
        : (item.from_index != null && item.to_index != null ? [item.from_index, item.to_index] : null);
      return { item, indices };
    })
    .filter((x) => Array.isArray(x.indices) && x.indices[0] < x.indices[1])
    .sort((a, b) => b.indices[0] - a.indices[0]);

  for (const { item, indices } of indexed) {
    const full = fullUrlFromEntity(item);
    if (!full) continue;
    const [start, end] = indices;
    if (start < 0 || end > out.length) continue;
    const slice = out.slice(start, end);
    if (/t\.co/i.test(slice) || slice === item.url || slice === item.short_url) {
      out = out.slice(0, start) + full + out.slice(end);
    }
  }

  for (const item of items) {
    const full = fullUrlFromEntity(item);
    if (!full) continue;
    const code = tcoCode(item.url) || tcoCode(item.short_url) || tcoCode(item.expanded_url);
    if (code) {
      out = out.replace(new RegExp(`(?:https?:\\/\\/)?t\\.co\\/${code}\\/?`, 'gi'), full);
    }
    if (item.url && item.url !== full && out.includes(item.url)) {
      out = out.split(item.url).join(full);
    }
  }

  Object.entries(extraMap || {}).forEach(([code, full]) => {
    if (!code || !full) return;
    const safe = String(code).replace(/[^A-Za-z0-9]/g, '');
    if (!safe) return;
    out = out.replace(new RegExp(`(?:https?:\\/\\/)?t\\.co\\/${safe}\\/?`, 'gi'), full);
  });

  return out;
}

export function tweetUrlEntities(tweet) {
  const legacy = tweet?.legacy || tweet || {};
  const note = tweet?.note_tweet?.note_tweet_results?.result
    || tweet?.note_tweet?.result
    || {};
  const urls = [
    ...(legacy.entities?.urls || []),
    ...(tweet?.entities?.urls || []),
    ...(note.entity_set?.urls || []),
    ...(note.entities?.urls || [])
  ];
  const seen = new Set();
  const out = [];
  for (const item of urls) {
    const key = item?.url || item?.expanded_url || item?.unwound_url;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return { ...(legacy.entities || tweet?.entities || {}), urls: out };
}

export function unwrapRedirectUrl(raw) {
  try {
    const parsed = new URL(raw);
    if (/\/i\/web\/redirect/i.test(parsed.pathname)) {
      const inner = parsed.searchParams.get('url') || parsed.searchParams.get('to');
      if (inner) return inner;
    }
  } catch {}
  return raw;
}

export function displayUrlLabel(href) {
  const raw = String(href || '').trim();
  if (!raw) return '';
  if (/t\.co\//i.test(raw)) {
    try {
      const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      return `${u.hostname}${u.pathname}`;
    } catch {
      return raw;
    }
  }
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export function splitTextAndUrls(text) {
  const s = String(text || '');
  const re = /(https?:\/\/[^\s<>]+)|(\bt\.co\/[A-Za-z0-9]+)/gi;
  const parts = [];
  let last = 0;
  let m;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push({ type: 'text', value: s.slice(last, m.index) });
    let value = m[0];
    value = value.replace(/[),.;!?]+$/g, '');
    parts.push({ type: 'url', value });
    last = m.index + value.length;
    re.lastIndex = last;
  }
  if (last < s.length) parts.push({ type: 'text', value: s.slice(last) });
  return parts;
}
