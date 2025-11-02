import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  collection, 
  doc, 
  query, 
  orderBy, 
  limit,
  startAfter,
  onSnapshot, 
  getDocs,
  DocumentSnapshot,
  Unsubscribe,
  where
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';

interface Message {
  id: string;
  text: string;
  uid: string;
  createdAt: any;
  [key: string]: any;
}

interface UseOptimizedChatMessagesProps {
  roomId: string;
  pageSize?: number;
  enableRealtime?: boolean;
}

export const useOptimizedChatMessages = ({
  roomId,
  pageSize = 20,
  enableRealtime = true
}: UseOptimizedChatMessagesProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const isInitialLoad = useRef(true);

  // Load initial messages with pagination
  const loadInitialMessages = useCallback(async () => {
    if (!roomId || loading) return;

    setLoading(true);
    try {
      const messagesRef = collection(doc(db, 'rooms', roomId), 'messages');
      const q = query(
        messagesRef, 
        orderBy('createdAt', 'desc'), 
        limit(pageSize)
      );

      const snapshot = await getDocs(q);
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];

      setMessages(messagesList.reverse()); // Reverse to show chronological order
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageSize);
      
      // Setup real-time listener chỉ cho messages mới sau timestamp cuối
      if (enableRealtime && messagesList.length > 0) {
        setupRealtimeListener(messagesList[messagesList.length - 1].createdAt);
      }
    } catch (error) {
      console.error('Error loading initial messages:', error);
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, [roomId, pageSize, enableRealtime]);

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!roomId || !lastDoc || loading || !hasMore) return;

    setLoading(true);
    try {
      const messagesRef = collection(doc(db, 'rooms', roomId), 'messages');
      const q = query(
        messagesRef,
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(pageSize)
      );

      const snapshot = await getDocs(q);
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];

      if (newMessages.length > 0) {
        setMessages(prev => [...newMessages.reverse(), ...prev]);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === pageSize);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setLoading(false);
    }
  }, [roomId, lastDoc, pageSize, loading, hasMore]);

  // Setup real-time listener chỉ cho messages mới
  const setupRealtimeListener = useCallback((afterTimestamp: any) => {
    if (!roomId || !enableRealtime) return;

    // Cleanup existing listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const messagesRef = collection(doc(db, 'rooms', roomId), 'messages');
    const q = query(
      messagesRef,
      orderBy('createdAt', 'asc'),
      startAfter(afterTimestamp)
    );

    unsubscribeRef.current = onSnapshot(q, (snapshot) => {
      const newMessages: Message[] = [];
      
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const messageData = {
            id: change.doc.id,
            ...change.doc.data()
          } as Message;
          newMessages.push(messageData);
        }
      });

      if (newMessages.length > 0) {
        setMessages(prev => [...prev, ...newMessages]);
      }
    });
  }, [roomId, enableRealtime]);

  // Initialize
  useEffect(() => {
    if (roomId && isInitialLoad.current) {
      loadInitialMessages();
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [roomId, loadInitialMessages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return {
    messages,
    loading,
    hasMore,
    loadMoreMessages,
    refreshMessages: loadInitialMessages
  };
};
