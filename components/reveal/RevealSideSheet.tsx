import React, { useEffect } from 'react';
import {
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  Extrapolate,
} from 'react-native-reanimated';

type SheetSide = 'left' | 'right';

interface RevealSideSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: SheetSide;
  widthRatio?: number;
  maxWidth?: number;
  topInset?: number;
  bottomInset?: number;
  allowBackdropDismiss?: boolean;
  panelStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

const RevealSideSheet = ({
  visible,
  onClose,
  children,
  side = 'left',
  widthRatio = 0.86,
  maxWidth = 460,
  topInset = Platform.OS === 'ios' ? 52 : 16,
  bottomInset = 16,
  allowBackdropDismiss = true,
  panelStyle,
  contentContainerStyle,
}: RevealSideSheetProps) => {
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(width * widthRatio, maxWidth);
  const progress = useSharedValue(0); // Always start from 0 to ensure animation from mount

  useEffect(() => {
    progress.value = withSpring(visible ? 1 : 0, {
      damping: 34,
      stiffness: 220,
      mass: 0.9,
      restDisplacementThreshold: 0.001,
      restSpeedThreshold: 0.001,
    });
  }, [progress, visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.8], [0, 1], Extrapolate.CLAMP),
    backgroundColor: 'rgba(1, 15, 20, 0.62)',
  }));

  const sheetStyle = useAnimatedStyle(() => {
    const travel = panelWidth + 60;
    const hidden = side === 'right' ? travel : -travel;

    return {
      transform: [
        { translateX: interpolate(progress.value, [0, 1], [hidden, 0], Extrapolate.CLAMP) },
        { 
          scale: interpolate(
            progress.value, 
            [0, 0.5, 1], 
            [0.92, 0.98, 1], 
            Extrapolate.CLAMP
          ) 
        },
      ],
      opacity: interpolate(progress.value, [0, 0.4, 1], [0, 0.5, 1], Extrapolate.CLAMP),
    };
  });

  const innerContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.3, 1], [0, 1], Extrapolate.CLAMP),
    transform: [
      { scale: interpolate(progress.value, [0.3, 1], [0.95, 1], Extrapolate.CLAMP) }
    ]
  }));

  return (
    <View pointerEvents={visible ? 'auto' : 'box-none'} style={styles.root}>
      <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[styles.backdrop, backdropStyle]}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={allowBackdropDismiss ? onClose : undefined}
        />
      </Animated.View>

      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        renderToHardwareTextureAndroid={visible}
        shouldRasterizeIOS={visible}
        style={[
          styles.panel,
          side === 'right' ? styles.panelRight : styles.panelLeft,
          { width: panelWidth, top: topInset, bottom: bottomInset },
          sheetStyle,
          panelStyle,
        ]}
      >
        <Animated.View style={[styles.content, contentContainerStyle, innerContentStyle]}>
          {children}
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    position: 'absolute',
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: '#00080A',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: Platform.OS === 'ios' ? 0.38 : 0.32,
    shadowRadius: 32,
    elevation: 24,
    backgroundColor: 'transparent',
  },
  panelRight: {
    right: 12,
  },
  panelLeft: {
    left: 12,
  },
  content: {
    flex: 1,
  },
});

export default RevealSideSheet;
