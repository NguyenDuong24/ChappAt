import React, { useContext, useState, useEffect, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors, PRIMARY_COLOR } from '@/constants/Colors';
import { UserVibe } from '@/types/vibe';
import VibePickerModal from './VibePickerModal';
import { useAuth } from '@/context/authContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VibeStoryModal from './VibeStoryModal';
import AvatarFrame from '../common/AvatarFrame';
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  useAnimatedStyle,
  Easing
} from 'react-native-reanimated';

interface VibeAvatarProps {
  avatarUrl?: string;
  size?: number;
  currentVibe?: UserVibe | null | any;
  onPress?: () => void;
  onVibePress?: () => void;
  showAddButton?: boolean;
  userLocation?: { latitude: number; longitude: number; address?: string };
  storyUser?: { id: string; username?: string; profileUrl?: string };
  // New: control the position of the vibe badge icon relative to the avatar
  vibeBadgePosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  // New: allow hiding the vibe icon entirely (useful when parent draws its own)
  showVibeIcon?: boolean;
  frameType?: string;
}

const VibeAvatar: React.FC<VibeAvatarProps> = ({
  avatarUrl,
  size = 60,
  currentVibe,
  onPress,
  onVibePress,
  showAddButton = true,
  userLocation,
  storyUser,
  vibeBadgePosition = 'bottom-right',
  showVibeIcon = true,
  frameType,
}) => {
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const colors = theme === 'dark' ? Colors.dark : Colors.light;

  const [isVibeModalVisible, setIsVibeModalVisible] = useState(false);
  const [isStoryVisible, setIsStoryVisible] = useState(false);
  const [seen, setSeen] = useState(false);

  // Normalize vibe presence (support objects without isActive)
  const vibeObj = currentVibe?.vibe ? currentVibe.vibe : undefined;

  const isExpired = (expiresAt: any) => {
    if (!expiresAt) return false;
    const now = new Date();
    const expiry = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
    return expiry.getTime() <= now.getTime();
  };

  const hasVibe = !!currentVibe && (!!currentVibe.isActive || !!vibeObj) && !isExpired(currentVibe.expiresAt);

  const framePadding = frameType ? (size * 0.3) : 0;
  const vibeRingSize = size + framePadding + 8;
  const vibeIconSize = size * 0.3;
  const addButtonSize = size * 0.35;

  const seenKey = useMemo(() => (currentVibe?.id ? `vibeSeen:${currentVibe.id}` : undefined), [currentVibe?.id]);

  useEffect(() => {
    let mounted = true;
    const loadSeen = async () => {
      if (!seenKey) return;
      try {
        const v = await AsyncStorage.getItem(seenKey);
        if (mounted) setSeen(!!v);
      } catch { }
    };
    loadSeen();
    return () => { mounted = false };
  }, [seenKey]);

  const avatarContent = (
    <AvatarFrame
      avatarUrl={avatarUrl || ''}
      frameType={frameType}
      size={size}
    />
  );

  const handleAvatarPress = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (hasVibe && storyUser && (currentVibe?.id || currentVibe?.vibe?.id || currentVibe?.vibeId)) {
      setIsStoryVisible(true);
      if (seenKey) AsyncStorage.setItem(seenKey, '1').catch(() => { });
      setSeen(true);
    }
  };

  // Normalize to full UserVibe shape for story modal
  const normalizedVibe: UserVibe | null = useMemo(() => {
    if (!currentVibe || !vibeObj) return null;
    const id = currentVibe.id || currentVibe.vibeId || 'vibe';
    const userId = currentVibe.userId || storyUser?.id || '';
    return {
      id,
      userId,
      vibeId: currentVibe.vibeId || vibeObj.id || id,
      vibe: vibeObj,
      customMessage: currentVibe.customMessage || '',
      createdAt: currentVibe.createdAt || null,
      expiresAt: currentVibe.expiresAt || null,
      isActive: currentVibe.isActive ?? true,
      location: currentVibe.location || undefined,
    } as UserVibe;
  }, [currentVibe, vibeObj, storyUser?.id]);

  const vibePulse = useSharedValue(1);

  useEffect(() => {
    if (hasVibe && !seen) {
      vibePulse.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      vibePulse.value = 1;
    }
  }, [hasVibe, seen]);

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: vibePulse.value }],
    opacity: withTiming(hasVibe ? 1 : 0, { duration: 300 }),
  }));

  const renderAvatar = () => {
    // Hide vibe ring when frame is active to prevent gray background
    if (frameType) {
      return (
        <View style={styles.avatarContainer}>
          {avatarContent}
        </View>
      );
    }

    if (hasVibe && (vibeObj?.color || currentVibe?.vibe?.color)) {
      const color = (vibeObj?.color || currentVibe?.vibe?.color) as string;
      const ringTuple = seen
        ? ['#C7C7CC', '#E5E5EA', '#C7C7CC'] as [string, string, string]
        : [color, `${color}80`, color] as [string, string, string];

      // Even with a frame, we can show a subtle glow ring behind it
      const finalRingColors = ringTuple;

      return (
        <View style={styles.avatarContainer}>
          <Animated.View style={animatedRingStyle}>
            <LinearGradient
              colors={finalRingColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.vibeRing,
                {
                  width: vibeRingSize,
                  height: vibeRingSize,
                  borderRadius: vibeRingSize / 2,
                  // Add a glow effect
                  shadowColor: color,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: seen ? 0 : 0.6,
                  shadowRadius: 10,
                  elevation: seen ? 0 : 10,
                }
              ]}
            >
              <View style={[
                styles.avatarWrapper,
                {
                  width: size + framePadding,
                  height: size + framePadding,
                  borderRadius: (size + framePadding) / 2,
                  backgroundColor: frameType ? 'transparent' : colors.background,
                }
              ]}>
                {avatarContent}
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      );
    }

    return (
      <View style={styles.avatarContainer}>
        {avatarContent}
      </View>
    );
  };

  const handleVibePress = () => {
    if (onVibePress) {
      onVibePress();
    } else {
      setIsVibeModalVisible(true);
    }
  };

  const getBadgePositionStyle = (): any => {
    const offset = frameType ? -(framePadding / 4) : -2;
    switch (vibeBadgePosition) {
      case 'top-left':
        return { top: offset, left: offset };
      case 'top-right':
        return { top: offset, right: offset };
      case 'bottom-left':
        return { bottom: offset, left: offset };
      case 'bottom-right':
      default:
        return { bottom: offset, right: offset };
    }
  };

  const renderVibeIcon = () => {
    if (!showVibeIcon) return null;

    if (!hasVibe) {
      // Show add vibe button
      if (showAddButton) {
        return (
          <TouchableOpacity
            style={[
              styles.addVibeButton,
              {
                width: addButtonSize,
                height: addButtonSize,
                borderRadius: addButtonSize / 2,
                backgroundColor: PRIMARY_COLOR,
                // Add button stays at bottom-right for affordance
                bottom: 0,
                right: 0,
              }
            ]}
            onPress={handleVibePress}
            activeOpacity={0.8}
          >
            <MaterialIcons name="add" size={addButtonSize * 0.6} color="white" />
          </TouchableOpacity>
        );
      }
      return null;
    }

    const color = (vibeObj?.color || currentVibe?.vibe?.color) as string;
    const emoji = (vibeObj?.emoji || currentVibe?.vibe?.emoji) as string;

    // Show current vibe icon
    return (
      <TouchableOpacity
        style={[
          styles.vibeIcon,
          {
            width: vibeIconSize,
            height: vibeIconSize,
            borderRadius: vibeIconSize / 2,
            backgroundColor: color,
            ...getBadgePositionStyle(),
          }
        ]}
        onPress={handleVibePress}
        activeOpacity={0.8}
      >
        <Text style={[styles.vibeEmoji, { fontSize: vibeIconSize * 0.6 }]}>
          {emoji}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={handleAvatarPress}
        activeOpacity={0.8}
      >
        <View style={styles.avatarSection}>
          {renderAvatar()}
          {renderVibeIcon()}
        </View>
      </TouchableOpacity>

      <VibePickerModal
        visible={isVibeModalVisible}
        onClose={() => setIsVibeModalVisible(false)}
        userLocation={userLocation}
      />

      {normalizedVibe && storyUser && (
        <VibeStoryModal
          visible={isStoryVisible}
          onClose={() => { setIsStoryVisible(false); setSeen(true); }}
          user={{ id: storyUser.id, username: storyUser.username, profileUrl: storyUser.profileUrl }}
          userVibe={normalizedVibe}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  avatarSection: {
    position: 'relative',
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  vibeRing: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    borderRadius: 1000,
  },
  defaultAvatar: {
    borderRadius: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vibeIcon: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addVibeButton: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  vibeEmoji: {
    textAlign: 'center',
  },
});

export default VibeAvatar;
