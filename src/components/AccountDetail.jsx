import React, { useEffect, useRef, useState } from 'react';

function expandBioLinks(text, entities, extraMap) {
  let out = String(text || '');
  const lists = [entities?.description?.urls, entities?.url?.urls, entities?.urls].filter(Boolean).flat();
  const items = [...lists].sort((a, b) => String(b?.url || '').length - String(a?.url || '').length);
  for (const item of items) {
    const full = item?.expanded_url || item?.unwound_url || (item?.display_url ? `https://${String(item.display_url).replace(/^https?:\/\//i, '')}` : '');
    if (!full) continue;
    const candidates = new Set();
    if (item.url) {
      candidates.add(item.url);
      candidates.add(String(item.url).replace(/^https?:\/\//i, ''));
    }
    const tco = String(item.url || '').match(/t\.co\/([A-Za-z0-9]+)/i);
    if (tco) {
      candidates.add(`t.co/${tco[1]}`);
      candidates.add(`https://t.co/${tco[1]}`);
      candidates.add(`http://t.co/${tco[1]}`);
    }
    for (const shortUrl of candidates) {
      if (shortUrl && out.includes(shortUrl)) out = out.split(shortUrl).join(full);
    }
  }
  Object.entries(extraMap || {}).forEach(([code, full]) => {
    if (!code || !full) return;
    out = out.replace(new RegExp(`https?:\\/\\/t\\.co\\/${code}`, 'gi'), full);
    out = out.replace(new RegExp(`(?<![:\\/\\w])t\\.co\\/${code}`, 'gi'), full);
  });
  return out;
}
import { 
  UserMinus, UserCheck, Calendar, MapPin, Link as LinkIcon, 
  Heart, Repeat, MessageCircle, AlertTriangle, ShieldCheck, 
  Activity, Clock, Sparkles, ExternalLink, Copy, Globe, Loader2
} from 'lucide-react';

export default function AccountDetail({
  account,
  onUnfollow,
  onKeep,
  isPressedRed,
  isPressedGreen,
  tweetStore = {},
  onManualFetchTweet
}) {
  const detailScrollRef = useRef(null);
  const handle = account?.handle || 'user';
  const [tcoMap, setTcoMap] = useState({});

  useEffect(() => {
    if (detailScrollRef.current) detailScrollRef.current.scrollTop = 0;
  }, [handle]);

  useEffect(() => {
    const text = account?.bio || '';
    const codes = [...String(text).matchAll(/t\.co\/([A-Za-z0-9]+)/gi)].map((m) => m[1]);
    if (!codes.length) {
      setTcoMap({});
      return;
    }
    let cancelled = false;
    fetch('/api/x/expand_tco', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codes })
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setTcoMap(data?.urls || {});
      })
      .catch(() => {
        if (!cancelled) setTcoMap({});
      });
    return () => { cancelled = true; };
  }, [handle, account?.bio]);

  if (!account) {
    return (
      <div className="workspace-detail" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Wähle einen Account aus, um Details zu sehen</p>
      </div>
    );
  }

  const {
    name = 'Unbekannt',
    avatar = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png',
    banner = '',
    bio = '',
    followersCount = 0,
    followingCount = 0,
    joinedDate = '',
    location = '',
    website = '',
    websiteDisplay = '',
    entities = null,
    verified = false,
    verifiedType = '',
    followsYou = false,
    lastActive = 'Unbekannt',
    isFollowing = true,
    interactions = {},
    tweets = []
  } = account;

  const storeEntry = tweetStore[handle];
  const isRefreshing = !!storeEntry?.loading;
  const liveTweets = storeEntry?.tweets || [];
  const fallbackTweets = (tweets || []).filter((t) => t.source !== 'api_import' && !t.isReply && !t.isRT);
  const sourceTweets = storeEntry?.fetched ? liveTweets : (storeEntry ? [] : fallbackTweets);
  const currentTweets = sourceTweets.filter((t) => !t.isReply && !t.isRT).slice(0, 3);
  const isLoadingTweets = !!(isRefreshing || (storeEntry && !storeEntry.fetched && currentTweets.length === 0));

  const safeLastActive = lastActive || 'Unbekannt';
  const isInactive = safeLastActive.includes('month') || safeLastActive.includes('year') || safeLastActive.includes('Monat') || safeLastActive.includes('Jahr');

  // Calculate metrics
  const followerRatio = followingCount > 0 ? (followersCount / followingCount).toFixed(1) : (followersCount || 0);
  const totalPostLikes = currentTweets.reduce((sum, t) => sum + (t.likes || 0), 0);
  const totalPostRetweets = currentTweets.reduce((sum, t) => sum + (t.retweets || 0), 0);

  return (
    <div ref={detailScrollRef} className="workspace-detail" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', overflowY: 'auto', overflowAnchor: 'none' }}>
      
      {/* ════════════════════════════════════════════════════════════════
         NATIVE X (TWITTER) PROFILE HERO
         ════════════════════════════════════════════════════════════════ */}
      <div className="profile-hero" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0 }}>
        {/* Cover Banner */}
        <div style={{ height: '120px', width: '100%', overflow: 'hidden', background: 'var(--bg-card-hover)', position: 'relative' }}>
          <img 
            src={banner || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80'} 
            alt="Banner" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        </div>
        
        {/* Profile Info & Header Actions */}
        <div style={{ padding: '0 20px 16px 20px', position: 'relative' }}>
          {/* Avatar & Action Buttons Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '-42px', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <img 
              src={avatar || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png'} 
              alt={name} 
              style={{ width: 84, height: 84, borderRadius: '50%', border: '4px solid var(--bg-card)', objectFit: 'cover', background: 'var(--bg-card)' }} 
            />
            
            {/* Action Bar */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                className={`btn-unfollow ${isPressedRed ? 'active-key' : ''}`}
                onClick={() => onUnfollow && onUnfollow()}
                title="Shortcut: Left Arrow (←) oder 'U'"
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              >
                <UserMinus size={16} />
                <span>{isFollowing ? 'Entfolgen' : 'Re-Follow'}</span>
                <span className="key-badge red" style={{ marginLeft: '4px', fontSize: '0.72rem' }}>← / U</span>
              </button>

              <button
                className={`btn-keep ${isPressedGreen ? 'active-key' : ''} ${isFollowing ? '' : 'is-kept'}`}
                onClick={() => onKeep && onKeep()}
                title="Shortcut: Right Arrow (→) oder 'K'"
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              >
                <UserCheck size={16} />
                <span>{isFollowing ? 'Behalten' : 'Nächster'}</span>
                <span className="key-badge green" style={{ marginLeft: '4px', fontSize: '0.72rem' }}>→ / K</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  const code = `fetch("https://x.com/i/api/1.1/friendships/destroy.json", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "x-csrf-token": document.cookie.match(/ct0=([^;]+)/)[1], "x-twitter-active-user": "yes", "x-twitter-auth-type": "OAuth2Session" }, body: "screen_name=${encodeURIComponent(handle)}" }).then(r => r.ok ? alert("✅ @${handle} erfolgreich entfolgt!") : alert("❌ Fehler: Status " + r.status));`;
                  try {
                    await navigator.clipboard.writeText(code);
                    alert(`📋 1-Klick Entfolge-Code für @${handle} in Zwischenablage kopiert!`);
                  } catch (e) {
                    alert('Fehler beim Kopieren des Codes.');
                  }
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--unfollow-red)', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
              >
                <Copy size={14} />
                <span>1-Klick Code</span>
              </button>

              <a
                href={`https://x.com/${handle}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', textDecoration: 'none', background: 'rgba(29, 155, 240, 0.1)', color: 'var(--accent-blue)', border: '1px solid rgba(29, 155, 240, 0.3)', fontWeight: 600, fontSize: '0.82rem' }}
              >
                <ExternalLink size={14} />
                <span>X.com ↗</span>
              </a>
            </div>
          </div>

          {/* Native X Identity Header (Name, Handle, Follows You) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                {name}
                {verified && (
                  <span className={`verified-icon ${verifiedType === 'gold' ? 'gold' : ''}`} title="Verified Account">
                    ✓
                  </span>
                )}
              </h1>

              {followsYou ? (
                <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                  🤝 Folgt dir zurück
                </span>
              ) : (
                <span style={{ background: 'rgba(244, 33, 46, 0.08)', color: 'var(--unfollow-red)', border: '1px solid rgba(244, 33, 46, 0.25)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                  ❌ Folgt dir NICHT zurück
                </span>
              )}
            </div>

            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              @{handle}
            </div>

            {/* Native X Bio */}
            {bio ? (
              <p style={{ fontSize: '0.92rem', lineHeight: 1.45, color: 'var(--text-primary)', margin: '4px 0 6px 0', whiteSpace: 'pre-wrap' }}>
                {expandBioLinks(bio, entities, tcoMap).split(/(https?:\/\/[^\s]+)|(\bt\.co\/[A-Za-z0-9]+)/g).filter(Boolean).map((part, i) => {
                  const href = /^https?:\/\//i.test(part)
                    ? part
                    : (/^t\.co\//i.test(part) ? `https://${part}` : '');
                  if (!href) return part;
                  const label = href.replace(/^https?:\/\//i, '').replace(/\/$/, '');
                  return (
                    <a key={i} href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>
                      {label}
                    </a>
                  );
                })}
              </p>
            ) : (
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: '4px 0 6px 0' }}>
                Keine Profil-Biographie hinterlegt.
              </p>
            )}

            {/* Native X Metadata Row (Location, Website, Joined, Following, Followers) */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-secondary)', alignItems: 'center', marginTop: '2px' }}>
              {location && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={14} />
                  <span>{location}</span>
                </span>
              )}
              {website && (
                <a
                  href={website.startsWith('http') ? website : `https://${website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent-blue)', textDecoration: 'none' }}
                >
                  <Globe size={14} />
                  <span>{websiteDisplay || website.replace(/^https?:\/\//i, '').replace(/\/$/, '')}</span>
                </a>
              )}
              {joinedDate && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={14} />
                  <span>Beigetreten {joinedDate}</span>
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '18px', marginTop: '14px', fontSize: '0.9rem', fontWeight: 600 }}>
              <span style={{ color: 'var(--text-primary)' }}>
                <strong>{(followingCount || 0).toLocaleString()}</strong> <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>Following</span>
              </span>
              <span style={{ color: 'var(--text-primary)' }}>
                <strong>{(followersCount || 0).toLocaleString()}</strong> <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>Followers</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
         COMPACT AUDIT PANEL (REICHWEITE, ENGAGEMENT & AKTIVITÄT)
         ════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
        
        {/* Box 1: Reichweite & Follower Ratio */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={15} color="var(--accent-blue)" />
              <span>Follower-Ratio &amp; Engagement</span>
            </span>
            <strong style={{ fontSize: '0.82rem', color: Number(followerRatio) >= 1 ? 'var(--keep-green)' : 'var(--unfollow-red)' }}>
              Ratio: {followerRatio}x
            </strong>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ flex: 1, background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', padding: '6px 8px', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>{followersCount.toLocaleString()}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Follower</div>
            </div>
            <div style={{ flex: 1, background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', padding: '6px 8px', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalPostLikes}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Post Likes</div>
            </div>
            <div style={{ flex: 1, background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', padding: '6px 8px', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalPostRetweets}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Retweets</div>
            </div>
          </div>
        </div>

        {/* Box 2: Account Aktivität & Status */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={15} color="var(--gold-accent)" />
              <span>Account Aktivität &amp; Status</span>
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Letzter Beitrag: <strong style={{ color: 'var(--text-primary)' }}>{safeLastActive}</strong>
            </span>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            {isInactive ? (
              <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: 'rgba(244, 33, 46, 0.08)', border: '1px solid rgba(244, 33, 46, 0.25)', borderRadius: '6px', color: 'var(--unfollow-red)', fontSize: '0.78rem', fontWeight: 600 }}>
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                <span>Inaktiv (&gt;1 Monat) – Entfolgen empfohlen</span>
              </div>
            ) : (
              <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '6px', color: '#10B981', fontSize: '0.78rem', fontWeight: 600 }}>
                <ShieldCheck size={14} style={{ flexShrink: 0 }} />
                <span>Aktiver Creator auf X (kürzlich gepostet)</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ════════════════════════════════════════════════════════════════
         RECENT TWEETS / LETZTE BEITRÄGE (MAIN POSTS & QUOTE TWEETS ONLY)
         ════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="detail-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 12px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} color="var(--accent-blue)" />
            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Letzte 3 Posts
            </h4>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {onManualFetchTweet && (
              <button
                onClick={() => onManualFetchTweet(handle, account.id)}
                disabled={isRefreshing}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  padding: '4px 10px',
                  background: 'rgba(29, 155, 240, 0.1)',
                  color: 'var(--accent-blue)',
                  border: '1px solid rgba(29, 155, 240, 0.3)',
                  borderRadius: '6px',
                  fontWeight: 700,
                  cursor: isRefreshing ? 'wait' : 'pointer'
                }}
                title="Erneut von X.com abrufen (force=true)"
              >
                <Loader2 size={12} className={isRefreshing ? 'spin' : ''} />
                <span>{isRefreshing ? 'Lade...' : 'Neu laden'}</span>
              </button>
            )}
            <a
              href={`https://x.com/${handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="external-link-btn"
              style={{ fontSize: '0.76rem', textDecoration: 'none', color: 'var(--accent-blue)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
            >
              <span>Auf x.com ansehen</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        <div className="tweets-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {isLoadingTweets ? (
            <div className="tweet-loading-box" style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', padding: '24px', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Loader2 size={24} className="spin" style={{ margin: '0 auto 8px auto', display: 'block', color: 'var(--accent-blue)' }} />
              <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Lade Live-Aktivitäten von @{handle}...</span>
            </div>
          ) : (!currentTweets || currentTweets.length === 0) ? (
            <div className="tweet-empty-box" style={{ background: 'var(--bg-card-hover)', border: '1px dashed var(--border-strong)', padding: '24px', borderRadius: 'var(--radius-md)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', margin: 0, lineHeight: 1.45 }}>
                Keine eigenen Posts von <strong>@{handle}</strong> gefunden.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {onManualFetchTweet && (
                  <button
                    onClick={() => onManualFetchTweet(handle, account.id)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', padding: '6px 14px', background: 'rgba(29, 155, 240, 0.1)', color: 'var(--accent-blue)', border: '1px solid rgba(29, 155, 240, 0.3)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Loader2 size={13} />
                    <span>Tweets neu laden</span>
                  </button>
                )}
                <a
                  href={`https://x.com/${handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', textDecoration: 'none', padding: '6px 14px', background: 'var(--bg-card-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}
                >
                  <ExternalLink size={13} />
                  <span>Profil auf x.com öffnen</span>
                </a>
              </div>
            </div>
          ) : (
            currentTweets.map((tw, index) => (
              <div key={tw.id || index} className="tweet-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '14px 16px', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="tweet-author-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src={avatar} alt={name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>{name}</strong>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>@{handle}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {tw.isQuote && (
                      <span style={{ color: 'var(--accent-blue)', fontSize: '0.72rem', background: 'rgba(29, 155, 240, 0.1)', border: '1px solid rgba(29, 155, 240, 0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                        Zitat-Tweet
                      </span>
                    )}
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      {tw.createdAt}
                    </span>
                  </div>
                </div>

                <p className="tweet-text" style={{ fontSize: '0.92rem', lineHeight: 1.45, color: 'var(--text-primary)', marginBottom: '10px', whiteSpace: 'pre-wrap', fontWeight: 450 }}>
                  {tw.text}
                </p>

                {tw.image && (
                  <img src={tw.image} alt="Tweet Attachment" className="tweet-media" style={{ borderRadius: '8px', maxWidth: '100%', maxHeight: '220px', objectFit: 'cover', marginBottom: '10px', border: '1px solid var(--border-color)' }} />
                )}

                <div className="tweet-footer" style={{ display: 'flex', gap: '20px', color: 'var(--text-secondary)', fontSize: '0.78rem', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
                  <span className="tweet-action-item" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MessageCircle size={14} />
                    <span>{tw.replies || 0}</span>
                  </span>
                  <span className="tweet-action-item" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Repeat size={14} />
                    <span>{tw.retweets || 0}</span>
                  </span>
                  <span className="tweet-action-item" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Heart size={14} color="var(--unfollow-red)" />
                    <span>{tw.likes || 0}</span>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}


