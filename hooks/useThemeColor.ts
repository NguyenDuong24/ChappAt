/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, getThemeColors, isDarkTheme } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const { theme } = useTheme();
  const colorFromProps = isDarkTheme(theme) ? props.dark : props.light;
  const currentThemeColors = getThemeColors(theme);

  if (colorFromProps) {
    return colorFromProps;
  } else {
    const key = String(colorName);
    return currentThemeColors[key] ?? Colors.light[key];
  }
}
