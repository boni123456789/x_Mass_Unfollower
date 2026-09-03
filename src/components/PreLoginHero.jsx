import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, Zap, Terminal, Sparkles, Command, CheckCircle2, Lock, Eye, RefreshCw, Key, Shield } from 'lucide-react';
import AccountList from './AccountList';
import AccountDetail from './AccountDetail';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { INITIAL_ACCOUNTS } from '../mockData';
import { playTap } from '../utils/soundHaptics.js';

export default function PreLoginHero({
  onOpenLogin,
  onStartDemo,
  accounts = [],
  selectedIndex,
  onSelectIndex,
  searchTerm,
  onSearchChange,
  activeFilter,
  onFilterChange,
  currentAccount,
  onUnfollow,
  onKeep,
  onPrev,
  isPressedRed,
  isPressedGreen
}) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'import_guide'

  const displayAccounts = (accounts && accounts.length > 0) ? accounts : INITIAL_ACCOUNTS;
  const displayAccount = currentAccount || displayAccounts[selectedIndex] || displayAccounts[0];

  return (
    <div className="clay-hero-wrapper">
      {/* Background Dot Matrix Texture */}
      <div className="clay-grid-pattern" />

      <div className="clay-hero-container">
        {/* Top Editorial Header Bar (Halldon style) */}
        <div className="editorial-header">
          <div className="editorial-pill">
            <span className="pill-dot" />
            <span className="pill-text">{t('hero.badge')}</span>
            <span className="pill-code">v2.4</span>
          </div>

          <h1 className="editorial-title">
            {t('hero.titlePrefix')}<span className="highlight-text">{t('hero.titleHighlight')}</span>
          </h1>

          <p className="editorial-subtitle">
            {t('hero.subtitle')}
          </p>

          {/* Primary Action Buttons Bar */}
          <div className="editorial-actions">
            <button
              type="button"
              className="clay-btn-primary"
              onClick={() => { playTap(); onOpenLogin('browser_import'); }}
            >
              <svg viewBox="0 0 24 24" className="x-mini-logo">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>{t('hero.connectX')}</span>
              <span className="btn-shortcut-hint">⌘K</span>
            </button>

            <button
              type="button"
              className="clay-btn-outline"
              onClick={() => { playTap(); onOpenLogin('browser_import'); }}
            >
              <Zap size={15} color="#FFD700" />
              <span>{t('hero.oneClickImport')}</span>
            </button>

            <button
              type="button"
              className="clay-btn-ghost"
              onClick={() => { playTap(); onStartDemo(); }}
            >
              <Eye size={15} />
              <span>{t('hero.previewMode')}</span>
            </button>
          </div>
        </div>

        {/* Clay-Style Live Interactive Workstation Showcase */}
        <div className="clay-workstation-frame" style={{ boxShadow: 'var(--shadow-airbnb)' }}>
          <div className="workstation-topbar">
            <div className="topbar-left">
              <div className="window-indicator">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
              <div className="topbar-title">
                <Lock size={12} className="lock-icon" />
                <span>CLEANSWEEP WORKSPACE</span>
                <span className="tag-mono">{t('hero.unauthPreview')}</span>
              </div>
            </div>

            <div className="topbar-right">
              <div className="tab-switcher">
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
                  onClick={() => { playTap(); setActiveTab('preview'); }}
                >
                  <Eye size={13} />
                  <span>{t('hero.tabPreview')}</span>
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'import_guide' ? 'active' : ''}`}
                  onClick={() => { playTap(); setActiveTab('import_guide'); }}
                >
                  <Terminal size={13} />
                  <span>{t('hero.tabGuide')}</span>
                </button>
              </div>

              <button
                type="button"
                className="topbar-cta-btn"
                onClick={() => { playTap(); onOpenLogin('browser_import'); }}
              >
                <span>{t('hero.connectAccountBtn')}</span>
              </button>
            </div>
          </div>

          {/* Interactive Workspace Body */}
          {activeTab === 'preview' ? (
            <div className="workstation-viewport">
              <AccountList
                accounts={displayAccounts}
                selectedIndex={selectedIndex}
                onSelectIndex={onSelectIndex}
                searchTerm={searchTerm}
                onSearchChange={onSearchChange}
                activeFilter={activeFilter}
                onFilterChange={onFilterChange}
              />
              <AccountDetail
                account={displayAccount}
                onUnfollow={onUnfollow}
                onKeep={onKeep}
                onPrev={onPrev}
                isPressedRed={isPressedRed}
                isPressedGreen={isPressedGreen}
              />
            </div>
          ) : (
            <div className="workstation-guide-panel">
              <div className="guide-card">
                <div className="guide-header">
                  <Terminal size={20} color="#1D9BF0" />
                  <h3>{t('hero.guideTitle')}</h3>
                </div>
                <div className="guide-steps">
                  <div className="step-item">
                    <span className="step-num">01</span>
                    <div className="step-content">
                      <strong>{t('hero.step1Title')}</strong>
                      <p>{t('hero.step1Desc')}</p>
                    </div>
                  </div>
                  <div className="step-item">
                    <span className="step-num">02</span>
                    <div className="step-content">
                      <strong>{t('hero.step2Title')}</strong>
                      <p>{t('hero.step2Desc')}</p>
                    </div>
                  </div>
                  <div className="step-item">
                    <span className="step-num">03</span>
                    <div className="step-content">
                      <strong>{t('hero.step3Title')}</strong>
                      <p>{t('hero.step3Desc')}</p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="clay-btn-primary"
                  onClick={() => onOpenLogin('browser_import')}
                  style={{ marginTop: '16px', alignSelf: 'flex-start' }}
                >
                  <span>{t('hero.copyScriptAction')}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Editorial Feature Breakdown (Halldon Style Grid) */}
        <div className="editorial-features-grid">
          <div className="editorial-feature-card">
            <div className="card-mono-badge">{t('hero.feature1Badge')}</div>
            <h3>{t('hero.feature1Title')}</h3>
            <p>{t('hero.feature1Desc')}</p>
          </div>

          <div className="editorial-feature-card">
            <div className="card-mono-badge">{t('hero.feature2Badge')}</div>
            <h3>{t('hero.feature2Title')}</h3>
            <p>
              {t('hero.feature2Desc')}
            </p>
          </div>

          <div className="editorial-feature-card">
            <div className="card-mono-badge">{t('hero.feature3Badge')}</div>
            <h3>{t('hero.feature3Title')}</h3>
            <p>{t('hero.feature3Desc')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
