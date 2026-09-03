import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Key, RefreshCw, CheckCircle, LogOut, ArrowRight, ExternalLink, Copy, Check, Terminal, Zap } from 'lucide-react';
import { verifyXCredentials } from '../services/xApi';
import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function LoginModal({ isOpen, onClose, onLogin, onLogout, currentUser }) {
  const { t } = useLanguage();
  const [authToken, setAuthToken] = useState('');
  const [ct0Token, setCt0Token] = useState('');
  const [customHandle, setCustomHandle] = useState('');
  const [authMethod, setAuthMethod] = useState('browser_import'); // 'browser_import' | 'x_session' | 'demo'
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [importScriptContent, setImportScriptContent] = useState('');
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setIsExtensionInstalled(!!window.__CLEANSWEEP_EXTENSION_INSTALLED__);
    }
  }, [isOpen]);

  useEffect(() => {
    fetch('/import-script.js')
      .then(r => r.text())
      .then(text => setImportScriptContent(text))
      .catch(() => setImportScriptContent('alert("Error: import-script.js could not be loaded");'));
  }, []);

  // Listen for Extension responses
  useEffect(() => {
    const handleExtensionMsg = (event) => {
      if (event.data?.source === 'CSX_EXTENSION' && event.data?.type === 'EXTENSION_IMPORT_RESPONSE') {
        const response = event.data;
        if (response.success) {
          handleCheckImport();
        } else {
          setIsAuthenticating(false);
          setErrorMsg(response.error || t('loginModal.errorExtensionSync'));
        }
      }
    };
    window.addEventListener('message', handleExtensionMsg);
    return () => window.removeEventListener('message', handleExtensionMsg);
  }, [t]);

  if (!isOpen) return null;

  const copyImportScript = () => {
    navigator.clipboard.writeText(importScriptContent);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  // ── 1-Click Auto Sync via Extension ──
  const handleExtensionAutoSync = () => {
    setIsAuthenticating(true);
    setErrorMsg(null);
    window.postMessage({ source: 'CSX_APP', type: 'TRIGGER_EXTENSION_IMPORT' }, '*');
    
    // Timeout fallback after 45s for large accounts (2000+ following)
    setTimeout(() => {
      setIsAuthenticating(prev => {
        if (prev) {
          setErrorMsg(t('loginModal.errorTimeout'));
          return false;
        }
        return false;
      });
    }, 45000);
  };

  // ── Check for imported data ──
  const handleCheckImport = async () => {
    setIsAuthenticating(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/x/imported');
      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error || t('loginModal.errorNoDataYet'));
        setIsAuthenticating(false);
        return;
      }
      const data = await res.json();
      if (data.user && data.accounts) {
        onLogin(data.user);
        localStorage.setItem('csx_imported_accounts', JSON.stringify(data.accounts));
        localStorage.setItem('csx_user', JSON.stringify(data.user));
        localStorage.setItem('csx_auth_token', data.user.authToken || '');
        localStorage.setItem('csx_ct0', data.user.ct0 || '');
        window.dispatchEvent(new CustomEvent('csx-import', { detail: data }));
        setIsAuthenticating(false);
        onClose();
      }
    } catch (e) {
      setErrorMsg(t('loginModal.errorServerDown'));
      setIsAuthenticating(false);
    }
  };

  // ── Paste / Direct JSON import ──
  const handlePasteImport = async (directContent = null) => {
    setIsAuthenticating(true);
    setErrorMsg(null);
    try {
      let content = typeof directContent === 'string' ? directContent : null;
      if (!content) {
        try {
          content = await navigator.clipboard.readText();
        } catch (clipErr) {
          throw new Error(t('loginModal.errorClipboardDenied'));
        }
      }
      if (!content || !content.trim()) {
        throw new Error(t('loginModal.errorClipboardEmpty'));
      }

      content = content.trim();

      if (content.startsWith('//') || content.startsWith('(async') || content.startsWith('const ') || !content.startsWith('{')) {
        throw new Error(t('loginModal.errorScriptInClipboard'));
      }

      const parsed = JSON.parse(content);
      if (!parsed.profile || !parsed.following) {
        throw new Error(t('loginModal.errorInvalidJson'));
      }

      const postRes = await fetch('/api/x/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      const postData = await postRes.json();
      if (!postData.success) {
        throw new Error(postData.error || 'Server rejected the import.');
      }

      const getRes = await fetch('/api/x/imported');
      if (!getRes.ok) {
        throw new Error(t('loginModal.errorFetchImported'));
      }
      const data = await getRes.json();

      if (data.user && data.accounts) {
        onLogin(data.user);
        localStorage.setItem('csx_imported_accounts', JSON.stringify(data.accounts));
        localStorage.setItem('csx_user', JSON.stringify(data.user));
        localStorage.setItem('csx_auth_token', data.user.authToken || '');
        localStorage.setItem('csx_ct0', data.user.ct0 || '');
        window.dispatchEvent(new CustomEvent('csx-import', { detail: data }));
        setIsAuthenticating(false);
        onClose();
      } else {
        throw new Error(t('loginModal.errorMissingData'));
      }
    } catch (e) {
      setErrorMsg(e.message);
      setIsAuthenticating(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      handlePasteImport(event.target?.result);
    };
    reader.readAsText(file);
  };

  const handleNativeXConnect = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const cleanAuth = authToken.trim().replace(/^["']|["']$/g, '').trim();
    const cleanCt = ct0Token.trim().replace(/^["']|["']$/g, '').trim();

    if (!cleanAuth || !cleanCt) {
      setErrorMsg(t('loginModal.errorTokensRequired'));
      return;
    }

    setIsAuthenticating(true);
    try {
      const xProfile = await verifyXCredentials(cleanAuth, cleanCt);
      localStorage.setItem('csx_auth_token', cleanAuth);
      localStorage.setItem('csx_ct0', cleanCt);
      onLogin({ ...xProfile, isRealSession: true, authToken: cleanAuth, ct0: cleanCt });
      setIsAuthenticating(false);
      onClose();
    } catch (err) {
      setIsAuthenticating(false);
      setErrorMsg(err.message + '\n\n💡 Tipp: ' + t('loginModal.tabExtension'));
    }
  };

  const handleDemoConnect = (e) => {
    e.preventDefault();
    const handle = customHandle.replace('@', '').trim() || 'demo_user';
    onLogin({
      id: `user_${handle}`,
      name: handle.charAt(0).toUpperCase() + handle.slice(1),
      handle: handle,
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${handle}`,
      banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
      bio: `X user @${handle} • Simulation Mode`,
      followingCount: 482,
      followersCount: 1240,
      joined: '2024',
      verified: true,
      isRealSession: false
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg className="x-logo-icon" viewBox="0 0 24 24" style={{ width: 22, height: 22 }}>
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 850, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              {t('loginModal.title')}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'var(--bg-card-hover)', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-secondary)', 
              width: 32, 
              height: 32, 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer' 
            }}
          >
            <X size={16} />
          </button>
        </div>

        {currentUser && (
          <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{t('loginModal.loggedInAs')}</span>
              <strong style={{ color: 'var(--text-primary)' }}>@{currentUser.handle}</strong>
              {currentUser.isRealSession && <span style={{ marginLeft: '6px', color: '#10B981', fontWeight: 700 }}>{t('loginModal.realLiveAccount')}</span>}
            </div>
            <button 
              type="button" 
              onClick={onLogout} 
              style={{ background: 'var(--unfollow-red)', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <LogOut size={14} />
              <span>{t('loginModal.logoutBtn')}</span>
            </button>
          </div>
        )}

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <button
            type="button"
            className={`filter-chip ${authMethod === 'browser_import' ? 'active' : ''}`}
            onClick={() => { setAuthMethod('browser_import'); setErrorMsg(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '0.8rem' }}
          >
            <Zap size={14} color="#10B981" />
            {t('loginModal.tabExtension')}
          </button>
          <button
            type="button"
            className={`filter-chip ${authMethod === 'x_session' ? 'active' : ''}`}
            onClick={() => { setAuthMethod('x_session'); setErrorMsg(null); }}
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            {t('loginModal.tabToken')}
          </button>
          <button
            type="button"
            className={`filter-chip ${authMethod === 'demo' ? 'active' : ''}`}
            onClick={() => { setAuthMethod('demo'); setErrorMsg(null); }}
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            {t('loginModal.tabDemo')}
          </button>
        </div>

        {errorMsg && (
          <div style={{ padding: '12px 14px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid var(--unfollow-red)', borderRadius: 'var(--radius-md)', color: '#EF4444', fontSize: '0.84rem', whiteSpace: 'pre-line', fontWeight: 600 }}>
            {errorMsg}
          </div>
        )}

        {/* Chrome Extension Status Banner */}
        <div style={{ padding: '14px 16px', background: 'var(--bg-card-hover)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={16} color="#10B981" /> {t('loginModal.extStatusTitle')}
            </strong>
            <span style={{ 
              fontSize: '0.68rem', 
              background: isExtensionInstalled ? '#10B981' : '#F59E0B', 
              color: '#FFFFFF', 
              fontWeight: 800, 
              padding: '2px 8px', 
              borderRadius: '999px' 
            }}>
              {isExtensionInstalled ? t('loginModal.extStatusActive') : t('loginModal.extStatusInstall')}
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            {isExtensionInstalled 
              ? t('loginModal.extDescActive') 
              : t('loginModal.extDescInactive')}
          </p>
          {!isExtensionInstalled && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', background: 'var(--bg-input)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              {t('loginModal.extStep1')} <code style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>chrome://extensions</code><br/>
              {t('loginModal.extStep2')}<br/>
              {t('loginModal.extStep3')}<strong style={{ color: 'var(--text-primary)', wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>c:\Users\marco\Desktop\x_Mass_Unfollower\extension</strong>
            </div>
          )}
        </div>

        {/* ═══════════════ 1-KLICK EXTENSION SYNC ═══════════════ */}
        {authMethod === 'browser_import' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <button
              type="button"
              onClick={handleExtensionAutoSync}
              disabled={isAuthenticating}
              style={{
                background: 'linear-gradient(135deg, #10B981, #059669)',
                color: '#ffffff',
                border: 'none',
                padding: '14px 20px',
                borderRadius: '8px',
                fontWeight: 850,
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                width: '100%'
              }}
            >
              {isAuthenticating ? <RefreshCw size={18} className="spin" /> : <Zap size={18} />}
              <span>{isAuthenticating ? t('loginModal.btnSyncing') : t('loginModal.btnStartAutoSync')}</span>
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0' }}>
              {t('loginModal.fallbackDivider')}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={copyImportScript}
                className="btn-secondary"
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {copiedScript ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiedScript ? t('loginModal.btnCopiedF12') : t('loginModal.btnCopyF12')}</span>
              </button>

              <button
                type="button"
                onClick={() => handlePasteImport()}
                disabled={isAuthenticating}
                className="btn-secondary"
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <CheckCircle size={16} />
                <span>{t('loginModal.btnFromClipboard')}</span>
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <label
                style={{
                  flex: 1,
                  background: 'var(--bg-card-hover)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                {t('loginModal.btnUploadJson')}
                <input type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>

              <button
                type="button"
                onClick={handleCheckImport}
                disabled={isAuthenticating}
                style={{
                  background: 'var(--bg-card-hover)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                {t('loginModal.btnDirectCheck')}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════ TOKEN LOGIN ═══════════════ */}
        {authMethod === 'x_session' && (
          <form onSubmit={handleNativeXConnect} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '10px 14px', background: 'rgba(217, 119, 6, 0.1)', border: '1px solid rgba(217, 119, 6, 0.3)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--gold-accent)' }}>
              {t('loginModal.tokenWarning')}
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                {t('loginModal.tokenAuthLabel')}
              </label>
              <input
                type="password"
                placeholder="z.B. a1b2c3d4e5f6..."
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                className="search-input"
                style={{ padding: '10px 12px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                {t('loginModal.tokenCt0Label')}
              </label>
              <input
                type="password"
                placeholder="z.B. 9876543210fedcba..."
                value={ct0Token}
                onChange={(e) => setCt0Token(e.target.value)}
                className="search-input"
                style={{ padding: '10px 12px' }}
              />
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="btn-primary"
              style={{ padding: '12px', fontSize: '0.9rem', fontWeight: 800, marginTop: '6px' }}
            >
              {isAuthenticating ? t('loginModal.tokenConnecting') : t('loginModal.tokenSubmit')}
            </button>
          </form>
        )}

        {/* ═══════════════ DEMO MODE ═══════════════ */}
        {authMethod === 'demo' && (
          <form onSubmit={handleDemoConnect} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '10px 14px', background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              {t('loginModal.demoDesc')}
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Demo Handle
              </label>
              <input
                type="text"
                placeholder="@demo_user"
                value={customHandle}
                onChange={(e) => setCustomHandle(e.target.value)}
                className="search-input"
                style={{ padding: '10px 12px' }}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ padding: '12px', fontSize: '0.9rem', fontWeight: 800, marginTop: '6px' }}
            >
              {t('loginModal.demoSubmit')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
