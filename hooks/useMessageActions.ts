import { useState } from 'react';
import { Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import MessageService, { ReplyData } from '../services/messageService';
import HotSpotMessageService from '@/services/hotSpotMessageService';

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

  const isGroupContext = (roomId: string): boolean => {
    const isGroup = (
      roomId.includes('group') ||
      roomId.startsWith('grp_') ||
      roomId.startsWith('GROUP_') ||
      (!roomId.includes('-') && !roomId.includes('_') && roomId.length > 15 && !roomId.startsWith('hotSpot:'))
    );
    return isGroup;
  };

  const isHotSpotContext = (roomId: string): boolean => {
    return roomId.startsWith('hotSpot:') || roomId.startsWith('HS_') || roomId.startsWith('hotspot_');
  };

  const stripHotSpotPrefix = (roomId: string): string => roomId.replace(/^hotSpot:/, '');

  const toggleReaction = async (roomId: string, messageId: string, emoji: string, userId: string) => {
    await handleAction(async () => {
      if (isHotSpotContext(roomId)) {
        const hsId = stripHotSpotPrefix(roomId);
        await HotSpotMessageService.toggleReaction(hsId, messageId, emoji, userId);
      } else if (isGroupContext(roomId)) {
        await MessageService.toggleGroupReaction(roomId, messageId, emoji, userId);
      } else {
        await MessageService.toggleReaction(messageId, emoji, userId, roomId);
      }
    }, undefined, 'Không thể thả cảm xúc');
  };

  const pinMessage = async (roomId: string, messageId: string, isPinned: boolean) => {
    await handleAction(async () => {
      if (isHotSpotContext(roomId)) {
        const hsId = stripHotSpotPrefix(roomId);
        await HotSpotMessageService.pinMessage(hsId, messageId, isPinned);
      } else if (isGroupContext(roomId)) {
        await MessageService.pinGroupMessage(roomId, messageId, isPinned);
      } else {
        await MessageService.pinMessage(messageId, isPinned, roomId);
      }
    }, isPinned ? 'Đã bỏ ghim tin nhắn' : 'Đã ghim tin nhắn', 'Không thể thực hiện thao tác ghim');
  };

  const deleteMessage = async (roomId: string, messageId: string, isCurrentUser: boolean) => {
    await handleAction(async () => {
      if (isHotSpotContext(roomId)) {
        const hsId = stripHotSpotPrefix(roomId);
        await HotSpotMessageService.deleteMessage(hsId, messageId, isCurrentUser);
      } else if (isGroupContext(roomId)) {
        await MessageService.deleteGroupMessage(roomId, messageId, isCurrentUser);
      } else {
        await MessageService.deleteMessage(messageId, isCurrentUser, roomId);
      }
    }, isCurrentUser ? 'Đã thu hồi tin nhắn' : 'Đã xóa tin nhắn', 'Không thể xóa tin nhắn');
  };

  const editMessage = async (roomId: string, messageId: string, newText: string) => {
    await handleAction(async () => {
      if (isHotSpotContext(roomId)) {
        const hsId = stripHotSpotPrefix(roomId);
        await HotSpotMessageService.editMessage(hsId, messageId, newText);
      } else if (isGroupContext(roomId)) {
        await MessageService.editGroupMessage(roomId, messageId, newText);
      } else {
        await MessageService.editMessage(messageId, newText, roomId);
      }
    }, 'Đã cập nhật tin nhắn', 'Không thể chỉnh sửa tin nhắn');
  };

  const addReply = async (roomId: string, messageId: string, replyData: ReplyData) => {
    await handleAction(async () => {
      if (isHotSpotContext(roomId)) {
        const hsId = stripHotSpotPrefix(roomId);
        await HotSpotMessageService.addReply(hsId, messageId, replyData as any);
      } else if (isGroupContext(roomId)) {
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
        { text: 'Hủy', style: 'cancel' },
        { text: isCurrentUser ? 'Thu hồi' : 'Xóa', style: 'destructive', onPress: onConfirm },
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
