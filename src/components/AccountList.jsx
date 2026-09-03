import React, { useEffect, useRef } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { playTap } from '../utils/soundHaptics.js';

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
  const { t } = useLanguage();
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
    { id: 'pending', label: t('accountList.filters.pending') },
    { id: 'all', label: t('accountList.filters.all') },
    { id: 'no_follow_back', label: t('accountList.filters.no_follow_back') },
    { id: 'inactive', label: t('accountList.filters.inactive') },
    { id: 'kept', label: t('accountList.filters.kept') },
    { id: 'unfollowed', label: t('accountList.filters.unfollowed') }
  ];

  const activeList = Array.isArray(activeFilter)
    ? activeFilter
    : [activeFilter || 'all'];

  const handleChipClick = (id) => {
    playTap();
    if (!onFilterChange) return;

    if (id === 'all') {
      onFilterChange(['all']);
      return;
    }

    let newList = activeList.filter((item) => item !== 'all');
    if (newList.includes(id)) {
      newList = newList.filter((item) => item !== id);
    } else {
      newList.push(id);
    }

    if (newList.length === 0) {
      newList = ['all'];
    }

    onFilterChange(newList);
  };

  return (
    <aside className="sidebar-list">
      <div className="sidebar-header">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder={t('accountList.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="filter-tabs">
          {filters.map((f) => {
            const isActive = f.id === 'all'
              ? activeList.includes('all') || activeList.length === 0
              : activeList.includes(f.id);
            return (
              <button
                key={f.id}
                className={`filter-chip ${isActive ? 'active' : ''}`}
                onClick={() => handleChipClick(f.id)}
                title={f.id === 'all' ? t('accountList.filterResetTitle') : t('accountList.filterToggleTitle', { label: f.label })}
              >
                {isActive && f.id !== 'all' && <span style={{ fontSize: '0.7rem' }}>✓</span>}
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="list-session-status">
          <span className="list-stat danger">{t('accountList.statUnfollowed', { count: unfollowedN })}</span>
          <span className="list-stat keep">{t('accountList.statKept', { count: keptN })}</span>
          <span className="list-stat">{t('accountList.statPending', { count: pendingN })}</span>
        </div>
      </div>

      <div className="accounts-scroll" ref={listRef}>
        {accounts.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <AlertCircle size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <p style={{ fontSize: '0.9rem' }}>{t('accountList.emptyMatch')}</p>
          </div>
        ) : (
          accounts.map((acc, index) => {
            if (!acc) return null;
            const isSelected = index === selectedIndex;
            const accName = acc.name || acc.handle || t('common.unknown');
            const accHandle = acc.handle || 'user';
            const accAvatar = acc.avatar || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png';

            const isUnfollowed = acc.reviewStatus === 'unfollowed' || acc.isFollowing === false;
            const isKept = acc.reviewStatus === 'kept';
            const statusKind = isUnfollowed ? 'unfollowed' : isKept ? 'kept' : acc.followsYou ? 'mutual' : 'pending';
            const statusLabel = isUnfollowed ? t('common.unfollowed') : isKept ? t('common.kept') : acc.followsYou ? t('common.mutual') : t('common.pending');

            return (
              <div
                key={acc.id || accHandle || index}
                className={`account-item ${isSelected ? 'active' : ''} ${isUnfollowed ? 'unfollowed' : ''} ${isKept ? 'kept' : ''}`}
                onClick={() => {
                  playTap();
                  handleSelect && handleSelect(index);
                }}
              >
                <span className={`list-status-pip ${statusKind}`} title={statusLabel} />
                <div className="account-avatar-wrapper">
                  <img 
                    src={accAvatar} 
                    alt={accName} 
                    className="account-avatar" 
                    onError={(e) => { e.target.src = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'; }}
                  />
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

                <div className="account-status-col">
                  <span className={`status-badge badge-${statusKind}`}>{statusLabel}</span>
                  <span className="account-index">#{index + 1}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
