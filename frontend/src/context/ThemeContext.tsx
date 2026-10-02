import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeName = 'obsidian' | 'emerald' | 'sapphire' | 'amethyst' | 'champagne';

export interface ThemeOption {
  id: ThemeName;
  name: string;
  bgHex: string;
  accentHex: string;
  previewGradient: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'obsidian',
    name: 'Obsidian & Gold',
    bgHex: '#0a0a0a',
    accentHex: '#d4af37',
    previewGradient: 'linear-gradient(135deg, #0a0a0a 0%, #d4af37 100%)',
  },
  {
    id: 'emerald',
    name: 'Imperial Emerald & Gold',
    bgHex: '#06120e',
    accentHex: '#e5c158',
    previewGradient: 'linear-gradient(135deg, #06120e 0%, #e5c158 100%)',
  },
  {
    id: 'sapphire',
    name: 'Midnight Sapphire & Amber',
    bgHex: '#070e1b',
    accentHex: '#eaa839',
    previewGradient: 'linear-gradient(135deg, #070e1b 0%, #eaa839 100%)',
  },
  {
    id: 'amethyst',
    name: 'Velvet Amethyst & Rose Gold',
    bgHex: '#120716',
    accentHex: '#e5a8a8',
    previewGradient: 'linear-gradient(135deg, #120716 0%, #e5a8a8 100%)',
  },
  {
    id: 'champagne',
    name: 'Champagne Silk & Bronze',
    bgHex: '#faf7f2',
    accentHex: '#a68028',
    previewGradient: 'linear-gradient(135deg, #faf7f2 0%, #a68028 100%)',
  },
];

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  currentOption: ThemeOption;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    try {
      const saved = localStorage.getItem('alsaifee_theme');
      return (saved as ThemeName) || 'obsidian';
    } catch {
      return 'obsidian';
    }
  });

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('alsaifee_theme', newTheme);
    } catch (e) {}
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const currentOption = THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, currentOption }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
