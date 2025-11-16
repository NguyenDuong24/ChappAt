import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import React, { useState, useContext } from 'react';
import { Avatar } from 'react-native-paper';
import { formatTime, getRoomId } from '../../utils/common';
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
import { useChatTheme } from '@/context/ChatThemeContext';

interface MessageItemProps {
  message: any;
  currentUser: any;
  otherUser?: any;
  onReply?: (message: any) => void;
  onMessageLayout?: (messageId: string, y: number) => void;
  isHighlighted?: boolean;
  onReport?: (message: any) => void;
}

export default function MessageItem({ 
  message, 
  currentUser, 
  otherUser,
  onReply,
  onMessageLayout,
  isHighlighted,
  onReport,
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
  
  // Messenger-style colors using chat theme
  const { currentTheme: chatTheme } = useChatTheme();
  const sentBubbleColor = chatTheme.sentMessageColor;
  const receivedBubbleColor = chatTheme.receivedMessageColor;
  const bubbleColors: readonly [string, string] = isCurrentUser ? [sentBubbleColor, sentBubbleColor] : [receivedBubbleColor, receivedBubbleColor];

  const {
    toggleReaction,
    pinMessage,
    deleteMessage,
    editMessage,
    copyToClipboard,
    showDeleteConfirm,
    isLoading,
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

  const formatMessageTime = () => {
    if (!message?.createdAt) return '';
    return formatTime(message.createdAt);
  };

  const onContainerLayout = (e: any) => {
    const y = e?.nativeEvent?.layout?.y;
    const msgId = (message?.id || message?.messageId) as string | undefined;
    if (typeof y === 'number' && msgId && onMessageLayout) {
      onMessageLayout(msgId, y);
    }
  };

  const isReplyingToVibe = message?.replyTo?.type === 'vibe';
  const isImageMessage = !!message?.imageUrl && !message?.text;
  const isGiftMessage = message?.type === 'gift' && message?.gift;

  return (
    <>
      <TouchableOpacity 
        onPress={handlePress} 
        onLongPress={handleLongPress}
        delayLongPress={300}
        activeOpacity={0.95}
        style={[styles.messageContainer, isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage]}
        onLayout={onContainerLayout}
      >
        {!isCurrentUser && (
          <Avatar.Image
            size={32}
            source={{ uri: message.profileUrl }}
            style={styles.avatar}
          />
        )}
        <View style={[styles.messageContent, { maxWidth: '80%' }]}>
          {/* Reply Preview */}
          {message?.replyTo && !isReplyingToVibe && (
            <View style={[
              styles.replyContainer,
              { 
                backgroundColor: isCurrentUser 
                  ? 'rgba(255,255,255,0.1)' 
                  : theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderLeftColor: isCurrentUser ? 'rgba(255,255,255,0.5)' : currentThemeColors.tint,
                marginBottom: 6,
              }
            ]}> 
              <View style={styles.replyContent}>
                <Text style={[
                  styles.replySender, 
                  { color: isCurrentUser ? 'rgba(255,255,255,0.85)' : currentThemeColors.tint }
                ]}>
                  {message.replyTo.senderName}
                </Text>
                <Text 
                  style={[
                    styles.replyText, 
                    { color: isCurrentUser ? 'rgba(255,255,255,0.65)' : currentThemeColors.subtleText }
                  ]} 
                  numberOfLines={2}
                >
                  {message.replyTo.imageUrl ? '📷 Hình ảnh' : message.replyTo.text}
                </Text>
              </View>
            </View>
          )}

          {/* Vibe Reply */}
          {isReplyingToVibe && (
            <View style={[
              styles.replyContainer,
              { 
                backgroundColor: isCurrentUser 
                  ? 'rgba(255,255,255,0.1)' 
                  : theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderLeftColor: isCurrentUser ? 'rgba(255,255,255,0.5)' : currentThemeColors.tint,
                marginBottom: 6,
              }
            ]}> 
              <View style={styles.replyContent}>
                <Text style={[
                  styles.replySender, 
                  { color: isCurrentUser ? 'rgba(255,255,255,0.85)' : currentThemeColors.tint }
                ]}>
                  Trả lời Vibe
                </Text>
                <Text 
                  style={[
                    styles.replyText, 
                    { color: isCurrentUser ? 'rgba(255,255,255,0.65)' : currentThemeColors.subtleText }
                  ]} 
                  numberOfLines={2}
                >
                  {message?.replyTo?.vibeEmoji || '✨'} {message?.replyTo?.vibeName || ''}
                </Text>
              </View>
            </View>
          )}

          {/* Message Bubble */}
          <View style={[styles.bubbleContainer, isCurrentUser ? styles.bubbleContainerRight : styles.bubbleContainerLeft]}>
            <View style={[
              styles.bubble,
              isCurrentUser ? styles.bubbleRight : styles.bubbleLeft,
              isHighlighted && styles.highlightedBubble,
              isImageMessage && styles.imageBubble,
            ]}>
              <View
                style={[
                  styles.bubbleContent,
                  { backgroundColor: isImageMessage || isGiftMessage ? 'transparent' : bubbleColors[0] },
                  isCurrentUser ? styles.currentUserBubbleShadow : styles.otherUserBubbleShadow,
                  isImageMessage && { padding: 0 },
                  isGiftMessage && { padding: 0 },
                ]}
              >
                {isGiftMessage ? (
                  <GiftMessage
                    gift={message.gift}
                    senderName={message?.senderName}
                    isCurrentUser={isCurrentUser}
                    themeColors={currentThemeColors}
                  />
                ) : message?.imageUrl ? (
                  <View style={styles.imageWrapper}>
                    <CustomImage 
                      source={message.imageUrl} 
                      style={styles.messageImage}
                      onLongPress={handleLongPress} 
                    />
                    {message.text && (
                      <Text style={[styles.messageText, { color: isCurrentUser ? '#FFFFFF' : chatTheme.textColor, marginTop: 8 }]}>
                        {message.text}
                      </Text>
                    )}
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.4)']}
                      style={styles.imageOverlay}
                    >
                      <View style={styles.timeStatusRow}>
                        <Text style={[styles.timeText, { color: '#FFFFFF' }]}>
                          {formatMessageTime()}
                        </Text>
                        {isCurrentUser && (
                          (() => {
                            switch (message?.status) {
                              case 'sent':
                                return <MaterialIcons name="done" size={14} color="#FFF" />;
                              case 'delivered':
                                return <MaterialIcons name="done-all" size={14} color="#FFF" />;
                              case 'read':
                                return <MaterialIcons name="done-all" size={14} color="#4CAF50" />;
                              default:
                                return <MaterialIcons name="schedule" size={14} color="#FFF" />;
                            }
                          })()
                        )}
                      </View>
                    </LinearGradient>
                  </View>
                ) : (
                  <>
                    <Text style={[styles.messageText, { color: isCurrentUser ? '#FFFFFF' : chatTheme.textColor }]}>
                      {message?.text}
                    </Text>
                    <View style={styles.timeStatusRow}>
                      <Text style={[styles.timeText, { color: isCurrentUser ? 'rgba(255,255,255,0.8)' : currentThemeColors.subtleText }]}>
                        {formatMessageTime()}
                      </Text>
                      {isCurrentUser && (
                        (() => {
                          switch (message?.status) {
                            case 'sent':
                              return <MaterialIcons name="done" size={14} color="rgba(255,255,255,0.7)" />;
                            case 'delivered':
                              return <MaterialIcons name="done-all" size={14} color="rgba(255,255,255,0.7)" />;
                            case 'read':
                              return <MaterialIcons name="done-all" size={14} color="#FFFFFF" />;
                            default:
                              return <MaterialIcons name="schedule" size={14} color="rgba(255,255,255,0.7)" />;
                          }
                        })()
                      )}
                    </View>
                  </>
                )}
                {message.isEdited && (
                  <Text style={[styles.editedLabel, { color: isCurrentUser ? 'rgba(255,255,255,0.6)' : currentThemeColors.subtleText }]}>
                    đã chỉnh sửa
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Gift Badge */}
          {isGiftMessage && (
            <View style={[styles.giftBadge, { alignSelf: isCurrentUser ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.giftBadgeText, { color: currentThemeColors.tint }]}>
                🎉 Cám ơn vì món quà!
              </Text>
            </View>
          )}

          {/* Reactions */}
          {message?.reactions && Object.keys(message.reactions).length > 0 && (
            <MessageReactions
              reactions={message.reactions}
              onReactionPress={handleReactionPress}
              currentUserId={currentUser?.uid}
            />
          )}
          
          {showTime && (
            <View style={[styles.detailedTimeContainer, { alignSelf: isCurrentUser ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.detailedTimeText, { color: currentThemeColors.subtleText }]}>
                {message?.createdAt?.toDate?.().toLocaleString('vi-VN') || 'N/A'}
              </Text>
            </View>
          )}
        </View>
        {isCurrentUser && (
          <Avatar.Image
            size={32}
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
        onReport={() => onReport?.(message)}
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
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingHorizontal: 12,
    alignItems: 'flex-end',
  },
  currentUserMessage: {
    flexDirection: 'row-reverse',
  },
  otherUserMessage: {
    flexDirection: 'row',
  },
  avatar: {
    marginHorizontal: 8,
  },
  messageContent: {
    flexShrink: 1,
  },
  bubbleContainer: {
    position: 'relative',
    marginVertical: 2,
  },
  bubbleContainerRight: {
    alignItems: 'flex-end',
  },
  bubbleContainerLeft: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '100%',
  },
  bubbleGradient: {
    padding: 12,
    borderRadius: 20,
  },
  bubbleRight: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  bubbleLeft: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  currentUserBubbleShadow: {
    shadowColor: '#0084FF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
  otherUserBubbleShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  highlightedBubble: {
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  timeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    marginTop: 2,
    opacity: 0.7,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '400',
  },
  editedLabel: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
  },
  detailedTimeContainer: {
    marginTop: 4,
  },
  detailedTimeText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  replyContainer: {
    padding: 8,
    borderLeftWidth: 3,
    borderRadius: 8,
  },
  replyContent: {
    gap: 2,
  },
  replySender: {
    fontSize: 13,
    fontWeight: '700',
  },
  replyText: {
    fontSize: 14,
    lineHeight: 18,
  },
  giftBadge: {
    marginTop: 4,
  },
  giftBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  imageBubble: {
    overflow: 'hidden',
    borderRadius: 20,
  },
  imageWrapper: {
    position: 'relative',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 18,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  bubbleContent: {
    padding: 12,
    borderRadius: 18,
    maxWidth: '100%',
  },
});