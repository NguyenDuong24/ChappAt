import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
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
  defaultTheme = 'light'
}) => {
  const [theme, setThemeState] = useState<ThemeMode>(defaultTheme);

  // Load theme from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') {
          setThemeState(saved as ThemeMode);
        }
      } catch { }
    })();
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme).catch(() => { });
  };

  const toggleTheme = () => {
    setThemeState((prev: ThemeMode) => {
      const next: ThemeMode = prev === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => { });
      return next;
    });
  };

  const value: ThemeContextType = React.useMemo(() => ({
    theme,
    toggleTheme,
    setTheme,
  }), [theme]);

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
