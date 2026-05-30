import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import { Animated, View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Image } from 'expo-image';
import { Avatar } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useThemedColors } from '@/hooks/useThemedColors';
import { formatTime, truncateText } from '@/utils/common';
import { normalizeDisplayText } from '@/utils/textEncoding';
import VibeAvatar from '@/components/vibe/VibeAvatar';

const GroupVoiceCallWave = () => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  const scale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.34] });
  const opacity = pulseAnim.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0.55, 0.28, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.voiceCallWave, { opacity, transform: [{ scale }] }]}
    />
  );
};

export interface UnifiedChatItemProps {
  item: any;
  isGroup?: boolean;
  currentUser: any;
  lastMessage?: any;
  unreadCount?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  isPinned?: boolean;
  isTyping?: boolean;
  onlineCount?: number;
  isVoiceCallActive?: boolean;
  groupTypeInfo?: { icon: any, color: string, label: string };
  isHotSpot?: boolean;
  genderIconColor?: string;
  viewerShowOnline?: boolean;
  noBorder?: boolean;
}

const UnifiedChatItem = ({
  item,
  isGroup = false,
  currentUser,
  lastMessage,
  unreadCount = 0,
  onPress,
  onLongPress,
  isPinned = false,
  isTyping = false,
  onlineCount = 0,
  isVoiceCallActive = false,
  groupTypeInfo,
  isHotSpot = false,
  genderIconColor,
  viewerShowOnline = true,
}: UnifiedChatItemProps) => {
  const { t } = useTranslation();
  const currentThemeColors = useThemedColors();
  const { isDark } = currentThemeColors;

  // Hàm dịch thông minh với fallback tiếng Việt
  const tf = useCallback((key: string, fallback: string) => {
    const translated = t(key);
    return translated !== key ? translated : fallback;
  }, [t]);

const cardBackground = isHotSpot
    ? (isDark ? 'rgba(255,255,255,0.065)' : '#FFF7ED')
    : isGroup
      ? (isDark ? 'rgba(255,255,255,0.09)' : '#FFFFFF')
    : (isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF');

  const cardBorder = isHotSpot
    ? (isDark ? 'rgba(249,115,22,0.24)' : '#FFEDD5')
    : (isDark ? 'rgba(255,255,255,0.22)' : 'rgba(15,23,42,0.08)');

  const displayName = useMemo(() => {
    return normalizeDisplayText(item?.name || item?.username || item?.displayName || 'Người dùng');
  }, [item]);

  const avatarUri = useMemo(() => {
    const uri = item?.avatarUrl || item?.profileUrl || item?.photoURL || item?.photoUrl || item?.image || item?.avatar || item?.coverImage;
    return typeof uri === 'string' && uri.trim().length > 0 ? uri : undefined;
  }, [item]);

  const initials = useMemo(() => {
    const parts = displayName.trim().split(/\s+/);
    const first = parts[0]?.[0] || 'G';
    const second = parts[1]?.[0] || '';
    return (first + second).toUpperCase();
  }, [displayName]);

  const renderTime = useMemo(() => {
    if (!lastMessage?.createdAt && !lastMessage?.lastMessageTime) return '';
    return formatTime(lastMessage.createdAt || lastMessage.lastMessageTime);
  }, [lastMessage]);

  const messagePreview = useMemo(() => {
    if (isTyping) return tf('chat.typing', 'Đang nhập...');
    if (!lastMessage) {
      return isGroup ? tf('chat.no_messages', 'Chưa có tin nhắn') : tf('chat.say_hi', 'Gửi lời chào 👋');
    }
    if (lastMessage?.system) return normalizeDisplayText(lastMessage.text);
    if (lastMessage?.imageUrl) return tf('chat.image', '📷 Hình ảnh');
    if (lastMessage?.audioUrl) return tf('chat.audio', '🎵 Âm thanh');
    if (lastMessage?.videoUrl) return tf('chat.video', '🎬 Video');
    if (lastMessage?.fileUrl) return tf('chat.message', '📎 Tin nhắn');
    
    let text = normalizeDisplayText(lastMessage?.text || '');
    const hasMojibake = /[\u00C3\u00C2\uFFFD]/.test(text);
    if (hasMojibake && /match/i.test(text) && /hot\s*spot/i.test(text)) {
      text = 'Hai bạn đã match tại Hot Spot này! Cùng trò chuyện và lên kèo nhé!';
    }
    const prefix = !isGroup && currentUser?.uid === lastMessage?.uid
      ? `${tf('common.you', 'Bạn')}: `
      : '';
    return truncateText(`${prefix}${text}`, 50);
  }, [lastMessage, isTyping, isGroup, currentUser?.uid, tf]);

  const statusIcon = useMemo(() => {
    if (isGroup || !lastMessage || currentUser?.uid !== lastMessage?.uid) return '';
    switch (lastMessage?.status) {
      case 'sent': return '\u2713';
      case 'delivered': case 'read': return '\u2713\u2713';
      default: return '';
    }
  }, [isGroup, lastMessage, currentUser?.uid]);

  const isOnline = item?.isOnline || onlineCount > 0;
  const showOnlineBadge = (!isGroup && viewerShowOnline) || (isGroup && onlineCount > 0);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.72}>
      <View style={[styles.chatCard, isHotSpot && styles.hotSpotCard, { backgroundColor: cardBackground, borderColor: cardBorder }]}> 
        {isHotSpot && <View style={styles.hotSpotAccent} />}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarWrapper}>
            {isGroup && isVoiceCallActive ? <GroupVoiceCallWave /> : null}
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} contentFit="cover" transition={200} cachePolicy="memory-disk" />
            ) : (
              <Avatar.Text
                size={56}
                label={initials}
                style={{ backgroundColor: isGroup && groupTypeInfo?.color ? groupTypeInfo.color + '20' : (isDark ? '#334155' : '#E2E8F0') }}
                labelStyle={{ color: isGroup && groupTypeInfo?.color ? groupTypeInfo.color : (isDark ? '#E2E8F0' : '#64748B'), fontWeight: 'bold' }}
              />
            )}
            {showOnlineBadge && (
              <View style={[styles.statusIndicator, { backgroundColor: isOnline ? currentThemeColors.success : currentThemeColors.warning, borderColor: cardBackground }]} />
            )}
            {isGroup && isVoiceCallActive ? (
              <View style={[styles.voiceCallBadge, { borderColor: cardBackground }]}>
                <MaterialCommunityIcons name="phone-in-talk" size={11} color="#FFFFFF" />
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <View style={styles.userInfoRow}>
              <Text style={[styles.username, { color: currentThemeColors.text }]} numberOfLines={1}>{displayName}</Text>
              {isGroup && groupTypeInfo ? <MaterialCommunityIcons name={groupTypeInfo.icon} size={13} color={groupTypeInfo.color} /> : null}
              {isHotSpot && <View style={[styles.hotSpotBadge, { backgroundColor: isDark ? 'rgba(249,115,22,0.16)' : '#FFEDD5' }]}><MaterialCommunityIcons name="fire" size={12} color="#F97316" /></View>}
              {!isGroup && typeof item.age === 'number' && (
                <View style={[styles.genderContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.04)' }]}>
                  <MaterialCommunityIcons name={item.gender === 'male' ? 'gender-male' : 'gender-female'} size={12} color={genderIconColor || currentThemeColors.subtleText} />
                  <Text style={{ fontSize: 10, fontWeight: '700', marginLeft: 2, color: genderIconColor || currentThemeColors.subtleText }}>{item.age}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.time, { color: currentThemeColors.subtleText }]}>{renderTime}</Text>
          </View>
          <View style={styles.messageRow}>
            <Text style={[styles.lastMessage, { color: isTyping ? currentThemeColors.primary : currentThemeColors.subtleText }, unreadCount > 0 && { color: currentThemeColors.text, fontWeight: '600' }]} numberOfLines={1}>
              {statusIcon ? <Text style={{ color: '#3B82F6', fontSize: 13, fontWeight: 'bold' }}>{statusIcon} </Text> : null}{messagePreview}
            </Text>
            <View style={styles.badgeContainer}>
              {isPinned && <MaterialCommunityIcons name="pin" size={15} color={currentThemeColors.tint} style={{ marginRight: unreadCount > 0 ? 6 : 0, transform: [{ rotate: '45deg' }] }} />}
              {unreadCount > 0 && <View style={[styles.unreadBadge, { backgroundColor: currentThemeColors.primary || '#8B5CF6' }]}><Text style={styles.unreadText}>{unreadCount > 99 ? '99+' : unreadCount}</Text></View>}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 8, paddingVertical: 4 },
  chatCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 8, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
hotSpotCard: { borderWidth: 1.5, borderColor: 'rgba(249,115,22,0.3)' },
  hotSpotAccent: { position: 'absolute', left: 0, top: 16, bottom: 16, width: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4, backgroundColor: '#F97316' },
  avatarContainer: { marginRight: 14 },
  avatarWrapper: { position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
  avatarImage: { width: 56, height: 56, borderRadius: 28 },
  voiceCallWave: { position: 'absolute', left: -3, top: -3, width: 62, height: 62, borderRadius: 31, borderWidth: 2, borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.12)', zIndex: -1 },
  voiceCallBadge: { width: 22, height: 22, borderRadius: 11, position: 'absolute', right: -2, bottom: -2, borderWidth: 2.5, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  statusIndicator: { width: 14, height: 14, borderRadius: 7, position: 'absolute', bottom: 2, right: 2, borderWidth: 2.5, zIndex: 2 },
  contentContainer: { flex: 1, justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userInfoRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6, paddingRight: 8 },
  username: { fontSize: 16, fontWeight: '700', flexShrink: 1, letterSpacing: -0.2 },
  hotSpotBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 11 },
  genderContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  time: { fontSize: 11, fontWeight: '500', letterSpacing: 0.2, marginLeft: 8 },
  messageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { fontSize: 13.5, fontWeight: '400', flex: 1, paddingRight: 12, lineHeight: 18 },
  badgeContainer: { flexDirection: 'row', alignItems: 'center' },
  unreadBadge: { borderRadius: 12, minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  unreadText: { color: 'white', fontSize: 11, fontWeight: '800' },
});

export default React.memo(UnifiedChatItem);