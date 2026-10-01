'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_THEME_ID, THEMES, THEME_STORAGE_KEY, Theme, ThemeId } from './themes';

const THEME_EVENT = 'quiz-party-theme-change';

function readThemeId(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID;
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && saved in THEMES) return saved as ThemeId;
  } catch {
    // stockage indisponible : thème par défaut
  }
  return DEFAULT_THEME_ID;
}

// Thème choisi dans Paramétrage, mémorisé sur cet appareil (localStorage).
export function useTheme(): { theme: Theme; themeId: ThemeId; setTheme: (id: ThemeId) => void } {
  const [themeId, setThemeId] = useState<ThemeId>(readThemeId);

  useEffect(() => {
    const sync = () => setThemeId(readThemeId());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener(THEME_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(THEME_EVENT, sync);
    };
  }, []);

  const setTheme = useCallback((id: ThemeId) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {
      // ignoré : le choix vaudra pour cette session seulement
    }
    setThemeId(id);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return { theme: THEMES[themeId], themeId, setTheme };
}
