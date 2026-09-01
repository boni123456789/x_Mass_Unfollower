import React from 'react';
import { Zap, LogOut, RefreshCw, Sun, Moon, Trash2 } from 'lucide-react';

export default function Navbar({
  user,
  isAppReady,
  unfollowedCount,
  keptCount = 0,
  totalAccounts,
  theme,
  onToggleTheme,
  onOpenLogin,
  onLogout,
  onClearCache,
  onOpenBatch,
  onOpenStats,
  bridgeLive = false
}) {
  return (
    <header className="navbar">
      <div className="nav-brand">
        <svg className="x-logo-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        <span className="brand-title">CleanSweep <span className="brand-x">X</span></span>
        <span className="brand-badge-mono">v2.4</span>
      </div>

      <div className="nav-actions">
        {/* Theme Switcher Toggle */}
        <button 
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          title={theme === 'clay-light' ? 'Zu Dark Mode wechseln' : 'Zu Clay Warm Light Mode wechseln'}
        >
          {theme === 'clay-light' ? <Moon size={15} /> : <Sun size={15} color="#F59E0B" />}
          <span className="theme-toggle-label">{theme === 'clay-light' ? 'Dunkel' : 'Hell'}</span>
        </button>

        {/* Session Stats Pill - Only show live counts when active workspace is ready */}
        <div
          className="nav-stats-pill"
          title={bridgeLive ? 'Live-Bridge aktiv (x.com Session)' : 'Extension neu laden (v1.3.0) und x.com-Tab offen lassen'}
          style={{ cursor: 'default' }}
        >
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: bridgeLive ? 'var(--keep-green)' : 'var(--unfollow-red)',
            display: 'inline-block'
          }} />
          <span className="stat-label">{bridgeLive ? 'Live' : 'Offline'}</span>
        </div>

        {isAppReady && (
          <div 
            onClick={onOpenStats}
            className="nav-stats-pill"
            title="Session Statistiken"
          >
            <div className="stat-item">
              <span className="stat-label">Entfolgt:</span>
              <span className="stat-val danger">{unfollowedCount}</span>
            </div>
            <span className="stat-divider">/</span>
            <div className="stat-item">
              <span className="stat-label">Behalten:</span>
              <span className="stat-val keep">{keptCount}</span>
            </div>
            <span className="stat-divider">/</span>
            <div className="stat-item">
              <span className="stat-label">Gesamt:</span>
              <span className="stat-val">{totalAccounts}</span>
            </div>
          </div>
        )}

        {/* Batch Unfollow Button */}
        {isAppReady && (
          <button className="nav-btn-secondary" onClick={onOpenBatch}>
            <Zap size={14} color="#F59E0B" />
            <span>Auto-Clean</span>
          </button>
        )}

        {/* User Account / Login Button */}
        {user ? (
          <div className="nav-user-box">
            <img 
              src={user.avatar} 
              alt={user.name} 
              className="user-avatar"
              onError={(e) => { e.target.src = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'; }}
            />
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-handle">@{user.handle}</span>
            </div>
            <button onClick={onClearCache} className="icon-btn" title="Cache &amp; Tweets-Speicher leeren">
              <Trash2 size={14} />
            </button>
            <button onClick={onOpenLogin} className="icon-btn" title="Account wechseln">
              <RefreshCw size={14} />
            </button>
            <button onClick={onLogout} className="icon-btn danger" title="Abmelden (Sitzung vollständig beenden)">
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button className="nav-btn-primary" onClick={onOpenLogin}>
            <svg viewBox="0 0 24 24" className="x-logo-btn">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>Mit X anmelden</span>
          </button>
        )}
      </div>
    </header>
  );
}
