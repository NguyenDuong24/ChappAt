import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  collection,
  doc,
  query,
  orderBy,
  limit,
  limitToLast,
  startAfter,
  onSnapshot,
  getDocs,
  DocumentSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { CHAT_COST_LIMITS } from '@/config/costControls';

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

// How many recent messages the real-time listener watches.
// Only the "tail" of the conversation is monitored — older messages
// are loaded on-demand via pagination which uses one-shot getDocs().
const REALTIME_TAIL_SIZE = 50;

function getCreatedAtMs(message: Message): number {
  const value = message.createdAt;
  if (!value) return Date.now(); // pending messages without timestamp go to end
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  return 0;
}

export const useOptimizedChatMessages = ({
  roomId,
  pageSize = CHAT_COST_LIMITS.initialPageSize,
  enableRealtime = true,
}: UseOptimizedChatMessagesProps) => {
  const safePageSize = useMemo(
    () => Math.min(pageSize, CHAT_COST_LIMITS.maxPageSize),
    [pageSize]
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const initializedRef = useRef(false);

  // ─── Core: Real-time listener on the TAIL of the collection ───────────────
  // Uses limitToLast(N) + orderBy('createdAt','asc') so Firestore only
  // watches the most recent N messages. Any new message lands inside this
  // window and triggers an 'added' event. Edits/deletes on recent messages
  // also fire 'modified'/'removed' as expected.
  const setupRealtimeListener = useCallback(() => {
    if (!roomId || !enableRealtime) return;

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    const messagesRef = collection(doc(db, 'rooms', roomId), 'messages');
    const q = query(
      messagesRef,
      orderBy('createdAt', 'asc'),
      limitToLast(REALTIME_TAIL_SIZE),
    );

    unsubscribeRef.current = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const msgData = { id: change.doc.id, ...change.doc.data() } as Message;

        if (change.type === 'added') {
          setMessages(prev => {
            if (prev.some(m => m.id === msgData.id)) return prev;
            // Binary-insert into sorted array instead of sort(entire array)
            const ts = getCreatedAtMs(msgData);
            const next = [...prev];
            let lo = 0, hi = next.length;
            while (lo < hi) {
              const mid = (lo + hi) >>> 1;
              if (getCreatedAtMs(next[mid]) < ts) lo = mid + 1;
              else hi = mid;
            }
            next.splice(lo, 0, msgData);
            return next;
          });
        } else if (change.type === 'modified') {
          setMessages(prev => prev.map(m => m.id === msgData.id ? { ...m, ...msgData } : m));
        } else if (change.type === 'removed') {
          setMessages(prev => prev.filter(m => m.id !== msgData.id));
        }
      });
    }, (error) => {
      console.error('[useOptimizedChatMessages] realtime listener error:', error);
    });
  }, [roomId, enableRealtime]);

  // ─── Initial load (historical messages via pagination) ───────────────────
  const loadInitialMessages = useCallback(async () => {
    if (!roomId) return;

    setLoadingInitial(true);
    try {
      const messagesRef = collection(doc(db, 'rooms', roomId), 'messages');
      const initialQuery = query(
        messagesRef,
        orderBy('createdAt', 'desc'),
        limit(safePageSize)
      );

      const snapshot = await getDocs(initialQuery);
      const messagesList = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as Message[];

      // Set historical messages first (reversed = asc)
      setMessages(messagesList.reverse());
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === safePageSize);
    } catch (error) {
      console.error('[useOptimizedChatMessages] loadInitialMessages error:', error);
    } finally {
      setLoadingInitial(false);
      setIsInitialLoadComplete(true);
    }
  }, [roomId, safePageSize]);

  const loadMoreMessages = useCallback(async () => {
    if (!roomId || !lastDoc || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const messagesRef = collection(doc(db, 'rooms', roomId), 'messages');
      const moreQuery = query(
        messagesRef,
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(safePageSize)
      );

      const snapshot = await getDocs(moreQuery);
      const newMessages = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as Message[];

      if (newMessages.length > 0) {
        setMessages(prev => {
          const byId = new Map(prev.map(m => [m.id, m]));
          newMessages.forEach(m => { if (!byId.has(m.id)) byId.set(m.id, m); });
          return Array.from(byId.values()).sort((a, b) => getCreatedAtMs(a) - getCreatedAtMs(b));
        });
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === safePageSize);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('[useOptimizedChatMessages] loadMoreMessages error:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [roomId, lastDoc, safePageSize, loadingMore, hasMore]);

  // ─── Room change: reset state ─────────────────────────────────────────────
  useEffect(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setMessages([]);
    setLastDoc(null);
    setHasMore(true);
    setLoadingInitial(false);
    setLoadingMore(false);
    setIsInitialLoadComplete(false);
    initializedRef.current = false;
  }, [roomId]);

  // ─── Initialize: load history first, then attach real-time listener ───────
  useEffect(() => {
    if (!roomId || initializedRef.current) return;
    initializedRef.current = true;

    // Load history in background, real-time listener handles new messages
    loadInitialMessages().then(() => {
      if (enableRealtime) {
        setupRealtimeListener();
      }
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [roomId, loadInitialMessages, setupRealtimeListener, enableRealtime]);

  return {
    messages,
    loading: loadingInitial,
    hasMore,
    loadMoreMessages,
    refreshMessages: loadInitialMessages,
    isLoadingMore: loadingMore,
    isInitialLoadComplete,
  };
};
