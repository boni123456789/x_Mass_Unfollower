import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, Zap, Terminal, Sparkles, Command, CheckCircle2, Lock, Eye, RefreshCw, Key, Shield } from 'lucide-react';
import AccountList from './AccountList';
import AccountDetail from './AccountDetail';

export default function PreLoginHero({
  onOpenLogin,
  onStartDemo,
  accounts,
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
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'import_guide'

  return (
    <div className="clay-hero-wrapper">
      {/* Background Dot Matrix Texture */}
      <div className="clay-grid-pattern" />

      <div className="clay-hero-container">
        {/* Top Editorial Header Bar (Halldon style) */}
        <div className="editorial-header">
          <div className="editorial-pill">
            <span className="pill-dot" />
            <span className="pill-text">CLEANSWEEP X • AUTOMATED AUDIT ENGINE</span>
            <span className="pill-code">v2.4</span>
          </div>

          <h1 className="editorial-title">
            Dein X Feed aufräumen in <span className="highlight-text">Höchstgeschwindigkeit</span>
          </h1>

          <p className="editorial-subtitle">
            Entfolge inaktiven Accounts, Nicht-Zurückfolgern &amp; Spam per Tastatur in Rekordzeit. 100% lokal, anonym und direkt in deinem Browser.
          </p>

          {/* Primary Action Buttons Bar */}
          <div className="editorial-actions">
            <button
              type="button"
              className="clay-btn-primary"
              onClick={() => onOpenLogin('browser_import')}
            >
              <svg viewBox="0 0 24 24" className="x-mini-logo">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>Mit X.com verbinden</span>
              <span className="btn-shortcut-hint">⌘K</span>
            </button>

            <button
              type="button"
              className="clay-btn-outline"
              onClick={() => onOpenLogin('browser_import')}
            >
              <Zap size={15} color="#FFD700" />
              <span>1-Klick Browser Import</span>
            </button>

            <button
              type="button"
              className="clay-btn-ghost"
              onClick={onStartDemo}
            >
              <Eye size={15} />
              <span>Vorschau-Modus aktivieren</span>
            </button>
          </div>
        </div>

        {/* Clay-Style Live Interactive Workstation Showcase */}
        <div className="clay-workstation-frame">
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
                <span className="tag-mono">UNAUTHENTICATED PREVIEW</span>
              </div>
            </div>

            <div className="topbar-right">
              <div className="tab-switcher">
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('preview')}
                >
                  <Eye size={13} />
                  <span>Interaktive Vorschau</span>
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'import_guide' ? 'active' : ''}`}
                  onClick={() => setActiveTab('import_guide')}
                >
                  <Terminal size={13} />
                  <span>Import Anleitung</span>
                </button>
              </div>

              <button
                type="button"
                className="topbar-cta-btn"
                onClick={() => onOpenLogin('browser_import')}
              >
                <span>Account Verbinden →</span>
              </button>
            </div>
          </div>

          {/* Interactive Workspace Body */}
          {activeTab === 'preview' ? (
            <div className="workstation-viewport">
              <AccountList
                accounts={accounts}
                selectedIndex={selectedIndex}
                onSelectIndex={onSelectIndex}
                searchTerm={searchTerm}
                onSearchChange={onSearchChange}
                activeFilter={activeFilter}
                onFilterChange={onFilterChange}
              />
              <AccountDetail
                account={currentAccount}
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
                  <h3>In 30 Sekunden mit X.com verbinden</h3>
                </div>
                <div className="guide-steps">
                  <div className="step-item">
                    <span className="step-num">01</span>
                    <div className="step-content">
                      <strong>Skript kopieren oder Chrome Extension nutzen</strong>
                      <p>Öffne den Login-Dialog in CleanSweep X und kopiere das 1-Zeilen Import Skript.</p>
                    </div>
                  </div>
                  <div className="step-item">
                    <span className="step-num">02</span>
                    <div className="step-content">
                      <strong>Auf X.com in der Entwickler-Konsole ausführen</strong>
                      <p>Gehe auf x.com (eingeloggt), drücke F12 → Konsole, füge das Skript ein &amp; Enter drücken.</p>
                    </div>
                  </div>
                  <div className="step-item">
                    <span className="step-num">03</span>
                    <div className="step-content">
                      <strong>Echte Profile blitzschnell entfolgen</strong>
                      <p>Deine Folgeliste wird automatisch geladen. Entfolge per Tastatur mit Pfeiltasten &amp; U/K Keys!</p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="clay-btn-primary"
                  onClick={() => onOpenLogin('browser_import')}
                  style={{ marginTop: '16px', alignSelf: 'flex-start' }}
                >
                  <span>Jetzt Skript kopieren &amp; Importieren →</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Editorial Feature Breakdown (Halldon Style Grid) */}
        <div className="editorial-features-grid">
          <div className="editorial-feature-card">
            <div className="card-mono-badge">[ 01 // SECURITY ]</div>
            <h3>100% Client-Side Engine</h3>
            <p>
              Keine Passwörter auf externen Servern. Die Datenverarbeitung und das Entfolgen finden direkt in deiner aktiven X.com-Sitzung statt.
            </p>
          </div>

          <div className="editorial-feature-card">
            <div className="card-mono-badge">[ 02 // SPEED ]</div>
            <h3>Tactile Keyboard Deck</h3>
            <p>
              Optimiert für Höchstgeschwindigkeit: Nutze Pfeiltasten <code>← / →</code> oder <code>U / K</code>, um 500+ Accounts in unter 3 Minuten zu bereinigen.
            </p>
          </div>

          <div className="editorial-feature-card">
            <div className="card-mono-badge">[ 03 // INTELLIGENCE ]</div>
            <h3>Smart Filter Scoring</h3>
            <p>
              Erkenne Nicht-Zurückfolger, inaktive Profile (&gt;90 Tage) und interagierte Spam-Accounts auf einen Blick ohne langes Suchen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
