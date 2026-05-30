import React, { useEffect, useRef, useContext } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { ThemeContext } from '@/context/ThemeContext';
import { getLiquidPalette } from '@/components/liquid';
import { LinearGradient } from 'expo-linear-gradient';

interface AddPostButtonProps {
  isScroll: boolean;
}

export default function AddPostButton({ isScroll }: AddPostButtonProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const palette = React.useMemo(
    () => themeContext?.palette || getLiquidPalette(theme),
    [theme, themeContext]
  );

  // Slide + fade khi scroll
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isScroll ? 1 : 0,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [isScroll]);

  // Pulse và xoay nhẹ khi không scroll
  useEffect(() => {
    if (!isScroll) {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      const rotateLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 8000,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 0,
            duration: 8000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
      rotateLoop.start();
      return () => {
        pulseLoop.stop();
        rotateLoop.stop();
      };
    } else {
      pulseAnim.setValue(1);
      rotateAnim.setValue(0);
    }
  }, [isScroll]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 60],
  });

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX }, { scale: pulseAnim }],
          opacity,
        },
      ]}
    >
      {/* Outer glow ring with rotation */}
      <Animated.View style={[styles.glowRingOuter, { transform: [{ rotate: spin }] }]}>
        <LinearGradient
          colors={[palette.sphereGradient[0] + '60', palette.sphereGradient[1] + '60']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Inner glow ring */}
      <View style={styles.glowRingInner}>
        <LinearGradient
          colors={[palette.sphereGradient[0] + '40', palette.sphereGradient[1] + '40']}
          style={StyleSheet.absoluteFill}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      </View>

      {/* Main button */}
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => router.push('/profile/create')}
        style={styles.touchable}
        accessibilityLabel="Create post"
        accessibilityRole="button"
      >
        <LinearGradient
          colors={[palette.sphereGradient[1], palette.sphereGradient[0]]}
          style={styles.gradientBg}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Inner shine effect */}
          <View style={styles.shineOverlay} />
          <FontAwesome name="plus" size={24} color="#FFF" style={styles.iconShadow} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 105,
    right: 24,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  glowRingOuter: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.5,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  glowRingInner: {
    position: 'absolute',
    width: 66,
    height: 66,
    borderRadius: 33,
    opacity: 0.7,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  touchable: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 18,
        shadowColor: '#000',
      },
    }),
  },
  gradientBg: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 30,
  },
  shineOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  iconShadow: {
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});