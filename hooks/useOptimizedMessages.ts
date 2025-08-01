import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, limit, getDocs, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useUserContext } from '@/context/UserContext';

interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  timestamp: any;
  chatId: string;
  type?: 'text' | 'image' | 'file';
  imageUrl?: string;
  read?: boolean;
}

interface MessageWithUser extends Message {
  senderInfo?: {
    uid: string;
    username: string;
    profileUrl?: string;
  };
  receiverInfo?: {
    uid: string;
    username: string;
    profileUrl?: string;
  };
}

interface ChatPreview {
  chatId: string;
  lastMessage: MessageWithUser;
  otherUser: {
    uid: string;
    username: string;
    profileUrl?: string;
  };
  unreadCount: number;
}

export const useOptimizedMessages = (currentUserId: string) => {
  const [chatPreviews, setChatPreviews] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const { getUsersInfo, preloadUsers } = useUserContext();

  // Load chat previews with optimized user loading
  const loadChatPreviews = useCallback(async () => {
    if (!currentUserId || loading) return;
    
    setLoading(true);
    try {
      // Get all messages for current user
      const messagesQuery = query(
        collection(db, 'messages'),
        where('participants', 'array-contains', currentUserId),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      const messagesSnapshot = await getDocs(messagesQuery);
      const messages: Message[] = [];
      const userIds = new Set<string>();

      messagesSnapshot.forEach((doc) => {
        const messageData = { id: doc.id, ...doc.data() } as Message;
        messages.push(messageData);
        
        // Collect all unique user IDs
        if (messageData.senderId !== currentUserId) {
          userIds.add(messageData.senderId);
        }
        if (messageData.receiverId !== currentUserId) {
          userIds.add(messageData.receiverId);
        }
      });

      // Preload all user information in one go
      const userIdsArray = Array.from(userIds);
      if (userIdsArray.length > 0) {
        await preloadUsers(userIdsArray);
        const usersMap = await getUsersInfo(userIdsArray);

        // Group messages by chat and create previews
        const chatMap = new Map<string, MessageWithUser[]>();
        
        messages.forEach(message => {
          const otherUserId = message.senderId === currentUserId ? message.receiverId : message.senderId;
          const chatKey = [currentUserId, otherUserId].sort().join('_');
          
          const messageWithUser: MessageWithUser = {
            ...message,
            senderInfo: usersMap.get(message.senderId),
            receiverInfo: usersMap.get(message.receiverId)
          };

          if (!chatMap.has(chatKey)) {
            chatMap.set(chatKey, []);
          }
          chatMap.get(chatKey)!.push(messageWithUser);
        });

        // Create chat previews
        const previews: ChatPreview[] = [];
        chatMap.forEach((chatMessages, chatKey) => {
          const sortedMessages = chatMessages.sort((a, b) => b.timestamp - a.timestamp);
          const lastMessage = sortedMessages[0];
          const otherUserId = lastMessage.senderId === currentUserId ? lastMessage.receiverId : lastMessage.senderId;
          const otherUser = usersMap.get(otherUserId);
          
          if (otherUser) {
            const unreadCount = chatMessages.filter(
              msg => msg.senderId !== currentUserId && !msg.read
            ).length;

            previews.push({
              chatId: chatKey,
              lastMessage,
              otherUser,
              unreadCount
            });
          }
        });

        // Sort previews by timestamp
        previews.sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp);
        setChatPreviews(previews);
      }

    } catch (error) {
      console.error('Error loading chat previews:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, loading, getUsersInfo, preloadUsers]);

  // Set up real-time listener for new messages
  const setupRealtimeListener = useCallback(() => {
    if (!currentUserId) return;

    const messagesQuery = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', currentUserId),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      if (!snapshot.empty) {
        // Reload chat previews when new message arrives
        loadChatPreviews();
      }
    });

    return unsubscribe;
  }, [currentUserId, loadChatPreviews]);

  // Load messages for a specific chat
  const loadChatMessages = useCallback(async (chatId: string, limitCount: number = 50): Promise<MessageWithUser[]> => {
    try {
      const messagesQuery = query(
        collection(db, 'messages'),
        where('chatId', '==', chatId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const messagesSnapshot = await getDocs(messagesQuery);
      const messages: Message[] = [];
      const userIds = new Set<string>();

      messagesSnapshot.forEach((doc) => {
        const messageData = { id: doc.id, ...doc.data() } as Message;
        messages.push(messageData);
        userIds.add(messageData.senderId);
        userIds.add(messageData.receiverId);
      });

      // Get user info for messages
      const userIdsArray = Array.from(userIds);
      const usersMap = await getUsersInfo(userIdsArray);

      const messagesWithUsers: MessageWithUser[] = messages.map(message => ({
        ...message,
        senderInfo: usersMap.get(message.senderId),
        receiverInfo: usersMap.get(message.receiverId)
      }));

      return messagesWithUsers.reverse(); // Reverse to show oldest first
    } catch (error) {
      console.error('Error loading chat messages:', error);
      return [];
    }
  }, [getUsersInfo]);

  useEffect(() => {
    loadChatPreviews();
    const unsubscribe = setupRealtimeListener();
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUserId]);

  return {
    chatPreviews,
    loading,
    loadChatPreviews,
    loadChatMessages,
  };
};
