import React, { useEffect, useRef, useState } from 'react';
import {
  UserMinus, UserCheck, Calendar, MapPin,
  Heart, Repeat, MessageCircle, AlertTriangle, ShieldCheck,
  Activity, Clock, Sparkles, ExternalLink, Copy, Globe, Loader2,
  BadgeCheck
} from 'lucide-react';
import { collectUrlEntities, displayUrlLabel, expandUrlsInText, extractTcoCodes, splitTextAndUrls, tcoCode } from '../utils/expandUrls';
import { useLanguage } from '../i18n/LanguageContext.jsx';

function LinkifiedText({ text }) {
  return splitTextAndUrls(text).map((part, i) => {
    if (part.type !== 'url') return <React.Fragment key={i}>{part.value}</React.Fragment>;
    const href = /^https?:\/\//i.test(part.value) ? part.value : `https://${part.value}`;
    return (
      <a
        key={i}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'var(--accent-blue)', textDecoration: 'none', wordBreak: 'break-all' }}
      >
        {displayUrlLabel(href)}
      </a>
    );
  });
}

export default function AccountDetail({
  account,
  onUnfollow,
  onKeep,
  isPressedRed,
  isPressedGreen,
  tweetStore = {},
  onManualFetchTweet
}) {
  const { t, formatTime } = useLanguage();
  const detailScrollRef = useRef(null);
  const handle = account?.handle || 'user';
  const [tcoMap, setTcoMap] = useState({});

  useEffect(() => {
    if (detailScrollRef.current) detailScrollRef.current.scrollTop = 0;
  }, [handle]);

  useEffect(() => {
    const liveTweets = tweetStore[handle]?.tweets || [];
    const fallbackTweets = account?.tweets || [];
    const allTweets = liveTweets.length ? liveTweets : fallbackTweets;
    const text = [
      account?.bio || '',
      account?.website || '',
      ...allTweets.map((t) => t?.text || '')
    ].join(' ');
    const entityCodes = [
      ...collectUrlEntities(account?.entities),
      ...allTweets.flatMap((t) => collectUrlEntities(t?.entities))
    ].map((item) => tcoCode(item.url) || tcoCode(item.short_url)).filter(Boolean);
    const codes = [...new Set([...extractTcoCodes(text), ...entityCodes])];
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
  }, [handle, account?.bio, account?.website, account?.entities, account?.tweets, tweetStore]);

  if (!account) {
    return (
      <div className="workspace-detail" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: 'var(--text-secondary)' }}>{t('accountDetail.selectAccountPrompt')}</p>
      </div>
    );
  }

  const {
    name = t('common.unknown'),
    avatar = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png',
    banner = '',
    bio = '',
    followersCount = 0,
    followingCount = 0,
    joinedDate = '',
    location = '',
    website = '',
    entities = null,
    verified = false,
    verifiedType = '',
    followsYou = false,
    lastActive = t('common.unknown'),
    isFollowing = true,
    interactions = {},
    tweets = []
  } = account;

  const storeEntry = tweetStore[handle];
  const isRefreshing = !!storeEntry?.loading;
  const liveTweets = (storeEntry?.tweets || []).filter((t) => !t.isReply && !t.isRT);
  const fallbackTweets = (tweets || []).filter((t) => !t.isReply && !t.isRT);
  const expectingLive = typeof onManualFetchTweet === 'function';
  const isLoadingTweets = !!(
    isRefreshing
    || (expectingLive && liveTweets.length === 0 && !storeEntry?.fetched && !storeEntry?.error)
  );
  const sourceTweets = liveTweets.length > 0
    ? liveTweets
    : (isLoadingTweets ? [] : fallbackTweets);
  const currentTweets = sourceTweets.slice(0, 3);

  const safeLastActive = lastActive || t('common.unknown');
  const isInactive = safeLastActive.includes('month') || safeLastActive.includes('year') || safeLastActive.includes('Monat') || safeLastActive.includes('Jahr');

  // Calculate metrics
  const followerRatio = followingCount > 0 ? (followersCount / followingCount).toFixed(1) : (followersCount || 0);
  const totalPostLikes = currentTweets.reduce((sum, t) => sum + (t.likes || 0), 0);
  const totalPostRetweets = currentTweets.reduce((sum, t) => sum + (t.retweets || 0), 0);
  const expandedBio = expandUrlsInText(bio, entities, tcoMap);
  const expandedWebsite = expandUrlsInText(website, entities, tcoMap) || website;
  const websiteHref = expandedWebsite
    ? (/^https?:\/\//i.test(expandedWebsite) ? expandedWebsite : `https://${expandedWebsite}`)
    : '';
  const websiteLabel = displayUrlLabel(websiteHref);

  return (
    <div ref={detailScrollRef} className="workspace-detail" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', overflowY: 'auto', overflowAnchor: 'none', position: 'relative' }}>
      
      {/* Duolingo & Revolut Style Tactile Stamp */}
      {isPressedRed && (
        <div className="action-stamp unfollowed">
          ✕ {t('common.unfollowed')}
        </div>
      )}
      {isPressedGreen && (
        <div className="action-stamp kept">
          ✓ {t('common.kept')}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
         NATIVE X (TWITTER) PROFILE HERO
         ════════════════════════════════════════════════════════════════ */}
      <div key={handle} className="profile-hero card-anim-enter" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, boxShadow: 'var(--shadow-airbnb)' }}>
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
              onError={(e) => { e.target.src = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png'; }}
              style={{ width: 84, height: 84, borderRadius: '50%', border: '4px solid var(--bg-card)', objectFit: 'cover', background: 'var(--bg-card)' }} 
            />
            
            {/* Action Bar */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                className={`btn-unfollow ${isPressedRed ? 'active-key' : ''}`}
                onClick={() => onUnfollow && onUnfollow()}
                title={t('accountDetail.shortcutUnfollow')}
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              >
                <UserMinus size={16} />
                <span>{isFollowing ? t('common.unfollow') : t('common.reFollow')}</span>
                <span className="key-badge red" style={{ marginLeft: '4px', fontSize: '0.72rem' }}>← / U</span>
              </button>

              <button
                className={`btn-keep ${isPressedGreen ? 'active-key' : ''} ${isFollowing ? '' : 'is-kept'}`}
                onClick={() => onKeep && onKeep()}
                title={t('accountDetail.shortcutKeep')}
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              >
                <UserCheck size={16} />
                <span>{isFollowing ? t('common.keep') : t('common.next')}</span>
                <span className="key-badge green" style={{ marginLeft: '4px', fontSize: '0.72rem' }}>→ / K</span>
              </button>

              <button
                type="button"
                className="btn-tactile-neutral"
                onClick={async () => {
                  const code = `fetch("https://x.com/i/api/1.1/friendships/destroy.json", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "x-csrf-token": document.cookie.match(/ct0=([^;]+)/)[1], "x-twitter-active-user": "yes", "x-twitter-auth-type": "OAuth2Session" }, body: "screen_name=${encodeURIComponent(handle)}" }).then(r => r.ok ? alert("✅ @${handle} erfolgreich entfolgt!") : alert("❌ Fehler: Status " + r.status));`;
                  try {
                    await navigator.clipboard.writeText(code);
                    alert(t('accountDetail.oneClickCodeCopied', { handle }));
                  } catch (e) {
                    alert(t('accountDetail.oneClickCodeFailed'));
                  }
                }}
              >
                <Copy size={13} />
                <span>{t('accountDetail.oneClickCode')}</span>
              </button>

              <a
                href={`https://x.com/${handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-tactile-neutral"
              >
                <ExternalLink size={13} />
                <span>{t('accountDetail.openProfile')}</span>
              </a>
            </div>
          </div>

          {/* User Names & Handle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                {name}
                {verified && <BadgeCheck size={18} color="var(--accent-blue)" />}
              </h1>

              {/* Clean Minimalist Follow Pill */}
              {followsYou ? (
                <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--keep-green)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700 }}>
                  {t('accountDetail.followsYou')}
                </span>
              ) : (
                <span style={{ background: 'var(--bg-card-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 650 }}>
                  {t('accountDetail.notFollowsYou')}
                </span>
              )}
            </div>

            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              @{handle}
            </div>

            {/* Native X Bio */}
            {bio ? (
              <p style={{ fontSize: '0.92rem', lineHeight: 1.45, color: 'var(--text-primary)', margin: '4px 0 6px 0', whiteSpace: 'pre-wrap' }}>
                <LinkifiedText text={expandedBio} />
              </p>
            ) : (
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: '4px 0 6px 0' }}>
                {t('accountDetail.noBio')}
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
              {websiteHref && (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent-blue)', textDecoration: 'none', wordBreak: 'break-all' }}
                >
                  <Globe size={14} />
                  <span>{websiteLabel}</span>
                </a>
              )}
              {joinedDate && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={14} />
                  <span>{t('accountDetail.joined', { date: joinedDate })}</span>
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '18px', marginTop: '14px', fontSize: '0.9rem', fontWeight: 600 }}>
              <span style={{ color: 'var(--text-primary)' }}>
                <strong>{(followingCount || 0).toLocaleString()}</strong> <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>{t('common.following')}</span>
              </span>
              <span style={{ color: 'var(--text-primary)' }}>
                <strong>{(followersCount || 0).toLocaleString()}</strong> <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>{t('common.followers')}</span>
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
              <span>{t('accountDetail.followerRatioEngagement')}</span>
            </span>
            <strong style={{ fontSize: '0.82rem', color: Number(followerRatio) >= 1 ? 'var(--keep-green)' : 'var(--unfollow-red)' }}>
              {t('accountDetail.ratio', { ratio: followerRatio })}
            </strong>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ flex: 1, background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', padding: '6px 8px', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>{followersCount.toLocaleString()}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>{t('accountDetail.followerLabel')}</div>
            </div>
            <div style={{ flex: 1, background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', padding: '6px 8px', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalPostLikes}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>{t('accountDetail.postLikes')}</div>
            </div>
            <div style={{ flex: 1, background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', padding: '6px 8px', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalPostRetweets}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>{t('accountDetail.retweets')}</div>
            </div>
          </div>
        </div>

        {/* Box 2: Account Aktivität & Status */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={15} color="var(--gold-accent)" />
              <span>{t('accountDetail.accountActivityStatus')}</span>
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {t('accountDetail.lastPost', { time: formatTime(safeLastActive) })}
            </span>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            {isInactive ? (
              <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: 'rgba(244, 33, 46, 0.08)', border: '1px solid rgba(244, 33, 46, 0.25)', borderRadius: '6px', color: 'var(--unfollow-red)', fontSize: '0.78rem', fontWeight: 600 }}>
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                <span>{t('accountDetail.inactiveWarning')}</span>
              </div>
            ) : (
              <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '6px', color: '#10B981', fontSize: '0.78rem', fontWeight: 600 }}>
                <ShieldCheck size={14} style={{ flexShrink: 0 }} />
                <span>{t('accountDetail.activeCreator')}</span>
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
              {t('accountDetail.lastPostsTitle')}
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
                title={t('accountDetail.reloadFromXTitle')}
              >
                <Loader2 size={12} className={isRefreshing ? 'spin' : ''} />
                <span>{isRefreshing ? t('common.loading') : t('common.reload')}</span>
              </button>
            )}
            <a
              href={`https://x.com/${handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="external-link-btn"
              style={{ fontSize: '0.76rem', textDecoration: 'none', color: 'var(--accent-blue)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
            >
              <span>{t('accountDetail.viewOnX')}</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        <div className="tweets-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {isLoadingTweets ? (
            <div className="tweet-loading-box" style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', padding: '24px', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Loader2 size={24} className="spin" style={{ margin: '0 auto 8px auto', display: 'block', color: 'var(--accent-blue)' }} />
              <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{t('accountDetail.loadingLiveTweets', { handle })}</span>
            </div>
          ) : (!currentTweets || currentTweets.length === 0) ? (
            <div className="tweet-empty-box" style={{ background: 'var(--bg-card-hover)', border: storeEntry?.rateLimited ? '1px solid rgba(245, 158, 11, 0.4)' : '1px dashed var(--border-strong)', padding: '24px', borderRadius: 'var(--radius-md)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              {storeEntry?.rateLimited ? (
                <div style={{ color: '#F59E0B', fontSize: '0.85rem', textAlign: 'center', margin: 0, lineHeight: 1.45 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>{t('accountDetail.rateLimitTitle')}</div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {t('accountDetail.rateLimitDesc')}
                  </span>
                </div>
              ) : (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', margin: 0, lineHeight: 1.45 }}>
                  {t('accountDetail.noPostsFound', { handle })}
                  {account?.lastActivityNote && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px', opacity: 0.9 }}>
                      💡 {account.lastActivityNote}
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {onManualFetchTweet && (
                  <button
                    className="btn-tactile-neutral"
                    onClick={() => onManualFetchTweet(handle, account.id)}
                  >
                    <Loader2 size={13} />
                    <span>{t('accountDetail.reloadTweetsBtn')}</span>
                  </button>
                )}
                <a
                  href={`https://x.com/${handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', textDecoration: 'none', padding: '6px 14px', background: 'var(--bg-card-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}
                >
                  <ExternalLink size={13} />
                  <span>{t('accountDetail.openProfileXBtn')}</span>
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
                        {t('accountDetail.quoteTweet')}
                      </span>
                    )}
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      {formatTime(tw.createdAt)}
                    </span>
                  </div>
                </div>

                <p className="tweet-text" style={{ fontSize: '0.92rem', lineHeight: 1.45, color: 'var(--text-primary)', marginBottom: '10px', whiteSpace: 'pre-wrap', fontWeight: 450 }}>
                  <LinkifiedText text={expandUrlsInText(tw.text, tw.entities, tcoMap)} />
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


