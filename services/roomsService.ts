import { doc, updateDoc, arrayRemove, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

export const roomsService = {
    /**
     * Removes a user from a chat room (effectively deleting the chat for them).
     * @param roomId The ID of the room to delete.
     * @param userId The ID of the user deleting the chat.
     */
    async deleteChat(roomId: string, userId: string): Promise<void> {
        try {
            const roomRef = doc(db, 'rooms', roomId);
            await updateDoc(roomRef, {
                participants: arrayRemove(userId),
                updatedAt: serverTimestamp()
            });
            console.log(`User ${userId} removed from room ${roomId}`);
        } catch (error) {
            console.error('Error deleting chat:', error);
            throw error;
        }
    },

    /**
     * Pins a chat for a user.
     * @param userId The ID of the user.
     * @param chatId The ID of the chat to pin.
     */
    async pinChat(userId: string, chatId: string): Promise<void> {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                pinnedChatIds: arrayUnion(chatId)
            });
        } catch (error) {
            console.error('Error pinning chat:', error);
            throw error;
        }
    },

    /**
     * Unpins a chat for a user.
     * @param userId The ID of the user.
     * @param chatId The ID of the chat to unpin.
     */
    async unpinChat(userId: string, chatId: string): Promise<void> {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                pinnedChatIds: arrayRemove(chatId)
            });
        } catch (error) {
            console.error('Error unpinning chat:', error);
            throw error;
        }
    }
};
