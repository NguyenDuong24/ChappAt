import React, { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { ThemeMode } from '@/context/ThemeContext';
import { getLiquidPalette } from './liquidStyles';

type LiquidGlassBackgroundProps = {
  themeMode?: ThemeMode;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export default function LiquidGlassBackground({
  themeMode = 'light',
  style,
  children,
}: LiquidGlassBackgroundProps) {
  const palette = useMemo(() => getLiquidPalette(themeMode), [themeMode]);

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={palette.appGradient as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <LinearGradient
        colors={palette.glowTop as [string, string, ...string[]]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.85, y: 0.85 }}
        style={[styles.glowLayer, styles.topGlow]}
      />

      <LinearGradient
        colors={palette.glowBottom as [string, string, ...string[]]}
        start={{ x: 0.85, y: 0.2 }}
        end={{ x: 0.1, y: 1 }}
        style={[styles.glowLayer, styles.bottomGlow]}
      />

      <View pointerEvents="none" style={styles.noiseOverlay} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  glowLayer: {
    position: 'absolute',
    borderRadius: 999,
  },
  topGlow: {
    width: 380,
    height: 380,
    top: -170,
    left: -120,
  },
  bottomGlow: {
    width: 420,
    height: 420,
    right: -160,
    bottom: -180,
  },
  noiseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.015)',
  },
});

