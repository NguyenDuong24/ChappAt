import { collection, doc, updateDoc, serverTimestamp, getDoc, arrayUnion, arrayRemove, Timestamp, addDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

class HotSpotMessageService {
  // Toggle reaction on a hot-spot chat message
  async toggleReaction(chatRoomId: string, messageId: string, emoji: string, userId: string): Promise<void> {
    const messageRef = doc(db, 'hotSpotChats', chatRoomId, 'messages', messageId);
    const snap = await getDoc(messageRef);
    if (!snap.exists()) throw new Error('Message not found');
    const data = snap.data() as any;
    const current: Record<string, string[]> = data.reactions || {};
    const users = current[emoji] || [];
    const updatedUsers = users.includes(userId) ? users.filter(u => u !== userId) : [...users, userId];
    const updated = { ...current } as Record<string, string[]>;
    if (updatedUsers.length > 0) updated[emoji] = updatedUsers; else delete updated[emoji];
    await updateDoc(messageRef, { reactions: updated, updatedAt: serverTimestamp() });
  }

  // Pin/Unpin message and keep chat pinnedMessages in sync (optional but aligns with room behavior)
  async pinMessage(chatRoomId: string, messageId: string, isPinned: boolean): Promise<void> {
    const chatRef = doc(db, 'hotSpotChats', chatRoomId);
    const messageRef = doc(chatRef, 'messages', messageId);
    await updateDoc(messageRef, {
      isPinned: !isPinned,
      pinnedAt: !isPinned ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    });
    if (!isPinned) {
      await updateDoc(chatRef, { pinnedMessages: arrayUnion(messageId), updatedAt: serverTimestamp() });
    } else {
      await updateDoc(chatRef, { pinnedMessages: arrayRemove(messageId), updatedAt: serverTimestamp() });
    }
  }

  // Delete or recall message
  async deleteMessage(chatRoomId: string, messageId: string, isCurrentUser: boolean): Promise<void> {
    const messageRef = doc(db, 'hotSpotChats', chatRoomId, 'messages', messageId);
    if (isCurrentUser) {
      await updateDoc(messageRef, {
        isRecalled: true,
        recalledAt: serverTimestamp(),
        text: 'Tin nhắn đã được thu hồi',
        imageUrl: null,
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(messageRef, { deletedFor: serverTimestamp(), updatedAt: serverTimestamp() });
    }
  }

  // Edit message text
  async editMessage(chatRoomId: string, messageId: string, newText: string): Promise<void> {
    const messageRef = doc(db, 'hotSpotChats', chatRoomId, 'messages', messageId);
    await updateDoc(messageRef, {
      text: newText,
      isEdited: true,
      editedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  // Add a reply reference to message (lightweight threading)
  async addReply(chatRoomId: string, messageId: string, replyData: {
    text?: string;
    uid: string;
    senderName?: string;
    imageUrl?: string | null;
  }): Promise<void> {
    const messageRef = doc(db, 'hotSpotChats', chatRoomId, 'messages', messageId);
    await updateDoc(messageRef, {
      replies: arrayUnion({
        id: `reply_${Date.now()}`,
        text: replyData.text || '',
        uid: replyData.uid,
        senderName: replyData.senderName || '',
        imageUrl: replyData.imageUrl || null,
        createdAt: Timestamp.now(),
      }),
      replyCount: (snap: any) => (snap?.replyCount || 0) + 1,
      updatedAt: serverTimestamp(),
    } as any);
  }
}

export default new HotSpotMessageService();
