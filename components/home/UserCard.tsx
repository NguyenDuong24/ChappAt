import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
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
  currentThemeColors,
  viewerShowOnline,
}: UserCardProps) => {
  const router = useRouter();
  const accentGradient = useMemo(() => getCardGradient(currentThemeColors), [currentThemeColors]);
  const distance = useMemo(
    () => (location ? calculateDistance(location.coords, item?.location) : null),
    [location, item?.location]
  );
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
    router.push(`/chat/${userId}` as any);
  }, [item.id, item.uid, router]);

  const avatarUrl = item?.profileUrl || item?.photoURL || item?.avatarUrl;

  // Màu sắc động cho icon chat dựa trên theme
  const chatButtonStyle = useMemo(() => {
    const isDark = currentThemeColors.isDark;
    const primaryColor = currentThemeColors.primary || currentThemeColors.tint || '#8B5CF6';
    if (isDark) {
      return {
        background: `${primaryColor}20`,
        iconColor: primaryColor,
        borderColor: `${primaryColor}40`,
      };
    }
    return {
      background: `${primaryColor}10`,
      iconColor: primaryColor,
      borderColor: `${primaryColor}30`,
    };
  }, [currentThemeColors.isDark, currentThemeColors.primary, currentThemeColors.tint]);

  return (
    <View>
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
            <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" transition={80} cachePolicy="memory-disk" />
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
              {item?.username || 'Người dùng SaiGon Match'}
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

        <Pressable 
          style={({ pressed }) => [
            styles.chatButton,
            {
              backgroundColor: chatButtonStyle.background,
              borderColor: chatButtonStyle.borderColor,
              transform: [{ scale: pressed ? 0.94 : 1 }],
            },
          ]} 
          onPress={handleChat}
        >
          <Ionicons name="chatbubble-ellipses" size={18} color={chatButtonStyle.iconColor} />
        </Pressable>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    height: 84,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 10,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
});

export default memo(UserCard, (prev, next) => {
  const prevItem = prev.item || {};
  const nextItem = next.item || {};
  return (
    (prevItem.id || prevItem.uid) === (nextItem.id || nextItem.uid) &&
    prevItem.username === nextItem.username &&
    prevItem.profileUrl === nextItem.profileUrl &&
    prevItem.photoURL === nextItem.photoURL &&
    prevItem.avatarUrl === nextItem.avatarUrl &&
    prevItem.isOnline === nextItem.isOnline &&
    prevItem.age === nextItem.age &&
    prevItem.gender === nextItem.gender &&
    prevItem.locationName === nextItem.locationName &&
    prevItem.city === nextItem.city &&
    prev.location === next.location &&
    prev.viewerShowOnline === next.viewerShowOnline &&
    prev.currentThemeColors === next.currentThemeColors
  );
});