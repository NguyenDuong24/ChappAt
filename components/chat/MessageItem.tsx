import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import React, { useState, useContext } from 'react';
import { Avatar } from 'react-native-paper';
import { formatTime, formatDetailedTime, getRoomId } from '../../utils/common';
import { Image } from 'react-native';
import CustomImage from '../common/CustomImage';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import GiftMessage from './GiftMessage';
import MessageActionSheet from './MessageActionSheet';
import MessageReactions from './MessageReactions';
import EditMessageModal from './EditMessageModal';
import { useMessageActions } from '@/hooks/useMessageActions';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

interface MessageItemProps {
  message: any;
  currentUser: any;
  otherUser?: any;
  onReply?: (message: any) => void;
  onMessageLayout?: (messageId: string, y: number) => void;
  isHighlighted?: boolean;
}

export default function MessageItem({ 
  message, 
  currentUser, 
  otherUser,
  onReply,
  onMessageLayout,
  isHighlighted,
}: MessageItemProps) {
  const isCurrentUser = message?.uid === currentUser?.uid;
  const [showTime, setShowTime] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const { id: routePeerId } = useLocalSearchParams<{ id?: string }>();
  const currentUid = currentUser?.uid ?? currentUser?.id ?? currentUser?.userId;
  const otherUid = otherUser?.uid ?? otherUser?.id ?? otherUser?.userId ?? (routePeerId as string | undefined);
  const computedRoomId = currentUid && otherUid ? getRoomId(currentUid, otherUid) : undefined;
  const roomId = computedRoomId || (message?.roomId as string | undefined) || (message?.chatId as string | undefined) || '';
  
  // Tuple-typed gradients for bubbles
  const meColors: readonly [string, string] = theme === 'dark'
    ? [Colors.dark.tintDark, Colors.accent] // Indigo-500 to Emerald-500
    : ['#D1FAE5', '#A7F3D0'];
  const otherColors: readonly [string, string] = theme === 'dark'
    ? [Colors.dark.surface, Colors.dark.background]
    : ['#EEF2FF', '#E0E7FF'];
  const bubbleColors: readonly [string, string] = isCurrentUser ? meColors : otherColors;

  // Use message actions hook
  const {
    toggleReaction,
    pinMessage,
    deleteMessage,
    editMessage,
    copyToClipboard,
    showDeleteConfirm,
    isLoading,
    error,
  } = useMessageActions();

  const handlePress = () => {
    setShowTime(prev => !prev); 
  };

  const handleLongPress = () => {
    setShowActionSheet(true);
  };

  const handleReply = () => {
    onReply?.(message);
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleEditSave = async (newText: string) => {
    const msgId = (message?.id || message?.messageId) as string | undefined;
    if (!roomId || !msgId) return;
    await editMessage(roomId, msgId, newText);
    setShowEditModal(false);
  };

  const handleDelete = () => {
    const msgId = (message?.id || message?.messageId) as string | undefined;
    if (!roomId || !msgId) return;
    showDeleteConfirm(
      () => deleteMessage(roomId, msgId, isCurrentUser),
      isCurrentUser
    );
  };

  const handlePin = () => {
    const msgId = (message?.id || message?.messageId) as string | undefined;
    if (!roomId || !msgId) return;
    pinMessage(roomId, msgId, !!message?.isPinned);
  };

  const handleReaction = (emoji: string) => {
    const msgId = (message?.id || message?.messageId) as string | undefined;
    const currentUid = currentUser?.uid ?? currentUser?.id;
    if (!roomId || !msgId || !currentUid) return;
    toggleReaction(roomId, msgId, emoji, currentUid);
  };

  const handleReactionPress = (emoji: string) => {
    const msgId = (message?.id || message?.messageId) as string | undefined;
    const currentUid = currentUser?.uid ?? currentUser?.id;
    if (!roomId || !msgId || !currentUid) return;
    toggleReaction(roomId, msgId, emoji, currentUid);
  };

  const handleCopy = () => {
    if (message?.text) {
      copyToClipboard(message.text);
    }
  };

  const getStatusIcon = () => {
    if (!isCurrentUser) return null;
    
    switch (message?.status) {
      case 'sent':
        return <MaterialIcons name="done" size={14} color="#999" />;
      case 'delivered':
        return <MaterialIcons name="done-all" size={14} color="#999" />;
      case 'read':
        return <MaterialIcons name="done-all" size={14} color="#4CAF50" />;
      default:
        return <MaterialIcons name="schedule" size={14} color="#999" />;
    }
  };

  const formatMessageTime = () => {
    if (!message?.createdAt) return '';
    const time = formatTime(message.createdAt);
    return time;
  };

  const onContainerLayout = (e: any) => {
    const y = e?.nativeEvent?.layout?.y;
    const msgId = (message?.id || message?.messageId) as string | undefined;
    if (typeof y === 'number' && msgId && onMessageLayout) {
      onMessageLayout(msgId, y);
    }
  };

  const isReplyingToVibe = message?.replyTo?.type === 'vibe';

  return (
    <>
      <TouchableOpacity 
        onPress={handlePress} 
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={[styles.messageContainer, isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage]}
        onLayout={onContainerLayout}
      >
        {!isCurrentUser && (
          <Avatar.Image
            size={32} // giảm từ 40 xuống 32
            source={{ uri: message.profileUrl }}
            style={styles.avatar}
          />
        )}
        <View style={styles.messageContent}>
          {/* Reply indicator for message reply */}
          {message?.replyTo && !isReplyingToVibe && (
            <View style={styles.replyContainer}>
              <View style={styles.replyIndicator} />
              <View
                style={[
                  styles.replyContent,
                  styles.replyBox,
                  {
                    backgroundColor: theme === 'dark' ? Colors.dark.commentBackground : Colors.light.commentBackground,
                    borderColor: theme === 'dark' ? Colors.gray600 : Colors.gray200,
                  },
                ]}
              >
                <Text style={[styles.replySender, { color: currentThemeColors.tint }]}>
                  {message.replyTo.senderName}
                </Text>
                <Text 
                  style={[styles.replyText, { color: currentThemeColors.text }]} 
                  numberOfLines={1}
                >
                  {message.replyTo.imageUrl ? '📷 Hình ảnh' : message.replyTo.text}
                </Text>
              </View>
            </View>
          )}

          {/* Reply indicator for vibe reply */}
          {isReplyingToVibe && (
            <View style={[styles.replyContainer, { paddingLeft: 10 }]}>
              <View
                style={[
                  styles.vibeChip,
                  {
                    backgroundColor: theme === 'dark' ? '#818CF826' : '#6366F11A',
                    borderColor: theme === 'dark' ? Colors.gray600 : Colors.gray200,
                  },
                ]}
              > 
                <Text style={[styles.vibeChipText, { color: currentThemeColors.tint }]} numberOfLines={1}>
                  Trả lời Vibe: {message?.replyTo?.vibeEmoji || '✨'} {message?.replyTo?.vibeName || ''}
                </Text>
              </View>
            </View>
          )}

          {/* Message bubble */}
          <LinearGradient
            colors={bubbleColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.bubbleGradient,
              isCurrentUser ? styles.bubbleRight : styles.bubbleLeft,
              isCurrentUser ? styles.currentUserBubbleShadow : styles.otherUserBubbleShadow,
              { borderColor: theme === 'dark' ? Colors.gray700 : Colors.gray200 },
              isHighlighted ? { borderColor: currentThemeColors.tint, borderWidth: 2 } : null,
              { padding: 8, borderRadius: 12 }, // giảm padding và borderRadius
            ]}
          >
            {message?.type === 'gift' && message?.gift ? (
              <GiftMessage
                gift={message.gift}
                senderName={message?.senderName}
                isCurrentUser={isCurrentUser}
                themeColors={currentThemeColors}
              />
            ) : message?.imageUrl ? (
              <CustomImage source={message.imageUrl} style={[styles.image, { height: 120, width: 160 }]} /> // giảm kích thước ảnh
            ) : (
              <Text style={[styles.messageText, { color: isCurrentUser && theme === 'dark' ? Colors.dark.text : currentThemeColors.text, fontSize: 13.5, lineHeight: 18 }]}> 
                {message?.text}
              </Text>
            )}

            {/* Time and status row */}
            <View style={styles.timeStatusContainer}>
              <Text style={[styles.timeText, { color: isCurrentUser && theme === 'dark' ? Colors.dark.subtleText : '#64748B', fontSize: 9 }]}> 
                {formatMessageTime()}
              </Text>
              {isCurrentUser ? (
                (() => {
                  switch (message?.status) {
                    case 'sent':
                      return <MaterialIcons name="done" size={12} color={theme === 'dark' ? Colors.dark.icon : '#999'} />;
                    case 'delivered':
                      return <MaterialIcons name="done-all" size={12} color={theme === 'dark' ? Colors.dark.icon : '#999'} />;
                    case 'read':
                      return <MaterialIcons name="done-all" size={12} color={theme === 'dark' ? Colors.dark.iconActive : '#4CAF50'} />;
                    default:
                      return <MaterialIcons name="schedule" size={12} color={theme === 'dark' ? Colors.dark.icon : '#999'} />;
                  }
                })()
              ) : getStatusIcon()}
            </View>
          </LinearGradient>

          {/* Optional celebration badge for gifts */}
          {message?.type === 'gift' && (
            <View style={{ alignSelf: isCurrentUser ? 'flex-end' : 'flex-start', marginTop: 4 }}>
              <Text style={{ fontSize: 12 }}>🎉 Cám ơn vì món quà!</Text>
            </View>
          )}

          {/* Reactions */}
          {message?.reactions && (
            <MessageReactions
              reactions={message.reactions}
              onReactionPress={handleReactionPress}
              currentUserId={currentUser?.uid}
            />
          )}
          
          {showTime && (
            <View style={styles.detailedTimeContainer}>
              <Text style={[styles.detailedTimeText, { color: currentThemeColors.subtleText }]}>
                {message?.createdAt && formatDetailedTime(message.createdAt)}
              </Text>
              {isCurrentUser && message?.status && (
                <Text style={[styles.statusText, { color: currentThemeColors.subtleText }]}>
                  {message.status === 'sent' && 'Đã gửi'}
                  {message.status === 'delivered' && 'Đã nhận'}
                  {message.status === 'read' && 'Đã xem'}
                </Text>
              )}
            </View>
          )}
        </View>
        {isCurrentUser && (
          <Avatar.Image
            size={32} // giảm từ 40 xuống 32
            source={{ uri: currentUser?.profileUrl }}
            style={styles.avatar}
          />
        )}
      </TouchableOpacity>

      <MessageActionSheet
        visible={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        onReply={handleReply}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPin={handlePin}
        onCopy={handleCopy}
        onReaction={handleReaction}
        isCurrentUser={isCurrentUser}
        isPinned={message?.isPinned}
        message={message}
      />

      <EditMessageModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleEditSave}
        originalText={message?.text || ''}
        loading={isLoading}
      />
    </>
  );
}

const styles = StyleSheet.create({
  image: {
    borderRadius: 10, // giảm từ 12 xuống 10
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 6,
    paddingHorizontal: 10,
    maxWidth: '85%',
    alignSelf: 'flex-start',
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
  },
  avatar: {
    marginRight: 6, // giảm từ 10 xuống 6
    marginLeft: 6, // giảm từ 10 xuống 6
  },
  messageContent: {
    flex: 1,
  },
  messageText: {
    fontSize: 13.5, // giảm từ 15.5 xuống 13.5
    lineHeight: 18, // giảm từ 21 xuống 18
    fontWeight: '500',
  },
  // Reply block
  replyContainer: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 10,
    opacity: 0.95,
  },
  replyIndicator: {
    width: 3,
    backgroundColor: '#6366F1',
    borderRadius: 1.5,
    marginRight: 8,
  },
  replyContent: {
    flex: 1,
  },
  replySender: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 12.5,
  },
  replyBox: {
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  // Vibe chip
  vibeChip: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  vibeChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Bubble look
  bubbleGradient: {
    padding: 8, // giảm từ 12 xuống 8
    borderRadius: 12, // giảm từ 16 xuống 12
    minWidth: 48, // giảm từ 60 xuống 48
    borderWidth: StyleSheet.hairlineWidth,
  },
  bubbleRight: {
    borderTopRightRadius: 6, // giảm từ 8 xuống 6
    borderTopLeftRadius: 12, // giảm từ 16 xuống 12
    borderBottomLeftRadius: 12, // giảm từ 16 xuống 12
    borderBottomRightRadius: 4, // giảm từ 6 xuống 4
  },
  bubbleLeft: {
    borderTopRightRadius: 12, // giảm từ 16 xuống 12
    borderTopLeftRadius: 6, // giảm từ 8 xuống 6
    borderBottomRightRadius: 12, // giảm từ 16 xuống 12
    borderBottomLeftRadius: 4, // giảm từ 6 xuống 4
  },
  currentUserBubbleShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2.5,
    elevation: 2,
  },
  otherUserBubbleShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  timeStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6, // giảm từ 8 xuống 6
    gap: 3, // giảm từ 4 xuống 3
  },
  timeText: {
    fontSize: 9, // giảm từ 10.5 xuống 9
  },
  detailedTimeContainer: {
    alignItems: 'flex-start',
    marginTop: 2, // giảm từ 4 xuống 2
    paddingLeft: 6, // giảm từ 10 xuống 6
  },
  detailedTimeText: {
    fontSize: 9, // giảm từ 11 xuống 9
  },
  statusText: {
    fontSize: 9, // giảm từ 11 xuống 9
  },
});
