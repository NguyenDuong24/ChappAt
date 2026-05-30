/**
 * NearbyEntryButton — Floating action button to launch Chạm Sóng
 * 
 * Drop anywhere:
 *   import { NearbyEntryButton } from '@/components/nearby/NearbyEntryButton';
 *   <NearbyEntryButton />
 */
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

export function NearbyEntryButton() {
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [pulsing, setPulsing] = useState(false);

  // Subtle pulse every 5 seconds to suggest activity
  useEffect(() => {
    const loop = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    };

    loop();
    const interval = setInterval(loop, 5000);
    return () => clearInterval(interval);
  }, [pulseAnim]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/nearby-match');
  };

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.85, 1],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale }], opacity },
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        style={styles.button}
        activeOpacity={0.8}
      >
        <Ionicons name="pulse" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 999,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
});
