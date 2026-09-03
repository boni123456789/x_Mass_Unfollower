import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import Navbar from './components/Navbar';
import PreLoginHero from './components/PreLoginHero';
import AccountList from './components/AccountList';
import AccountDetail from './components/AccountDetail';
import LoginModal from './components/LoginModal';
import BatchUnfollowModal from './components/BatchUnfollowModal';
import StatsModal from './components/StatsModal';
import KeyboardDock from './components/KeyboardDock';
import Toast from './components/Toast';
import QueueBanner from './components/QueueBanner';
import { INITIAL_ACCOUNTS } from './mockData';
import { fetchUserTweets, extensionInstalled } from './services/tweetFetch';
import { isInactiveAccount, isNoFollowBack } from './utils/filterUtils.js';
import { useLanguage } from './i18n/LanguageContext.jsx';
import {
  playKeepPop,
  playUnfollowThud,
  playUndo,
  playTap,
  playCelebrationFanfare
} from './utils/soundHaptics.js';

const DECISIONS_KEY = 'csx_review_decisions';

function loadDecisions() {
  try {
    return JSON.parse(localStorage.getItem(DECISIONS_KEY) || '{}');
  } catch {
    return {};
  }
}

function normHandle(h) {
  return String(h || '').replace(/^@/, '').toLowerCase().trim();
}

function persistDecision(handle, status) {
  if (!handle) return;
  const all = loadDecisions();
  const key = normHandle(handle);
  if (status) all[key] = status;
  else delete all[key];
  try {
    localStorage.setItem(DECISIONS_KEY, JSON.stringify(all));
  } catch {}
}

function applyDecisions(list) {
  const decisions = loadDecisions();
  return (list || []).map((acc) => {
    const key = normHandle(acc.handle);
    const status = decisions[key] || decisions[`@${key}`];
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
  const { t } = useLanguage();
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

  const [accounts, setAccounts] = useState(() => applyDecisions(INITIAL_ACCOUNTS));
  const [isLoadingLive, setIsLoadingLive] = useState(() => !!localStorage.getItem('csx_user'));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState(['all']);

  // Global Tweet Store & Rolling Window Prefetch
  const [tweetStore, setTweetStore] = useState({});
  const pendingFetches = useRef(new Set());
  const tweetStoreRef = useRef({});
  const manualInflightRef = useRef(new Set());
  const hasLiveData = useRef(false);
  const lastRateLimitRef = useRef(0);

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

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  // Live Queue & Rate Limit state
  const [queueStatus, setQueueStatus] = useState({
    pendingCount: 0,
    failedCount: 0,
    completedCount: 0,
    isRateLimited: false,
    resetInMs: 0
  });

  const fetchQueueStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/x/queue_status');
      if (res.ok) {
        const data = await res.json();
        setQueueStatus(data);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchQueueStatus]);

  const handleSyncLiveDiff = useCallback(async () => {
    try {
      const decisions = loadDecisions();
      const unfollowedItems = (accounts || [])
        .filter((acc) => decisions[String(acc.handle || '').toLowerCase()] === 'unfollowed' || acc.reviewStatus === 'unfollowed' || acc.isFollowing === false)
        .map((acc) => ({ handle: acc.handle, userId: acc.id }));

      if (unfollowedItems.length === 0) {
        showToast(t('toasts.noUnfollowedToSync'));
        return;
      }

      const res = await fetch('/api/x/sync_live_diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unfollowedItems })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.addedCount > 0) {
          showToast(t('toasts.unconfirmedAddedToQueue', { count: data.addedCount }));
        } else {
          showToast(t('toasts.allSyncedOrQueued'));
        }
        fetchQueueStatus();
      }
    } catch (e) {
      showToast(t('toasts.syncDiffError'));
    }
  }, [accounts, fetchQueueStatus, showToast, t]);

  const handleResumeQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/x/resume_queue', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showToast(t('toasts.rateLimitLifted', { count: data.pendingCount }));
        fetchQueueStatus();
      }
    } catch (e) {
      showToast(t('toasts.resumeQueueError'));
    }
  }, [fetchQueueStatus, showToast, t]);

  const handleResetQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/x/reset_queue', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showToast(t('toasts.queueReset', { count: data.pendingCount }));
        fetchQueueStatus();
      }
    } catch (e) {
      showToast(t('toasts.resetQueueError'));
    }
  }, [fetchQueueStatus, showToast, t]);

  const handlePauseQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/x/pause_queue', { method: 'POST' });
      if (res.ok) {
        showToast(t('toasts.queuePaused'));
        fetchQueueStatus();
      }
    } catch (e) {
      showToast(t('toasts.queuePauseError'));
    }
  }, [fetchQueueStatus, showToast, t]);

  const handleClearQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/x/clear_queue', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showToast(t('toasts.queueCleared', { count: data.clearedCount || 0 }));
        fetchQueueStatus();
      }
    } catch (e) {
      showToast(t('toasts.queueClearError'));
    }
  }, [fetchQueueStatus, showToast, t]);

  const handleRemoveFromQueue = useCallback(async (handle, userId) => {
    try {
      const res = await fetch('/api/x/remove_from_queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, userId })
      });
      if (res.ok) {
        showToast(t('toasts.removedFromQueue', { handle }));
        fetchQueueStatus();
      }
    } catch (e) {}
  }, [fetchQueueStatus, showToast, t]);

  const handleRequeueFailed = useCallback(async () => {
    try {
      const res = await fetch('/api/x/requeue_failed', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showToast(t('toasts.requeuedFailed', { count: data.requeuedCount || 0 }));
        fetchQueueStatus();
      }
    } catch (e) {}
  }, [fetchQueueStatus, showToast, t]);

  // Auto-check for server-imported accounts from x.com on mount or focus (with localStorage fallback)
  const checkServerImport = useCallback(async () => {
    if (hasLiveData.current) return;
    setIsLoadingLive(true);
    let loaded = false;
    try {
      const res = await fetch('/api/x/imported');
      if (res.ok) {
        const data = await res.json();
        if (data.user && data.accounts && data.accounts.length > 0) {
          hasLiveData.current = true;
          setCurrentUser(data.user);
          setAccounts(applyDecisions(data.accounts));
          setSelectedIndex(0);
          setIsDemoActive(true);
          localStorage.setItem('csx_user', JSON.stringify(data.user));
          localStorage.setItem('csx_imported_accounts', JSON.stringify(data.accounts));
          showToast(t('toasts.profilesLoaded', { count: data.accounts.length }));
          loaded = true;
        }
      }
    } catch (e) {
      // Server not running or no import session
    }

    if (!loaded && !hasLiveData.current) {
      try {
        const savedAccounts = localStorage.getItem('csx_imported_accounts');
        const savedUser = localStorage.getItem('csx_user');
        if (savedAccounts && savedUser) {
          const parsedAccounts = JSON.parse(savedAccounts);
          const parsedUser = JSON.parse(savedUser);
          if (parsedAccounts && parsedAccounts.length > 0) {
            hasLiveData.current = true;
            setCurrentUser(parsedUser);
            setAccounts(applyDecisions(parsedAccounts));
            setSelectedIndex(0);
            setIsDemoActive(true);
            showToast(t('toasts.profilesRestored', { count: parsedAccounts.length }));
          }
        }
      } catch (e) {
        // ignore parse error
      }
    }

    setIsLoadingLive(false);
  }, [t, showToast]);

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
        showToast(t('toasts.liveUnfollowFailed'));
      }
    };
    window.addEventListener('message', onMsg);
    window.postMessage({ source: 'CSX_APP', type: 'PING' }, '*');
    const retry = setTimeout(() => window.postMessage({ source: 'CSX_APP', type: 'PING' }, '*'), 600);
    return () => {
      window.removeEventListener('message', onMsg);
      clearTimeout(retry);
    };
  }, [t, showToast]);

  // Listen for browser-import events from LoginModal
  useEffect(() => {
    const handleImport = (e) => {
      const data = e.detail;
      if (data?.user && data?.accounts?.length > 0) {
        hasLiveData.current = true;
        setCurrentUser(data.user);
        setAccounts(applyDecisions(data.accounts));
        setSelectedIndex(0);
        setIsDemoActive(true);
        showToast(t('toasts.profilesImported', { count: data.accounts.length }));
      }
    };
    window.addEventListener('csx-import', handleImport);
    return () => window.removeEventListener('csx-import', handleImport);
  }, [t, showToast]);

  const filteredAccounts = useMemo(() => {
    const filtersList = Array.isArray(activeFilter) ? activeFilter : [activeFilter || 'all'];

    return accounts.filter((acc) => {
      const matchesSearch =
        acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.handle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.bio.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;
      if (filtersList.includes('all') || filtersList.length === 0) return true;

      for (const filterId of filtersList) {
        if (filterId === 'no_follow_back' || filterId === 'not_following_back') {
          if (!isNoFollowBack(acc)) return false;
        } else if (filterId === 'inactive') {
          if (!isInactiveAccount(acc)) return false;
        } else if (filterId === 'pending' || filterId === 'offen') {
          const isPending = acc.reviewStatus !== 'kept' && acc.reviewStatus !== 'unfollowed' && acc.isFollowing !== false;
          if (!isPending) return false;
        } else if (filterId === 'unfollowed') {
          const isUnfollowed = acc.reviewStatus === 'unfollowed' || acc.isFollowing === false;
          if (!isUnfollowed) return false;
        } else if (filterId === 'kept') {
          const isKept = acc.reviewStatus === 'kept';
          if (!isKept) return false;
        }
      }

      return true;
    });
  }, [accounts, searchTerm, activeFilter]);

  useEffect(() => {
    tweetStoreRef.current = tweetStore;
  }, [tweetStore]);

  const loadAccountTweets = useCallback(async (account) => {
    const handle = account?.handle;
    if (!handle) return;
    if (manualInflightRef.current.has(handle)) return;
    if (pendingFetches.current.has(handle)) return;

    // Pause auto-prefetching if 429 Rate Limit was recently hit (25s cooldown)
    if (Date.now() - lastRateLimitRef.current < 25000) return;

    const existing = tweetStoreRef.current[handle];
    if (existing?.tweets?.length >= 3) return;
    if (existing?.loading) return;
    if (existing?.fetched) return;
    if (existing?.triedAt && Date.now() - existing.triedAt < 15000) return;

    pendingFetches.current.add(handle);
    setTweetStore((prev) => ({
      ...prev,
      [handle]: { tweets: prev[handle]?.tweets || [], fetched: false, loading: true }
    }));
    try {
      const res = await fetchUserTweets(handle, { userId: account.id });
      if (manualInflightRef.current.has(handle)) return;

      const tweets = res?.tweets || (Array.isArray(res) ? res : []);
      const rateLimited = !!res?.rateLimited;
      const error = !!res?.error;

      if (rateLimited) {
        lastRateLimitRef.current = Date.now();
      }

      setTweetStore((prev) => ({
        ...prev,
        [handle]: {
          tweets: tweets,
          fetched: !rateLimited && !error && (tweets.length > 0 || res?.success === true),
          rateLimited: rateLimited,
          error: error || rateLimited,
          loading: false,
          triedAt: Date.now()
        }
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
          rateLimited: false,
          triedAt: Date.now()
        }
      }));
    } finally {
      pendingFetches.current.delete(handle);
    }
  }, []);

  useEffect(() => {
    if (!currentUser || !isDemoActive || filteredAccounts.length === 0) return;
    
    // Staggered rolling window range: 1 behind, current account, 3 ahead
    const targets = [
      filteredAccounts[selectedIndex - 1],
      filteredAccounts[selectedIndex],
      filteredAccounts[selectedIndex + 1],
      filteredAccounts[selectedIndex + 2],
      filteredAccounts[selectedIndex + 3]
    ].filter((acc) => acc?.handle);

    const timers = targets.map((acc, i) => {
      return setTimeout(() => {
        loadAccountTweets(acc);
      }, i * 150);
    });

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [selectedIndex, currentUser, isDemoActive, loadAccountTweets, filteredAccounts]);

  const handleFetchSingleTweet = useCallback((handle, userId) => {
    if (!currentUser && !extensionInstalled()) {
      showToast(t('toasts.liveApiDisabledPreview'));
      return;
    }

    lastRateLimitRef.current = 0; // reset cooldown on manual click
    pendingFetches.current.delete(handle);
    manualInflightRef.current.add(handle);
    setTweetStore((prev) => ({
      ...prev,
      [handle]: { tweets: [], fetched: false, loading: true, rateLimited: false }
    }));

    fetchUserTweets(handle, { userId, force: true })
      .then((res) => {
        const tweets = res?.tweets || (Array.isArray(res) ? res : []);
        const rateLimited = !!res?.rateLimited;
        if (rateLimited) {
          lastRateLimitRef.current = Date.now();
          showToast(t('toasts.rateLimitReached'));
        } else if (tweets.length > 0) {
          showToast(t('toasts.tweetsLoaded', { count: tweets.length, handle }));
        } else {
          showToast(t('toasts.noTweetsFound', { handle }));
        }

        setTweetStore((prev) => ({
          ...prev,
          [handle]: {
            tweets: tweets,
            fetched: !rateLimited && (tweets.length > 0 || res?.success === true),
            rateLimited: rateLimited,
            error: rateLimited,
            loading: false,
            triedAt: Date.now()
          }
        }));
      })
      .catch(() => {
        setTweetStore((prev) => ({
          ...prev,
          [handle]: { tweets: prev[handle]?.tweets || [], fetched: false, loading: false, error: true, triedAt: Date.now() }
        }));
        showToast(t('toasts.fetchTweetsError', { handle }));
      })
      .finally(() => {
        manualInflightRef.current.delete(handle);
      });
  }, [currentUser, t, showToast]);

  const handleLogin = useCallback((newUser) => {
    setCurrentUser(newUser);
    setIsDemoActive(true);
    if (newUser?.isRealSession === false) {
      setAccounts(applyDecisions(INITIAL_ACCOUNTS));
    }
    try {
      localStorage.setItem('csx_user', JSON.stringify(newUser));
    } catch (e) {}
    showToast(t('toasts.loggedInAs', { handle: newUser.handle }));
  }, [t, showToast]);

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

    showToast(t('toasts.sessionCleared'));
  }, [t, showToast]);

  const handleClearCache = useCallback(async () => {
    try {
      await fetch('/api/x/clear_cache', { method: 'POST' });
    } catch (e) {}
    setTweetStore({});
    pendingFetches.current.clear();
    showToast(t('toasts.tweetCacheCleared'));
  }, [t, showToast]);

  const handleToggleTheme = useCallback(() => {
    setTheme(prev => prev === 'clay-light' ? 'clay-dark' : 'clay-light');
  }, []);

  const currentAccount = filteredAccounts[selectedIndex] || filteredAccounts[0] || null;
  const advanceFromRef = useRef(null);

  const isPendingAccount = useCallback((acc) => {
    if (!acc) return false;
    if (acc.reviewStatus === 'kept' || acc.reviewStatus === 'unfollowed') return false;
    return acc.isFollowing !== false;
  }, []);

  useEffect(() => {
    const fromAccount = advanceFromRef.current;
    if (!fromAccount) return;
    advanceFromRef.current = null;
    setSelectedIndex((prev) => {
      const list = filteredAccounts;
      if (!list.length) return 0;
      const stillVisible = list.some((a) => accountsMatch(a, fromAccount));
      if (!stillVisible) {
        const idx = Math.min(prev, list.length - 1);
        for (let i = 0; i < list.length; i++) {
          const j = (idx + i) % list.length;
          if (isPendingAccount(list[j])) return j;
        }
        return idx;
      }
      const start = list.findIndex((a) => accountsMatch(a, fromAccount));
      const from = start >= 0 ? start : prev;
      for (let i = 1; i <= list.length; i++) {
        const idx = (from + i) % list.length;
        const acc = list[idx];
        if (!acc || accountsMatch(acc, fromAccount)) continue;
        if (isPendingAccount(acc)) return idx;
      }
      return Math.min(Math.max(from, 0), list.length - 1);
    });
  }, [accounts, filteredAccounts, isPendingAccount]);

  const handleUnfollow = useCallback((maybeAccount) => {
    const accountToUnfollow = isAccountPayload(maybeAccount) ? maybeAccount : currentAccount;
    if (!accountToUnfollow?.handle) return;

    playUnfollowThud();
    setIsPressedRed(true);
    setTimeout(() => setIsPressedRed(false), 240);

    const prevReviewed = accounts.filter((a) => a.reviewStatus === 'kept' || a.reviewStatus === 'unfollowed').length;
    const newTotal = prevReviewed + 1;
    if ([10, 25, 50, 100, 250, 500].includes(newTotal)) {
      try {
        confetti({ particleCount: 55, spread: 70, origin: { y: 0.65 } });
      } catch {}
      playCelebrationFanfare();
      showToast(t('toasts.milestoneReached', { count: newTotal }));
    }

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

    advanceFromRef.current = accountToUnfollow;
  }, [currentAccount, selectedIndex, accounts, showToast, t]);

  const handleKeep = useCallback((maybeAccount) => {
    const accountToKeep = isAccountPayload(maybeAccount) ? maybeAccount : currentAccount;
    if (!accountToKeep?.handle) return;

    playKeepPop();
    setIsPressedGreen(true);
    setTimeout(() => setIsPressedGreen(false), 240);

    const prevReviewed = accounts.filter((a) => a.reviewStatus === 'kept' || a.reviewStatus === 'unfollowed').length;
    const newTotal = prevReviewed + 1;
    if ([10, 25, 50, 100, 250, 500].includes(newTotal)) {
      try {
        confetti({ particleCount: 55, spread: 70, origin: { y: 0.65 } });
      } catch {}
      playCelebrationFanfare();
      showToast(t('toasts.milestoneReached', { count: newTotal }));
    }

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

    advanceFromRef.current = accountToKeep;
  }, [currentAccount, selectedIndex, accounts, showToast, t]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;

    playUndo();
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
    const verb = lastAction.action === 'unfollow' ? t('toasts.undoVerbUnfollow') : t('toasts.undoVerbKeep');
    showToast(t('toasts.undoSuccess', { verb, handle: lastAction.account.handle }));
  }, [history, t, showToast]);

  // Keyboard Shortcuts Listener with Haptics & Visual Key Depress
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore key events when typing inside input fields or modals are open
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (isLoginOpen || isBatchOpen || isStatsOpen) return;

      const key = e.key.toLowerCase();

      if (e.key === 'ArrowLeft' || key === 'u') {
        e.preventDefault();
        setActiveKeys((prev) => ({ ...prev, arrowleft: true, u: true, unfollow: true }));
        handleUnfollow();
      } else if (e.key === 'ArrowRight' || key === 'k') {
        e.preventDefault();
        setActiveKeys((prev) => ({ ...prev, arrowright: true, k: true, keep: true }));
        handleKeep();
      } else if (e.key === 'ArrowUp' || key === 'w') {
        e.preventDefault();
        playTap();
        setActiveKeys((prev) => ({ ...prev, arrowup: true, w: true, prev: true }));
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown' || key === 's') {
        e.preventDefault();
        playTap();
        setActiveKeys((prev) => ({ ...prev, arrowdown: true, s: true, next: true }));
        setSelectedIndex((prev) => Math.min(prev + 1, filteredAccounts.length - 1));
      } else if (e.key === ' ') {
        e.preventDefault();
        playTap();
        setActiveKeys((prev) => ({ ...prev, ' ': true, space: true }));
      } else if (key === 'z') {
        e.preventDefault();
        setActiveKeys((prev) => ({ ...prev, z: true, undo: true }));
        handleUndo();
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (['arrowleft', 'u'].includes(key)) setActiveKeys((prev) => ({ ...prev, arrowleft: false, u: false, unfollow: false }));
      if (['arrowright', 'k'].includes(key)) setActiveKeys((prev) => ({ ...prev, arrowright: false, k: false, keep: false }));
      if (['arrowup', 'w'].includes(key)) setActiveKeys((prev) => ({ ...prev, arrowup: false, w: false, prev: false }));
      if (['arrowdown', 's'].includes(key)) setActiveKeys((prev) => ({ ...prev, arrowdown: false, s: false, next: false }));
      if (e.key === ' ') setActiveKeys((prev) => ({ ...prev, ' ': false, space: false }));
      if (key === 'z') setActiveKeys((prev) => ({ ...prev, z: false, undo: false }));
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
        queueStatus={queueStatus}
        onSyncLiveDiff={handleSyncLiveDiff}
        onResumeQueue={handleResumeQueue}
      />

      <QueueBanner
        queueStatus={queueStatus}
        bridgeLive={bridgeLive}
        onResumeQueue={handleResumeQueue}
        onPauseQueue={handlePauseQueue}
        onResetQueue={handleResetQueue}
        onClearQueue={handleClearQueue}
        onRemoveFromQueue={handleRemoveFromQueue}
        onRequeueFailed={handleRequeueFailed}
        onOpenStats={() => setIsStatsOpen(true)}
        accounts={accounts}
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
            showToast(t('toasts.previewModeActivated'));
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
      <KeyboardDock
        activeKeys={activeKeys}
        onUnfollow={() => handleUnfollow()}
        onKeep={() => handleKeep()}
        onUndo={handleUndo}
        canUndo={history.length > 0}
      />

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
        onBatchUnfollow={(unfollowedIds) => {
          const unfollowSet = new Set(
            (unfollowedIds || []).flatMap((item) => {
              if (typeof item === 'object' && item !== null) {
                return [normHandle(item.handle), normHandle(item.id)].filter(Boolean);
              }
              return [normHandle(item)].filter(Boolean);
            })
          );

          const batchItems = accounts
            .filter((acc) => {
              const handleKey = normHandle(acc.handle);
              const idKey = normHandle(acc.id);
              return unfollowSet.has(handleKey) || unfollowSet.has(idKey);
            })
            .map((acc) => ({ handle: acc.handle, userId: acc.id }));

          batchItems.forEach((item) => persistDecision(item.handle, 'unfollowed'));

          setAccounts((prev) =>
            prev.map((acc) => {
              const handleKey = normHandle(acc.handle);
              const idKey = normHandle(acc.id);
              const isTarget = unfollowSet.has(handleKey) || unfollowSet.has(idKey);
              if (!isTarget) return acc;
              return { ...acc, isFollowing: false, reviewStatus: 'unfollowed' };
            })
          );

          if (batchItems.length > 0) {
            fetch('/api/x/sync_live_diff', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ unfollowedItems: batchItems })
            }).then(() => fetchQueueStatus()).catch(() => {});
          }

          showToast(t('toasts.batchUnfollowedAndQueued', { count: batchItems.length }));
        }}
      />

      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        unfollowedAccounts={accounts.filter((a) => a.reviewStatus === 'unfollowed' || !a.isFollowing)}
        totalInitialFollowing={accounts.length}
        queueStatus={queueStatus}
        onSyncLiveDiff={handleSyncLiveDiff}
      />

      {/* Global Toast Banner */}
      {toastMessage && <Toast message={toastMessage} />}
    </div>
  );
}
