import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc,
  getDoc,
  getDocs,
  arrayUnion,
  arrayRemove,
  increment,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { httpsCallable } from 'firebase/functions';
import contentModerationService from './contentModerationService';
import { functions } from '../firebaseConfig';

export interface MessageData {
  text: string;
  senderId: string;
  receiverId: string;
  chatId: string;
  type?: 'text' | 'image' | 'file' | 'audio';
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  status?: 'sent' | 'delivered' | 'read';
}

export interface CallData {
  callerId: string;
  receiverId: string;
  type: 'video' | 'audio';
  status: 'ringing' | 'accepted' | 'declined' | 'ended';
  roomId?: string;
}

export interface FriendRequestData {
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
}

// Reply payload for adding a reply reference to a message
export interface ReplyData {
  text?: string;
  uid: string;
  senderName?: string;
  imageUrl?: string | null;
  replyToMessageId?: string;
}

class MessageService {
  // Gửi tin nhắn với content moderation
  async sendMessage(messageData: MessageData): Promise<string | null> {
    try {
      // Import content moderation service
      const contentModerationService = (await import('./contentModerationService')).default;
      
      // Kiểm tra content moderation
      const moderationResult = await contentModerationService.moderateContent(
        messageData.text || undefined,
        messageData.imageUrl || undefined
      );

      // Nếu content không clean, throw error với thông tin chi tiết
      if (!moderationResult.isContentClean) {
        const errorDetails = {
          textViolation: moderationResult.textResult && !moderationResult.textResult.isClean ? moderationResult.textResult : null,
          imageViolation: moderationResult.imageResult && moderationResult.imageResult.isInappropriate ? moderationResult.imageResult : null
        };
        
        const error: any = new Error('Content moderation failed');
        error.moderationResult = moderationResult;
        error.details = errorDetails;
        throw error;
      }

      // Lấy thông tin người gửi để có tên
      const senderDoc = await getDoc(doc(db, 'users', messageData.senderId));
      const senderData = senderDoc.exists() ? senderDoc.data() : {};
      const senderName = (senderData as any).displayName || (senderData as any).fullName || 'Unknown';

      const messageWithTimestamp = {
        ...messageData,
        senderName,
        timestamp: serverTimestamp(),
        status: 'sent',
        createdAt: new Date().toISOString(),
        // Thêm flag nếu content có warning nhỏ (không block nhưng có thể nghi ngờ)
        ...(moderationResult.textResult?.confidence && moderationResult.textResult.confidence > 0.3 && {
          contentModerationScore: moderationResult.textResult.confidence
        }),
        ...(moderationResult.imageResult?.confidence && moderationResult.imageResult.confidence > 0.2 && {
          imageModerationScore: moderationResult.imageResult.confidence
        })
      };

      // Thêm tin nhắn vào Firestore - Cloud Function sẽ tự động gửi notification
      const docRef = await addDoc(collection(db, 'messages'), messageWithTimestamp);
      
      console.log('Message sent successfully with moderation check:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Gửi tin nhắn mà không kiểm tra moderation (dành cho admin hoặc trusted users)
  async sendMessageWithoutModeration(messageData: MessageData): Promise<string | null> {
    try {
      // Lấy thông tin người gửi để có tên
      const senderDoc = await getDoc(doc(db, 'users', messageData.senderId));
      const senderData = senderDoc.exists() ? senderDoc.data() : {};
      const senderName = (senderData as any).displayName || (senderData as any).fullName || 'Unknown';

      const messageWithTimestamp = {
        ...messageData,
        senderName,
        timestamp: serverTimestamp(),
        status: 'sent',
        createdAt: new Date().toISOString(),
        bypassedModeration: true // Flag để biết message này đã bypass moderation
      };

      // Thêm tin nhắn vào Firestore
      const docRef = await addDoc(collection(db, 'messages'), messageWithTimestamp);
      
      console.log('Message sent without moderation:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error sending message without moderation:', error);
      throw error;
    }
  }

  // Tạo cuộc gọi - sẽ trigger Cloud Function tự động
  async createCall(callData: CallData): Promise<string | null> {
    try {
      // Lấy thông tin người gọi
      const callerDoc = await getDoc(doc(db, 'users', callData.callerId));
      const callerData = callerDoc.exists() ? callerDoc.data() : {};
      const callerName = (callerData as any).displayName || (callerData as any).fullName || 'Unknown';

      const callWithTimestamp = {
        ...callData,
        callerName,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
      };

      // Thêm cuộc gọi vào Firestore - Cloud Function sẽ tự động gửi notification
      const docRef = await addDoc(collection(db, 'calls'), callWithTimestamp);
      
      console.log('Call created successfully:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating call:', error);
      throw error;
    }
  }

  // Gửi friend request - sẽ trigger Cloud Function tự động
  async sendFriendRequest(requestData: FriendRequestData): Promise<string | null> {
    try {
      // Lấy thông tin người gửi
      const fromUserDoc = await getDoc(doc(db, 'users', requestData.fromUserId));
      const fromUserData = fromUserDoc.exists() ? fromUserDoc.data() : {};
      const fromUserName = (fromUserData as any).displayName || (fromUserData as any).fullName || 'Unknown';

      const requestWithTimestamp = {
        ...requestData,
        fromUserName,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
      };

      // Thêm friend request vào Firestore - Cloud Function sẽ tự động gửi notification
      const docRef = await addDoc(collection(db, 'friendRequests'), requestWithTimestamp);
      
      console.log('Friend request sent successfully:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error sending friend request:', error);
      throw error;
    }
  }

  // Gửi notification thủ công qua Cloud Function
  async sendManualNotification(targetUserId: string, notification: any): Promise<boolean> {
    try {
      const sendNotificationFunction = httpsCallable(functions, 'sendNotification');
      
      const result = await sendNotificationFunction({
        targetUserId,
        notification,
      });

      console.log('Manual notification sent:', (result as any).data);
      return true;
    } catch (error) {
      console.error('Error sending manual notification:', error);
      return false;
    }
  }

  // Đánh dấu tin nhắn đã đọc
  async markMessageAsRead(messageId: string): Promise<void> {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        status: 'read',
        readAt: serverTimestamp(),
      });
      
      console.log('Message marked as read:', messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  // Cập nhật trạng thái cuộc gọi
  async updateCallStatus(callId: string, status: string): Promise<void> {
    try {
      const callRef = doc(db, 'calls', callId);
      await updateDoc(callRef, {
        status,
        updatedAt: serverTimestamp(),
      });
      
      console.log('Call status updated:', callId, status);
    } catch (error) {
      console.error('Error updating call status:', error);
      throw error;
    }
  }

  // Phản hồi friend request
  async respondToFriendRequest(requestId: string, status: 'accepted' | 'declined'): Promise<void> {
    try {
      const requestRef = doc(db, 'friendRequests', requestId);
      await updateDoc(requestRef, {
        status,
        respondedAt: serverTimestamp(),
      });
      
      console.log('Friend request responded:', requestId, status);
    } catch (error) {
      console.error('Error responding to friend request:', error);
      throw error;
    }
  }

  // Gửi tin nhắn nhóm
  async sendGroupMessage(groupId: string, senderId: string, text: string, memberIds: string[]): Promise<string | null> {
    try {
      // Lấy thông tin người gửi và nhóm
      const senderDoc = await getDoc(doc(db, 'users', senderId));
      const senderData = senderDoc.exists() ? senderDoc.data() : {};
      const senderName = (senderData as any).displayName || (senderData as any).fullName || 'Unknown';

      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      const groupData = groupDoc.exists() ? groupDoc.data() : {};
      const groupName = (groupData as any).name || 'Group Chat';

      // Tạo tin nhắn cho mỗi thành viên (trừ người gửi)
      const promises = memberIds
        .filter(memberId => memberId !== senderId)
        .map(async (memberId) => {
          const messageData = {
            text,
            senderId,
            receiverId: memberId,
            chatId: `group_${groupId}`,
            groupId,
            groupName,
            senderName,
            type: 'text' as const,
            timestamp: serverTimestamp(),
            status: 'sent' as const,
            createdAt: new Date().toISOString(),
          };

          return addDoc(collection(db, 'messages'), messageData);
        });

      const results = await Promise.all(promises);
      console.log('Group message sent to', results.length, 'members');
      
      return results[0]?.id || null;
    } catch (error) {
      console.error('Error sending group message:', error);
      throw error;
    }
  }

  // Toggle reaction on message - note the parameter order is (messageId, emoji, userId, roomId)
  async toggleReaction(messageId: string, emoji: string, userId: string, roomId: string): Promise<void> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const messageRef = doc(roomRef, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      console.log('toggleReaction:', { roomId, messageId });
      if (!messageDoc.exists()) {
        throw new Error('Message not found');
      }

      const messageData = messageDoc.data() as any;
      const currentReactions = messageData.reactions || {};
      
      // Get current users for this emoji
      const currentUsers: string[] = currentReactions[emoji] || [];
      
      let updatedUsers: string[];
      if (currentUsers.includes(userId)) {
        // Remove user from reaction
        updatedUsers = currentUsers.filter((id: string) => id !== userId);
      } else {
        // Add user to reaction
        updatedUsers = [...currentUsers, userId];
      }
      
      // Update reactions object
      const updatedReactions = { ...currentReactions } as Record<string, string[]>;
      if (updatedUsers.length > 0) {
        updatedReactions[emoji] = updatedUsers;
      } else {
        delete updatedReactions[emoji];
      }
      
      await updateDoc(messageRef, {
        reactions: updatedReactions,
        updatedAt: serverTimestamp()
      });
      
      console.log('Reaction toggled successfully');
    } catch (error) {
      console.error('Error toggling reaction:', error);
      throw error;
    }
  }

  // Pin/Unpin message and keep room's pinnedMessages in sync
  async pinMessage(messageId: string, isPinned: boolean = false, roomId: string): Promise<void> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const messageRef = doc(roomRef, 'messages', messageId);
      
      // Flip pin on message
      await updateDoc(messageRef, {
        isPinned: !isPinned,
        pinnedAt: !isPinned ? serverTimestamp() : null,
        updatedAt: serverTimestamp()
      });
      
      // Update room's pinnedMessages array
      if (!isPinned) {
        await updateDoc(roomRef, {
          pinnedMessages: arrayUnion(messageId),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(roomRef, {
          pinnedMessages: arrayRemove(messageId),
          updatedAt: serverTimestamp(),
        });
      }
      
      console.log('Message pin status updated');
    } catch (error) {
      console.error('Error updating pin status:', error);
      throw error;
    }
  }

  // Delete message
  async deleteMessage(messageId: string, isCurrentUser: boolean, roomId: string): Promise<void> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const messageRef = doc(roomRef, 'messages', messageId);
      
      if (isCurrentUser) {
        // For sender: mark as recalled
        await updateDoc(messageRef, {
          isRecalled: true,
          recalledAt: serverTimestamp(),
          text: 'Tin nhắn đã được thu hồi',
          imageUrl: null,
          updatedAt: serverTimestamp()
        });
      } else {
        // For receiver: mark as deleted for this user only (soft delete)
        await updateDoc(messageRef, {
          deletedFor: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      console.log('Message deleted successfully');
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  // Edit message
  async editMessage(messageId: string, newText: string, roomId: string): Promise<void> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const messageRef = doc(roomRef, 'messages', messageId);
      
      await updateDoc(messageRef, {
        text: newText,
        isEdited: true,
        editedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('Message edited successfully');
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }

  // Add a reply reference to a message (for reply count/threading)
  async addReply(messageId: string, replyData: ReplyData, roomId: string): Promise<void> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const messageRef = doc(roomRef, 'messages', messageId);

      await updateDoc(messageRef, {
        replies: arrayUnion({
          id: `reply_${Date.now()}`,
          text: replyData.text || '',
          uid: replyData.uid,
          senderName: replyData.senderName || '',
          imageUrl: replyData.imageUrl || null,
          // serverTimestamp() cannot be used inside arrayUnion payload
          createdAt: Timestamp.now(),
        }),
        replyCount: increment(1),
        updatedAt: serverTimestamp(),
      });

      console.log('Reply added to message');
    } catch (error) {
      console.error('Error adding reply:', error);
      throw error;
    }
  }

  // Get message details
  async getMessage(messageId: string, roomId: string): Promise<any> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const messageRef = doc(roomRef, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      if (!messageDoc.exists()) {
        throw new Error('Message not found');
      }
      return messageDoc.data();
    } catch (error) {
      console.error('Error getting message:', error);
      throw error;
    }
  }

  // Update message status (sent/delivered/read)
  async updateMessageStatus(messageId: string, status: 'sent' | 'delivered' | 'read', roomId: string): Promise<void> {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const messageRef = doc(roomRef, 'messages', messageId);

      await updateDoc(messageRef, {
        status,
        [`${status}At`]: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as any);

      console.log('Message status updated');
    } catch (error) {
      console.error('Error updating message status:', error);
      throw error;
    }
  }

  // === GROUP MESSAGE METHODS === //
  
  // Toggle reaction on group message
  async toggleGroupReaction(groupId: string, messageId: string, emoji: string, userId: string): Promise<void> {
    try {
      console.log('🔥 toggleGroupReaction called with:', { groupId, messageId, emoji, userId });
      
      // Validate inputs
      if (!groupId || !messageId || !emoji || !userId) {
        console.error('❌ Missing required parameters');
        throw new Error('Missing required parameters');
      }
      
      // First check if group exists
      const groupRef = doc(db, 'groups', groupId);
      const groupDoc = await getDoc(groupRef);
      
      if (!groupDoc.exists()) {
        console.error('❌ Group not found:', groupId);
        throw new Error('Group not found');
      }
      
      console.log('✅ Group found:', groupDoc.data());
      
      // For groups, messages are stored in groups/{groupId}/messages/{messageId}
      const messageRef = doc(groupRef, 'messages', messageId);
      
      console.log('🔍 Checking message path:', `groups/${groupId}/messages/${messageId}`);
      const messageDoc = await getDoc(messageRef);
      
      if (!messageDoc.exists()) {
        console.error('❌ Group message not found:', messageId, 'in group:', groupId);
        console.error('❌ Full path:', `groups/${groupId}/messages/${messageId}`);
        
        // List all messages in the group for debugging
        const messagesRef = collection(groupRef, 'messages');
        const messagesSnapshot = await getDocs(messagesRef);
        console.log('📋 Available messages in group:');
        messagesSnapshot.forEach((msgDoc: any) => {
          const data = msgDoc.data();
          console.log('  -', msgDoc.id, data.text?.substring(0, 20) + '...');
        });
        
        throw new Error('Group message not found');
      }
      
      console.log('✅ Message found, current data:', messageDoc.data());

      const messageData = messageDoc.data() as any;
      const currentReactions = messageData.reactions || {};
      
      // Get current users for this emoji
      const currentUsers: string[] = currentReactions[emoji] || [];
      
      let updatedUsers: string[];
      if (currentUsers.includes(userId)) {
        // Remove user from reaction
        updatedUsers = currentUsers.filter((id: string) => id !== userId);
      } else {
        // Add user to reaction
        updatedUsers = [...currentUsers, userId];
      }
      
      // Update reactions object
      const updatedReactions = { ...currentReactions } as Record<string, string[]>;
      if (updatedUsers.length > 0) {
        updatedReactions[emoji] = updatedUsers;
      } else {
        delete updatedReactions[emoji];
      }
      
      await updateDoc(messageRef, {
        reactions: updatedReactions,
        updatedAt: serverTimestamp()
      });
      
      console.log('Group reaction toggled successfully:', emoji, 'by user:', userId);
    } catch (error) {
      console.error('Error toggling group reaction:', error);
      throw error;
    }
  }

  // Pin/Unpin group message
  async pinGroupMessage(groupId: string, messageId: string, isPinned: boolean = false): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const messageRef = doc(groupRef, 'messages', messageId);
      
      // Flip pin on message
      await updateDoc(messageRef, {
        isPinned: !isPinned,
        pinnedAt: !isPinned ? serverTimestamp() : null,
        updatedAt: serverTimestamp()
      });
      
      // Update group's pinnedMessages array
      if (!isPinned) {
        await updateDoc(groupRef, {
          pinnedMessages: arrayUnion(messageId),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(groupRef, {
          pinnedMessages: arrayRemove(messageId),
          updatedAt: serverTimestamp(),
        });
      }
      
      console.log('Group message pin status updated:', messageId, 'pinned:', !isPinned);
    } catch (error) {
      console.error('Error updating group pin status:', error);
      throw error;
    }
  }

  // Delete group message
  async deleteGroupMessage(groupId: string, messageId: string, isCurrentUser: boolean): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const messageRef = doc(groupRef, 'messages', messageId);
      
      if (isCurrentUser) {
        // For sender: mark as recalled
        await updateDoc(messageRef, {
          isRecalled: true,
          recalledAt: serverTimestamp(),
          text: 'Tin nhắn đã được thu hồi',
          imageUrl: null,
          updatedAt: serverTimestamp()
        });
        console.log('Group message recalled by sender:', messageId);
      } else {
        // For receiver: mark as deleted for this user only (soft delete)
        await updateDoc(messageRef, {
          deletedFor: arrayUnion(isCurrentUser ? 'sender' : 'receiver'),
          updatedAt: serverTimestamp()
        });
        console.log('Group message deleted for user:', messageId);
      }
    } catch (error) {
      console.error('Error deleting group message:', error);
      throw error;
    }
  }

  // Edit group message
  async editGroupMessage(groupId: string, messageId: string, newText: string): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const messageRef = doc(groupRef, 'messages', messageId);
      
      await updateDoc(messageRef, {
        text: newText,
        isEdited: true,
        editedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('Group message edited successfully:', messageId);
    } catch (error) {
      console.error('Error editing group message:', error);
      throw error;
    }
  }

  // Add a reply reference to a group message
  async addGroupReply(groupId: string, messageId: string, replyData: ReplyData): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const messageRef = doc(groupRef, 'messages', messageId);

      await updateDoc(messageRef, {
        replies: arrayUnion({
          id: `reply_${Date.now()}`,
          text: replyData.text || '',
          uid: replyData.uid,
          senderName: replyData.senderName || '',
          imageUrl: replyData.imageUrl || null,
          createdAt: Timestamp.now(),
        }),
        replyCount: increment(1),
        updatedAt: serverTimestamp(),
      });

      console.log('Reply added to group message:', messageId);
    } catch (error) {
      console.error('Error adding group reply:', error);
      throw error;
    }
  }

  // Get group message details
  async getGroupMessage(groupId: string, messageId: string): Promise<any> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const messageRef = doc(groupRef, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      if (!messageDoc.exists()) {
        throw new Error('Group message not found');
      }
      return messageDoc.data();
    } catch (error) {
      console.error('Error getting group message:', error);
      throw error;
    }
  }

  // Update group message status
  async updateGroupMessageStatus(groupId: string, messageId: string, status: 'sent' | 'delivered' | 'read'): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const messageRef = doc(groupRef, 'messages', messageId);

      await updateDoc(messageRef, {
        status,
        [`${status}At`]: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as any);

      console.log('Group message status updated:', messageId, 'to:', status);
    } catch (error) {
      console.error('Error updating group message status:', error);
      throw error;
    }
  }

  // Send a new group message (utility method)
  async sendGroupMessageDirect(groupId: string, senderId: string, messageData: any): Promise<string | null> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const messagesRef = collection(groupRef, 'messages');
      
      const messageWithTimestamp = {
        ...messageData,
        uid: senderId,
        createdAt: serverTimestamp(),
        status: 'sent',
        reactions: {},
        isPinned: false,
        isEdited: false,
        isRecalled: false,
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(messagesRef, messageWithTimestamp);
      console.log('Group message sent directly:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error sending group message directly:', error);
      throw error;
    }
  }
}

export default new MessageService();
