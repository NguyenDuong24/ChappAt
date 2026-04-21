import React, { createContext, useState, useContext, ReactNode, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLiquidPalette, LiquidPalette } from '../components/liquid/liquidStyles';
import { DEFAULT_THEME, getAvailableThemes, isDarkTheme, isThemeKey } from '../constants/Colors';

export type ThemeMode = string;

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  palette: LiquidPalette;
  themes: ThemeMode[];
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeMode;
}

const THEME_STORAGE_KEY = '@chappat:theme_preference';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = DEFAULT_THEME
}) => {
  const [theme, setThemeState] = useState<ThemeMode>(
    isThemeKey(defaultTheme) ? defaultTheme : DEFAULT_THEME
  );
  const themes = useMemo<ThemeMode[]>(() => {
    const allThemes = getAvailableThemes();
    if (allThemes.length === 0) return [DEFAULT_THEME];
    return allThemes;
  }, []);

  // Load theme from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved && isThemeKey(saved)) {
          setThemeState(saved as ThemeMode);
        }
      } catch { }
    })();
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    const nextTheme = isThemeKey(newTheme) ? newTheme : DEFAULT_THEME;
    setThemeState(nextTheme);
    AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme).catch(() => { });
  };

  const toggleTheme = () => {
    setThemeState((prev: ThemeMode) => {
      const currentIndex = themes.indexOf(prev);
      const nextIndex = (currentIndex + 1) % themes.length;
      const next = themes[nextIndex] || DEFAULT_THEME;
      AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => { });
      return next;
    });
  };

  const isDark = useMemo(() => {
    return isDarkTheme(theme);
  }, [theme]);

  const palette = useMemo(() => {
    return getLiquidPalette(theme);
  }, [theme]);

  const value: ThemeContextType = useMemo(() => ({
    theme,
    isDark,
    palette,
    themes,
    toggleTheme,
    setTheme,
  }), [theme, isDark, palette, themes]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
