import { useState } from 'react';
import { Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import MessageService, { ReplyData } from '../services/messageService';

export interface UseMessageActionsResult {
  isLoading: boolean;
  error: string | null;
  toggleReaction: (roomId: string, messageId: string, emoji: string, userId: string) => Promise<void>;
  pinMessage: (roomId: string, messageId: string, isPinned: boolean) => Promise<void>;
  deleteMessage: (roomId: string, messageId: string, isCurrentUser: boolean) => Promise<void>;
  editMessage: (roomId: string, messageId: string, newText: string) => Promise<void>;
  addReply: (roomId: string, messageId: string, replyData: ReplyData) => Promise<void>;
  copyToClipboard: (text: string) => Promise<void>;
  showDeleteConfirm: (onConfirm: () => void, isCurrentUser: boolean) => void;
}

export const useMessageActions = (): UseMessageActionsResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: () => Promise<void>, successMessage?: string, errorMessage?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await action();
      if (successMessage) {
        Alert.alert('Thành công', successMessage);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setError(errorMsg);
      console.error('MessageAction error:', err);
      Alert.alert('Lỗi', errorMessage || errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to determine if it's a group or room
  const isGroupContext = (roomId: string): boolean => {
    console.log('🔍 Checking isGroupContext for roomId:', roomId);
    // More robust group detection:
    // 1. Contains 'group' in ID
    // 2. Starts with known group prefixes
    // 3. Regular chat rooms have underscore format "uid1_uid2" or contain "-" (Firebase auto-generated room IDs)
    // 4. Group IDs are usually clean alphanumeric without "-" or "_"
    const isGroup = (
      roomId.includes('group') ||
      roomId.startsWith('grp_') ||
      roomId.startsWith('GROUP_') ||
      // A group ID should NOT contain "-" (which indicates it's a room ID)
      // and should NOT contain "_" (which indicates it's a "uid1_uid2" format)
      (!roomId.includes('-') && !roomId.includes('_') && roomId.length > 15)
    );
    console.log('🔍 isGroupContext result:', isGroup, 'for roomId:', roomId);
    return isGroup;
  };

  const toggleReaction = async (roomId: string, messageId: string, emoji: string, userId: string) => {
    console.log('🎯 toggleReaction called with:', { roomId, messageId, emoji, userId });
    await handleAction(async () => {
      if (isGroupContext(roomId)) {
        console.log('📱 Using group reaction method');
        await MessageService.toggleGroupReaction(roomId, messageId, emoji, userId);
      } else {
        console.log('💬 Using regular chat reaction method');
        await MessageService.toggleReaction(messageId, emoji, userId, roomId);
      }
    }, undefined, 'Không thể thả cảm xúc');
  };

  const pinMessage = async (roomId: string, messageId: string, isPinned: boolean) => {
    await handleAction(async () => {
      if (isGroupContext(roomId)) {
        await MessageService.pinGroupMessage(roomId, messageId, isPinned);
      } else {
        await MessageService.pinMessage(messageId, isPinned, roomId);
      }
    }, isPinned ? 'Đã bỏ ghim tin nhắn' : 'Đã ghim tin nhắn', 'Không thể thực hiện thao tác ghim');
  };

  const deleteMessage = async (roomId: string, messageId: string, isCurrentUser: boolean) => {
    await handleAction(async () => {
      if (isGroupContext(roomId)) {
        await MessageService.deleteGroupMessage(roomId, messageId, isCurrentUser);
      } else {
        await MessageService.deleteMessage(messageId, isCurrentUser, roomId);
      }
    }, isCurrentUser ? 'Đã thu hồi tin nhắn' : 'Đã xóa tin nhắn', 'Không thể xóa tin nhắn');
  };

  const editMessage = async (roomId: string, messageId: string, newText: string) => {
    await handleAction(async () => {
      if (isGroupContext(roomId)) {
        await MessageService.editGroupMessage(roomId, messageId, newText);
      } else {
        await MessageService.editMessage(messageId, newText, roomId);
      }
    }, 'Đã cập nhật tin nhắn', 'Không thể chỉnh sửa tin nhắn');
  };

  const addReply = async (roomId: string, messageId: string, replyData: ReplyData) => {
    await handleAction(async () => {
      if (isGroupContext(roomId)) {
        await MessageService.addGroupReply(roomId, messageId, replyData);
      } else {
        await MessageService.addReply(messageId, replyData, roomId);
      }
    }, undefined, 'Không thể trả lời tin nhắn');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Đã sao chép', 'Tin nhắn đã được sao chép vào clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('Lỗi', 'Không thể sao chép tin nhắn');
    }
  };

  const showDeleteConfirm = (onConfirm: () => void, isCurrentUser: boolean) => {
    Alert.alert(
      isCurrentUser ? 'Thu hồi tin nhắn' : 'Xóa tin nhắn',
      isCurrentUser 
        ? 'Bạn có muốn thu hồi tin nhắn này không? Tin nhắn sẽ bị xóa khỏi cuộc trò chuyện.'
        : 'Bạn có muốn xóa tin nhắn này khỏi thiết bị của mình không?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: isCurrentUser ? 'Thu hồi' : 'Xóa',
          style: 'destructive',
          onPress: onConfirm,
        },
      ]
    );
  };

  return {
    isLoading,
    error,
    toggleReaction,
    pinMessage,
    deleteMessage,
    editMessage,
    addReply,
    copyToClipboard,
    showDeleteConfirm,
  };
};
