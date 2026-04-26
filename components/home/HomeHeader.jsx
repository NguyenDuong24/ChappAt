import React, { memo } from 'react';
import { Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/context/authContext';
import { useThemedColors } from '@/hooks/useThemedColors';

export const HOME_HEADER_HEIGHT = Platform.OS === 'ios' ? 108 : (StatusBar.currentHeight || 24) + 68;

const HomeHeader = ({
  activeFiltersCount = 0,
  onOpenFilter,
  onOpenSettings,
  onOpenRadar,
}) => {
  const { user } = useAuth();
  const colors = useThemedColors();
  const avatar = user?.profileUrl || user?.photoURL || user?.avatarUrl;
  const displayName = user?.username || user?.displayName || 'bạn';
  const headerGradient = colors.palette?.appGradient || colors.gradientBackground || [colors.background, colors.surface, colors.background];
  const accentGradient = colors.palette?.sphereGradient || colors.gradientPrimary || ['#FF35B8', '#8B5CF6', '#22D3EE'];

  return (
    <Animated.View entering={FadeInDown.duration(520).springify()} style={styles.container}>
      <LinearGradient
        colors={headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { borderColor: colors.border }]}
      >
        <View style={styles.identityRow}>
          {/* Avatar */}
          <Pressable
            style={[styles.avatarWrap, { borderColor: colors.border }]}
            onPress={onOpenSettings}
          >
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" transition={180} />
            ) : (
              <LinearGradient colors={accentGradient} style={styles.avatarFallback}>
                <Ionicons name="person" size={22} color="#fff" />
              </LinearGradient>
            )}
            <View style={[styles.onlineDot, { borderColor: colors.background || '#0A0E1F' }]} />
          </Pressable>

          {/* Greeting */}
          <View style={styles.titleBlock}>
            <View style={styles.greetRow}>
              <Text style={[styles.title, { color: colors.text }]}>Hi, {displayName} 👋</Text>
            </View>
            <Text style={[styles.subtitle, { color: colors.subtleText }]} numberOfLines={1}>
              Find your vibe today
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            <Pressable
              style={[styles.iconButton, { backgroundColor: 'rgba(255,255,255,0.07)', borderColor: colors.border }]}
              onPress={onOpenRadar}
            >
              <Ionicons name="location-outline" size={20} color={colors.text} />
            </Pressable>
            <Pressable
              style={[styles.iconButton, { backgroundColor: 'rgba(255,255,255,0.07)', borderColor: colors.border }]}
              onPress={onOpenFilter}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.text} />
              {activeFiltersCount > 0 ? (
                <View style={styles.notifyBadge}>
                  <Text style={styles.notifyText}>{activeFiltersCount > 99 ? '99+' : activeFiltersCount}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HOME_HEADER_HEIGHT,
    zIndex: 1000,
  },
  header: {
    minHeight: HOME_HEADER_HEIGHT,
    paddingTop: Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight || 24) + 10,
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 0,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    position: 'relative',
    zIndex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  onlineDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    backgroundColor: '#22C55E',
    zIndex: 10,
  },
  titleBlock: {
    flex: 1,
  },
  greetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.7,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  notifyBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0A0E1F',
  },
  notifyText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
  },
});

export default memo(HomeHeader);
