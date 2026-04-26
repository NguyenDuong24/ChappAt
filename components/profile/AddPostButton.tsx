import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import React, { useEffect, useRef, useContext } from 'react';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemeContext } from '@/context/ThemeContext';
import { getLiquidPalette } from '@/components/liquid';
import { LinearGradient } from 'expo-linear-gradient';

interface AddPostButtonProps {
  isScroll: boolean;
}

export default function AddPostButton({ isScroll }: AddPostButtonProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const palette = React.useMemo(() => themeContext?.palette || getLiquidPalette(theme), [theme, themeContext]);

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isScroll ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isScroll]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 60],
  });

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <Animated.View style={[styles.createPostButtonContainer, { transform: [{ translateX }], opacity }]}>
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => router.push('/profile/create')}
        style={styles.touchable}
      >
        <LinearGradient
          colors={palette.sphereGradient as [string, string, ...string[]]}
          style={styles.gradientBg}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <FontAwesome name="plus" size={24} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  createPostButtonContainer: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    zIndex: 100,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  touchable: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  gradientBg: {
    height: 56,
    width: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

