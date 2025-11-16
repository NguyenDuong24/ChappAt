// ✅ Optimized hook for group messages with pagination, caching, and debouncing
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  doc, 
  query, 
  orderBy, 
  limit, 
  startAfter, 
  onSnapshot,
  getDocs,
  Unsubscribe,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';

// ✅ Global cache to reduce Firebase reads across component re-renders
const messageCache = new Map<string, { 
  messages: any[]; 
  timestamp: number;
  lastVisible: QueryDocumentSnapshot<DocumentData> | null;
}>();

const CACHE_TTL = 30000; // 30 seconds

interface UseOptimizedGroupMessagesOptions {
  groupId: string;
  currentUserId: string;
  pageSize?: number;
  enabled?: boolean;
}

export function useOptimizedGroupMessages({ 
  groupId, 
  currentUserId,
  pageSize = 30,
  enabled = true 
}: UseOptimizedGroupMessagesOptions) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const isLoadingMoreRef = useRef(false);
  const mountedRef = useRef(true);

  // ✅ Check cache first
  const getCachedMessages = useCallback(() => {
    const cached = messageCache.get(groupId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached;
    }
    return null;
  }, [groupId]);

  // ✅ Update cache
  const updateCache = useCallback((newMessages: any[], lastDoc: QueryDocumentSnapshot<DocumentData> | null) => {
    messageCache.set(groupId, {
      messages: newMessages,
      timestamp: Date.now(),
      lastVisible: lastDoc
    });
  }, [groupId]);

  // ✅ Initial load with real-time updates
  useEffect(() => {
    if (!groupId || !enabled || !currentUserId) {
      setLoading(false);
      return;
    }

    mountedRef.current = true;

    // Try cache first
    const cached = getCachedMessages();
    if (cached) {
      setMessages(cached.messages);
      setLastVisible(cached.lastVisible);
      setHasMore(cached.messages.length >= pageSize);
      setLoading(false);
      console.log(`✅ [useOptimizedGroupMessages] Loaded ${cached.messages.length} messages from cache`);
    }

    const messagesRef = collection(doc(db, 'groups', groupId), 'messages');
    const q = query(
      messagesRef, 
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    console.log(`🔄 [useOptimizedGroupMessages] Setting up real-time listener for group ${groupId}`);

    unsubscribeRef.current = onSnapshot(
      q,
      (snapshot) => {
        if (!mountedRef.current) return;

        const messagesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).filter((msg: any) => {
          // Filter out recalled messages for non-senders
          if (msg.isRecalled && msg.uid !== currentUserId) return false;
          // Filter out messages deleted by this user
          if (msg.deletedFor && msg.deletedFor.includes(currentUserId)) return false;
          return true;
        });
        
        const reversedMessages = messagesList.reverse();
        const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
        
        setMessages(reversedMessages);
        setLastVisible(lastDoc);
        setHasMore(snapshot.docs.length >= pageSize);
        setLoading(false);
        setError(null);
        
        // Update cache
        updateCache(reversedMessages, lastDoc);
        
        console.log(`✅ [useOptimizedGroupMessages] Loaded ${reversedMessages.length} messages`);
      },
      (err) => {
        if (!mountedRef.current) return;
        console.error('❌ [useOptimizedGroupMessages] Snapshot error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      mountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [groupId, currentUserId, enabled, pageSize, getCachedMessages, updateCache]);

  // ✅ Load more messages (pagination) - Only fetch when needed
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMoreRef.current || !lastVisible || !mountedRef.current) {
      return;
    }

    isLoadingMoreRef.current = true;
    console.log('📥 [useOptimizedGroupMessages] Loading more messages...');

    try {
      const messagesRef = collection(doc(db, 'groups', groupId), 'messages');
      const q = query(
        messagesRef,
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(pageSize)
      );

      // One-time fetch for pagination (not real-time)
      const snapshot = await getDocs(q);
      
      if (!mountedRef.current) return;

      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter((msg: any) => {
        if (msg.isRecalled && msg.uid !== currentUserId) return false;
        if (msg.deletedFor && msg.deletedFor.includes(currentUserId)) return false;
        return true;
      });

      if (newMessages.length > 0) {
        const reversedNew = newMessages.reverse();
        const updatedMessages = [...reversedNew, ...messages];
        
        setMessages(updatedMessages);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(newMessages.length >= pageSize);
        
        // Update cache
        updateCache(updatedMessages, snapshot.docs[snapshot.docs.length - 1]);
        
        console.log(`✅ [useOptimizedGroupMessages] Loaded ${newMessages.length} more messages`);
      } else {
        setHasMore(false);
        console.log('ℹ️ [useOptimizedGroupMessages] No more messages to load');
      }
    } catch (err: any) {
      if (!mountedRef.current) return;
      console.error('❌ [useOptimizedGroupMessages] Load more error:', err);
      setError(err.message);
    } finally {
      isLoadingMoreRef.current = false;
    }
  }, [groupId, currentUserId, hasMore, lastVisible, messages, pageSize, updateCache]);

  // ✅ Refresh (clear cache)
  const refresh = useCallback(() => {
    messageCache.delete(groupId);
    setLastVisible(null);
    setHasMore(true);
    setLoading(true);
  }, [groupId]);

  return {
    messages,
    loading,
    error,
    hasMore,
    loadMore,
    refresh
  };
}
