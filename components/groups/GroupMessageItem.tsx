import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState, useContext, useMemo } from 'react';
import { formatTime } from '@/utils/common';
import CustomImage from '@/components/common/CustomImage';
import MessageActionSheet from '@/components/chat/MessageActionSheet';
import EditMessageModal from '@/components/chat/EditMessageModal';
import MessageReactions from '@/components/chat/MessageReactions';
import { useMessageActions } from '@/hooks/useMessageActions';
import GiftMessage from '@/components/chat/GiftMessage';
import { useTranslation } from 'react-i18next';

// Expanded color palette - 20 distinct colors for better distribution
const AVATAR_COLORS = [
  ['#FF6B6B', '#EE5A6F'], // Red
  ['#4ECDC4', '#44A08D'], // Teal
  ['#45B7D1', '#2E86AB'], // Blue
  ['#FFA07A', '#FA8072'], // Salmon
  ['#98D8C8', '#7FB3D5'], // Mint
  ['#F7DC6F', '#F4D03F'], // Yellow
  ['#BB8FCE', '#9B59B6'], // Purple
  ['#85C1E2', '#5DADE2'], // Sky Blue
  ['#F8B500', '#FF9800'], // Orange
  ['#26A69A', '#00897B'], // Cyan
  ['#EC407A', '#E91E63'], // Pink
  ['#66BB6A', '#43A047'], // Green
  ['#AB47BC', '#8E24AA'], // Deep Purple
  ['#FF7043', '#F4511E'], // Deep Orange
  ['#5C6BC0', '#3F51B5'], // Indigo
  ['#26C6DA', '#00ACC1'], // Light Blue
  ['#FFCA28', '#FFA000'], // Amber
  ['#EF5350', '#E53935'], // Red
  ['#8D6E63', '#6D4C41'], // Brown
  ['#78909C', '#546E7A'], // Blue Grey
];

// Consistent color assignment based on user ID
const getUserColor = (userId: string): string[] => {
  if (!userId) return AVATAR_COLORS[0];

  // Create a simple hash from userId
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }

  // Get positive index
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

// Get name color based on user ID (lighter colors for text)
const getNameColor = (userId: string, theme: string): string => {
  const colors = getUserColor(userId);
  return colors[0]; // Use first color from gradient
};

const StatusIcon = ({ status, isOverlay = false }: { status: string, isOverlay?: boolean }) => {
  const color = isOverlay ? '#FFFFFF' : (status === 'read' ? '#4CAF50' : '#999');
  const iconName = (() => {
    switch (status) {
      case 'read':
      case 'delivered':
        return 'done-all';
      case 'sent':
        return 'done';
      default:
        return 'access-time';
    }
  })();

  return <MaterialIcons name={iconName} size={12} color={color} />;
};

const MessageAvatar = ({
  profileUrl,
  senderName,
  userId,
  size = 40,
  showOnlineIndicator = false
}: {
  profileUrl: string;
  senderName: string;
  userId: string;
  size?: number;
  showOnlineIndicator?: boolean;
}) => {
  const [imageError, setImageError] = useState(false);
  const avatarColors = useMemo(() => getUserColor(userId), [userId]);

  if (!profileUrl || imageError) {
    const initial = senderName ? senderName.charAt(0).toUpperCase() : '?';

    return (
      <View style={[styles.avatarContainer, { width: size, height: size }]}>
        <LinearGradient
          colors={avatarColors as unknown as readonly [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: size * 0.4, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
            {initial}
          </Text>
        </LinearGradient>
        {showOnlineIndicator && (
          <View style={[styles.onlineIndicator, { width: size * 0.3, height: size * 0.3, right: -2, bottom: -2 }]} />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.avatarContainer, { width: size, height: size }]}>
      <CustomImage
        source={profileUrl}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.2)',
        }}
        onLongPress={() => { }}
      />
      {showOnlineIndicator && (
        <View style={[styles.onlineIndicator, { width: size * 0.3, height: size * 0.3, right: -2, bottom: -2 }]} />
      )}
    </View>
  );
};

interface GroupMessageItemProps {
  message: any;
  currentUser: any;
  groupId?: string;
  onReply?: (message: any) => void;
  onMessageLayout?: (messageId: string, y: number) => void;
  isHighlighted?: boolean;
  onReport?: (message: any) => void;
  onUserPress?: (userId: string) => void;
}

const GroupMessageItem: React.FC<GroupMessageItemProps> = ({
  message,
  currentUser,
  groupId = '',
  onReply,
  onMessageLayout,
  isHighlighted,
  onReport,
  onUserPress,
}) => {
  const { t } = useTranslation();
  const isCurrentUser = message.uid === currentUser?.uid;
  const [showTime, setShowTime] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  // Get consistent name color for this user
  const nameColor = useMemo(() =>
    getNameColor(message.uid, theme),
    [message.uid, theme]
  );

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
    if (!groupId || !msgId) return;
    await editMessage(groupId, msgId, newText);
    setShowEditModal(false);
  };

  const handleDelete = () => {
    const msgId = (message?.id || message?.messageId) as string | undefined;
    if (!groupId || !msgId) return;
    showDeleteConfirm(
      () => deleteMessage(groupId, msgId, isCurrentUser),
      isCurrentUser
    );
  };

  const handlePin = () => {
    const msgId = (message?.id || message?.messageId) as string | undefined;
    if (!groupId || !msgId) return;
    pinMessage(groupId, msgId, !!message?.isPinned);
  };

  const handleReaction = (emoji: string) => {
    const msgId = (message?.id || message?.messageId) as string | undefined;
    const currentUid = currentUser?.uid ?? currentUser?.id;
    if (!groupId || !msgId || !currentUid) return;
    toggleReaction(groupId, msgId, emoji, currentUid);
  };

  const handleCopy = () => {
    if (message?.text) {
      copyToClipboard(message.text);
    }
  };

  const getLastMessageStatusIcon = () => {
    if (!message || currentUser?.uid !== message?.uid) return '';

    switch (message?.status) {
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return '✓✓';
      default:
        return '';
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

  const isImageOnly = message.imageUrl && !message.text;
  const isGiftMessage = message?.type === 'gift' && message?.gift;

  // Refined gradients for bubbles
  const meColors: readonly [string, string] = theme === 'dark'
    ? ['#1D4ED8', '#1E40AF']
    : ['#60A5FA', '#3B82F6'];
  const otherColors: readonly [string, string] = theme === 'dark'
    ? ['#334155', '#1F2937']
    : ['#F9FAFB', '#F3F4F6'];
  const bubbleColors: readonly [string, string] = isImageOnly ? ['transparent', 'transparent'] : (isCurrentUser ? meColors : otherColors);

  // Memoized bubble styles
  const bubbleStyle = useMemo(() => ({
    borderTopLeftRadius: isCurrentUser ? 18 : 4,
    borderTopRightRadius: isCurrentUser ? 4 : 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    shadowColor: theme === 'dark' ? '#000' : '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme === 'dark' ? 0.3 : 0.1,
    shadowRadius: 3,
    elevation: 2,
  }), [isCurrentUser, theme]);

  const highlightStyle = useMemo(() => ({
    borderWidth: 1.5,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOpacity: 0.5,
    shadowRadius: 6,
  }), []);

  const editedStyle = isCurrentUser ? styles.editedLabel : [styles.editedLabel, { color: currentThemeColors.subtleText }];

  return (
    <>
      <TouchableOpacity
        style={[styles.messageContainer, isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={300}
        activeOpacity={0.95}
        onLayout={onContainerLayout}
      >
        {!isCurrentUser && (
          <MessageAvatar
            profileUrl={message?.senderProfileUrl || message?.profileUrl}
            senderName={message?.senderName || message?.displayName || t('groups.user')}
            userId={message?.uid}
            size={32}
          />
        )}
        <View style={[styles.messageContent, { maxWidth: '80%' }]}>
          {/* Sender name for group messages (only for received messages) */}
          {!isCurrentUser && (
            <Text style={[styles.senderName, { color: nameColor }]}>
              {message?.senderName || message?.displayName || t('groups.user')}
            </Text>
          )}

          {/* Reply Preview */}
          {message?.replyTo && (
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
                  {message.replyTo.imageUrl ? `📷 ${t('groups.image')}` : message.replyTo.text}
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
              isImageOnly && styles.imageBubble,
            ]}>
              <View
                style={[
                  styles.bubbleContent,
                  { backgroundColor: isImageOnly || isGiftMessage ? 'transparent' : bubbleColors[0] },
                  isCurrentUser ? styles.currentUserBubbleShadow : styles.otherUserBubbleShadow,
                  isImageOnly && { padding: 0 },
                  isGiftMessage && { padding: 0 },
                ]}
              >
                {/* Pinned message badge */}
                {message?.isPinned && (
                  <View style={[styles.pinBadge, { backgroundColor: currentThemeColors.tint }]}>
                    <MaterialCommunityIcons name="pin" size={12} color="#FFFFFF" />
                    <Text style={styles.pinText}>{t('chat.pinned_message')}</Text>
                  </View>
                )}

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
                      <Text style={[styles.messageText, { color: isCurrentUser ? '#FFFFFF' : currentThemeColors.text, marginTop: 8 }]}>
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
                    <Text style={[styles.messageText, { color: isCurrentUser ? '#FFFFFF' : currentThemeColors.text }]}>
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
                    {t('chat.edited')}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Reactions */}
          {message?.reactions && Object.keys(message.reactions).length > 0 && (
            <MessageReactions
              reactions={message.reactions}
              onReactionPress={handleReaction}
              currentUserId={currentUser?.uid}
            />
          )}

          {showTime && (
            <View style={[styles.detailedTimeContainer, { alignSelf: isCurrentUser ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.detailedTimeText, { color: currentThemeColors.subtleText }]}>
                {message?.createdAt?.toDate?.().toLocaleString(t('common.locale') === 'vi' ? 'vi-VN' : 'en-US') || 'N/A'}
              </Text>
            </View>
          )}
        </View>
        {isCurrentUser && (
          <MessageAvatar
            profileUrl={currentUser?.profileUrl || currentUser?.photoURL}
            senderName={currentUser?.displayName || currentUser?.username}
            userId={currentUser?.uid}
            size={32}
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
};

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
  senderName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
    marginLeft: 4,
    letterSpacing: 0.2,
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
  pinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  pinText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
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
  avatarContainer: {
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    backgroundColor: '#4CAF50',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#fff',
  },
});

export default GroupMessageItem;