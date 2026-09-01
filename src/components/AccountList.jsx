import React, { useEffect, useRef } from 'react';
import { Search, AlertCircle } from 'lucide-react';

export default function AccountList({
  accounts,
  selectedIndex,
  onSelectIndex,
  onSelectAccount,
  searchTerm,
  onSearchChange,
  activeFilter,
  onFilterChange,
  sessionStats
}) {
  const handleSelect = onSelectIndex || onSelectAccount;
  const listRef = useRef(null);

  useEffect(() => {
    const root = listRef.current;
    if (!root) return;
    const active = root.querySelector('.account-item.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const unfollowedN = sessionStats?.unfollowed ?? accounts.filter((a) => a.reviewStatus === 'unfollowed' || !a.isFollowing).length;
  const keptN = sessionStats?.kept ?? accounts.filter((a) => a.reviewStatus === 'kept').length;
  const pendingN = Math.max(0, (sessionStats?.total ?? accounts.length) - unfollowedN - keptN);

  const filters = [
    { id: 'pending', label: 'Offen' },
    { id: 'all', label: 'Alle' },
    { id: 'no_follow_back', label: 'Kein Follow-Back' },
    { id: 'inactive', label: 'Inaktiv' },
    { id: 'kept', label: 'Behalten' },
    { id: 'unfollowed', label: 'Entfolgt' }
  ];

  return (
    <aside className="sidebar-list">
      <div className="sidebar-header">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search handle, name, bio..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="filter-tabs">
          {filters.map((f) => (
            <button
              key={f.id}
              className={`filter-chip ${activeFilter === f.id ? 'active' : ''}`}
              onClick={() => onFilterChange(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="list-session-status">
          <span className="list-stat danger">{unfollowedN} entfolgt</span>
          <span className="list-stat keep">{keptN} behalten</span>
          <span className="list-stat">{pendingN} offen</span>
        </div>
      </div>

      <div className="accounts-scroll" ref={listRef}>
        {accounts.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <AlertCircle size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <p style={{ fontSize: '0.9rem' }}>No accounts match your filter.</p>
          </div>
        ) : (
          accounts.map((acc, index) => {
            if (!acc) return null;
            const isSelected = index === selectedIndex;
            const accName = acc.name || acc.handle || 'Unbekannt';
            const accHandle = acc.handle || 'user';
            const accAvatar = acc.avatar || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png';

            return (
              <div
                key={acc.id || accHandle || index}
                className={`account-item ${isSelected ? 'active' : ''} ${acc.reviewStatus === 'unfollowed' || !acc.isFollowing ? 'unfollowed' : ''} ${acc.reviewStatus === 'kept' ? 'kept' : ''}`}
                onClick={() => handleSelect && handleSelect(index)}
              >
                <div className="account-avatar-wrapper">
                  <img src={accAvatar} alt={accName} className="account-avatar" />
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: 'var(--accent-blue)',
                        border: '2px solid var(--bg-dark)'
                      }}
                    />
                  )}
                </div>

                <div className="account-info">
                  <div className="account-name-row">
                    <span className="account-name">{accName}</span>
                    {acc.verified && (
                      <span style={{ fontSize: '0.75rem', color: acc.verifiedType === 'gold' ? 'var(--gold-check)' : 'var(--accent-blue)' }}>
                        ✓
                      </span>
                    )}
                  </div>
                  <span className="account-handle">@{accHandle}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  {acc.reviewStatus === 'unfollowed' || !acc.isFollowing ? (
                    <span className="status-badge badge-unfollowed">Entfolgt</span>
                  ) : acc.reviewStatus === 'kept' ? (
                    <span className="status-badge badge-kept">Behalten</span>
                  ) : acc.followsYou ? (
                    <span className="status-badge badge-follows-you">Mutual</span>
                  ) : (
                    <span className="status-badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                      Offen
                    </span>
                  )}
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    #{index + 1}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
