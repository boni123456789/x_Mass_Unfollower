import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import de from './locales/de.js';
import en from './locales/en.js';

const translations = { de, en };

const LanguageContext = createContext(null);

export const LANGUAGE_KEY = 'csx_language';

function getInitialLanguage() {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved === 'de' || saved === 'en') return saved;
    if (typeof navigator !== 'undefined' && navigator.language) {
      if (navigator.language.toLowerCase().startsWith('de')) return 'de';
    }
  } catch (e) {}
  return 'de';
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_KEY, language);
    } catch (e) {}
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', language);
    }
  }, [language]);

  const setLanguage = useCallback((lang) => {
    if (lang === 'de' || lang === 'en') {
      setLanguageState(lang);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === 'de' ? 'en' : 'de'));
  }, []);

  const t = useCallback((path, params = {}) => {
    if (!path) return '';
    const keys = path.split('.');
    
    let current = translations[language];
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        current = null;
        break;
      }
    }

    // Fallback to German if missing in English
    if (current === null || current === undefined) {
      let fallback = translations.de;
      for (const key of keys) {
        if (fallback && typeof fallback === 'object' && key in fallback) {
          fallback = fallback[key];
        } else {
          fallback = null;
          break;
        }
      }
      current = fallback;
    }

    // Fallback to English if missing in German
    if (current === null || current === undefined) {
      let fallback = translations.en;
      for (const key of keys) {
        if (fallback && typeof fallback === 'object' && key in fallback) {
          fallback = fallback[key];
        } else {
          fallback = null;
          break;
        }
      }
      current = fallback;
    }

    if (typeof current !== 'string') {
      return path;
    }

    let result = current;
    for (const [paramKey, paramVal] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
    }
    return result;
  }, [language]);

  // Helper for formatting time strings across languages
  const formatTime = useCallback((timeStr) => {
    if (!timeStr) return language === 'de' ? 'Unbekannt' : 'Unknown';
    if (language === 'de') return timeStr;

    // Convert common German time patterns to English
    let res = String(timeStr);
    res = res.replace(/^Heute\b/i, 'Today');
    res = res.replace(/^Gestern\b/i, 'Yesterday');
    res = res.replace(/Vor\s+(\d+)\s+Std\./gi, '$1 hrs ago');
    res = res.replace(/Vor\s+1\s+Std\./gi, '1 hr ago');
    res = res.replace(/Vor\s+(\d+)\s+Tagen/gi, '$1 days ago');
    res = res.replace(/Vor\s+1\s+Tag/gi, '1 day ago');
    res = res.replace(/Vor\s+(\d+)\s+Monaten/gi, '$1 months ago');
    res = res.replace(/Vor\s+1\s+Monat/gi, '1 month ago');
    res = res.replace(/(\d+)\s+Std\./gi, '$1 hrs');
    res = res.replace(/\(Heute\)/gi, '(Today)');
    res = res.replace(/Unbekannt/gi, 'Unknown');
    res = res.replace(/\bJanuar\b/gi, 'January')
             .replace(/\bFebruar\b/gi, 'February')
             .replace(/\bMärz\b/gi, 'March')
             .replace(/\bMai\b/gi, 'May')
             .replace(/\bJuni\b/gi, 'June')
             .replace(/\bJuli\b/gi, 'July')
             .replace(/\bOktober\b/gi, 'October')
             .replace(/\bDezember\b/gi, 'December');

    return res;
  }, [language]);

  const value = useMemo(() => ({
    language,
    isGerman: language === 'de',
    isEnglish: language === 'en',
    setLanguage,
    toggleLanguage,
    t,
    formatTime
  }), [language, setLanguage, toggleLanguage, t, formatTime]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
