import React, { useState, useEffect, useRef } from 'react';
import { Zap, LogOut, RefreshCw, Sun, Moon, Trash2, Globe, Volume2, VolumeX } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { isSoundEnabled, toggleSound, playTap } from '../utils/soundHaptics.js';

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
  bridgeLive = false,
  queueStatus = null,
  onSyncLiveDiff = null,
  onResumeQueue = null
}) {
  const { language, toggleLanguage, t } = useLanguage();
  const isRateLimited = queueStatus?.isRateLimited;
  const pendingCount = queueStatus?.pendingCount || 0;
  const failedCount = queueStatus?.failedCount || 0;

  const [soundActive, setSoundActive] = useState(() => isSoundEnabled());
  const [bumpUnfollowed, setBumpUnfollowed] = useState(false);
  const [bumpKept, setBumpKept] = useState(false);

  const prevUnfollowedRef = useRef(unfollowedCount);
  const prevKeptRef = useRef(keptCount);

  useEffect(() => {
    if (unfollowedCount !== prevUnfollowedRef.current) {
      setBumpUnfollowed(true);
      const timer = setTimeout(() => setBumpUnfollowed(false), 320);
      prevUnfollowedRef.current = unfollowedCount;
      return () => clearTimeout(timer);
    }
  }, [unfollowedCount]);

  useEffect(() => {
    if (keptCount !== prevKeptRef.current) {
      setBumpKept(true);
      const timer = setTimeout(() => setBumpKept(false), 320);
      prevKeptRef.current = keptCount;
      return () => clearTimeout(timer);
    }
  }, [keptCount]);

  const handleToggleSound = () => {
    const next = toggleSound();
    setSoundActive(next);
  };

  const handleThemeClick = () => {
    playTap();
    onToggleTheme();
  };

  const handleLangClick = () => {
    playTap();
    toggleLanguage();
  };

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
        {/* Tactile Sound & Haptic FX Toggle */}
        <button
          className={`sound-toggle-btn ${soundActive ? '' : 'muted'}`}
          onClick={handleToggleSound}
          title={t('common.soundToggleTitle')}
        >
          {soundActive ? <Volume2 size={15} color="var(--keep-green)" /> : <VolumeX size={15} />}
          <span className="sound-toggle-label">{soundActive ? t('common.soundOn') : t('common.soundOff')}</span>
        </button>

        {/* Language Switcher Toggle */}
        <button
          className="lang-toggle-btn"
          onClick={handleLangClick}
          title={t('common.langSwitch')}
        >
          <Globe size={14} color="var(--accent-blue)" />
          <span className="lang-toggle-badge">{language.toUpperCase()}</span>
        </button>

        {/* Theme Switcher Toggle */}
        <button 
          className="theme-toggle-btn"
          onClick={handleThemeClick}
          title={theme === 'clay-light' ? t('common.switchToDark') : t('common.switchToLight')}
        >
          {theme === 'clay-light' ? <Moon size={15} /> : <Sun size={15} color="#F59E0B" />}
          <span className="theme-toggle-label">{theme === 'clay-light' ? t('common.dark') : t('common.light')}</span>
        </button>

        {/* Session Stats Pill - Only show live counts when active workspace is ready */}
        <div
          className="nav-stats-pill"
          title={bridgeLive ? t('navbar.bridgeActive') : t('navbar.bridgeInactive')}
          style={{ cursor: 'default' }}
        >
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: bridgeLive ? 'var(--keep-green)' : 'var(--unfollow-red)',
            display: 'inline-block'
          }} />
          <span className="stat-label">{bridgeLive ? t('navbar.live') : t('navbar.offline')}</span>
        </div>

        {/* Queue / Rate Limit Status Pill */}
        {(pendingCount > 0 || failedCount > 0 || isRateLimited) && (
          <button
            className="nav-stats-pill"
            onClick={() => {
              if (onResumeQueue) onResumeQueue();
              else if (onSyncLiveDiff) onSyncLiveDiff();
            }}
            style={{
              background: isRateLimited ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              borderColor: isRateLimited ? 'var(--unfollow-red)' : '#F59E0B',
              cursor: 'pointer'
            }}
            title={isRateLimited ? t('navbar.rateLimitTitle') : t('navbar.queueTitle', { count: pendingCount })}
          >
            <RefreshCw className={isRateLimited ? '' : 'spin-slow'} size={13} color={isRateLimited ? 'var(--unfollow-red)' : '#F59E0B'} />
            <span className="stat-label" style={{ fontWeight: 600, color: isRateLimited ? 'var(--unfollow-red)' : '#F59E0B' }}>
              {isRateLimited
                ? t('navbar.rateLimitActive', { seconds: Math.round((queueStatus?.resetInMs || 0) / 1000) })
                : t('navbar.inQueue', { count: pendingCount })}
            </span>
          </button>
        )}

        {/* Live Clean Sync Button */}
        {isAppReady && onSyncLiveDiff && (
          <button
            className="nav-btn-secondary"
            onClick={onSyncLiveDiff}
            title={t('navbar.liveCleanSyncTitle')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={13} color="#3B82F6" />
            <span>{t('navbar.liveCleanSync')}</span>
          </button>
        )}

        {isAppReady && (
          <div 
            onClick={() => { playTap(); onOpenStats && onOpenStats(); }}
            className="nav-stats-pill"
            title={t('navbar.statsTitle')}
          >
            <div className="stat-item">
              <span className="stat-label">{t('navbar.unfollowedLabel')}</span>
              <span className={`stat-val danger ${bumpUnfollowed ? 'counter-bump' : ''}`}>{unfollowedCount}</span>
            </div>
            <span className="stat-divider">/</span>
            <div className="stat-item">
              <span className="stat-label">{t('navbar.keptLabel')}</span>
              <span className={`stat-val keep ${bumpKept ? 'counter-bump' : ''}`}>{keptCount}</span>
            </div>
            <span className="stat-divider">/</span>
            <div className="stat-item">
              <span className="stat-label">{t('navbar.totalLabel')}</span>
              <span className="stat-val">{totalAccounts}</span>
            </div>
          </div>
        )}

        {/* Batch Unfollow Button */}
        {isAppReady && (
          <button className="nav-btn-secondary" onClick={() => { playTap(); onOpenBatch && onOpenBatch(); }}>
            <Zap size={14} color="#F59E0B" />
            <span>{t('navbar.autoClean')}</span>
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
            <button onClick={() => { playTap(); onClearCache && onClearCache(); }} className="icon-btn" title={t('navbar.clearCacheTitle')}>
              <Trash2 size={14} />
            </button>
            <button onClick={() => { playTap(); onOpenLogin && onOpenLogin(); }} className="icon-btn" title={t('navbar.switchAccountTitle')}>
              <RefreshCw size={14} />
            </button>
            <button onClick={() => { playTap(); onLogout && onLogout(); }} className="icon-btn danger" title={t('navbar.logoutTitle')}>
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button className="nav-btn-primary" onClick={() => { playTap(); onOpenLogin && onOpenLogin(); }}>
            <svg viewBox="0 0 24 24" className="x-logo-btn">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>{t('navbar.loginWithX')}</span>
          </button>
        )}
      </div>
    </header>
  );
}
