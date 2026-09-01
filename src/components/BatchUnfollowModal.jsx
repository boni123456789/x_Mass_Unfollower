import React, { useState } from 'react';
import { X, Zap, Play, Square, Copy, CheckCircle2 } from 'lucide-react';

export default function BatchUnfollowModal({
  isOpen,
  onClose,
  accounts,
  onBatchUnfollow
}) {
  const [targetCategory, setTargetCategory] = useState('no_follow_back'); // 'no_follow_back' | 'inactive' | 'spam'
  const [delayMs, setDelayMs] = useState(800);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [logs, setLogs] = useState([]);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  if (!isOpen) return null;

  // Filter eligible accounts based on selected category
  const eligibleAccounts = accounts.filter(acc => {
    if (!acc.isFollowing) return false;
    const lastActive = acc.lastActive || '';
    if (targetCategory === 'no_follow_back') return !acc.followsYou;
    if (targetCategory === 'inactive') return lastActive.includes('month') || lastActive.includes('year') || lastActive.includes('Monat') || lastActive.includes('Jahr');
    if (targetCategory === 'spam') return acc.category === 'Spam & Inactive' || (acc.followersCount || 0) < 50;
    return false;
  });

  const handleStartBatch = () => {
    if (eligibleAccounts.length === 0) return;
    setIsRunning(true);
    setProgress(0);
    setProcessedCount(0);
    setLogs([`⚡ Batch Unfollow gestartet für ${eligibleAccounts.length} Accounts...`]);

    let idx = 0;
    const idsToUnfollow = [];

    const interval = setInterval(() => {
      if (idx >= eligibleAccounts.length) {
        clearInterval(interval);
        setIsRunning(false);
        onBatchUnfollow(idsToUnfollow);
        setLogs(prev => [...prev, `✅ Batch Unfollow abgeschlossen! ${idsToUnfollow.length} Accounts entfolgt.`]);
        return;
      }

      const acc = eligibleAccounts[idx];
      idsToUnfollow.push(acc.id);
      idx++;

      setProcessedCount(idx);
      setProgress(Math.round((idx / eligibleAccounts.length) * 100));
      setLogs(prev => [...prev.slice(-8), `Lokaler Status geändert: @${acc.handle} (${acc.name})`]);
    }, delayMs);
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
    try {
      console.log("[" + (i+1) + "/" + targets.length + "] Entfolge @" + item.handle + "...");
      const bodyStr = "screen_name=" + encodeURIComponent(item.handle) + (item.id && !item.id.startsWith("acc_") ? "&user_id=" + encodeURIComponent(item.id) : "");
      const res = await fetch("https://x.com/i/api/1.1/friendships/destroy.json", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "x-csrf-token": ct0,
          "x-twitter-active-user": "yes",
          "x-twitter-auth-type": "OAuth2Session"
        },
        body: bodyStr
      });

      if (res.ok) {
        successCount++;
        console.log("  ✅ @" + item.handle + " erfolgreich entfolgt!");
      } else {
        console.log("  ❌ Fehler bei @" + item.handle + ": Status " + res.status);
      }
    } catch (e) {
      console.log("  ❌ Fehler:", e.message);
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
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Mass Unfollow (Live-Cleaning)</h2>
          </div>
          {!isRunning && (
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          )}
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Wähle deine Zielgruppe. Du kannst die Liste entweder lokal bereinigen oder mit 1 Klick ein **Live Unfollow-Skript** kopieren, das die Accounts direkt auf x.com entfolgt.
        </p>

        {/* Target Rule Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            ZIELGRUPPE WÄHLEN:
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--bg-card-hover)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', cursor: isRunning ? 'default' : 'pointer' }}>
              <input
                type="radio"
                name="category"
                checked={targetCategory === 'no_follow_back'}
                onChange={() => setTargetCategory('no_follow_back')}
                disabled={isRunning}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <strong style={{ fontSize: '0.9rem' }}>Accounts, die dir nicht zurückfolgen</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Nur Nicht-Mutuals entfolgen
                </span>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--bg-card-hover)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', cursor: isRunning ? 'default' : 'pointer' }}>
              <input
                type="radio"
                name="category"
                checked={targetCategory === 'inactive'}
                onChange={() => setTargetCategory('inactive')}
                disabled={isRunning}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <strong style={{ fontSize: '0.9rem' }}>Inaktive Accounts (&gt;3 Monate)</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Accounts entfolgen, die lange nichts gepostet haben
                </span>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--bg-card-hover)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', cursor: isRunning ? 'default' : 'pointer' }}>
              <input
                type="radio"
                name="category"
                checked={targetCategory === 'spam'}
                onChange={() => setTargetCategory('spam')}
                disabled={isRunning}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <strong style={{ fontSize: '0.9rem' }}>Spam / Bot Accounts</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Promotional Bots & Inaktive Low-Follower Profile entfolgen
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Speed / Delay Setting */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sicherheits-Verzögerung (Delay):</span>
          <select
            value={delayMs}
            onChange={(e) => setDelayMs(Number(e.target.value))}
            disabled={isRunning}
            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', padding: '4px 10px', borderRadius: '6px' }}
          >
            <option value={400}>Schnell (400ms Delay)</option>
            <option value={800}>Empfohlen (800ms Delay)</option>
            <option value={1500}>Stealth (1.5s Delay)</option>
          </select>
        </div>

        {/* Progress & Live Terminal Log */}
        {isRunning && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span>Fortschritt: {processedCount} / {eligibleAccounts.length}</span>
              <strong>{progress}%</strong>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <div style={{ background: '#0a0a0c', padding: '12px', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--keep-green)', height: '110px', overflowY: 'auto' }}>
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Bereite Profile: <strong style={{ color: 'var(--unfollow-red)' }}>{eligibleAccounts.length}</strong>
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            {!isRunning && (
              <button
                className="btn-secondary"
                onClick={handleCopyUnfollowScript}
                disabled={eligibleAccounts.length === 0}
                style={{ background: 'rgba(255, 215, 0, 0.15)', color: '#FFD700', borderColor: 'rgba(255, 215, 0, 0.4)', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {copiedSuccess ? <CheckCircle2 size={16} color="var(--keep-green)" /> : <Copy size={16} />}
                <span>{copiedSuccess ? 'Kopiert!' : '📋 Live Unfollow-Skript kopieren'}</span>
              </button>
            )}
            <button
              className="btn-primary"
              onClick={handleStartBatch}
              disabled={isRunning || eligibleAccounts.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: isRunning ? 'var(--unfollow-red)' : 'var(--accent-blue)' }}
            >
              {isRunning ? (
                <>
                  <Square size={16} />
                  <span>Bereinige...</span>
                </>
              ) : (
                <>
                  <Play size={16} />
                  <span>Lokal entfolgen ({eligibleAccounts.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
