import React, { useState } from 'react';
import { X, Zap, Play, Square, Copy, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { isInactiveAccount, isNoFollowBack } from '../utils/filterUtils.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function BatchUnfollowModal({
  isOpen,
  onClose,
  accounts,
  onBatchUnfollow,
  onUnfollowBatch
}) {
  const { t } = useLanguage();
  const [selectedCategories, setSelectedCategories] = useState(['no_follow_back']); // Array of selected category ids
  const [delayMs, setDelayMs] = useState(800);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [logs, setLogs] = useState([]);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  if (!isOpen) return null;

  const toggleCategory = (cat) => {
    if (selectedCategories.includes(cat)) {
      if (selectedCategories.length === 1) return;
      setSelectedCategories((prev) => prev.filter((c) => c !== cat));
    } else {
      setSelectedCategories((prev) => [...prev, cat]);
    }
  };

  // Filter eligible accounts based on selected categories (Logical AND)
  const eligibleAccounts = accounts.filter(acc => {
    if (!acc.isFollowing) return false;
    if (selectedCategories.length === 0) return false;

    if (selectedCategories.includes('no_follow_back') && !isNoFollowBack(acc)) return false;

    if (selectedCategories.includes('inactive') && !isInactiveAccount(acc)) return false;

    if (selectedCategories.includes('spam')) {
      const isSpam = acc.category === 'Spam & Inactive' || (acc.followersCount || 0) < 50;
      if (!isSpam) return false;
    }

    return true;
  });

  const handleStartBatch = () => {
    if (eligibleAccounts.length === 0) return;
    const itemsToUnfollow = eligibleAccounts.map((a) => ({ id: a.id, handle: a.handle }));
    
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    const batchFn = onBatchUnfollow || onUnfollowBatch;
    if (typeof batchFn === 'function') {
      batchFn(itemsToUnfollow);
    }
    setSuccessMessage(t('batchModal.successMsg', { count: itemsToUnfollow.length }));
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1300);
  };

  const handleCopyUnfollowScript = async () => {
    const targets = eligibleAccounts.map(a => ({ id: a.id, handle: a.handle })).filter(a => a.handle);

    const scriptText = `(async function executeUnfollowBatch() {
  const targets = ${JSON.stringify(targets)};
  console.log("🚀 CleanSweep X: Starte automatisches Entfolgen von " + targets.length + " Accounts auf x.com...");
  
  const getCsrf = () => document.cookie.match(/ct0=([^;]+)/)?.[1] || "";
  const ct0 = getCsrf();
  if (!ct0) {
    alert("❌ Fehler: CSRF-Token (ct0) nicht gefunden. Bitte auf x.com eingeloggt bleiben.");
    return;
  }

  let successCount = 0;
  for (let i = 0; i < targets.length; i++) {
    const item = targets[i];
    const normId = item.id && /^\\d+$/.test(String(item.id)) ? String(item.id) : "";
    const normHandle = String(item.handle || "").replace(/^@/, "").trim();

    let isSuccess = false;
    try {
      console.log("[" + (i+1) + "/" + targets.length + "] Entfolge @" + normHandle + "...");
      const bodyStr = (normId && normHandle)
        ? "user_id=" + encodeURIComponent(normId) + "&screen_name=" + encodeURIComponent(normHandle) + "&include_profile_interstitial_type=1"
        : (normId ? "user_id=" + encodeURIComponent(normId) + "&include_profile_interstitial_type=1" : "screen_name=" + encodeURIComponent(normHandle) + "&include_profile_interstitial_type=1");

      const res = await fetch("https://x.com/i/api/1.1/friendships/destroy.json", {
        method: "POST",
        headers: {
          "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
          "content-type": "application/x-www-form-urlencoded",
          "x-csrf-token": ct0,
          "x-twitter-active-user": "yes",
          "x-twitter-auth-type": "OAuth2Session"
        },
        body: bodyStr
      });

      const data = await res.json().catch(() => null);
      const hasErr = Array.isArray(data?.errors) && data.errors.length > 0;
      if (res.ok && data && !hasErr && data.following === false) {
        isSuccess = true;
      }
    } catch (e) {}

    if (!isSuccess && normId) {
      try {
        const gqlRes = await fetch("https://x.com/i/api/graphql/2p1D3x6R-0a5uXzQ6G0V9w/UnfollowUser", {
          method: "POST",
          headers: {
            "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
            "content-type": "application/json",
            "x-csrf-token": ct0,
            "x-twitter-active-user": "yes",
            "x-twitter-auth-type": "OAuth2Session"
          },
          body: JSON.stringify({ variables: { target_user_id: normId }, queryId: "2p1D3x6R-0a5uXzQ6G0V9w" })
        });
        const gqlData = await gqlRes.json().catch(() => null);
        const hasGqlErr = Array.isArray(gqlData?.errors) && gqlData.errors.length > 0;
        if (gqlRes.ok && gqlData && !hasGqlErr && gqlData.data) {
          isSuccess = true;
        }
      } catch (e) {}
    }

    if (isSuccess) {
      successCount++;
      console.log("  ✅ @" + normHandle + " erfolgreich entfolgt (verifiziert)!");
    } else {
      console.log("  ❌ Entfolgen von @" + normHandle + " fehlgeschlagen/nicht verifiziert.");
    }
    await new Promise(r => setTimeout(r, 800 + Math.random() * 400));
  }

  alert("🎉 BATCH-ENTFOLGEN ABGESCHLOSSEN!\n\n" + successCount + " von " + targets.length + " Accounts erfolgreich auf X.com entfolgt.");
})();`;

    try {
      await navigator.clipboard.writeText(scriptText);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 3000);
      alert(
        '📋 UNFOLLOW-SKRIPT IN DIE ZWISCHENABLAGE KOPIERT!\n\n' +
        'Target Accounts: ' + targets.length + ' Profile\n\n' +
        'Anleitung:\n' +
        '1. Gehe zu deinem geöffneten x.com Tab\n' +
        '2. Öffne F12 → Konsole\n' +
        '3. Füge das Skript ein & drücke Enter\n' +
        '4. Die Accounts werden live auf X entfolgt!'
      );
    } catch (e) {
      alert('Kopieren fehlgeschlagen: ' + e.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={isRunning ? undefined : onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={22} color="#FFD700" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{t('batchModal.title')}</h2>
          </div>
          {!isRunning && (
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          )}
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {t('batchModal.desc')}
        </p>

        {/* Target Rule Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {t('batchModal.criteriaTitle')}
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              background: selectedCategories.includes('no_follow_back') ? 'rgba(29, 155, 240, 0.12)' : 'var(--bg-card-hover)',
              border: selectedCategories.includes('no_follow_back') ? '1px solid #1D9BF0' : '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              cursor: isRunning ? 'default' : 'pointer',
              transition: 'all 0.2s'
            }}>
              <input
                type="checkbox"
                checked={selectedCategories.includes('no_follow_back')}
                onChange={() => toggleCategory('no_follow_back')}
                disabled={isRunning}
                style={{ width: '16px', height: '16px', accentColor: '#1D9BF0', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <strong style={{ fontSize: '0.9rem', color: selectedCategories.includes('no_follow_back') ? '#1D9BF0' : 'var(--text-primary)' }}>
                  {t('batchModal.ruleNoFollowBackTitle')}
                </strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {t('batchModal.ruleNoFollowBackDesc')}
                </span>
              </div>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              background: selectedCategories.includes('inactive') ? 'rgba(29, 155, 240, 0.12)' : 'var(--bg-card-hover)',
              border: selectedCategories.includes('inactive') ? '1px solid #1D9BF0' : '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              cursor: isRunning ? 'default' : 'pointer',
              transition: 'all 0.2s'
            }}>
              <input
                type="checkbox"
                checked={selectedCategories.includes('inactive')}
                onChange={() => toggleCategory('inactive')}
                disabled={isRunning}
                style={{ width: '16px', height: '16px', accentColor: '#1D9BF0', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <strong style={{ fontSize: '0.9rem', color: selectedCategories.includes('inactive') ? '#1D9BF0' : 'var(--text-primary)' }}>
                  {t('batchModal.ruleInactiveTitle')}
                </strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {t('batchModal.ruleInactiveDesc')}
                </span>
              </div>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              background: selectedCategories.includes('spam') ? 'rgba(29, 155, 240, 0.12)' : 'var(--bg-card-hover)',
              border: selectedCategories.includes('spam') ? '1px solid #1D9BF0' : '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              cursor: isRunning ? 'default' : 'pointer',
              transition: 'all 0.2s'
            }}>
              <input
                type="checkbox"
                checked={selectedCategories.includes('spam')}
                onChange={() => toggleCategory('spam')}
                disabled={isRunning}
                style={{ width: '16px', height: '16px', accentColor: '#1D9BF0', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <strong style={{ fontSize: '0.9rem', color: selectedCategories.includes('spam') ? '#1D9BF0' : 'var(--text-primary)' }}>
                  {t('batchModal.ruleSpamTitle')}
                </strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {t('batchModal.ruleSpamDesc')}
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Speed / Delay Setting */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('batchModal.delayLabel')}</span>
          <select
            value={delayMs}
            onChange={(e) => setDelayMs(Number(e.target.value))}
            disabled={isRunning}
            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', padding: '4px 10px', borderRadius: '6px' }}
          >
            <option value={400}>{t('batchModal.delayFast')}</option>
            <option value={800}>{t('batchModal.delayRecommended')}</option>
            <option value={1500}>{t('batchModal.delayStealth')}</option>
          </select>
        </div>

        {/* Instant Success Banner */}
        {successMessage && (
          <div style={{
            background: 'rgba(0, 186, 124, 0.15)',
            border: '1px solid var(--keep-green)',
            color: 'var(--keep-green)',
            padding: '12px 16px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.9rem',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '10px'
          }}>
            <CheckCircle2 size={18} color="var(--keep-green)" />
            <span>{successMessage}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {t('batchModal.readyProfiles')} <strong style={{ color: 'var(--unfollow-red)' }}>{eligibleAccounts.length}</strong>
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn-secondary"
              onClick={handleCopyUnfollowScript}
              disabled={eligibleAccounts.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {copiedSuccess ? <CheckCircle2 size={16} color="var(--keep-green)" /> : <Copy size={16} />}
              <span>{copiedSuccess ? t('batchModal.copiedBtn') : t('batchModal.copyLiveScriptBtn')}</span>
            </button>
            <button
              className="btn-primary"
              onClick={handleStartBatch}
              disabled={eligibleAccounts.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Zap size={16} />
              <span>{t('batchModal.queueUnfollowBtn', { count: eligibleAccounts.length })}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
