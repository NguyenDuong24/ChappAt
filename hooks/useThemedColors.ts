import { useTheme } from '@/context/ThemeContext';
import { Colors, getThemeColors } from '@/constants/Colors';

export const useThemedColors = () => {
  const { theme, isDark, palette } = useTheme();

  // Get base theme-specific colors
  const currentThemeColors = getThemeColors(theme);

  // Create a unified color object that combines theme colors and semantic colors
  return {
    // Core colors from theme
    ...currentThemeColors,

    // NEW Theme Palette Overrides (Liquid Design)
    text: palette.textColor,
    background: 'transparent', // Allow LiquidGlassBackground to show through
    surface: palette.cardGradient[0],
    cardBackground: palette.cardGradient[0],
    subtleText: palette.subtitleColor,
    border: palette.menuBorder,
    icon: palette.textColor,

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
        primary: currentThemeColors.gradientHotSpotsPrimary as any,
        secondary: currentThemeColors.gradientHotSpotsSecondary as any,
        card: currentThemeColors.gradientHotSpotsCard as any,
        overlay: currentThemeColors.gradientHotSpotsOverlay as any,
      }
    },

    // Current theme mode
    isDark,
    theme,
    palette,
  };
};

// Alternative hook for just getting the current theme colors
export const useCurrentThemeColors = () => {
  const { theme } = useTheme();
  return getThemeColors(theme);
};
