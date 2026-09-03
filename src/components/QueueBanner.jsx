import React, { useState, useMemo } from 'react';
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Play, 
  Pause, 
  Copy, 
  Trash2, 
  ListOrdered, 
  X, 
  Search, 
  ExternalLink,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { playTap } from '../utils/soundHaptics.js';

export default function QueueBanner({ 
  queueStatus, 
  bridgeLive, 
  onResumeQueue, 
  onPauseQueue, 
  onResetQueue, 
  onClearQueue, 
  onRemoveFromQueue, 
  onRequeueFailed, 
  onOpenStats,
  accounts = []
}) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [queueSearch, setQueueSearch] = useState('');

  const pending = queueStatus?.pending || [];
  const failed = queueStatus?.failed || [];
  const pendingCount = queueStatus?.pendingCount ?? 0;
  const completedCount = queueStatus?.completedCount ?? 0;
  const failedCount = queueStatus?.failedCount ?? 0;
  const isRateLimited = Boolean(queueStatus?.isRateLimited);
  const isPaused = Boolean(queueStatus?.isPaused);
  const resetInMs = queueStatus?.resetInMs ?? 0;

  // Map accounts to easily get avatars / names for queued items
  const accountMap = useMemo(() => {
    const map = new Map();
    (accounts || []).forEach(acc => {
      if (acc.handle) map.set(acc.handle.toLowerCase().replace(/^@/, ''), acc);
      if (acc.id) map.set(String(acc.id), acc);
    });
    return map;
  }, [accounts]);

  // Filtered queue for the modal
  const filteredQueue = useMemo(() => {
    if (!queueSearch.trim()) return pending;
    const query = queueSearch.toLowerCase().replace(/^@/, '').trim();
    return pending.filter(t => {
      const h = String(t.handle || '').toLowerCase();
      const mapped = accountMap.get(h);
      const n = mapped?.name ? mapped.name.toLowerCase() : '';
      return h.includes(query) || n.includes(query);
    });
  }, [pending, queueSearch, accountMap]);

  if (!queueStatus) return null;

  // Don't show banner if queue is completely empty
  if (pendingCount === 0 && failedCount === 0 && !isRateLimited) return null;

  const total = pendingCount + completedCount + failedCount;
  const progressPercent = total > 0 ? Math.min(100, Math.round((completedCount / total) * 100)) : 0;
  const currentTask = pending[0] || null;

  const generateRunnerScript = () => {
    const targetsPayload = pending.map(t => ({ handle: t.handle, userId: t.userId }));
    return `(async function executeCleanSweepAutoPilot() {
  if (window.__cleanSweepAutoPilotRunning) {
    alert("🤖 CleanSweep Auto-Pilot is already running!");
    return;
  }
  window.__cleanSweepAutoPilotRunning = true;

  let hud = document.getElementById("cleansweep-hud");
  if (!hud) {
    hud = document.createElement("div");
    hud.id = "cleansweep-hud";
    hud.style.cssText = "position:fixed;top:16px;right:16px;z-index:999999;background:#0f172a;color:#fff;padding:16px 20px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.5);font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;font-size:14px;border:1px solid #334155;min-width:320px;";
    document.body.appendChild(hud);
  }

  const updateHud = (statusText, statusColor = "#38bdf8") => {
    if (!hud) return;
    hud.innerHTML = \`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <span style="font-weight:700;color:#38bdf8;font-size:15px;">🤖 CleanSweep Auto-Pilot v3.0</span>
        <button id="cleansweep-stop-btn" style="background:#ef4444;color:#fff;border:none;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">Stop</button>
      </div>
      <div style="margin-bottom:6px;font-weight:500;color:\${statusColor};">\${statusText}</div>
      <div style="display:flex;gap:16px;font-size:12px;color:#94a3b8;border-top:1px solid #1e293b;padding-top:6px;margin-top:6px;">
        <span>✅ <b style="color:#f8fafc;">\${successCount}</b> unfollowed</span>
        <span>⏳ <b style="color:#f8fafc;">\${targets.length - currentIndex}</b> remaining</span>
      </div>
    \`;
    const stopBtn = document.getElementById("cleansweep-stop-btn");
    if (stopBtn) {
      stopBtn.onclick = () => {
        window.__cleanSweepAutoPilotRunning = false;
        if (hud) hud.remove();
        alert("🛑 Auto-Pilot stopped.");
      };
    }
  };

  console.log("🚀 CleanSweep X Auto-Pilot v3.0 started on x.com...");
  const targets = ${JSON.stringify(targetsPayload)};
  const ct0 = document.cookie.match(/ct0=([^;]+)/)?.[1] || "";
  if (!ct0) {
    alert("❌ Error: CSRF Token (ct0) not found. Please be logged in on x.com.");
    if (hud) hud.remove();
    return;
  }

  let successCount = 0;
  let failCount = 0;
  let currentIndex = 0;

  updateHud("🟢 Started... Initializing queue");

  while (currentIndex < targets.length && window.__cleanSweepAutoPilotRunning) {
    const task = targets[currentIndex];
    const normId = task.userId && /^\\d+$/.test(String(task.userId)) ? String(task.userId) : "";
    const normHandle = String(task.handle || "").replace(/^@/, "").trim();

    updateHud("⚡ Unfollowing @" + normHandle + " [" + (currentIndex + 1) + "/" + targets.length + "]", "#38bdf8");
    console.log("[" + (currentIndex + 1) + "/" + targets.length + "] Unfollowing @" + normHandle + "...");

    let isSuccess = false;
    let is429 = false;
    let errText = "";
    let resetSec = 0;

    try {
      const bodyPayload = (normId && normHandle)
        ? "user_id=" + encodeURIComponent(normId) + "&screen_name=" + encodeURIComponent(normHandle) + "&include_profile_interstitial_type=1"
        : (normId ? "user_id=" + encodeURIComponent(normId) + "&include_profile_interstitial_type=1" : "screen_name=" + encodeURIComponent(normHandle) + "&include_profile_interstitial_type=1");

      const unfollowRes = await fetch("https://x.com/i/api/1.1/friendships/destroy.json", {
        method: "POST",
        headers: {
          "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
          "content-type": "application/x-www-form-urlencoded",
          "x-csrf-token": ct0,
          "x-twitter-active-user": "yes",
          "x-twitter-auth-type": "OAuth2Session"
        },
        body: bodyPayload
      });

      const status = unfollowRes.status;
      const resJson = await unfollowRes.json().catch(() => null);
      const hasErr = Array.isArray(resJson?.errors) && resJson.errors.length > 0;
      errText = hasErr ? resJson.errors[0].message : "";

      const resetHeader = unfollowRes.headers.get("x-rate-limit-reset");
      if (resetHeader) resetSec = parseInt(resetHeader, 10);

      if (status === 429 || /rate limit/i.test(errText)) {
        is429 = true;
      } else if (unfollowRes.ok) {
        isSuccess = true;
      }
    } catch (e) {
      errText = e.message;
    }

    if (isSuccess) {
      successCount++;
      currentIndex++;
      console.log("  ✅ [" + currentIndex + "] @" + normHandle + " UNFOLLOWED! (" + successCount + " total)");
      await new Promise(r => setTimeout(r, 2200 + Math.random() * 1200));
    } else if (is429) {
      failCount++;
      const nowSec = Math.floor(Date.now() / 1000);
      let waitSeconds = (resetSec && resetSec > nowSec) ? (resetSec - nowSec + 15) : 900;
      if (waitSeconds < 60) waitSeconds = 900;

      console.warn("⚠️ X.com Rate Limit (429) reached. Auto-Pilot waiting for " + Math.ceil(waitSeconds / 60) + " minutes...");

      while (waitSeconds > 0 && window.__cleanSweepAutoPilotRunning) {
        const m = Math.floor(waitSeconds / 60);
        const s = waitSeconds % 60;
        const timeStr = (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
        updateHud("🟡 Rate Limit! Auto-Resume in " + timeStr, "#f59e0b");
        await new Promise(r => setTimeout(r, 1000));
        waitSeconds--;
      }

      if (window.__cleanSweepAutoPilotRunning) {
        console.log("🔄 Cooldown complete! Resuming...");
        updateHud("🔄 Rate Limit cleared! Resuming...", "#10b981");
        await new Promise(r => setTimeout(r, 3000));
      }
    } else {
      failCount++;
      console.warn("  ❌ [" + (currentIndex + 1) + "] @" + normHandle + " failed:", errText || ("HTTP " + status));
      currentIndex++;
      await new Promise(r => setTimeout(r, 2200 + Math.random() * 1200));
    }
  }

  if (hud) hud.remove();
  window.__cleanSweepAutoPilotRunning = false;
  console.log("🎉 AUTO-PILOT FINISHED! Successfully unfollowed: " + successCount);
  alert("🎉 CLEANSSWEEP AUTO-PILOT FINISHED!\\n\\n" + successCount + " accounts successfully unfollowed.");
})();`;
  };

  const handleCopyRunnerScript = async () => {
    try {
      const script = generateRunnerScript();
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      setIsScriptModalOpen(true);
    } catch (e) {
      alert('Copy failed: ' + e.message);
    }
  };

  const handleClearConfirm = () => {
    if (window.confirm(t('queueBanner.confirmClearQueue', { count: pendingCount }))) {
      if (onClearQueue) onClearQueue();
      setIsQueueModalOpen(false);
    }
  };

  return (
    <>
      <div 
        className={`queue-banner ${isRateLimited ? 'rate-limited' : ''} ${isPaused ? 'paused' : ''}`}
      >
        {/* Left: Status Badge & Text Information */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '260px', flex: '1 1 auto' }}>
          {/* Status Icon Indicator */}
          <div className={`queue-status-icon-wrap ${isRateLimited ? 'rate-limited' : ''} ${isPaused ? 'paused' : ''}`}>
            {isRateLimited ? (
              <AlertTriangle size={16} />
            ) : isPaused ? (
              <Pause size={16} />
            ) : (
              <RefreshCw size={14} className="spin-slow" />
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {/* Main status heading */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700 }}>
              {isRateLimited ? (
                <span style={{ color: 'var(--unfollow-red)' }}>
                  {t('queueBanner.rateLimitActive', { seconds: Math.max(1, Math.round(resetInMs / 1000)) })}
                </span>
              ) : isPaused ? (
                <span style={{ color: 'var(--gold-accent)' }}>
                  {t('queueBanner.queuePaused')}
                </span>
              ) : currentTask ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--accent-blue)' }}>{t('queueBanner.liveUnfollowActive', { handle: currentTask.handle })}</span>
                </span>
              ) : (
                <span>{t('queueBanner.liveQueueProcessing')}</span>
              )}
            </div>

            {/* Sub-text: Counters and badges */}
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontWeight: 600 }}>
                {t('queueBanner.progressText', { completed: completedCount, total, percent: progressPercent })}
              </span>

              {/* Clickable pending badge that opens modal */}
              {pendingCount > 0 && (
                <button
                  onClick={() => {
                    playTap();
                    setIsQueueModalOpen(true);
                  }}
                  className="banner-btn"
                  style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                  title={t('queueBanner.viewQueueTooltip', { count: pendingCount })}
                >
                  <ListOrdered size={11} />
                  <span>{t('queueBanner.remainingText', { count: pendingCount })}</span>
                </button>
              )}

              {/* Clickable failed badge to retry */}
              {failedCount > 0 && (
                <button
                  onClick={() => {
                    playTap();
                    onRequeueFailed && onRequeueFailed();
                  }}
                  className="banner-btn danger"
                  style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                  title={t('queueBanner.retryFailedTooltip', { count: failedCount })}
                >
                  <RotateCcw size={11} />
                  <span>{t('queueBanner.failedText', { count: failedCount })}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Center: Minimalist Linear / Apple Progress Bar */}
        <div style={{ flex: '1 1 200px', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            <span>{t('queueBanner.progressLabel')}</span>
            <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{progressPercent}%</span>
          </div>
          <div className="minimal-progress-track">
            <div 
              className={`minimal-progress-fill ${isRateLimited ? 'rate-limited' : ''} ${isPaused ? 'paused' : ''}`}
              style={{ width: `${progressPercent}%` }} 
            />
          </div>
        </div>

        {/* Right: User Controls & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* Pause / Resume Button */}
          {isPaused ? (
            <button
              onClick={() => {
                playTap();
                onResumeQueue && onResumeQueue();
              }}
              className="banner-btn success"
              title={t('queueBanner.resumeQueueTooltip')}
            >
              <Play size={11} fill="currentColor" />
              <span>{t('queueBanner.resumeQueueBtn')}</span>
            </button>
          ) : (
            onPauseQueue && (
              <button
                onClick={() => {
                  playTap();
                  onPauseQueue();
                }}
                className="banner-btn"
                title={t('queueBanner.pauseQueueTooltip')}
              >
                <Pause size={11} />
                <span>{t('queueBanner.pauseQueueBtn')}</span>
              </button>
            )
          )}

          {/* Trigger / Force Restart Button */}
          {isRateLimited ? (
            <button
              onClick={() => {
                playTap();
                onResumeQueue && onResumeQueue();
              }}
              className="banner-btn danger"
            >
              <Play size={11} fill="currentColor" />
              <span>{t('queueBanner.forceRestartBtn')}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                playTap();
                onResumeQueue && onResumeQueue();
              }}
              className="banner-btn primary"
              title={t('queueBanner.triggerQueueTooltip')}
            >
              <RefreshCw size={11} />
              <span>{t('queueBanner.triggerQueueBtn')}</span>
            </button>
          )}

          {/* View Queue Inspector Button */}
          <button
            onClick={() => {
              playTap();
              setIsQueueModalOpen(true);
            }}
            className="banner-btn"
            title={t('queueBanner.viewQueueTooltip', { count: pendingCount })}
          >
            <ListOrdered size={12} />
            <span>{t('queueBanner.viewQueueBtn', { count: pendingCount })}</span>
          </button>

          {/* Live Runner Script Button */}
          <button
            onClick={() => {
              playTap();
              handleCopyRunnerScript();
            }}
            className="banner-btn"
            title={t('queueBanner.copyRunnerTooltip')}
          >
            {copied ? <CheckCircle2 size={12} color="var(--keep-green)" /> : <Copy size={12} />}
            <span>{copied ? t('queueBanner.copiedBtn') : t('queueBanner.copyRunnerScriptBtn')}</span>
          </button>

          {/* Requeue All (Reset) Button */}
          {onResetQueue && (
            <button
              onClick={() => {
                playTap();
                onResetQueue();
              }}
              className="banner-btn"
              title={t('queueBanner.resetQueueTooltip')}
            >
              <RotateCcw size={11} />
              <span>{t('queueBanner.resetQueueBtn')}</span>
            </button>
          )}

          {/* Clear Queue Button */}
          {onClearQueue && pendingCount > 0 && (
            <button
              onClick={() => {
                playTap();
                handleClearConfirm();
              }}
              className="banner-btn danger"
              title={t('queueBanner.clearQueueTooltip')}
            >
              <Trash2 size={11} />
              <span>{t('queueBanner.clearQueueBtn')}</span>
            </button>
          )}

          {/* Session Details Link */}
          <button
            onClick={() => {
              playTap();
              onOpenStats && onOpenStats();
            }}
            className="banner-btn"
            style={{ border: 'none', background: 'transparent', boxShadow: 'none', textDecoration: 'underline' }}
          >
            {t('queueBanner.detailsBtn')}
          </button>
        </div>
      </div>

      {/* ─── QUEUE INSPECTOR MODAL ─────────────────────────────────────── */}
      {isQueueModalOpen && (
        <div 
          onClick={() => setIsQueueModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface-color, #1e293b)',
              border: '1px solid var(--border-color, #334155)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '82vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
              overflow: 'hidden',
              color: 'var(--text-primary, #ffffff)'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color, #334155)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  background: 'rgba(29, 155, 240, 0.15)',
                  padding: '6px',
                  borderRadius: '8px',
                  color: '#1D9BF0'
                }}>
                  <ListOrdered size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                    {t('queueBanner.queueModalTitle', { count: pendingCount })}
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary, #94a3b8)', marginTop: '2px' }}>
                    {completedCount} completed • {failedCount} failed
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsQueueModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  padding: '6px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary, #94a3b8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Search & Actions Bar */}
            <div style={{
              padding: '12px 20px',
              borderBottom: '1px solid var(--border-color, #334155)',
              display: 'flex',
              gap: '10px',
              alignItems: 'center'
            }}>
              <div style={{
                flex: 1,
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-secondary, #94a3b8)' }} />
                <input
                  type="text"
                  placeholder={t('queueBanner.queueModalSearch')}
                  value={queueSearch}
                  onChange={e => setQueueSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    borderRadius: '8px',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border-color, #334155)',
                    color: 'inherit',
                    fontSize: '0.82rem',
                    outline: 'none'
                  }}
                />
              </div>

              {pendingCount > 0 && onClearQueue && (
                <button
                  onClick={handleClearConfirm}
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#F87171',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Trash2 size={13} />
                  <span>{t('queueBanner.clearQueueBtn')}</span>
                </button>
              )}
            </div>

            {/* Queue Item List */}
            <div style={{
              padding: '10px 20px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {filteredQueue.length === 0 ? (
                <div style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  color: 'var(--text-secondary, #94a3b8)',
                  fontSize: '0.85rem'
                }}>
                  {queueSearch ? t('queueBanner.queueModalEmpty') : t('queueBanner.queueEmpty')}
                </div>
              ) : (
                filteredQueue.map((item, idx) => {
                  const normH = String(item.handle || '').replace(/^@/, '');
                  const accountInfo = accountMap.get(normH.toLowerCase());
                  const displayName = accountInfo?.name || `@${normH}`;
                  const avatar = accountInfo?.avatar || accountInfo?.profileImageUrl;

                  return (
                    <div
                      key={item.userId || item.handle || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.06)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)', width: '22px' }}>
                          #{idx + 1}
                        </span>
                        {avatar ? (
                          <img
                            src={avatar}
                            alt=""
                            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'rgba(29, 155, 240, 0.2)',
                            color: '#1D9BF0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.8rem'
                          }}>
                            {normH.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>
                            {displayName}
                          </span>
                          <a
                            href={`https://x.com/${normH}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontSize: '0.74rem',
                              color: 'var(--text-secondary, #94a3b8)',
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            @{normH} <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {onRemoveFromQueue && (
                          <button
                            onClick={() => onRemoveFromQueue(normH, item.userId)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: '#F87171',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 600
                            }}
                            title={t('queueBanner.removeFromQueueTooltip')}
                          >
                            <Trash2 size={12} />
                            <span>{t('queueBanner.removeBtn')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border-color, #334155)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0, 0, 0, 0.15)'
            }}>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary, #94a3b8)' }}>
                {t('queueBanner.itemsRemaining', { count: pendingCount })}
              </span>
              <button
                onClick={() => setIsQueueModalOpen(false)}
                style={{
                  background: 'var(--accent-blue, #1D9BF0)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '6px 16px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {t('queueBanner.closeBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── LIVE RUNNER SCRIPT MODAL ──────────────────────────────────── */}
      {isScriptModalOpen && (
        <div
          onClick={() => setIsScriptModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface-color, #1e293b)',
              border: '1px solid var(--border-color, #334155)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '540px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
              color: 'var(--text-primary, #ffffff)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'rgba(0, 186, 124, 0.2)', padding: '6px', borderRadius: '8px', color: '#00BA7C' }}>
                  <CheckCircle2 size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                  {t('queueBanner.scriptModalTitle')}
                </h3>
              </div>
              <button
                onClick={() => setIsScriptModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary, #94a3b8)' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.5 }}>
              {t('queueBanner.scriptModalDesc')}
            </p>

            {/* Steps */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.25)',
              padding: '14px 16px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '0.82rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ background: 'var(--accent-blue, #1D9BF0)', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, flexShrink: 0 }}>1</span>
                <span>{t('queueBanner.scriptModalStep1')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ background: 'var(--accent-blue, #1D9BF0)', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, flexShrink: 0 }}>2</span>
                <span>{t('queueBanner.scriptModalStep2')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ background: 'var(--accent-blue, #1D9BF0)', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, flexShrink: 0 }}>3</span>
                <span>{t('queueBanner.scriptModalStep3')}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                onClick={handleCopyRunnerScript}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-primary, #fff)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Copy size={13} />
                <span>{copied ? t('queueBanner.copiedBtn') : t('queueBanner.copyAgainBtn')}</span>
              </button>
              <button
                onClick={() => setIsScriptModalOpen(false)}
                style={{
                  background: 'var(--accent-blue, #1D9BF0)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                {t('queueBanner.scriptModalClose')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
