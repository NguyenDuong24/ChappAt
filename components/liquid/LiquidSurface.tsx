import React, { useMemo } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { ThemeMode } from '@/context/ThemeContext';
import { getLiquidPalette } from './liquidStyles';

type LiquidSurfaceProps = {
  children?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  themeMode?: ThemeMode;
  intensity?: number;
  borderRadius?: number;
};

export default function LiquidSurface({
  children,
  style,
  themeMode = 'light',
  intensity = 24,
  borderRadius = 18,
}: LiquidSurfaceProps) {
  const palette = useMemo(() => getLiquidPalette(themeMode), [themeMode]);
  const showBlur = Platform.OS === 'ios';

  return (
    <View style={[styles.container, { borderRadius }, style]}>
      <LinearGradient
        colors={palette.cardGradient as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {showBlur && (
        <BlurView
          intensity={intensity}
          tint={themeMode === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFillObject}
        />
      )}

      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            borderRadius,
            borderWidth: 1,
            borderColor: themeMode === 'dark' ? 'rgba(208, 255, 244, 0.2)' : 'rgba(86, 144, 129, 0.24)',
          },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
});

