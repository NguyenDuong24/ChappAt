import { Platform, type TextStyle, type ViewStyle } from 'react-native';
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { Colors, getThemeColors, isDarkTheme } from '@/constants/Colors';
import type { ThemeMode } from '@/context/ThemeContext';

export type LiquidPalette = {
  appGradient: string[];
  glowTop: string[];
  glowBottom: string[];
  cardGradient: string[];
  sphereGradient: string[];
  menuBackground: string;
  menuBorder: string;
  textColor: string;
  subtitleColor: string;
  primary: string;
  secondary: string;
};

/**
 * Nhà máy tạo Palette (Theme Factory)
 * Tự động lấy cấu hình từ Colors.ts dựa trên theme hiện tại.
 */
export function getLiquidPalette(theme: ThemeMode = 'light'): LiquidPalette {
  const t = getThemeColors(theme);

  return {
    appGradient: t.gradientBackground,
    glowTop: t.glowTop,
    glowBottom: t.glowBottom,
    cardGradient: t.gradientCard,
    sphereGradient: t.gradientPrimary,
    menuBackground: t.menuBackground,
    menuBorder: t.menuBorder,
    textColor: t.text,
    subtitleColor: t.subtleText,
    primary: t.tint,
    secondary: t.tintLight || t.tint,
  };
}

export function getLiquidMenuContentStyle(theme: ThemeMode = 'light'): ViewStyle {
  const palette = getLiquidPalette(theme);
  return {
    backgroundColor: palette.menuBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.menuBorder,
    minWidth: 180,
    overflow: 'hidden',
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#000000',
          shadowOpacity: 0.15,
          shadowRadius: 15,
          shadowOffset: { width: 0, height: 8 },
        }
      : {
          elevation: 6,
        }),
  };
}

export function getLiquidMenuItemTitleStyle(theme: ThemeMode = 'light'): TextStyle {
  const palette = getLiquidPalette(theme);
  return {
    color: palette.textColor,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.1,
  };
}

export function getLiquidPaperTheme(theme: ThemeMode = 'light') {
  const palette = getLiquidPalette(theme);
  
  // Tự động nhận diện dark/light dựa trên màu nền theme.
  const isDark = isDarkTheme(theme);
  const base = isDark ? MD3DarkTheme : MD3LightTheme;

  return {
    ...base,
    roundness: 22,
    colors: {
      ...base.colors,
      primary: Colors.primary,
      secondary: Colors.secondary,
      background: 'transparent',
      surface: palette.menuBackground,
      surfaceVariant: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
      onSurface: palette.textColor,
      onSurfaceVariant: palette.subtitleColor,
      outline: palette.menuBorder,
      error: Colors.error,
    },
  };
}
