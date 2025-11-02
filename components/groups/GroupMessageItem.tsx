import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { formatTime, formatDetailedTime } from '@/utils/common';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import CustomImage from '../common/CustomImage';
import MessageActionSheet from '../chat/MessageActionSheet';
import MessageReactions from '../chat/MessageReactions';
import EditMessageModal from '../chat/EditMessageModal';
import { useMessageActions } from '@/hooks/useMessageActions';

const StatusIcon = ({ status }: { status: string }) => {
  let icon = '✓';
  let color = '#999';
  if (status === 'delivered') icon = '✓✓';
  if (status === 'read') { icon = '✓✓'; color = '#4CAF50'; }
  if (status === 'sent') icon = '✓';
  if (!['sent', 'delivered', 'read'].includes(status)) { icon = '⏰'; }
  return (
    <Text style={{ color, fontSize: 12, marginLeft: 4 }}>{icon}</Text>
  );
};

const MessageAvatar = ({ profileUrl, senderName, size = 40 }: { profileUrl: string; senderName: string; size?: number }) => {
  const [imageError, setImageError] = useState(false);
  if (!profileUrl || imageError) {
    const initial = senderName ? senderName.charAt(0).toUpperCase() : '?';
    return (
      <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }] }>
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: size * 0.4 }}>{initial}</Text>
      </View>
    );
  }
  return (
    <CustomImage
      source={profileUrl}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#f0f0f0' }}
    />
  );
};

interface GroupMessageItemProps {
  message: any;
  currentUser: any;
  groupId?: string;
  onReply?: (message: any) => void;
  onMessageLayout?: (messageId: string, y: number) => void;
  isHighlighted?: boolean;
}

const GroupMessageItem: React.FC<GroupMessageItemProps> = ({ 
  message, 
  currentUser, 
  groupId = '',
  onReply,
  onMessageLayout,
  isHighlighted 
}) => {
  const isCurrentUser = message.uid === currentUser?.uid;
  const [showTime, setShowTime] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  // Use message actions hook (works for both chat and group)
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
    if (!groupId || !msgId) return;
    // For groups, we use the groupId as the room ID
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
    console.log('🎯 GroupMessageItem handleReaction:', { groupId, msgId, emoji, currentUid, message });
    if (!groupId || !msgId || !currentUid) {
      console.log('❌ Missing required data for reaction:', { groupId, msgId, currentUid });
      return;
    }
    toggleReaction(groupId, msgId, emoji, currentUid);
  };

  const handleReactionPress = (emoji: string) => {
    const msgId = (message?.id || message?.messageId) as string | undefined;
    const currentUid = currentUser?.uid ?? currentUser?.id;
    console.log('🎯 GroupMessageItem handleReactionPress:', { groupId, msgId, emoji, currentUid });
    if (!groupId || !msgId || !currentUid) {
      console.log('❌ Missing required data for reaction press:', { groupId, msgId, currentUid });
      return;
    }
    toggleReaction(groupId, msgId, emoji, currentUid);
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

  return (
    <>
      <TouchableOpacity 
        style={{ marginBottom: 8 }}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={500}
        onLayout={onContainerLayout}
      >
        <View style={[styles.row, { justifyContent: isCurrentUser ? 'flex-end' : 'flex-start' }]}> 
          {!isCurrentUser && (
            <View style={{ marginHorizontal: 8, alignSelf: 'flex-end' }}>
              <MessageAvatar profileUrl={message.profileUrl} senderName={message.senderName} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            {!isCurrentUser && (
              <Text style={[styles.senderName, { color: currentThemeColors.tint }]}>{message.senderName}</Text>
            )}
            {/* Reply indicator */}
            {message?.replyTo && (
              <View style={[styles.replyContainer, { opacity: 0.8 }]}> 
                <View style={[styles.replyIndicator, { backgroundColor: currentThemeColors.tint }]}/>
                <View style={styles.replyContent}>
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
            {/* Pin indicator */}
            {message?.isPinned && (
              <View style={styles.pinIndicator}>
                <MaterialIcons name="push-pin" size={16} color={currentThemeColors.warning} />
                <Text style={[styles.pinText, { color: currentThemeColors.text }]}>
                  Tin nhắn đã ghim
                </Text>
              </View>
            )}
            <View style={[styles.bubble, {
              backgroundColor: isCurrentUser ? currentThemeColors.cardBackgroundElevated : currentThemeColors.cardBackground,
              borderColor: isHighlighted ? currentThemeColors.tint : 'transparent',
              borderWidth: isHighlighted ? 2 : 0,
            }]}> 
              {message.imageUrl && (
                <CustomImage source={message.imageUrl} style={[styles.messageImage, { backgroundColor: currentThemeColors.cardBackground }]} />
              )}
              {message.text ? (
                <Text style={[styles.messageText, { color: currentThemeColors.text }]}>{message.text}</Text>
              ) : null}
              <View style={styles.timeStatusRow}>
                <Text style={[styles.timeText, { color: currentThemeColors.subtleText }]}>{formatMessageTime()}</Text>
                {isCurrentUser && <StatusIcon status={message.status} />}
              </View>
            </View>
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
            <View style={{ marginHorizontal: 8, alignSelf: 'flex-end' }}>
              <MessageAvatar profileUrl={currentUser?.profileUrl} senderName={currentUser?.displayName} />
            </View>
          )}
        </View>
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
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    maxWidth: '85%',
    alignSelf: 'stretch',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginLeft: 4,
    textAlign: 'left',
  },
  bubble: {
    padding: 12,
    borderRadius: 16,
    minWidth: 60,
    borderWidth: 0, // borderColor sẽ được set động
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  messageImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
    marginBottom: 6,
  },
  timeStatusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
  },
  timeText: {
    fontSize: 10,
  },
  detailedTimeContainer: {
    alignItems: 'flex-start',
    marginTop: 4,
    paddingLeft: 10,
  },
  detailedTimeText: {
    fontSize: 11,
  },
  statusText: {
    fontSize: 11,
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyContainer: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 10,
  },
  replyIndicator: {
    width: 3,
    borderRadius: 1.5,
    marginRight: 8,
  },
  replyContent: {
    flex: 1,
  },
  replySender: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 12,
  },
  pinIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingLeft: 10,
    opacity: 0.9,
  },
  pinText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default GroupMessageItem;