import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Navbar from './components/Navbar';
import PreLoginHero from './components/PreLoginHero';
import AccountList from './components/AccountList';
import AccountDetail from './components/AccountDetail';
import LoginModal from './components/LoginModal';
import BatchUnfollowModal from './components/BatchUnfollowModal';
import StatsModal from './components/StatsModal';
import KeyboardDock from './components/KeyboardDock';
import Toast from './components/Toast';
import { INITIAL_ACCOUNTS } from './mockData';
import { fetchUserTweets, extensionInstalled } from './services/tweetFetch';

const DECISIONS_KEY = 'csx_review_decisions';

function loadDecisions() {
  try {
    return JSON.parse(localStorage.getItem(DECISIONS_KEY) || '{}');
  } catch {
    return {};
  }
}

function persistDecision(handle, status) {
  if (!handle) return;
  const all = loadDecisions();
  const key = String(handle).toLowerCase();
  if (status) all[key] = status;
  else delete all[key];
  try {
    localStorage.setItem(DECISIONS_KEY, JSON.stringify(all));
  } catch {}
}

function applyDecisions(list) {
  const decisions = loadDecisions();
  return (list || []).map((acc) => {
    const status = decisions[String(acc.handle || '').toLowerCase()];
    if (status === 'unfollowed') return { ...acc, isFollowing: false, reviewStatus: 'unfollowed' };
    if (status === 'kept') return { ...acc, isFollowing: true, reviewStatus: 'kept' };
    return { ...acc, reviewStatus: acc.reviewStatus || 'pending' };
  });
}

function isAccountPayload(value) {
  return !!(value && typeof value === 'object' && (value.handle || value.id) && !value.nativeEvent);
}

function accountsMatch(a, b) {
  if (!a || !b) return false;
  const ha = String(a.handle || '').toLowerCase();
  const hb = String(b.handle || '').toLowerCase();
  if (ha && hb && ha === hb) return true;
  return !!(a.id && b.id && a.id === b.id && !String(a.id).startsWith('acc_'));
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('csx_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore parse error
      }
    }
    return null;
  });

  const [isDemoActive, setIsDemoActive] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('csx_theme') || 'clay-light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('csx_theme', theme);
  }, [theme]);

  const [accounts, setAccounts] = useState([]);
  const [isLoadingLive, setIsLoadingLive] = useState(() => !!localStorage.getItem('csx_user'));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Global Tweet Store & Rolling Window Prefetch
  const [tweetStore, setTweetStore] = useState({});
  const pendingFetches = useRef(new Set());
  const tweetStoreRef = useRef({});
  const manualInflightRef = useRef(new Set());
  const hasLiveData = useRef(false);

  // Modals
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  // Undo stack
  const [history, setHistory] = useState([]);

  // Active key state for UI keyboard dock highlights
  const [activeKeys, setActiveKeys] = useState({});
  const [isPressedRed, setIsPressedRed] = useState(false);
  const [isPressedGreen, setIsPressedGreen] = useState(false);

  // Toast alert
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Auto-check for server-imported accounts from x.com on mount or focus
  const checkServerImport = useCallback(async () => {
    if (hasLiveData.current) return;
    setIsLoadingLive(true);
    try {
      const res = await fetch('/api/x/imported');
      if (res.ok) {
        const data = await res.json();
        if (data.user && data.accounts && data.accounts.length > 0) {
          hasLiveData.current = true;
          setCurrentUser(data.user);
          setAccounts(applyDecisions(data.accounts));
          setActiveFilter('pending');
          setSelectedIndex(0);
          setIsDemoActive(true);
          localStorage.setItem('csx_user', JSON.stringify(data.user));
          showToast(`✅ ${data.accounts.length} echte Following-Profile geladen!`);
        }
      }
    } catch (e) {
      // Server not running or no import session
    } finally {
      setIsLoadingLive(false);
    }
  }, []);

  const [bridgeLive, setBridgeLive] = useState(() => extensionInstalled());

  useEffect(() => {
    checkServerImport();

    const handleFocus = () => checkServerImport();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkServerImport]);

  useEffect(() => {
    const onMsg = (event) => {
      const data = event.data;
      if (data?.source !== 'CSX_EXTENSION') return;
      if (data.type === 'PONG') setBridgeLive(true);
      if (data.type === 'UNFOLLOW_RESPONSE' && data.success === false) {
        showToast(`❌ Live-Entfolgen fehlgeschlagen – x.com-Tab offen lassen & Extension neu laden.`);
      }
    };
    window.addEventListener('message', onMsg);
    window.postMessage({ source: 'CSX_APP', type: 'PING' }, '*');
    const retry = setTimeout(() => window.postMessage({ source: 'CSX_APP', type: 'PING' }, '*'), 600);
    return () => {
      window.removeEventListener('message', onMsg);
      clearTimeout(retry);
    };
  }, []);

  // Listen for browser-import events from LoginModal
  useEffect(() => {
    const handleImport = (e) => {
      const data = e.detail;
      if (data?.user && data?.accounts?.length > 0) {
        hasLiveData.current = true;
        setCurrentUser(data.user);
        setAccounts(applyDecisions(data.accounts));
        setActiveFilter('pending');
        setSelectedIndex(0);
        setIsDemoActive(true);
        showToast(`✅ ${data.accounts.length} echte Following-Profile importiert!`);
      }
    };
    window.addEventListener('csx-import', handleImport);
    return () => window.removeEventListener('csx-import', handleImport);
  }, []);

  const filteredAccounts = useMemo(() => accounts.filter((acc) => {
    const matchesSearch =
      acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.handle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.bio.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (activeFilter === 'not_following_back' || activeFilter === 'no_follow_back') return !acc.followsYou;
    if (activeFilter === 'inactive') {
      return acc.lastActiveRelative?.includes('Monat') || acc.lastActiveRelative?.includes('Jahr') || acc.lastActiveRelative === 'Vorschau fehlt';
    }
    if (activeFilter === 'pending' || activeFilter === 'offen') {
      return acc.reviewStatus !== 'kept' && acc.reviewStatus !== 'unfollowed' && acc.isFollowing !== false;
    }
    if (activeFilter === 'unfollowed') return acc.reviewStatus === 'unfollowed' || !acc.isFollowing;
    if (activeFilter === 'kept') return acc.reviewStatus === 'kept';
    return true;
  }), [accounts, searchTerm, activeFilter]);

  useEffect(() => {
    tweetStoreRef.current = tweetStore;
  }, [tweetStore]);

  const loadAccountTweets = useCallback(async (account) => {
    const handle = account?.handle;
    if (!handle) return;
    if (manualInflightRef.current.has(handle)) return;
    if (pendingFetches.current.has(handle)) return;
    const existing = tweetStoreRef.current[handle];
    if (existing?.fetched) return;

    pendingFetches.current.add(handle);
    setTweetStore((prev) => ({
      ...prev,
      [handle]: { tweets: prev[handle]?.tweets || [], fetched: false, loading: true }
    }));
    try {
      const tweets = await fetchUserTweets(handle, { userId: account.id });
      if (manualInflightRef.current.has(handle)) return;
      setTweetStore((prev) => ({
        ...prev,
        [handle]: { tweets: tweets || [], fetched: true, loading: false }
      }));
    } catch {
      if (manualInflightRef.current.has(handle)) return;
      setTweetStore((prev) => ({
        ...prev,
        [handle]: {
          tweets: prev[handle]?.tweets || [],
          fetched: false,
          loading: false,
          error: true,
          triedAt: Date.now()
        }
      }));
    } finally {
      pendingFetches.current.delete(handle);
    }
  }, []);

  useEffect(() => {
    if (!currentUser || !isDemoActive || filteredAccounts.length === 0) return;
    const current = filteredAccounts[selectedIndex];
    const next = filteredAccounts[selectedIndex + 1];
    let cancelled = false;
    (async () => {
      await loadAccountTweets(current);
      if (cancelled) return;
      await loadAccountTweets(next);
    })();
    return () => { cancelled = true; };
  }, [selectedIndex, filteredAccounts, currentUser, isDemoActive, loadAccountTweets]);

  const handleFetchSingleTweet = useCallback((handle, userId) => {
    if (!currentUser && !extensionInstalled()) {
      showToast('⚠️ Live API-Abruf ist im reinen Vorschau-Modus (offline) deaktiviert.');
      return;
    }

    pendingFetches.current.delete(handle);
    manualInflightRef.current.add(handle);
    setTweetStore((prev) => ({
      ...prev,
      [handle]: { tweets: [], fetched: false, loading: true }
    }));

    fetchUserTweets(handle, { userId, force: true })
      .then((tweets) => {
        setTweetStore((prev) => ({
          ...prev,
          [handle]: { tweets: tweets || [], fetched: true, loading: false }
        }));
        showToast(`🔄 ${(tweets || []).length} Beiträge für @${handle} neu geladen!`);
      })
      .catch(() => {
        setTweetStore((prev) => ({
          ...prev,
          [handle]: { tweets: prev[handle]?.tweets || [], fetched: false, loading: false, error: true, triedAt: Date.now() }
        }));
        showToast(`❌ Fehler beim Laden der Tweets für @${handle}`);
      })
      .finally(() => {
        manualInflightRef.current.delete(handle);
      });
  }, [currentUser]);

  const handleLogin = useCallback((newUser) => {
    setCurrentUser(newUser);
    setIsDemoActive(true);
    if (newUser?.isRealSession === false) {
      setAccounts(applyDecisions(INITIAL_ACCOUNTS));
    }
    try {
      localStorage.setItem('csx_user', JSON.stringify(newUser));
    } catch (e) {}
    showToast(`Eingeloggt als @${newUser.handle}`);
  }, []);

  const handleLogout = useCallback(async () => {
    // Purge server RAM session and cache
    try {
      await fetch('/api/x/logout', { method: 'POST' });
    } catch (e) {}

    // Reset local frontend state
    setCurrentUser(null);
    setIsDemoActive(false);
    setAccounts([]);
    setSelectedIndex(0);
    setTweetStore({});
    pendingFetches.current.clear();
    hasLiveData.current = false;

    // Purge local and session storage
    try {
      localStorage.removeItem('csx_user');
      localStorage.removeItem('csx_imported_accounts');
      localStorage.removeItem('csx_auth_token');
      localStorage.removeItem('csx_ct0');
      localStorage.removeItem(DECISIONS_KEY);
      sessionStorage.clear();
    } catch (e) {}

    showToast('🧹 Sitzung & Cache vollständig gelöscht.');
  }, []);

  const handleClearCache = useCallback(async () => {
    try {
      await fetch('/api/x/clear_cache', { method: 'POST' });
    } catch (e) {}
    setTweetStore({});
    pendingFetches.current.clear();
    showToast('🧹 Tweet-Cache & Speicher geleert.');
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme(prev => prev === 'clay-light' ? 'clay-dark' : 'clay-light');
  }, []);

  const currentAccount = filteredAccounts[selectedIndex] || filteredAccounts[0] || null;

  const advanceToNextPending = useCallback((fromAccount) => {
    setSelectedIndex((prev) => {
      const list = filteredAccounts;
      if (!list.length) return 0;
      const start = Math.max(0, list.findIndex((a) => accountsMatch(a, fromAccount)));
      for (let i = 1; i <= list.length; i++) {
        const idx = (start + i) % list.length;
        const acc = list[idx];
        if (!acc || accountsMatch(acc, fromAccount)) continue;
        if (acc.reviewStatus === 'kept' || acc.reviewStatus === 'unfollowed') continue;
        return idx;
      }
      return Math.min(Math.max(start, prev) + 1, list.length - 1);
    });
  }, [filteredAccounts]);

  const handleUnfollow = useCallback((maybeAccount) => {
    const accountToUnfollow = isAccountPayload(maybeAccount) ? maybeAccount : currentAccount;
    if (!accountToUnfollow?.handle) return;

    setIsPressedRed(true);
    setTimeout(() => setIsPressedRed(false), 200);

    setHistory((prev) => [...prev, {
      account: accountToUnfollow,
      action: 'unfollow',
      prevStatus: accountToUnfollow.reviewStatus || 'pending',
      prevFollowing: accountToUnfollow.isFollowing !== false,
      prevIndex: selectedIndex
    }]);

    persistDecision(accountToUnfollow.handle, 'unfollowed');
    setAccounts((prev) =>
      prev.map((acc) => accountsMatch(acc, accountToUnfollow)
        ? { ...acc, isFollowing: false, reviewStatus: 'unfollowed' }
        : acc)
    );

    window.postMessage({
      source: 'CSX_APP',
      type: 'UNFOLLOW_USER',
      handle: accountToUnfollow.handle,
      userId: accountToUnfollow.id
    }, '*');

    fetch('/api/x/queue_unfollow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: accountToUnfollow.handle, userId: accountToUnfollow.id })
    }).catch(() => {});

    advanceToNextPending(accountToUnfollow);
  }, [currentAccount, selectedIndex, advanceToNextPending]);

  const handleKeep = useCallback((maybeAccount) => {
    const accountToKeep = isAccountPayload(maybeAccount) ? maybeAccount : currentAccount;
    if (!accountToKeep?.handle) return;

    setIsPressedGreen(true);
    setTimeout(() => setIsPressedGreen(false), 200);

    setHistory((prev) => [...prev, {
      account: accountToKeep,
      action: 'keep',
      prevStatus: accountToKeep.reviewStatus || 'pending',
      prevFollowing: accountToKeep.isFollowing !== false,
      prevIndex: selectedIndex
    }]);

    persistDecision(accountToKeep.handle, 'kept');
    setAccounts((prev) =>
      prev.map((acc) => accountsMatch(acc, accountToKeep)
        ? { ...acc, isFollowing: true, reviewStatus: 'kept' }
        : acc)
    );

    advanceToNextPending(accountToKeep);
  }, [currentAccount, selectedIndex, advanceToNextPending]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;

    const lastAction = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));

    const prevStatus = lastAction.prevStatus || 'pending';
    persistDecision(lastAction.account.handle, prevStatus === 'pending' ? null : prevStatus);
    setAccounts((prev) =>
      prev.map((acc) => accountsMatch(acc, lastAction.account)
        ? {
            ...acc,
            isFollowing: lastAction.prevFollowing !== false,
            reviewStatus: prevStatus
          }
        : acc)
    );
    if (lastAction.prevIndex !== undefined) {
      setSelectedIndex(lastAction.prevIndex);
    }
    const verb = lastAction.action === 'unfollow' ? 'Entfolgen' : 'Behalten';
    showToast(`${verb} von @${lastAction.account.handle} rückgängig gemacht.`);
  }, [history]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore key events when typing inside input fields or modals are open
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      if (isLoginOpen || isBatchOpen || isStatsOpen) return;

      const key = e.key.toLowerCase();

      if (e.key === 'ArrowLeft' || key === 'u') {
        e.preventDefault();
        setActiveKeys((prev) => ({ ...prev, unfollow: true }));
        handleUnfollow();
      } else if (e.key === 'ArrowRight' || key === 'k') {
        e.preventDefault();
        setActiveKeys((prev) => ({ ...prev, keep: true }));
        handleKeep();
      } else if (e.key === 'ArrowUp' || key === 'w') {
        e.preventDefault();
        setActiveKeys((prev) => ({ ...prev, prev: true }));
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown' || key === 's') {
        e.preventDefault();
        setActiveKeys((prev) => ({ ...prev, next: true }));
        setSelectedIndex((prev) => Math.min(prev + 1, filteredAccounts.length - 1));
      } else if (key === 'z') {
        e.preventDefault();
        setActiveKeys((prev) => ({ ...prev, undo: true }));
        handleUndo();
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (['arrowleft', 'u'].includes(key)) setActiveKeys((prev) => ({ ...prev, unfollow: false }));
      if (['arrowright', 'k'].includes(key)) setActiveKeys((prev) => ({ ...prev, keep: false }));
      if (['arrowup', 'w'].includes(key)) setActiveKeys((prev) => ({ ...prev, prev: false }));
      if (['arrowdown', 's'].includes(key)) setActiveKeys((prev) => ({ ...prev, next: false }));
      if (key === 'z') setActiveKeys((prev) => ({ ...prev, undo: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleUnfollow, handleKeep, handleUndo, filteredAccounts.length, isLoginOpen, isBatchOpen, isStatsOpen]);

  const unfollowedCount = accounts.filter((a) => a.reviewStatus === 'unfollowed' || !a.isFollowing).length;
  const keptCount = accounts.filter((a) => a.reviewStatus === 'kept').length;

  return (
    <div className="app-container">
      <Navbar
        user={currentUser}
        isAppReady={!!currentUser || isDemoActive}
        unfollowedCount={unfollowedCount}
        keptCount={keptCount}
        totalAccounts={accounts.length}
        bridgeLive={bridgeLive}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
        onClearCache={handleClearCache}
        onOpenBatch={() => setIsBatchOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
      />

      {/* Main View: Pre-Login Hero OR Active Workstation */}
      {(!currentUser && !isDemoActive) ? (
        <PreLoginHero
          onOpenLogin={(method) => {
            setIsLoginOpen(true);
          }}
          onStartDemo={() => {
            setAccounts(applyDecisions(INITIAL_ACCOUNTS));
            setIsDemoActive(true);
            showToast('Vorschau-Modus aktiviert (12 Demo-Profile)');
          }}
          accounts={accounts}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          currentAccount={currentAccount}
          onUnfollow={() => handleUnfollow()}
          onKeep={() => handleKeep()}
          onPrev={() => setSelectedIndex((prev) => Math.max(0, prev - 1))}
          isPressedRed={isPressedRed}
          isPressedGreen={isPressedGreen}
        />
      ) : (
        <main className="main-content">
          <AccountList
            accounts={filteredAccounts}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
            onSelectAccount={setSelectedIndex}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            sessionStats={{ unfollowed: unfollowedCount, kept: keptCount, total: accounts.length }}
          />
          <AccountDetail
            account={currentAccount}
            onUnfollow={() => handleUnfollow()}
            onKeep={() => handleKeep()}
            onUndo={handleUndo}
            canUndo={history.length > 0}
            isPressedRed={isPressedRed}
            isPressedGreen={isPressedGreen}
            tweetStore={tweetStore}
            onManualFetchTweet={handleFetchSingleTweet}
          />
        </main>
      )}

      {/* Floating Keyboard Dock for Swiping Controls */}
      {(currentUser || isDemoActive) && (
        <KeyboardDock
          activeKeys={activeKeys}
          onUnfollow={() => handleUnfollow()}
          onKeep={() => handleKeep()}
          onUndo={handleUndo}
          canUndo={history.length > 0}
        />
      )}

      {/* Modals */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLogin={handleLogin}
        onLogout={handleLogout}
        currentUser={currentUser}
      />

      <BatchUnfollowModal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        accounts={accounts}
        onUnfollowBatch={(unfollowedIds) => {
          setAccounts((prev) =>
            prev.map((acc) => {
              if (!unfollowedIds.includes(acc.id) && !unfollowedIds.includes(acc.handle)) return acc;
              persistDecision(acc.handle, 'unfollowed');
              return { ...acc, isFollowing: false, reviewStatus: 'unfollowed' };
            })
          );
          showToast(`⚡ ${unfollowedIds.length} Accounts in Batch entfolgt!`);
        }}
      />

      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        unfollowedAccounts={accounts.filter((a) => a.reviewStatus === 'unfollowed' || !a.isFollowing)}
        totalInitialFollowing={accounts.length}
      />

      {/* Global Toast Banner */}
      {toastMessage && <Toast message={toastMessage} />}
    </div>
  );
}
