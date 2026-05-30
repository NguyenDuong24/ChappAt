// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  InteractionManager,
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
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
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
  deferContentMount?: boolean;
  contentMountDelayMs?: number;
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
  deferContentMount = true,
  contentMountDelayMs = 90,
  panelStyle,
  contentContainerStyle,
}: RevealSideSheetProps) => {
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(width * widthRatio, maxWidth);
  const progress = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);
  const [contentReady, setContentReady] = useState(!deferContentMount || visible);
  const contentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionRef = useRef<{ cancel?: () => void } | null>(null);

  const finishClose = useCallback(() => {
    setMounted(false);
    setContentReady(!deferContentMount);
  }, [deferContentMount]);

  useEffect(() => {
    if (contentTimerRef.current) {
      clearTimeout(contentTimerRef.current);
      contentTimerRef.current = null;
    }

    if (interactionRef.current?.cancel) {
      interactionRef.current.cancel();
      interactionRef.current = null;
    }

    if (visible) {
      setMounted(true);
      if (deferContentMount) {
        setContentReady(false);
        contentTimerRef.current = setTimeout(() => {
          interactionRef.current = InteractionManager.runAfterInteractions(() => {
            setContentReady(true);
            interactionRef.current = null;
          });
          contentTimerRef.current = null;
        }, contentMountDelayMs);
      } else {
        setContentReady(true);
      }
    }

    progress.value = visible
      ? withSpring(1, {
        damping: 24,
        stiffness: 220,
        mass: 0.9,
        overshootClamping: true,
        restDisplacementThreshold: 0.001,
        restSpeedThreshold: 0.001,
      })
      : withTiming(0, {
        duration: 180,
      }, (finished) => {
      if (finished && !visible) {
        runOnJS(finishClose)();
      }
    });

    return () => {
      if (contentTimerRef.current) {
        clearTimeout(contentTimerRef.current);
        contentTimerRef.current = null;
      }
      if (interactionRef.current?.cancel) {
        interactionRef.current.cancel();
        interactionRef.current = null;
      }
    };
  }, [contentMountDelayMs, deferContentMount, finishClose, progress, visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.8], [0, 1], Extrapolate.CLAMP),
    backgroundColor: 'rgba(1, 15, 20, 0.62)',
  }));

  const sheetStyle = useAnimatedStyle(() => {
    const travel = panelWidth + 24;
    const hidden = side === 'right' ? travel : -travel;

    return {
      transform: [
        { translateX: interpolate(progress.value, [0, 1], [hidden, 0], Extrapolate.CLAMP) },
        { scale: interpolate(progress.value, [0, 1], [0.985, 1], Extrapolate.CLAMP) },
      ],
      opacity: interpolate(progress.value, [0, 0.18, 1], [0, 1, 1], Extrapolate.CLAMP),
    };
  });

  if (!mounted) return null;

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
        <View style={[styles.content, contentContainerStyle]}>
          {contentReady ? children : null}
        </View>
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
    shadowOpacity: Platform.OS === 'ios' ? 0.28 : 0,
    shadowRadius: 24,
    elevation: Platform.OS === 'android' ? 8 : 24,
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
