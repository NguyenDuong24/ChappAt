import { View, StyleSheet, TouchableOpacity, Pressable, Animated as RNAnimated } from 'react-native';
import { Image } from 'expo-image';
import React, { useContext, useMemo, useCallback, useState } from 'react';
import { Avatar, Text, Badge } from 'react-native-paper';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { formatTime, truncateText } from '@/utils/common';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import GroupPreviewModal from './GroupPreviewModal';

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
  isVoiceCallActive?: boolean;
  voiceCallParticipantsCount?: number;
  isJoined?: boolean;
  onJoinGroup?: (groupId: string) => void;
  isSearchResult?: boolean;
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
  onlineMembers = [],
  isVoiceCallActive = false,
  voiceCallParticipantsCount = 0,
  isJoined = false,
  onJoinGroup,
  isSearchResult = false
}: GroupItemProps) => {
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Validate group data - don't render if invalid
  if (!item || !item.id) {
    console.warn('EnhancedGroupItem: Invalid group data, skipping render');
    return null;
  }

  const rippleColor = theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  // Animation cho voice call ring
  const voiceCallAnim = React.useRef(new RNAnimated.Value(0)).current;

  React.useEffect(() => {
    if (isVoiceCallActive) {
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(voiceCallAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          RNAnimated.timing(voiceCallAnim, { toValue: 0, duration: 1000, useNativeDriver: true })
        ])
      ).start();
    } else {
      voiceCallAnim.stopAnimation();
      voiceCallAnim.setValue(0);
    }
  }, [isVoiceCallActive]);

  const voiceCallScale = voiceCallAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const voiceCallOpacity = voiceCallAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

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
  const memberCount = useMemo(() => item?.members?.length || 0, [item?.members]);

  const groupDescription = useMemo(() => {
    if (!item?.description) return null;
    return truncateText(item.description, 60);
  }, [item?.description]);

  // Group type icon and color
  const groupTypeInfo = useMemo(() => {
    // Check multiple possible field names
    const type = item?.type || item?.privacy || (item?.isPublic ? 'public' : 'private'); // Default to private if no type

    console.log('Computed type:', type);

    if (type === 'public' || type === 'Public') {
      return { icon: 'earth' as const, color: '#667EEA', label: 'Công khai' };
    }
    if (type === 'private' || type === 'Private') {
      return { icon: 'lock' as const, color: '#F59E0B', label: 'Riêng tư' };
    }
    return { icon: 'lock' as const, color: '#F59E0B', label: 'Riêng tư' }; // Default fallback
  }, [item?.type, item?.privacy, item?.isPublic]);

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    try {
      if (!item?.id) return;

      // If not joined, show preview modal
      if (!isJoined) {
        setShowPreviewModal(true);
        return;
      }

      // Update read status (mark all as read now)
      try {
        const readStatusRef = doc(db, 'groups', item.id, 'readStatus', currentUser.uid);
        setDoc(readStatusRef, { lastReadAt: serverTimestamp() }, { merge: true }).catch(() => { });
      } catch { }

      // Navigate to group chat
      router.push({
        pathname: '/groups/[id]',
        params: { id: item.id }
      });
    } catch (error) {
      console.error('Error navigating to group:', error);
    }
  };

  const handleJoinGroup = () => {
    if (onJoinGroup && item?.id) {
      onJoinGroup(item.id);
    }
  };

  const messageIcon = useMemo(() => {
    if (isTyping) return <MaterialCommunityIcons name="dots-horizontal-circle" size={16} color="#10B981" />;
    if (lastMessage?.imageUrl) return <MaterialCommunityIcons name="image-outline" size={16} color={currentThemeColors.subtleText} />;
    if (lastMessage?.audioUrl) return <MaterialCommunityIcons name="microphone" size={16} color={currentThemeColors.subtleText} />;
    if (lastMessage?.videoUrl) return <MaterialCommunityIcons name="video-outline" size={16} color={currentThemeColors.subtleText} />;
    if (lastMessage?.fileUrl) return <MaterialCommunityIcons name="paperclip" size={16} color={currentThemeColors.subtleText} />;
    return null;
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
        style={({ pressed }) => [
          styles.pressable,
          pressed && { backgroundColor: rippleColor }
        ]}
      >
        <View style={styles.content}>
          {/* Avatar Section */}
          <View style={styles.avatarContainer}>
            {isVoiceCallActive && (
              <RNAnimated.View
                style={[
                  styles.voiceCallRing,
                  {
                    borderColor: '#10B981',
                    transform: [{ scale: voiceCallScale }],
                    opacity: voiceCallOpacity
                  }
                ]}
              />
            )}

            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatar}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
            ) : (
              <Avatar.Text
                size={56}
                label={initials}
                style={[styles.avatarPlaceholder, { backgroundColor: groupTypeInfo.color + '20' }]}
                labelStyle={[styles.avatarLabel, { color: groupTypeInfo.color }]}
              />
            )}

            {/* Online Status Badge */}
            {onlineCount > 0 && (
              <View style={[styles.onlineBadge, { borderColor: currentThemeColors.cardBackground }]}>
                <View style={styles.onlineDot} />
              </View>
            )}
          </View>

          {/* Info Section */}
          <View style={styles.info}>
            <View style={styles.topRow}>
              <View style={styles.nameRow}>
                <Text
                  variant="titleMedium"
                  style={[styles.name, { color: currentThemeColors.text }]}
                  numberOfLines={1}
                >
                  {item?.name || 'Group'}
                </Text>
                <MaterialCommunityIcons
                  name={groupTypeInfo.icon}
                  size={14}
                  color={groupTypeInfo.color}
                  style={styles.typeIcon}
                />
              </View>
              {isJoined && formattedTime && (
                <Text variant="bodySmall" style={[styles.time, { color: currentThemeColors.subtleText }]}>
                  {formattedTime}
                </Text>
              )}
            </View>

            {isJoined ? (
              <View style={styles.bottomRow}>
                <View style={styles.messageRow}>
                  {messageIcon}
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.message,
                      { color: unreadCount > 0 ? currentThemeColors.text : currentThemeColors.subtleText },
                      unreadCount > 0 && styles.unreadMessage
                    ]}
                    numberOfLines={1}
                  >
                    {messagePreview}
                  </Text>
                </View>

                {unreadCount > 0 && (
                  <Badge size={20} style={[styles.badge, { backgroundColor: Colors.primary }]}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </View>
            ) : (
              <View style={styles.searchResultInfo}>
                {groupDescription && (
                  <Text
                    variant="bodySmall"
                    style={[styles.description, { color: currentThemeColors.subtleText }]}
                    numberOfLines={1}
                  >
                    {groupDescription}
                  </Text>
                )}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="account-group" size={14} color={currentThemeColors.subtleText} />
                    <Text variant="bodySmall" style={[styles.statText, { color: currentThemeColors.subtleText }]}>
                      {memberCount} thành viên
                    </Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <View style={[styles.onlineDotSmall, { backgroundColor: '#10B981' }]} />
                    <Text variant="bodySmall" style={[styles.statText, { color: currentThemeColors.subtleText }]}>
                      {onlineCount} trực tuyến
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Action Button for search results */}
          {!isJoined && isSearchResult && (
            <TouchableOpacity
              onPress={handleJoinGroup}
              style={[styles.joinButton, { backgroundColor: Colors.primary }]}
            >
              <Text style={styles.joinButtonText}>Tham gia</Text>
            </TouchableOpacity>
          )}
        </View>
      </Pressable>

      {/* Group Preview Modal */}
      <GroupPreviewModal
        visible={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        group={item}
        onJoin={handleJoinGroup}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  pressable: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    borderRadius: 20,
  },
  avatarLabel: {
    fontWeight: 'bold',
    fontSize: 20,
  },
  voiceCallRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 24,
    borderWidth: 2,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  name: {
    fontWeight: '700',
    marginRight: 6,
  },
  typeIcon: {
    opacity: 0.7,
  },
  time: {
    fontSize: 12,
    marginLeft: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  message: {
    flex: 1,
  },
  unreadMessage: {
    fontWeight: '600',
  },
  badge: {
    marginLeft: 8,
    fontWeight: 'bold',
  },
  searchResultInfo: {
    marginTop: 2,
  },
  description: {
    marginBottom: 4,
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
  },
  statDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  onlineDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  joinButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default EnhancedGroupItem;