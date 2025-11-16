import { View, StyleSheet, TouchableOpacity, Pressable, Image, Animated as RNAnimated } from 'react-native';
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

      // If not joined, navigate to preview screen
      if (!isJoined) {
        router.push({
          pathname: '/groups/preview/[id]',
          params: { id: item.id }
        });
        return;
      }

      // Update read status (mark all as read now)
      try {
        const readStatusRef = doc(db, 'groups', item.id, 'readStatus', currentUser.uid);
        setDoc(readStatusRef, { lastReadAt: serverTimestamp() }, { merge: true }).catch(() => {});
      } catch {}

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
        style={styles.pressable}
      >
        <View style={styles.content}>
          {/* Avatar Section */}
          <View style={styles.avatarContainer}>
            {/* Voice Call Active Ring */}
            {isVoiceCallActive && (
              <RNAnimated.View 
                style={[
                  styles.voiceCallRing, 
                  { 
                    opacity: voiceCallOpacity,
                    transform: [{ scale: voiceCallScale }]
                  }
                ]}
              />
            )}
            
            <LinearGradient
              colors={isVoiceCallActive 
                ? ['#10B981', '#059669'] 
                : (theme === 'dark' ? ['#6366F1', '#8B5CF6'] : ['#667EEA', '#764BA2'])
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarRing}
            >
              <View style={[styles.avatarInner, { backgroundColor: theme === 'dark' ? '#111827' : '#FFF' }]}> 
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatar} />
                ) : (
                  <View style={[styles.placeholderAvatar, { backgroundColor: theme === 'dark' ? '#1F2937' : '#E0E7FF' }]}>
                    <MaterialCommunityIcons name="account-group" size={24} color={theme === 'dark' ? '#93C5FD' : '#6366F1'} />
                  </View>
                )}
              </View>
            </LinearGradient>

            {/* Voice Call Badge */}
            {isVoiceCallActive && (
              <View style={styles.voiceCallBadge}>
                <MaterialCommunityIcons name="phone" size={12} color="#FFF" />
              </View>
            )}

            {/* Online Badge */}
            {onlineCount > 0 && !isVoiceCallActive && (
              <View style={styles.onlineBadge}>
                <Text style={styles.onlineBadgeText}>{onlineCount}</Text>
              </View>
            )}
          </View>

          {/* Text Content */}
          <View style={styles.textContainer}>
            {/* Header Row: Group Name + Type Icon + Time */}
            <View style={styles.headerRow}>
              <View style={styles.nameContainer}>
                <Text style={[styles.groupName, { color: currentThemeColors.text }]} numberOfLines={1}>
                  {item.name || 'Nhóm chưa đặt tên'}
                </Text>
                {groupTypeInfo && (
                  <MaterialCommunityIcons 
                    name={groupTypeInfo.icon} 
                    size={14} 
                    color={groupTypeInfo.color}
                    style={styles.typeIcon}
                  />
                )}
              </View>
              
              <View style={styles.rightSection}>
                {formattedTime && (
                  <Text style={[styles.time, { color: currentThemeColors.subtleText }]}>
                    {formattedTime}
                  </Text>
                )}

                {/* Join Button for Public Groups */}
                {!isJoined && item?.type === 'public' && onJoinGroup && (
                  <TouchableOpacity
                    style={styles.joinButton}
                    onPress={handleJoinGroup}
                    accessibilityRole="button"
                  >
                    <Text style={styles.joinButtonText}>Tham gia</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Message/Description Row */}
            <View style={styles.messageRow}>
              <View style={styles.previewLeft}>
                {/* Voice Call Active State */}
                {isVoiceCallActive ? (
                  <View style={styles.voiceCallContainer}>
                    <MaterialCommunityIcons name="phone-in-talk" size={16} color="#10B981" />
                    <Text style={styles.voiceCallText} numberOfLines={1}>
                      Đang gọi...{voiceCallParticipantsCount > 0 ? ` (${voiceCallParticipantsCount})` : ''}
                    </Text>
                  </View>
                ) : (isSearchResult || !isJoined) ? (
                  /* Search Result / Not Joined: Show Description + Member Count */
                  <View style={styles.searchInfoContainer}>
                    {groupDescription && (
                      <Text style={[styles.description, { color: currentThemeColors.subtleText }]} numberOfLines={1}>
                        {groupDescription}
                      </Text>
                    )}
                    <View style={styles.metaInfo}>
                      <MaterialCommunityIcons 
                        name="account-group" 
                        size={13} 
                        color={currentThemeColors.subtleText} 
                      />
                      <Text style={[styles.memberCount, { color: currentThemeColors.subtleText }]}>
                        {memberCount} thành viên
                      </Text>
                      {groupTypeInfo && (
                        <>
                          <Text style={[styles.dot, { color: currentThemeColors.subtleText }]}>•</Text>
                          <MaterialCommunityIcons 
                            name={groupTypeInfo.icon} 
                            size={13} 
                            color={groupTypeInfo.color} 
                          />
                          <Text style={[styles.typeLabel, { color: groupTypeInfo.color }]}>
                            {groupTypeInfo.label}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                ) : (
                  /* Regular Message Preview */
                  <View style={styles.messageContainer}>
                    {messageIcon}
                    <Text 
                      style={[
                        styles.messagePreview, 
                        { color: isTyping ? '#10B981' : currentThemeColors.subtleText },
                        isTyping && styles.typingText
                      ]} 
                      numberOfLines={1}
                    >
                      {messagePreview}
                    </Text>
                  </View>
                )}
              </View>

              {/* Unread Badge */}
              {unreadCount > 0 && (
                <LinearGradient 
                  colors={['#667EEA', '#764BA2']} 
                  start={{ x: 0, y: 0 }} 
                  end={{ x: 1, y: 1 }} 
                  style={styles.unreadBadge}
                >
                  <Text style={styles.unreadBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </LinearGradient>
              )}
            </View>
          </View>
        </View>
      </Pressable>

      {/* Group Preview Modal */}
      <GroupPreviewModal 
        visible={showPreviewModal} 
        onClose={() => setShowPreviewModal(false)} 
        group={item}
        onJoinGroup={onJoinGroup}
        currentUser={currentUser}
      />
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
  
  // Avatar Styles
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
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 2,
    backgroundColor: '#10B981',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  onlineBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  voiceCallRing: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: (AVATAR_SIZE + 22) / 2,
    borderWidth: 3,
    borderColor: '#10B981',
    backgroundColor: 'transparent',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  voiceCallBadge: {
    position: 'absolute',
    bottom: 0,
    right: 2,
    backgroundColor: '#10B981',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  
  // Text Content Styles
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 6,
  },
  typeIcon: {
    marginTop: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  time: {
    fontSize: 12,
    fontWeight: '500',
  },
  joinButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#667EEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  
  // Message Row Styles
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewLeft: {
    flex: 1,
    marginRight: 8,
  },
  voiceCallContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  voiceCallText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
    flex: 1,
  },
  searchInfoContainer: {
    gap: 3,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  memberCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  dot: {
    fontSize: 12,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  messagePreview: {
    fontSize: 14,
    flex: 1,
  },
  typingText: {
    fontWeight: '600',
    fontStyle: 'italic',
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
});

export default EnhancedGroupItem;