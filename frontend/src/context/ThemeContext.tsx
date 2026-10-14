import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeName = 'light' | 'dark' | 'obsidian' | 'emerald' | 'sapphire' | 'amethyst' | 'champagne';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getInitialTheme(): ThemeName {
  try {
    const saved = localStorage.getItem('alsaifee_theme') as ThemeName | null;
    if (saved === 'dark' || saved === 'light') return saved;
    // Migrate legacy themes: dark jewel tones -> dark, champagne -> light
    if (saved === 'obsidian' || saved === 'emerald' || saved === 'sapphire' || saved === 'amethyst') return 'dark';
    if (saved === 'champagne') return 'light';
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  } catch {
    return 'light';
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(getInitialTheme);

  const setTheme = (t: ThemeName) => {
    const next: ThemeName = t === 'obsidian' || t === 'emerald' || t === 'sapphire' || t === 'amethyst' ? 'dark' : t === 'champagne' ? 'light' : t;
    setThemeState(next);
    try {
      localStorage.setItem('alsaifee_theme', next);
    } catch {}
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
