import { useRouter, useSegments } from 'expo-router';
import React, { useContext } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Text, RefreshControl, Animated } from 'react-native';
import { Avatar, Card, Chip } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/Colors';
import { calculateDistance } from '@/utils/calculateDistance';
import { LinearGradient } from 'expo-linear-gradient';

import { LocationContext } from '@/context/LocationContext';
import { ThemeContext } from '@/context/ThemeContext';
import { useAuth } from '@/context/authContext';
import VibeAvatar from '@/components/vibe/VibeAvatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ListUser({ users, onRefresh, refreshing }: any) {
  const router = useRouter();
  const segments = useSegments();
  const { location } = React.useContext(LocationContext);
  const insets = useSafeAreaInsets();
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const { user: viewer } = useAuth();
  const viewerShowOnline = viewer?.showOnlineStatus !== false;

  // Derive activeTab from segments
  const activeTab = Array.isArray(segments) ? (segments[0] === '(tabs)' ? segments[1] : segments[0]) : segments[0];

  // Per-item scale refs stored in a map (avoid hooks inside renderItem)
  const scaleMapRef = React.useRef<Record<string, Animated.Value>>({});
  const getScaleForKey = (key: string) => {
    const map = scaleMapRef.current;
    if (!map[key]) {
      map[key] = new Animated.Value(1);
    }
    return map[key];
  };

  const renderUserItem = ({ item, index }: any) => {
    const ageColor = item.gender === 'male' ? Colors.secondary : item.gender === 'female' ? Colors.primary : currentThemeColors.subtleText;
    const genderIconColor = item.gender === 'male' ? Colors.primary : item.gender === 'female' ? Colors.secondary : currentThemeColors.subtleText;
    const gradientColors: [string, string] = item.gender === 'male'
      ? ['#667eea', '#764ba2']
      : item.gender === 'female'
        ? ['#f093fb', '#f5576c']
        : ['#4facfe', '#00f2fe'];

    let distance = 0;
    if (location) {
      distance = calculateDistance(location.coords, item?.location);
    }

    // Prepare current vibe (if available on user item)
    const currentVibe = item?.currentVibe?.vibe ? item.currentVibe : null;
    const vibe = currentVibe?.vibe;

    // Subtle press animation per-item without hooks in renderItem
    const key = String(item?.id || item?.uid || index);
    const scale = getScaleForKey(key);
    const handlePressIn = () => {
      Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
    };
    const handlePressOut = () => {
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
    };

    return (
      <Card style={[styles.userCard, { backgroundColor: currentThemeColors.surface || currentThemeColors.background }]}>
        <TouchableOpacity
          style={styles.userContainer}
          onPress={() => {
            // Navigate to UserProfileScreen within the current tab's stack
            if (activeTab === 'home') {
              router.push({
                pathname: "/(tabs)/home/UserProfileScreen",
                params: { userId: item.id }
              });
            } else {
              router.push({
                pathname: "/UserProfileScreen",
                params: { userId: item.id }
              });
            }
          }}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.85}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            {/* Card Gradient Border */}
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientBorder}
            >
              <View style={[styles.cardContent, { backgroundColor: currentThemeColors.surface || currentThemeColors.background }]}>
                {/* Avatar Section */}
                <View style={styles.avatarSection}>
                  <View style={styles.avatarContainer}>
                    <View style={[styles.avatarBorder, { borderColor: vibe ? vibe.color : 'white' }]}>
                      <VibeAvatar
                        avatarUrl={item.profileUrl}
                        size={50}
                        currentVibe={item.currentVibe || null}
                        showAddButton={false}
                        storyUser={{ id: item.id, username: item.username, profileUrl: item.profileUrl }}
                      />
                    </View>
                    {/* Online Status Indicator */}
                    {viewerShowOnline && (
                      <View style={[
                        styles.statusIndicator,
                        item.isOnline ? styles.online : styles.offline
                      ]}>
                        <View style={[styles.statusDot, item.isOnline ? styles.onlineDot : styles.offlineDot]} />
                      </View>
                    )}
                    {/* Vibe emoji badge on avatar */}
                    {vibe && (
                      <View style={[styles.vibeEmojiBadge, { backgroundColor: vibe.color }]}>
                        <Text style={styles.vibeEmojiBadgeText}>{vibe.emoji}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* User Info Section */}
                <View style={styles.userInfo}>
                  <View style={styles.textContainer}>
                    {/* Header row: name only */}
                    <View style={styles.headerRow}>
                      <View style={styles.nameRowLeft}>
                        <Text style={[styles.userName, { color: currentThemeColors.text }]} numberOfLines={1}>
                          {item.username}
                        </Text>
                        <MaterialCommunityIcons
                          name={item.gender === 'male' ? "gender-male" : item.gender === 'female' ? "gender-female" : "account"}
                          size={16}
                          color={genderIconColor}
                        />
                      </View>
                    </View>


                    {/* Bio */}
                    <Text style={[styles.bio, { color: currentThemeColors.subtleText }]} numberOfLines={1}>
                      {item.bio || "Chưa có thông tin giới thiệu"}
                    </Text>


                    {/* Vibe row (if user has a current vibe) */}
                    {vibe && (
                      <View style={styles.vibeRow}>
                        <LinearGradient
                          colors={[vibe.color + 'CC', vibe.color + '99']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.vibePill}
                        >
                          <Text style={styles.vibePillEmoji}>{vibe.emoji}</Text>
                          <Text style={styles.vibePillText} numberOfLines={1}>{vibe.name}</Text>
                        </LinearGradient>
                        {currentVibe?.customMessage ? (
                          <Text
                            numberOfLines={1}
                            style={[styles.vibeMessage, { color: currentThemeColors.subtleText }]}
                          >
                            {`"${currentVibe.customMessage}"`}
                          </Text>
                        ) : null}
                      </View>
                    )}

                    {/* Tags Section (age and distance) */}
                    <View style={styles.tagsContainer}>
                      <Chip
                        compact
                        style={[styles.ageChip, { backgroundColor: ageColor + '15' }]}
                        textStyle={[styles.chipText, { color: ageColor }]}
                        icon="calendar"
                      >
                        {typeof item.age === 'number' ? `${item.age} tuổi` : 'N/A'}
                      </Chip>
                      {distance !== null && !isNaN(distance) && (
                        <Chip
                          compact
                          style={[styles.distanceChipSmall, { backgroundColor: currentThemeColors.tint + '15' }]}
                          textStyle={[styles.chipText, { color: currentThemeColors.tint }]}
                          icon="map-marker"
                        >
                          {distance.toFixed(1)} km
                        </Chip>
                      )}
                    </View>
                  </View>

                  {/* Action Button */}
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      const dest = activeTab === 'chat'
                        ? `/(tabs)/chat/${item.id}`
                        : activeTab === 'home'
                          ? `/(tabs)/home/chat/${item.id}`
                          : `/chat/${item.id}`;
                      router.push(dest as any);
                    }}
                  >
                    <LinearGradient
                      colors={gradientColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.actionGradient}
                    >
                      <MaterialIcons name="chat" size={18} color="white" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <FlatList
      data={users.filter((user: any) => user.username && user.profileUrl && user.age !== null && user.age !== undefined && user.gender)}
      renderItem={renderUserItem}
      keyExtractor={(item) => item.id || item.uid}
      contentContainerStyle={[
        styles.listContainer,
        { backgroundColor: currentThemeColors.background, flexGrow: 1, paddingTop: insets.top + 80 }
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
      initialNumToRender={8}
      windowSize={10}
      removeClippedSubviews
    />
  );
}

const styles = StyleSheet.create({
  userCard: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    overflow: 'visible',
  },
  userContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradientBorder: {
    padding: 2,
    borderRadius: 16,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingBottom: 8,
    borderRadius: 14,
  },
  avatarSection: {
    width: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarBorder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  avatar: {
    backgroundColor: 'transparent',
    borderRadius: 30,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  onlineDot: { backgroundColor: Colors.success },
  offlineDot: { backgroundColor: Colors.warning },
  online: { backgroundColor: Colors.success },
  offline: { backgroundColor: Colors.warning },
  vibeEmojiBadge: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  vibeEmojiBadgeText: { fontSize: 12 },
  userInfo: {
    flex: 1,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start', // thay đổi từ space-between thành flex-start
    marginBottom: 1,
  },
  nameRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 6,
    maxWidth: '95%', // tăng từ 85% lên 95% vì distance đã xuống dưới
  },
  vibeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  vibePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    minHeight: 20,
  },
  vibePillEmoji: { fontSize: 12, marginRight: 4, color: 'white' },
  vibePillText: { fontSize: 10, fontWeight: '700', color: 'white', maxWidth: 100 },
  vibeMessage: { fontSize: 10, fontStyle: 'italic', flexShrink: 1 },
  bio: { fontSize: 12, marginBottom: 4, lineHeight: 18 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 2 },
  ageChip: {
    // remove fixed height to prevent clipping
    borderRadius: 20,
    marginRight: 4,
    alignSelf: 'flex-start',
  },
  distanceChipSmall: {
    // remove fixed height to prevent clipping
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  chipText: { fontSize: 12, fontWeight: '500' },
  actionButton: { marginLeft: 8 },
  actionGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: { paddingTop: 8, paddingBottom: 16 },
});
