import React, { memo, useEffect } from 'react';
import {
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useAuth } from '@/context/authContext';
import { useThemedColors } from '@/hooks/useThemedColors';

export const HOME_HEADER_HEIGHT =
  Platform.OS === 'ios' ? 108 : (StatusBar.currentHeight || 24) + 68;

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
  const headerGradient =
    colors.palette?.appGradient ||
    colors.gradientBackground ||
    [colors.background, colors.surface, colors.background];
  const accentGradient =
    colors.palette?.sphereGradient ||
    colors.gradientPrimary ||
    ['#FF35B8', '#8B5CF6', '#22D3EE'];
  const actionButtonBackground =
    colors.surfaceElevated ||
    colors.inputBackground ||
    'rgba(255,255,255,0.07)';

  // ── Hiệu ứng sóng radar lan tỏa ──────────────────────────
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.8, { duration: 1400, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    pulseOpacity.value = withRepeat(
      withTiming(0, { duration: 1400, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
  }, []);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));
  // ─────────────────────────────────────────────────────────

  return (
    <Animated.View
      entering={FadeInDown.duration(520).springify()}
      style={styles.container}
    >
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
              <Image
                source={{ uri: avatar }}
                style={styles.avatar}
                contentFit="cover"
                transition={180}
              />
            ) : (
              <LinearGradient colors={accentGradient} style={styles.avatarFallback}>
                <Ionicons name="person" size={22} color="#fff" />
              </LinearGradient>
            )}
            <View
              style={[
                styles.onlineDot,
                { borderColor: colors.background || '#0A0E1F' },
              ]}
            />
          </Pressable>

          {/* Greeting */}
          <View style={styles.titleBlock}>
            <View style={styles.greetRow}>
              <Text style={[styles.title, { color: colors.text }]}>
                Hi, {displayName} 👋
              </Text>
            </View>
            <Text
              style={[styles.subtitle, { color: colors.subtleText }]}
              numberOfLines={1}
            >
              Find your vibe today
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            {/* Radar button với hiệu ứng sóng */}
            <View style={styles.radarButtonContainer}>
              {/* Vòng sóng lan tỏa */}
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    borderColor: colors.primary || '#22D3EE',
                  },
                  pulseAnimatedStyle,
                ]}
              />
              <Pressable
                style={[
                  styles.iconButton,
                  {
                    backgroundColor: actionButtonBackground,
                    borderColor: colors.border,
                    // Thêm chút shadow để nổi bật
                    shadowColor: colors.primary || '#22D3EE',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                    elevation: 6,
                  },
                ]}
                onPress={onOpenRadar}
              >
                <MaterialCommunityIcons
                  name="radar"
                  size={22}
                  color={colors.primary || '#22D3EE'}
                />
              </Pressable>
            </View>

            {/* Nút lọc/thông báo */}
            <Pressable
              style={[
                styles.iconButton,
                {
                  backgroundColor: actionButtonBackground,
                  borderColor: colors.border,
                },
              ]}
              onPress={onOpenFilter}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.text} />
              {activeFiltersCount > 0 ? (
                <View style={styles.notifyBadge}>
                  <Text style={styles.notifyText}>
                    {activeFiltersCount > 99 ? '99+' : activeFiltersCount}
                  </Text>
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
  radarButtonContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
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