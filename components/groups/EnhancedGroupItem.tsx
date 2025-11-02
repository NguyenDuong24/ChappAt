import { View, StyleSheet, TouchableOpacity, Pressable, Image } from 'react-native';
import React, { useContext, useMemo, useCallback } from 'react';
import { Avatar, Text, Badge } from 'react-native-paper';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { formatTime, truncateText } from '@/utils/common';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface GroupItemProps {
  item: any;
  lastMessage?: any;
  currentUser: any;
  noBorder?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  unreadCount?: number;
  isTyping?: boolean;
  onlineMembers?: string[];
}

const EnhancedGroupItem = ({
  item,
  lastMessage,
  currentUser,
  noBorder = false,
  onPress,
  onLongPress,
  unreadCount = 0,
  isTyping = false,
  onlineMembers = []
}: GroupItemProps) => {
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const rippleColor = theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  // Helper to resolve avatar uri from multiple possible fields
  const getGroupAvatar = useCallback((): string | undefined => {
    const uri =
      item?.avatarUrl ||
      item?.photoURL ||
      item?.photoUrl ||
      item?.image ||
      item?.avatar ||
      item?.coverImage ||
      '';
    return typeof uri === 'string' && uri.trim().length > 0 ? uri : undefined;
  }, [item]);

  const avatarUri = useMemo(() => getGroupAvatar(), [getGroupAvatar]);

  const initials = useMemo(() => {
    const name: string = item?.name || 'Group';
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] || 'G';
    const second = parts[1]?.[0] || '';
    return (first + second).toUpperCase();
  }, [item?.name]);

  // Memoized values
  const messagePreview = useMemo(() => {
    if (isTyping) return 'Đang nhập...';
    if (!lastMessage) return 'Không có tin nhắn';
    if (lastMessage?.system) return lastMessage?.text || 'Tin nhắn hệ thống';
    if (lastMessage?.imageUrl) return '📷 Ảnh';
    if (lastMessage?.audioUrl) return '🎤 Âm thanh';
    if (lastMessage?.videoUrl) return '🎬 Video';
    if (lastMessage?.fileUrl) return '📎 Tệp đính kèm';
    if (lastMessage?.text) return truncateText(lastMessage.text, 30);
    return 'Tin nhắn mới';
  }, [lastMessage, isTyping]);

  const formattedTime = useMemo(() => {
    if (!lastMessage?.createdAt) return '';
    return formatTime(lastMessage.createdAt);
  }, [lastMessage?.createdAt]);

  const onlineCount = useMemo(() => onlineMembers.length, [onlineMembers]);

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    try {
      if (!item?.id) return;
      router.push({
        pathname: '/groups/[id]' as any,
        params: { id: item.id },
      });
    } catch (error) {
      console.error('Error navigating to group chat:', error);
    }
  };

  const messageIcon = useMemo(() => {
    if (isTyping) return <MaterialCommunityIcons name="dots-horizontal-circle" size={16} color="#10B981" />;
    if (lastMessage?.imageUrl) return <MaterialCommunityIcons name="image-outline" size={16} color={currentThemeColors.subtleText} />;
    if (lastMessage?.audioUrl) return <MaterialCommunityIcons name="microphone" size={16} color={currentThemeColors.subtleText} />;
    if (lastMessage?.videoUrl) return <MaterialCommunityIcons name="video-outline" size={16} color={currentThemeColors.subtleText} />;
    if (lastMessage?.fileUrl) return <MaterialCommunityIcons name="paperclip" size={16} color={currentThemeColors.subtleText} />;
    return <MaterialCommunityIcons name="message-outline" size={16} color={currentThemeColors.subtleText} />;
  }, [isTyping, lastMessage, currentThemeColors.subtleText]);

  return (
    <Animated.View
      entering={FadeInRight}
      exiting={FadeOutLeft}
      style={[
        styles.container,
        {
          backgroundColor: currentThemeColors.cardBackground,
          borderBottomColor: noBorder ? 'transparent' : currentThemeColors.border,
        },
      ]}
    >
      <Pressable
        onPress={handlePress}
        onLongPress={onLongPress}
        android_ripple={{ color: rippleColor }}
        style={styles.pressable}
      >
        <View style={styles.content}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={theme === 'dark' ? ['#6366F1', '#8B5CF6'] : ['#667EEA', '#764BA2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarRing}
            >
              <View style={[styles.avatarInner, { backgroundColor: theme === 'dark' ? '#111827' : '#FFF' }]}> 
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatar} />
                ) : (
                  <View style={[styles.placeholderAvatar, { backgroundColor: theme === 'dark' ? '#1F2937' : '#E0E7FF' }]}>
                    <MaterialCommunityIcons name="account-group" size={22} color={theme === 'dark' ? '#93C5FD' : '#6366F1'} />
                    <Text style={[styles.initials, { color: theme === 'dark' ? '#E5E7EB' : '#4F46E5' }]}>{initials}</Text>
                  </View>
                )}
              </View>
            </LinearGradient>

            {onlineCount > 0 && (
              <Badge size={16} style={styles.onlineBadge} theme={{ colors: { error: '#10B981' } }}>
                {onlineCount}
              </Badge>
            )}

            {unreadCount > 0 && (
              <View style={styles.unreadDot} />
            )}
          </View>

          <View style={styles.textContainer}>
            <View style={styles.headerRow}>
              <Text style={[styles.groupName, { color: currentThemeColors.text }]} numberOfLines={1}>
                {item.name || 'Nhóm chưa đặt tên'}
              </Text>
              <Text style={[styles.time, { color: currentThemeColors.subtleText }]}>
                {formattedTime}
              </Text>
            </View>

            <View style={styles.messageRow}>
              <View style={styles.previewLeft}>
                {messageIcon}
                {isTyping ? (
                  <Text style={[styles.typingText, { color: '#10B981' }]} numberOfLines={1}>
                    {messagePreview}
                  </Text>
                ) : (
                  <Text style={[styles.messagePreview, { color: currentThemeColors.subtleText }]} numberOfLines={1}>
                    {messagePreview}
                  </Text>
                )}
              </View>

              {unreadCount > 0 && (
                <LinearGradient colors={['#667EEA', '#764BA2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.unreadBadgeBg}>
                  <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </LinearGradient>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const AVATAR_SIZE = 56;

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  pressable: {
    padding: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarRing: {
    width: AVATAR_SIZE + 6,
    height: AVATAR_SIZE + 6,
    borderRadius: (AVATAR_SIZE + 6) / 2,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: AVATAR_SIZE / 2,
  },
  placeholderAvatar: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  initials: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 2,
    backgroundColor: '#10B981',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    textAlign: 'center',
    lineHeight: 16,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    backgroundColor: '#F43F5E',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    fontWeight: '500',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  messagePreview: {
    fontSize: 14,
    flex: 1,
  },
  typingText: {
    fontSize: 14,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  unreadBadgeBg: {
    minWidth: 28,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});

export default EnhancedGroupItem;

