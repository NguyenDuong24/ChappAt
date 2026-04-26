import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { calculateDistance } from '@/utils/calculateDistance';

interface UserCardProps {
  item: any;
  index: number;
  location: any;
  activeTab: string;
  currentThemeColors: any;
  viewerShowOnline: boolean;
}

const interestFallback = ['Du lịch', 'Chụp ảnh', 'Âm nhạc', 'Cafe', 'Game', 'Phim'];

const getCardGradient = (colors: any): [string, string, string] => {
  const theme = colors?.theme;
  if (theme === 'sapphire' || theme === 'slate') return ['#38BDF8', '#2563EB', '#A78BFA'];
  if (theme === 'ivory') return ['#34D399', '#10B981', '#06B6D4'];
  if (theme === 'ember' || theme === 'copper' || theme === 'sand') return ['#FB7185', '#F97316', '#FACC15'];
  if (theme === 'obsidian' || theme === 'amethyst') return ['#FF2E8A', '#7C3AED', '#22D3EE'];
  return ['#FF4BA5', '#8B5CF6', '#06B6D4'];
};

const UserCard = ({
  item,
  index,
  location,
  activeTab,
  currentThemeColors,
  viewerShowOnline,
}: UserCardProps) => {
  const router = useRouter();
  const accentGradient = useMemo(() => getCardGradient(currentThemeColors), [currentThemeColors]);
  const distance = location ? calculateDistance(location.coords, item?.location) : null;
  const tags = useMemo(() => {
    const source = Array.isArray(item?.interests) && item.interests.length > 0
      ? item.interests
      : interestFallback;
    return source.slice(0, 3);
  }, [item?.interests]);

  const handleProfile = useCallback(() => {
    router.push({
      pathname: '/(screens)/user/UserProfileScreen',
      params: { userId: item.id || item.uid },
    });
  }, [item.id, item.uid, router]);

  const handleChat = useCallback(() => {
    const userId = item.id || item.uid;
    const dest = activeTab === 'chat'
      ? `/(tabs)/chat/${userId}`
      : activeTab === 'home'
        ? `/(tabs)/home/chat/${userId}`
        : `/chat/${userId}`;
    router.push(dest as any);
  }, [activeTab, item.id, item.uid, router]);

  const avatarUrl = item?.profileUrl || item?.photoURL || item?.avatarUrl;

  return (
    <Animated.View entering={FadeInUp.delay(Math.min(index, 8) * 45).duration(420)} layout={Layout.springify()}>
      <Pressable
        style={[
          styles.card,
          {
            backgroundColor: currentThemeColors.surface,
            borderColor: currentThemeColors.border,
          },
        ]}
        onPress={handleProfile}
      >
        <LinearGradient colors={item?.isOnline ? ['#22C55E', accentGradient[2]] : accentGradient} style={styles.avatarShell}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" transition={180} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={24} color="#fff" />
            </View>
          )}
          {viewerShowOnline ? (
            <View style={[styles.statusDot, { backgroundColor: item?.isOnline ? '#22C55E' : '#F59E0B' }]} />
          ) : null}
        </LinearGradient>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: currentThemeColors.text }]} numberOfLines={1}>
              {item?.username || 'Người dùng ChappAt'}
            </Text>
            <MaterialCommunityIcons
              name={item?.gender === 'male' ? 'gender-male' : item?.gender === 'female' ? 'gender-female' : 'account-heart'}
              size={15}
              color={item?.gender === 'male' ? currentThemeColors.info : currentThemeColors.tint}
            />
          </View>
          <Text style={[styles.meta, { color: currentThemeColors.subtleText }]} numberOfLines={1}>
            {typeof item?.age === 'number' ? `${item.age} tuổi` : 'Đang cập nhật'}
            {item?.locationName || item?.city ? `  •  ${item.locationName || item.city}` : ''}
            {distance !== null && !Number.isNaN(distance) ? `  •  ${distance.toFixed(1)}km` : ''}
          </Text>
          <View style={styles.tags}>
            {tags.map((tag: string, tagIndex: number) => (
              <View key={`${tag}-${tagIndex}`} style={[styles.tag, { backgroundColor: `${currentThemeColors.tint}16` }]}>
                <Text style={[styles.tagText, { color: currentThemeColors.tint }]} numberOfLines={1}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable style={styles.chatButton} onPress={handleChat}>
          <LinearGradient colors={accentGradient} style={styles.chatGradient}>
            <Ionicons name="chatbubble" size={17} color="#fff" />
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: 74,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 10,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
  },
  avatarShell: {
    width: 54,
    height: 54,
    borderRadius: 27,
    padding: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  statusDot: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  info: {
    flex: 1,
    paddingLeft: 10,
    paddingRight: 8,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    maxWidth: '88%',
    fontSize: 14,
    fontWeight: '900',
  },
  meta: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 1,
  },
  tag: {
    maxWidth: 74,
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '900',
  },
  chatButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
  },
  chatGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default memo(UserCard);
