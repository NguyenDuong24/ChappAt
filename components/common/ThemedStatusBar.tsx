import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useContext } from 'react';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';

interface Props {
  backgroundColor?: string;
  style?: 'light' | 'dark' | 'auto' | 'inverted';
  translucent?: boolean;
}

// A tiny wrapper so every screen can have a consistent status bar color
// matching the current theme header by default, with per-screen overrides.
export default function ThemedStatusBar({ backgroundColor, style, translucent = false }: Props) {
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  return (
    <StatusBar
      style={style ?? (theme === 'dark' ? 'light' : 'dark')}
      backgroundColor={backgroundColor ?? currentThemeColors.backgroundHeader}
      translucent={translucent}
      animated
    />
  );
}
