import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import React, { useEffect, useRef } from 'react';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function AddPostButton({ isScroll }) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const router = useRouter();

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
    <Animated.View style={[styles.createPostButton, { transform: [{ translateX }], opacity }]}>
      <TouchableOpacity onPress={() => router.push('/profile/create')}>
        <FontAwesome name="plus" size={24} color="#0080ff" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  createPostButton: {
    borderRadius: 50,
    height: 50,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#63e6ff',
    zIndex: 100,
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
});
