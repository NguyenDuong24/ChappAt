import { useTheme } from '@/context/ThemeContext';
import { Colors, getThemeColors } from '@/constants/Colors';

const withAlpha = (color: string | undefined, alpha: string, fallback: string) => {
  if (typeof color !== 'string' || color.length === 0) return fallback;
  if (color[0] === '#' && color.length === 4) {
    const expanded = `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    return `${expanded}${alpha}`;
  }
  if (color[0] === '#' && color.length === 7) {
    return `${color}${alpha}`;
  }
  return fallback;
};

export const useThemedColors = () => {
  const { theme, isDark, palette } = useTheme();

  // Get base theme-specific colors
  const currentThemeColors = getThemeColors(theme);
  const primaryColor = currentThemeColors.tint || palette.primary || Colors.primary;
  const secondaryColor = currentThemeColors.tintLight || palette.secondary || primaryColor;
  const accentColor = currentThemeColors.tintDark || Colors.accent;
  const elevatedSurface = isDark
    ? withAlpha(secondaryColor, '18', 'rgba(255,255,255,0.08)')
    : 'rgba(255,255,255,0.96)';
  const inputSurface = isDark
    ? 'rgba(255,255,255,0.08)'
    : 'rgba(15,23,42,0.045)';
  const softPrimary = isDark
    ? withAlpha(primaryColor, '22', 'rgba(255,255,255,0.12)')
    : withAlpha(primaryColor, '16', 'rgba(15,23,42,0.06)');

  // Create a unified color object that combines theme colors and semantic colors
  return {
    // Core colors from theme
    ...currentThemeColors,

    // NEW Theme Palette Overrides (Liquid Design)
    text: palette.textColor,
    background: 'transparent', // Allow LiquidGlassBackground to show through
    appBackground: currentThemeColors.background,
    surface: palette.cardGradient[0],
    surfaceElevated: elevatedSurface,
    cardBackground: palette.cardGradient[0],
    inputBackground: inputSurface,
    subtleText: palette.subtitleColor,
    border: palette.menuBorder,
    borderDark: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(15,23,42,0.18)',
    separator: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.08)',
    backdrop: isDark ? 'rgba(2,6,23,0.72)' : 'rgba(15,23,42,0.42)',
    icon: palette.textColor,
    mutedText: palette.subtitleColor,
    tint: primaryColor,
    tintLight: secondaryColor,
    tintDark: accentColor,
    backgroundHeader: palette.cardGradient[0],

    // Semantic colors (same for both themes)
    success: Colors.success,
    error: Colors.error,
    danger: Colors.error,
    warning: Colors.warning,
    info: Colors.info,

    // Brand colors
    primary: primaryColor,
    secondary: secondaryColor,
    accent: accentColor,
    brandPrimary: Colors.primary,

    // Utility colors
    white: Colors.white,
    black: Colors.black,
    transparent: Colors.transparent,
    softPrimary,
    shadow: isDark ? '#000000' : '#64748B',

    // HotSpots specific colors (theme-aware)
    hotSpots: {
      background: currentThemeColors.hotSpotsBackground || currentThemeColors.background,
      surface: currentThemeColors.hotSpotsSurface || palette.cardGradient[0],
      surfaceLight: currentThemeColors.hotSpotsSurfaceLight || softPrimary,
      primary: currentThemeColors.hotSpotsPrimary || primaryColor,
      secondary: currentThemeColors.hotSpotsSecondary || '#F97316',
      accent: currentThemeColors.hotSpotsAccent || '#EC4899',
      text: currentThemeColors.hotSpotsText || palette.textColor,
      textSecondary: currentThemeColors.hotSpotsTextSecondary || palette.subtitleColor,
      textTertiary: currentThemeColors.hotSpotsTextTertiary || withAlpha(palette.textColor, '80', 'rgba(148,163,184,0.78)'),
      gradients: {
        primary: (currentThemeColors.gradientHotSpotsPrimary || [primaryColor, secondaryColor]) as any,
        secondary: (currentThemeColors.gradientHotSpotsSecondary || ['#F97316', '#EC4899']) as any,
        card: (currentThemeColors.gradientHotSpotsCard || palette.cardGradient) as any,
        overlay: (currentThemeColors.gradientHotSpotsOverlay || ['transparent', 'rgba(2,6,23,0.76)']) as any,
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
