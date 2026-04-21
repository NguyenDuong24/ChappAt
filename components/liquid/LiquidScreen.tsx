import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ThemeMode } from '@/context/ThemeContext';
import LiquidSurface from './LiquidSurface';
import LiquidGlassBackground from './LiquidGlassBackground';

type LiquidScreenProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  themeMode?: ThemeMode;
  useInsetSurface?: boolean;
};


export default function LiquidScreen({
  children,
  style,
  themeMode = 'light',
  useInsetSurface = false,
}: LiquidScreenProps) {
  return (
    <LiquidGlassBackground themeMode={themeMode} style={[styles.container, style]}>
      {useInsetSurface ? (
        <LiquidSurface themeMode={themeMode} style={styles.insetSurface} intensity={18} borderRadius={22}>
           <View style={styles.insetInner}>{children}</View>
        </LiquidSurface>
      ) : (
        children
      )}
    </LiquidGlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  insetSurface: {
    flex: 1,
    marginHorizontal: 10,
    marginTop: 6,
    marginBottom: 2,
  },
  insetInner: {
    flex: 1,
    overflow: 'hidden',
  },
});

