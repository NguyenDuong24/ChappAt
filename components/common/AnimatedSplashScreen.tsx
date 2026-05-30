import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { Image } from "expo-image";

const { width, height } = Dimensions.get("window");

interface AnimatedSplashScreenProps {
  onAnimationComplete: () => void;
  isReady: boolean;
}

const AnimatedSplashScreen: React.FC<AnimatedSplashScreenProps> = ({
  onAnimationComplete,
  isReady,
}) => {
  const [isAnimationDone, setIsAnimationDone] = useState(false);
  const splashScale = useSharedValue(1.02);
  const splashOpacity = useSharedValue(0);
  const bgOpacity = useSharedValue(1);
  const splashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startAnimation = () => {
    splashScale.value = withTiming(1, {
      duration: 900,
      easing: Easing.out(Easing.exp),
    });
    splashOpacity.value = withTiming(1, {
      duration: 450,
      easing: Easing.out(Easing.exp),
    });

    const minimumSplashTime = 2200;
    if (splashTimerRef.current) clearTimeout(splashTimerRef.current);
    splashTimerRef.current = setTimeout(() => {
      setIsAnimationDone(true);
      splashTimerRef.current = null;
    }, minimumSplashTime);
  };

  useEffect(() => {
    startAnimation();
    return () => {
      if (splashTimerRef.current) clearTimeout(splashTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isReady && isAnimationDone) {
      bgOpacity.value = withTiming(
        0,
        { duration: 600, easing: Easing.inOut(Easing.ease) },
        (finished) => {
          if (finished) {
            runOnJS(onAnimationComplete)();
          }
        },
      );
    }
  }, [isReady, isAnimationDone]);

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const splashImageStyle = useAnimatedStyle(() => ({
    opacity: splashOpacity.value,
    transform: [{ scale: splashScale.value }],
  }));

  return (
    <Animated.View style={[styles.container, bgStyle]}>
      <Animated.View style={[styles.splashImageWrap, splashImageStyle]}>
        <Image
          source={require("../../assets/images/splash.png")}
          style={styles.splashImage}
          contentFit="cover"
        />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  splashImageWrap: {
    width,
    height,
  },
  splashImage: {
    width,
    height,
  },
});

export default AnimatedSplashScreen;
