import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  Extrapolate,
} from 'react-native-reanimated';

type RevealSide = 'left' | 'right';

interface RevealScalableViewProps {
  revealed: boolean;
  children: React.ReactNode;
  side?: RevealSide;
  style?: StyleProp<ViewStyle>;
  disabledInteraction?: boolean;
  scale?: number;
  offset?: number;
}

const RevealScalableView = ({
  revealed,
  children,
  side = 'right',
  style,
  disabledInteraction = true,
  scale = 0.9,
  offset = 84,
}: RevealScalableViewProps) => {
  const progress = useSharedValue(0); // Always start at 0 for smooth mount animation

  useEffect(() => {
    progress.value = withSpring(revealed ? 1 : 0, {
      damping: 28,
      stiffness: 260,
      mass: 0.6,
      restDisplacementThreshold: 0.001,
      restSpeedThreshold: 0.001,
    });
  }, [progress, revealed]);

  const animatedStyle = useAnimatedStyle(() => {
    const direction = side === 'right' ? -1 : 1;

    return {
      transform: [
        { translateX: interpolate(progress.value, [0, 1], [0, direction * offset], Extrapolate.CLAMP) },
        { translateY: interpolate(progress.value, [0, 1], [0, 10], Extrapolate.CLAMP) },
        { scale: interpolate(progress.value, [0, 1], [1, scale], Extrapolate.CLAMP) },
      ],
      borderRadius: interpolate(progress.value, [0, 1], [0, 36], Extrapolate.CLAMP),
      borderWidth: interpolate(progress.value, [0, 1], [0, 1], Extrapolate.CLAMP),
      borderColor: interpolateColor(
        progress.value,
        [0, 1],
        ['rgba(255,255,255,0)', 'rgba(255,255,255,0.22)']
      ),
      shadowOpacity: interpolate(progress.value, [0, 1], [0, 0.25], Extrapolate.CLAMP),
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        ['transparent', 'rgba(0,0,0,0.02)']
      ),
    };
  });

  return (
    <Animated.View
      pointerEvents={revealed && disabledInteraction ? 'none' : 'auto'}
      renderToHardwareTextureAndroid={revealed}
      shouldRasterizeIOS={revealed}
      style={[styles.base, style, animatedStyle]}
    >
      {children}
    </Animated.View>
  );
};

const styles = {
  base: {
    flex: 1,
    shadowColor: '#03131A',
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    overflow: 'hidden' as const,
  },
};

export default RevealScalableView;
