import { 
  doc, 
  updateDoc, 
  deleteDoc, 
  arrayUnion, 
  arrayRemove,
  getDoc,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { getRoomId } from '@/utils/common';

export const MessageService = {
  
  // Add or remove reaction from a message
  async toggleReaction(roomId, messageId, emoji, userId) {
    try {
      const messageRef = doc(db, 'rooms', roomId, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      
      console.log(1111, messageDoc)
      if (!messageDoc.exists()) {
        throw new Error('Message not found');
      }
      
      const messageData = messageDoc.data();
      const reactions = messageData.reactions || {};
      const currentReactions = reactions[emoji] || [];
      
      const hasReacted = currentReactions.includes(userId);
      
      if (hasReacted) {
        // Remove reaction
        const updatedReactions = currentReactions.filter(id => id !== userId);
        if (updatedReactions.length === 0) {
          // Remove emoji entirely if no reactions left
          delete reactions[emoji];
        } else {
          reactions[emoji] = updatedReactions;
        }
      } else {
        // Add reaction
        reactions[emoji] = [...currentReactions, userId];
      }
      
      await updateDoc(messageRef, {
        reactions: reactions,
        updatedAt: serverTimestamp()
      });
      
      return { success: true, hasReacted: !hasReacted };
    } catch (error) {
      console.error('Error toggling reaction:', error);
      throw error;
    }
  },
  
  // Pin or unpin a message
  async togglePin(roomId, messageId, isPinned = false) {
    try {
      const messageRef = doc(db, 'rooms', roomId, 'messages', messageId);
      
      await updateDoc(messageRef, {
        isPinned: !isPinned,
        pinnedAt: !isPinned ? serverTimestamp() : null,
        updatedAt: serverTimestamp()
      });
      
      // Update room with pinned message info
      const roomRef = doc(db, 'rooms', roomId);
      if (!isPinned) {
        await updateDoc(roomRef, {
          pinnedMessages: arrayUnion(messageId),
          updatedAt: serverTimestamp()
        });
      } else {
        await updateDoc(roomRef, {
          pinnedMessages: arrayRemove(messageId),
          updatedAt: serverTimestamp()
        });
      }
      
      return { success: true, isPinned: !isPinned };
    } catch (error) {
      console.error('Error toggling pin:', error);
      throw error;
    }
  },
  
  // Delete/recall a message
  async deleteMessage(roomId, messageId, isCurrentUser = false) {
    try {
      const messageRef = doc(db, 'rooms', roomId, 'messages', messageId);
      
      if (isCurrentUser) {
        // Recall message - mark as deleted but keep metadata
        await updateDoc(messageRef, {
          text: 'Tin nhắn đã được thu hồi',
          imageUrl: null,
          isRecalled: true,
          recalledAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        // Delete message completely from user's view
        await deleteDoc(messageRef);
      }
      
      return { success: true, isRecalled: isCurrentUser };
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  },
  
  // Edit a message
  async editMessage(roomId, messageId, newText) {
    try {
      const messageRef = doc(db, 'rooms', roomId, 'messages', messageId);
      
      await updateDoc(messageRef, {
        text: newText,
        isEdited: true,
        editedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  },
  
  // Add reply to a message
  async addReply(roomId, messageId, replyData) {
    try {
      const messageRef = doc(db, 'rooms', roomId, 'messages', messageId);
      
      await updateDoc(messageRef, {
        replies: arrayUnion({
          id: `reply_${Date.now()}`,
          text: replyData.text,
          uid: replyData.uid,
          senderName: replyData.senderName,
          createdAt: serverTimestamp()
        }),
        replyCount: increment(1),
        updatedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error adding reply:', error);
      throw error;
    }
  },
  
  // Get message with full details
  async getMessage(roomId, messageId) {
    try {
      const messageRef = doc(db, 'rooms', roomId, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (!messageDoc.exists()) {
        throw new Error('Message not found');
      }
      
      return { success: true, data: messageDoc.data() };
    } catch (error) {
      console.error('Error getting message:', error);
      throw error;
    }
  },
  
  // Update message status (sent, delivered, read)
  async updateMessageStatus(roomId, messageId, status) {
    try {
      const messageRef = doc(db, 'rooms', roomId, 'messages', messageId);
      
      await updateDoc(messageRef, {
        status: status,
        [`${status}At`]: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating message status:', error);
      throw error;
    }
  }
};

export default MessageService;
