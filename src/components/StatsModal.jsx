import React from 'react';
import { X, Download, UserMinus, ShieldCheck, PieChart, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function StatsModal({
  isOpen,
  onClose,
  unfollowedAccounts,
  totalInitialFollowing
}) {
  if (!isOpen) return null;

  const handleConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(unfollowedAccounts, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `unfollowed_accounts_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,ID,Handle,Name,Bio,Followers,FollowsYou,LastActive\n";
    unfollowedAccounts.forEach(acc => {
      const row = [
        acc.id,
        acc.handle,
        `"${acc.name.replace(/"/g, '""')}"`,
        `"${(acc.bio || '').replace(/"/g, '""')}"`,
        acc.followersCount,
        acc.followsYou ? "Yes" : "No",
        `"${acc.lastActive}"`
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `unfollowed_accounts_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const unfollowedRatio = Math.round((unfollowedAccounts.length / totalInitialFollowing) * 100) || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PieChart size={22} color="var(--accent-blue)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Feed Audit & Session Summary</h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
          <div style={{ background: 'rgba(244, 33, 46, 0.08)', padding: '16px 12px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(244, 33, 46, 0.2)' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--unfollow-red)', fontFamily: 'var(--font-mono)' }}>
              {unfollowedAccounts.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '2px' }}>
              UNFOLLOWED
            </div>
          </div>

          <div style={{ background: 'rgba(29, 155, 240, 0.08)', padding: '16px 12px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(29, 155, 240, 0.2)' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>
              {unfollowedRatio}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '2px' }}>
              FEED CLEANED
            </div>
          </div>

          <div style={{ background: 'rgba(0, 186, 124, 0.08)', padding: '16px 12px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0, 186, 124, 0.2)' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--keep-green)', fontFamily: 'var(--font-mono)' }}>
              {totalInitialFollowing - unfollowedAccounts.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '2px' }}>
              KEPT FOLLOWING
            </div>
          </div>
        </div>

        {/* List preview of unfollowed accounts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              UNFOLLOWED ACCOUNTS AUDIT LOG ({unfollowedAccounts.length})
            </label>
            {unfollowedAccounts.length > 0 && (
              <button 
                onClick={handleConfetti} 
                style={{ background: 'transparent', border: 'none', color: '#FFD700', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Sparkles size={14} /> Celebrate Clean Feed!
              </button>
            )}
          </div>

          <div style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', maxHeight: '160px', overflowY: 'auto', padding: '8px' }}>
            {unfollowedAccounts.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: '0.85rem' }}>
                No accounts unfollowed yet in this session.
              </div>
            ) : (
              unfollowedAccounts.map(acc => (
                <div key={acc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderBottom: '1px solid var(--border-light)', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src={acc.avatar} alt={acc.name} style={{ width: 20, height: 20, borderRadius: '50%' }} />
                    <span style={{ fontWeight: 700 }}>{acc.name}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>@{acc.handle}</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--unfollow-red)' }}>Removed</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Export Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" onClick={handleExportCSV} disabled={unfollowedAccounts.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
              <Download size={14} />
              <span>Export CSV</span>
            </button>
            <button className="btn-secondary" onClick={handleExportJSON} disabled={unfollowedAccounts.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
              <Download size={14} />
              <span>Export JSON</span>
            </button>
          </div>
          <button className="btn-primary" onClick={onClose}>
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
