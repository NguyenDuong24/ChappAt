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
  where,
  startAt
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
  pageSize = 30,
  enableRealtime = true
}: UseOptimizedChatMessagesProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);

  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const isInitialLoad = useRef(true);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

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

      // messagesList is [Newest, ..., Oldest]
      // We need the oldest timestamp for the listener (which is at the END of the array before reverse)
      const oldestMessage = messagesList.length > 0 ? messagesList[messagesList.length - 1] : null;

      setMessages(messagesList.reverse()); // Reverse to show chronological order [Oldest, ..., Newest]
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageSize);

      // Setup real-time listener
      if (enableRealtime) {
        const lastTimestamp = oldestMessage ? oldestMessage.createdAt : null;
        setupRealtimeListener(lastTimestamp);
      }
    } catch (error) {
      console.error('Error loading initial messages:', error);
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
      setIsInitialLoadComplete(true);
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

  // Setup real-time listener
  const setupRealtimeListener = useCallback((afterTimestamp: any) => {
    if (!roomId || !enableRealtime) return;

    // Cleanup existing listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const messagesRef = collection(doc(db, 'rooms', roomId), 'messages');
    let q;

    if (afterTimestamp) {
      q = query(
        messagesRef,
        orderBy('createdAt', 'asc'),
        startAt(afterTimestamp)
      );
    } else {
      // If no initial messages, listen to all (effectively new ones since it's empty)
      q = query(
        messagesRef,
        orderBy('createdAt', 'asc')
      );
    }

    console.log('🎧 [setupRealtimeListener] Setting up listener for roomId:', roomId, 'afterTimestamp:', afterTimestamp);

    unsubscribeRef.current = onSnapshot(q, (snapshot) => {
      const newMessages: Message[] = [];
      const modifiedMessages: Message[] = [];

      console.log('🔥 [setupRealtimeListener] Snapshot received. Changes:', snapshot.docChanges().length);

      snapshot.docChanges().forEach((change) => {
        console.log('👉 Change type:', change.type, 'ID:', change.doc.id);
        if (change.type === 'added') {
          const messageData = {
            id: change.doc.id,
            ...change.doc.data()
          } as Message;
          newMessages.push(messageData);
        }
        if (change.type === 'modified') {
          const messageData = {
            id: change.doc.id,
            ...change.doc.data()
          } as Message;
          modifiedMessages.push(messageData);
        }
      });

      if (newMessages.length > 0) {
        setMessages(prev => {
          // Filter out duplicates just in case
          const existingIds = new Set(prev.map(m => m.id));
          const uniqueNew = newMessages.filter(m => !existingIds.has(m.id));
          return [...prev, ...uniqueNew];
        });
      }

      if (modifiedMessages.length > 0) {
        setMessages(prev => prev.map(msg => {
          const updated = modifiedMessages.find(m => m.id === msg.id);
          return updated ? updated : msg;
        }));
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
    refreshMessages: loadInitialMessages,
    isLoadingMore: loading && isInitialLoadComplete,
    isInitialLoadComplete
  };
};
