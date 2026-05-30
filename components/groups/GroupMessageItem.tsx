import { View, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemeContext } from '@/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useContext, useMemo, useCallback } from 'react';
import { formatTime } from '@/utils/common';
import CustomImage from '@/components/common/CustomImage';
import MessageActionSheet from '@/components/chat/MessageActionSheet';
import EditMessageModal from '@/components/chat/EditMessageModal';
import MessageReactions from '@/components/chat/MessageReactions';
import { useMessageActions } from '@/hooks/useMessageActions';
import GiftMessage from '@/components/chat/GiftMessage';
import AudioMessage from '@/components/chat/AudioMessage';
import { useTranslation } from 'react-i18next';
import VibeAvatar from '../vibe/VibeAvatar';
import { useThemedColors } from '@/hooks/useThemedColors';

// Enhanced color palette for group avatars
const AVATAR_COLORS = [
  ['#FF6B6B', '#EE5A6F'], ['#4ECDC4', '#44A08D'], ['#45B7D1', '#2E86AB'],
  ['#FFA07A', '#FA8072'], ['#98D8C8', '#7FB3D5'], ['#F7DC6F', '#F4D03F'],
  ['#BB8FCE', '#9B59B6'], ['#85C1E2', '#5DADE2'], ['#F8B500', '#FF9800'],
];

const getUserColor = (userId: string): string[] => {
  if (!userId) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getNameColor = (userId: string): string => getUserColor(userId)[0];

interface GroupMessageItemProps {
  message: any;
  currentUser: any;
  groupId?: string;
  onReply?: (message: any) => void;
  onMessageLayout?: (messageId: string, y: number) => void;
  isHighlighted?: boolean;
  onReport?: (message: any) => void;
  onUserPress?: (userId: string) => void;
  currentThemeColors?: any;
  isFirstInSequence?: boolean;
  isLastInSequence?: boolean;
  isSameSenderAsPrev?: boolean;
  isSameSenderAsNext?: boolean;
}

const IMAGE_BUBBLE_WIDTH = Math.min(Dimensions.get('window').width * 0.65, 260);

const GroupMessageItem: React.FC<GroupMessageItemProps> = React.memo(({
  message,
  currentUser,
  groupId = '',
  onReply,
  onMessageLayout,
  isHighlighted,
  onReport,
  onUserPress,
  currentThemeColors: propThemeColors,
  isFirstInSequence = true,
  isLastInSequence = true,
  isSameSenderAsPrev = false,
  isSameSenderAsNext = false,
}) => {
  const { t } = useTranslation();
  const msgUid = message?.uid || message?.userId || message?.senderId || '';
  const currentUid = currentUser?.uid || currentUser?.userId || '';
  const isCurrentUser = msgUid === currentUid;

  const [showTime, setShowTime] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const themedColors = useThemedColors();
  const currentThemeColors = propThemeColors || themedColors;
  const nameColor = useMemo(() => getNameColor(msgUid), [msgUid]);

  const { toggleReaction, pinMessage, deleteMessage, editMessage, copyToClipboard, showDeleteConfirm, isLoading } = useMessageActions();

  const handlePress = useCallback(() => setShowTime(prev => !prev), []);
  const handleLongPress = useCallback(() => setShowActionSheet(true), []);
  const handleReply = useCallback(() => onReply?.(message), [onReply, message]);

  const handleEditSave = useCallback(async (newText: string) => {
    const msgId = (message?.id || message?.messageId);
    if (!groupId || !msgId) return;
    await editMessage(groupId, msgId, newText);
    setShowEditModal(false);
  }, [groupId, message?.id, message?.messageId, editMessage]);

  const handleDelete = useCallback(() => {
    const msgId = (message?.id || message?.messageId);
    if (!groupId || !msgId) return;
    showDeleteConfirm(() => deleteMessage(groupId, msgId, isCurrentUser), isCurrentUser);
  }, [groupId, message?.id, message?.messageId, showDeleteConfirm, deleteMessage, isCurrentUser]);

  const handlePin = useCallback(() => {
    const msgId = (message?.id || message?.messageId);
    if (!groupId || !msgId) return;
    pinMessage(groupId, msgId, !!message?.isPinned);
  }, [groupId, message?.id, message?.messageId, message?.isPinned, pinMessage]);

  const handleReaction = useCallback((emoji: string) => {
    const msgId = (message?.id || message?.messageId);
    if (!groupId || !msgId || !currentUid) return;
    toggleReaction(groupId, msgId, emoji, currentUid);
  }, [groupId, message?.id, message?.messageId, currentUid, toggleReaction]);

  const formatMessageTime = useCallback(() => message?.createdAt ? formatTime(message.createdAt) : '', [message?.createdAt]);

  const renderStatusIcon = () => {
    if (!isCurrentUser) return null;
    switch (message?.status) {
      case 'read': return <MaterialIcons name="done-all" size={13} color="#FFFFFF" />;
      case 'delivered': return <MaterialIcons name="done-all" size={13} color="rgba(255,255,255,0.6)" />;
      case 'sent': return <MaterialIcons name="done" size={13} color="rgba(255,255,255,0.6)" />;
      default: return <MaterialIcons name="schedule" size={13} color="rgba(255,255,255,0.6)" />;
    }
  };

  const hasImage = !!message.imageUrl;
  const isGiftMessage = message?.type === 'gift' && message?.gift;
  const isAudioMessage = message?.type === 'audio' && message?.audioUrl;

  const bubbleColors: readonly [string, string] = isCurrentUser
    ? [currentThemeColors.primary, currentThemeColors.primary]
    : [theme === 'dark' ? '#262626' : '#F0F0F0', theme === 'dark' ? '#262626' : '#F0F0F0'];

  const marginTop = isFirstInSequence ? 12 : 2;
  const marginBottom = isLastInSequence ? 12 : 0;

  const avatarUrl = isCurrentUser
    ? (currentUser?.profileUrl || currentUser?.photoURL || '')
    : (message?.profileUrl || message?.senderProfileUrl || message?.photoURL || '');

  return (
    <>
      <TouchableOpacity
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
          { marginTop, marginBottom }
        ]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={300}
        activeOpacity={0.95}
      >
        <View style={isCurrentUser ? styles.avatarWrapperRight : styles.avatarWrapperLeft}>
          {isLastInSequence ? (
            <TouchableOpacity onPress={() => onUserPress?.(msgUid)} activeOpacity={0.7}>
              <VibeAvatar
                avatarUrl={avatarUrl}
                size={34}
                frameType={isCurrentUser ? currentUser?.activeFrame : message?.activeFrame}
                showVibeIcon={false}
                showAddButton={false}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={[styles.messageContent, { maxWidth: '75%' }]}>
          {!isCurrentUser && isFirstInSequence && (
            <Text style={[styles.senderName, { color: nameColor }]} numberOfLines={1}>
              {message?.senderName || message?.displayName || t('groups.user')}
            </Text>
          )}

          {message?.replyTo && (
            <View style={[
              styles.replyContainer,
              {
                backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.1)' : theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                marginBottom: -10,
                borderTopLeftRadius: 16, borderTopRightRadius: 16,
                borderBottomLeftRadius: isCurrentUser ? 16 : 4, borderBottomRightRadius: isCurrentUser ? 16 : 16,
                paddingBottom: 14,
                opacity: 0.8,
              }
            ]}>
              <View style={[styles.replyBar, { backgroundColor: isCurrentUser ? '#FFF' : nameColor }]} />
              <View style={styles.replyContent}>
                <Text style={[styles.replySender, { color: isCurrentUser ? '#FFFFFF' : nameColor }]} numberOfLines={1}>
                  {message.replyTo.senderName}
                </Text>
                <Text style={[styles.replyText, { color: isCurrentUser ? 'rgba(255,255,255,0.8)' : currentThemeColors.subtleText }]} numberOfLines={1}>
                  {message.replyTo.imageUrl ? t('groups.image') : message.replyTo.text}
                </Text>
              </View>
            </View>
          )}

          <View style={[styles.bubbleContainer, isCurrentUser ? styles.bubbleContainerRight : styles.bubbleContainerLeft]}>
            <View style={[
              styles.bubble,
              isCurrentUser ? styles.bubbleRight : styles.bubbleLeft,
              {
                borderTopRightRadius: isCurrentUser && !isFirstInSequence ? 4 : 20,
                borderTopLeftRadius: !isCurrentUser && !isFirstInSequence ? 4 : 20,
                borderBottomRightRadius: isCurrentUser && !isLastInSequence ? 4 : 20,
                borderBottomLeftRadius: !isCurrentUser && !isLastInSequence ? 4 : 20,
              },
              isHighlighted && styles.highlightedBubble
            ]}>
              <View style={[
                styles.bubbleContent,
                { backgroundColor: (hasImage || isGiftMessage) ? 'transparent' : bubbleColors[0] },
                (hasImage || isGiftMessage) && { padding: 0 },
              ]}>
                {isGiftMessage ? (
                  <GiftMessage gift={message.gift} senderName={message?.senderName} isCurrentUser={isCurrentUser} themeColors={currentThemeColors} />
                ) : isAudioMessage ? (
                  <AudioMessage uri={message.audioUrl} duration={message.duration} isCurrentUser={isCurrentUser} themeColors={currentThemeColors} />
                ) : message?.imageUrl ? (
                  <View style={styles.imageMessageContainer}>
                    <View style={styles.imageWrapper}>
                      <CustomImage source={message.imageUrl} style={styles.messageImage} onLongPress={handleLongPress} />
                      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={styles.imageOverlay}>
                        <View style={styles.imageMetaPill}>
                          <Text style={[styles.timeText, { color: '#FFF' }]}>{formatMessageTime()}</Text>
                          {renderStatusIcon()}
                        </View>
                      </LinearGradient>
                    </View>
                    {message.text && (
                      <View style={[styles.imageCaptionContainer, { backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                        <Text style={[styles.messageText, { color: isCurrentUser ? '#FFF' : currentThemeColors.text }]}>{message.text}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.textWrapper}>
                    <Text style={[styles.messageText, { color: isCurrentUser ? '#FFFFFF' : (theme === 'dark' ? '#E4E6EB' : '#1C1E21') }]}>
                      {message?.text}
                    </Text>
                  </View>
                )}

                {showTime && (
                  <View style={styles.timeStatusRow}>
                    <Text style={[styles.timeText, { color: isCurrentUser ? 'rgba(255,255,255,0.7)' : currentThemeColors.subtleText }]}>
                      {formatMessageTime()}
                    </Text>
                    {renderStatusIcon()}
                  </View>
                )}

                {isCurrentUser && !showTime && !hasImage && !isGiftMessage && !isAudioMessage && (
                  <View style={styles.compactStatus}>
                    {renderStatusIcon()}
                  </View>
                )}
              </View>
            </View>
            {message?.reactions && Object.keys(message.reactions).length > 0 && (
              <View style={[styles.reactionsOverlay, isCurrentUser ? { left: -6 } : { right: -6 }]}>
                <MessageReactions reactions={message.reactions} onReactionPress={handleReaction} currentUserId={currentUid} />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      <MessageActionSheet
        visible={showActionSheet} onClose={() => setShowActionSheet(false)}
        onReply={handleReply} onEdit={() => setShowEditModal(true)}
        onDelete={handleDelete} onPin={handlePin}
        onCopy={() => message?.text && copyToClipboard(message.text)}
        onReaction={handleReaction} isCurrentUser={isCurrentUser}
        isPinned={message?.isPinned} message={message}
        onReport={() => onReport?.(message)}
      />

      <EditMessageModal
        visible={showEditModal} onClose={() => setShowEditModal(false)}
        onSave={handleEditSave} originalText={message?.text || ''}
        loading={isLoading}
      />
    </>
  );
});

const styles = StyleSheet.create({
  messageContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    alignItems: 'flex-end',
  },
  currentUserMessage: { flexDirection: 'row-reverse' },
  otherUserMessage: { flexDirection: 'row' },
  avatarWrapperLeft: {
    width: 38,
    alignItems: 'center',
    marginRight: 4,
  },
  avatarWrapperRight: {
    width: 38,
    alignItems: 'center',
    marginLeft: 4,
  },
  messageContent: { flexShrink: 1 },
  senderName: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
    marginLeft: 12,
    opacity: 0.8,
  },
  bubbleContainer: { position: 'relative' },
  bubbleContainerRight: { alignItems: 'flex-end' },
  bubbleContainerLeft: { alignItems: 'flex-start' },
  bubble: { maxWidth: '100%', overflow: 'hidden' },
  bubbleRight: { borderRadius: 20 },
  bubbleLeft: { borderRadius: 20 },
  bubbleContent: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '100%',
    position: 'relative',
  },
  textWrapper: {
    minHeight: 22,
    justifyContent: 'center',
  },
  messageText: { fontSize: 16, lineHeight: 22 },
  timeStatusRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'flex-end', gap: 4, marginTop: 4,
  },
  compactStatus: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    opacity: 0.6,
  },
  timeText: { fontSize: 10, fontWeight: '500' },
  replyContainer: { padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  replyBar: { width: 3, height: '80%', borderRadius: 2 },
  replyContent: { flex: 1, gap: 1 },
  replySender: { fontSize: 11, fontWeight: '800' },
  replyText: { fontSize: 12, opacity: 0.8 },
  imageWrapper: {
    width: IMAGE_BUBBLE_WIDTH,
    borderRadius: 20,
    overflow: 'hidden',
  },
  messageImage: { width: '100%', aspectRatio: 1 },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8, alignItems: 'flex-end' },
  imageMetaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 12,
  },
  imageCaptionContainer: { padding: 10, borderRadius: 14, marginTop: 4 },
  reactionsOverlay: { position: 'absolute', bottom: -10, zIndex: 10 },
  highlightedBubble: { borderWidth: 2, borderColor: '#6366F1' },
  imageMessageContainer: { gap: 2 },
});

export default GroupMessageItem;
