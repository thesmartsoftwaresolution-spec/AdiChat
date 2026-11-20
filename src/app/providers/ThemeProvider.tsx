import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ThemePreference } from '../../types/database';
import {
  applyThemeToDocument,
  loadStoredTheme,
  resolveEffectiveTheme,
  saveStoredTheme,
} from '../../services/theme.service';

interface ThemeContextValue {
  preference: ThemePreference;
  effectiveTheme: 'light' | 'dark';
  setTheme: (pref: ThemePreference) => void;
  toggleLightDark: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreference] = useState<ThemePreference>(() => loadStoredTheme());
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() =>
    resolveEffectiveTheme(loadStoredTheme())
  );

  useEffect(() => {
    const resolved = applyThemeToDocument(preference);
    setEffectiveTheme(resolved);
    saveStoredTheme(preference);
  }, [preference]);

  useEffect(() => {
    if (preference !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      setEffectiveTheme(applyThemeToDocument('system'));
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [preference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      effectiveTheme,
      setTheme: (pref) => setPreference(pref),
      toggleLightDark: () =>
        setPreference((prev) => (resolveEffectiveTheme(prev) === 'dark' ? 'light' : 'dark')),
    }),
    [preference, effectiveTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
