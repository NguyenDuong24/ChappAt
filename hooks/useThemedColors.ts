import { useContext } from 'react';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';

export const useThemedColors = () => {
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  
  // Get theme-specific colors
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  
  // Create a unified color object that combines theme colors and semantic colors
  return {
    // Core colors from theme
    ...currentThemeColors,
    
    // Semantic colors (same for both themes)
    success: Colors.success,
    error: Colors.error,
    warning: Colors.warning,
    info: Colors.info,
    
    // Brand colors
    primary: Colors.primary,
    secondary: Colors.secondary,
    accent: Colors.accent,
    
    // Utility colors
    white: Colors.white,
    black: Colors.black,
    transparent: Colors.transparent,
    
    // HotSpots specific colors (theme-aware)
    hotSpots: {
      background: currentThemeColors.hotSpotsBackground,
      surface: currentThemeColors.hotSpotsSurface,
      surfaceLight: currentThemeColors.hotSpotsSurfaceLight,
      primary: currentThemeColors.hotSpotsPrimary,
      secondary: currentThemeColors.hotSpotsSecondary,
      accent: currentThemeColors.hotSpotsAccent,
      text: currentThemeColors.hotSpotsText,
      textSecondary: currentThemeColors.hotSpotsTextSecondary,
      textTertiary: currentThemeColors.hotSpotsTextTertiary,
      gradients: {
        primary: currentThemeColors.gradientHotSpotsPrimary,
        secondary: currentThemeColors.gradientHotSpotsSecondary,
        card: currentThemeColors.gradientHotSpotsCard,
        overlay: currentThemeColors.gradientHotSpotsOverlay,
      }
    },
    
    // Current theme mode
    isDark: theme === 'dark',
    theme,
  };
};

// Alternative hook for just getting the current theme colors
export const useCurrentThemeColors = () => {
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  return theme === 'dark' ? Colors.dark : Colors.light;
};
