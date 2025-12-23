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
  Timestamp
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { groupMessageCacheService } from '@/services/groupMessageCacheService';

interface GroupMessage {
  id: string;
  text?: string;
  imageUrl?: string;
  uid: string;
  createdAt: any;
  status?: string;
  senderName?: string;
  profileUrl?: string;
  [key: string]: any;
}

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
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const isInitialLoad = useRef(true);
  const isCacheLoaded = useRef(false);
  const mountedRef = useRef(true);

  // Setup real-time listener chỉ cho messages mới
  const setupRealtimeListener = useCallback((afterTimestamp: any) => {
    if (!groupId || !enabled) return;

    // Cleanup existing listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const messagesRef = collection(doc(db, 'groups', groupId), 'messages');
    const q = query(
      messagesRef,
      orderBy('createdAt', 'asc'),
      startAfter(afterTimestamp)
    );

    unsubscribeRef.current = onSnapshot(q, (snapshot) => {
      const newMessages: GroupMessage[] = [];
      const updatedMessages: GroupMessage[] = [];
      
      snapshot.docChanges().forEach((change) => {
        const messageData = {
          id: change.doc.id,
          ...change.doc.data()
        } as GroupMessage;
        
        if (change.type === 'added') {
          newMessages.push(messageData);
        } else if (change.type === 'modified') {
          updatedMessages.push(messageData);
        }
      });

      setMessages(prev => {
        let result = [...prev];
        
        // Add new messages
        if (newMessages.length > 0) {
          result = [...result, ...newMessages];
          // Cache new messages
          groupMessageCacheService.cacheMessages(groupId, newMessages).catch(() => {});
        }
        
        // Update existing messages (for status changes)
        if (updatedMessages.length > 0) {
          result = result.map(msg => {
            const updated = updatedMessages.find(u => u.id === msg.id);
            return updated ? { ...msg, ...updated } : msg;
          });
          // Update cache
          groupMessageCacheService.cacheMessages(groupId, result).catch(() => {});
        }
        
        return result;
      });
    }, (error) => {
      console.error('❌ [useOptimizedGroupMessages] Realtime listener error:', error);
      setError(error.message);
    });
  }, [groupId, enabled]);

  // Load initial messages from cache IMMEDIATELY, then fetch in background
  const loadInitialMessages = useCallback(async () => {
    if (!groupId || !enabled) {
      setLoading(false);
      return;
    }

    setError(null);
    const startTime = Date.now();
    console.log(`🚀 [useOptimizedGroupMessages] FAST LOAD for group: ${groupId}`);

    // STEP 1: Load from cache IMMEDIATELY (non-blocking UI)
    try {
      const cachedMessages = await groupMessageCacheService.getCachedMessages(groupId);
      
      if (cachedMessages.length > 0) {
        console.log(`⚡ [useOptimizedGroupMessages] Cache HIT! ${cachedMessages.length} messages in ${Date.now() - startTime}ms`);
        
        // Filter cached messages
        const filteredCached = cachedMessages.filter((msg: any) => {
          if (msg.isRecalled && msg.uid !== currentUserId) return false;
          if (msg.deletedFor && msg.deletedFor.includes(currentUserId)) return false;
          return true;
        });
        
        setMessages(filteredCached);
        setIsInitialLoadComplete(true); // Mark complete immediately for UI
        isCacheLoaded.current = true;
        isInitialLoad.current = false;
        
        // Setup realtime listener with timestamp from newest cached message
        const newestMsg = filteredCached[filteredCached.length - 1];
        if (newestMsg?.createdAt) {
          const timestamp = typeof newestMsg.createdAt === 'number' 
            ? Timestamp.fromMillis(newestMsg.createdAt)
            : newestMsg.createdAt?.seconds 
              ? new Timestamp(newestMsg.createdAt.seconds, newestMsg.createdAt.nanoseconds || 0)
              : newestMsg.createdAt;
          setupRealtimeListener(timestamp);
        }
        
        // STEP 2: Fetch fresh data in BACKGROUND (don't block UI)
        fetchFreshDataInBackground(filteredCached);
        return;
      }
    } catch (e) {
      console.warn(`⚠️ [useOptimizedGroupMessages] Cache error:`, e);
    }

    // STEP 2: No cache, fetch from Firestore
    console.log(`🔥 [useOptimizedGroupMessages] Cache MISS, fetching from Firestore`);
    setLoading(true);

    try {
      const messagesRef = collection(doc(db, 'groups', groupId), 'messages');
      const q = query(
        messagesRef,
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );

      const snapshot = await getDocs(q);
      const freshMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GroupMessage[];

      // Filter messages
      const filteredMessages = freshMessages.filter((msg: any) => {
        if (msg.isRecalled && msg.uid !== currentUserId) return false;
        if (msg.deletedFor && msg.deletedFor.includes(currentUserId)) return false;
        return true;
      }).reverse(); // Reverse to get chronological order

      console.log(`✅ [useOptimizedGroupMessages] Loaded ${filteredMessages.length} messages in ${Date.now() - startTime}ms`);

      setMessages(filteredMessages);
      setHasMore(snapshot.docs.length >= pageSize);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);

      // Cache fresh messages
      if (filteredMessages.length > 0) {
        groupMessageCacheService.cacheMessages(groupId, filteredMessages).catch(() => {});
      }

      // Setup real-time listener for new messages
      const lastMessageTime = filteredMessages.length > 0 
        ? filteredMessages[filteredMessages.length - 1]?.createdAt 
        : new Timestamp(0, 0);
      
      setupRealtimeListener(lastMessageTime);
    } catch (err: any) {
      console.error('❌ [useOptimizedGroupMessages] Load initial messages error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setIsInitialLoadComplete(true);
      isInitialLoad.current = false;
    }
  }, [groupId, enabled, currentUserId, pageSize, setupRealtimeListener]);

  // Fetch fresh data in background without blocking UI
  const fetchFreshDataInBackground = useCallback(async (cachedMessages: GroupMessage[]) => {
    if (!groupId) return;
    
    try {
      const messagesRef = collection(doc(db, 'groups', groupId), 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(pageSize));
      const snapshot = await getDocs(q);
      
      const freshMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GroupMessage[];
      
      // Filter fresh messages
      const filteredFresh = freshMessages.filter((msg: any) => {
        if (msg.isRecalled && msg.uid !== currentUserId) return false;
        if (msg.deletedFor && msg.deletedFor.includes(currentUserId)) return false;
        return true;
      }).reverse();
      
      // Check if fresh data is different from cache
      const cacheIds = new Set(cachedMessages.map(m => m.id));
      const freshIds = new Set(filteredFresh.map(m => m.id));
      const hasNewMessages = filteredFresh.some(m => !cacheIds.has(m.id));
      const hasMissingMessages = cachedMessages.some(m => !freshIds.has(m.id) && 
        cachedMessages.indexOf(m) >= cachedMessages.length - pageSize);
      
      if (hasNewMessages || hasMissingMessages) {
        console.log(`🔄 [useOptimizedGroupMessages] Background: Found updates, syncing...`);
        
        // Merge: keep cache older messages + fresh newest messages
        const mergedMap = new Map<string, GroupMessage>();
        cachedMessages.forEach(m => mergedMap.set(m.id, m));
        filteredFresh.forEach(m => mergedMap.set(m.id, m)); // Fresh overwrites cache
        
        const merged = Array.from(mergedMap.values()).sort((a, b) => {
          const timeA = a.createdAt?.seconds || a.createdAt?.toMillis?.() / 1000 || 0;
          const timeB = b.createdAt?.seconds || b.createdAt?.toMillis?.() / 1000 || 0;
          return timeA - timeB;
        });
        
        setMessages(merged);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        groupMessageCacheService.cacheMessages(groupId, merged).catch(() => {});
      } else {
        console.log(`✅ [useOptimizedGroupMessages] Background: Cache is up-to-date`);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      }
      
      setHasMore(snapshot.docs.length >= pageSize);
    } catch (error) {
      console.warn(`⚠️ [useOptimizedGroupMessages] Background fetch error:`, error);
    }
  }, [groupId, pageSize, currentUserId]);

  // Load more messages (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !lastDoc || !isInitialLoadComplete) {
      return;
    }

    setIsLoadingMore(true);
    console.log('📥 [useOptimizedGroupMessages] Loading more messages...');

    try {
      const messagesRef = collection(doc(db, 'groups', groupId), 'messages');
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
      })) as GroupMessage[];

      // Filter messages
      const filteredNewMessages = newMessages.filter((msg: any) => {
        if (msg.isRecalled && msg.uid !== currentUserId) return false;
        if (msg.deletedFor && msg.deletedFor.includes(currentUserId)) return false;
        return true;
      }).reverse(); // Reverse to get chronological order

      if (filteredNewMessages.length > 0) {
        setMessages(prev => [...filteredNewMessages, ...prev]); // Prepend older messages
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        
        // Update cache with all messages
        const allMessages = [...filteredNewMessages, ...messages];
        await groupMessageCacheService.cacheMessages(groupId, allMessages);
        
        console.log(`✅ [useOptimizedGroupMessages] Loaded ${filteredNewMessages.length} more messages`);
      }

      setHasMore(snapshot.docs.length >= pageSize);
    } catch (err: any) {
      console.error('❌ [useOptimizedGroupMessages] Load more error:', err);
      setError(err.message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [groupId, currentUserId, hasMore, isLoadingMore, lastDoc, isInitialLoadComplete, pageSize, messages]);

  // Refresh messages (clear cache and reload)
  const refresh = useCallback(async () => {
    console.log('🔄 [useOptimizedGroupMessages] Refreshing messages...');
    
    // Clear cache
    await groupMessageCacheService.clearGroupCache(groupId);
    
    // Reset state
    setMessages([]);
    setLastDoc(null);
    setHasMore(true);
    setIsInitialLoadComplete(false);
    isInitialLoad.current = true;
    isCacheLoaded.current = false;
    
    // Cleanup existing listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    // Reload
    await loadInitialMessages();
  }, [groupId, loadInitialMessages]);

  // Initial load
  useEffect(() => {
    if (!groupId || !enabled || !currentUserId) {
      setLoading(false);
      return;
    }

    mountedRef.current = true;
    loadInitialMessages();

    return () => {
      mountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [groupId, enabled, currentUserId, loadInitialMessages]);

  return {
    messages,
    loading,
    error,
    hasMore,
    loadMore: loadMore,
    refresh,
    isLoadingMore,
    isInitialLoadComplete
  };
}
