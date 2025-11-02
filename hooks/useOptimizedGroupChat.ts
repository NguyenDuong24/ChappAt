import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '@/firebaseConfig';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { useChat } from '@/context/OptimizedChatContext';

interface UseOptimizedGroupChatOptions {
  pageSize?: number;
}

export interface OptimizedGroupMessage extends DocumentData {
  id: string;
}

export function useOptimizedGroupChat(
  groupId: string,
  currentUser: { uid: string; username?: string; profileUrl?: string } | null,
  options: UseOptimizedGroupChatOptions = {}
) {
  const { pageSize = 30 } = options;
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const oldestLoadedRef = useRef<QueryDocumentSnapshot | null>(null);
  const liveUnsubRef = useRef<() => void>();

  const { getCachedMessages, updateMessages, addMessage, setActiveChat, removeActiveChat } = useChat();

  const cached = getCachedMessages(groupId) || [];
  const [messages, setMessages] = useState<OptimizedGroupMessage[]>(cached);

  // Activate this room in shared cache
  useEffect(() => {
    if (groupId) setActiveChat(groupId);
    return () => {
      if (groupId) removeActiveChat(groupId);
      try { liveUnsubRef.current && liveUnsubRef.current(); } catch {}
    };
  }, [groupId]);

  // Initial page + live listener for the last page
  useEffect(() => {
    if (!groupId || !currentUser?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Cleanup previous listener
    if (liveUnsubRef.current) {
      try { liveUnsubRef.current(); } catch {}
      liveUnsubRef.current = undefined;
    }

    (async () => {
      try {
        const groupRef = doc(db, 'groups', groupId);
        const messagesRef = collection(groupRef, 'messages');

        // Live listener for latest page
        const liveQ = query(messagesRef, orderBy('createdAt', 'desc'), limit(pageSize));
        const unsub = onSnapshot(liveQ, (snap) => {
          const latestDesc = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          // Keep reference to the oldest doc in the live window for pagination
          oldestLoadedRef.current = snap.docs[snap.docs.length - 1] || null;

          // Reverse to ascending for UI
          const latestAsc = [...latestDesc].reverse();

          // Merge with any previously loaded older messages (from cache/state)
          const older = (getCachedMessages(groupId) || []).filter((m: any) => {
            // Filter out messages that are in latestAsc
            return !latestAsc.find((lm) => lm.id === m.id);
          });
          const merged = [...older, ...latestAsc];

          setMessages(merged);
          updateMessages(groupId, merged);
          setHasMore(!!oldestLoadedRef.current);
          setLoading(false);
        }, (err) => {
          console.error('Group live listener error:', err);
          setLoading(false);
        });

        liveUnsubRef.current = unsub;
      } catch (e) {
        console.error('Setup group live listener failed:', e);
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, currentUser?.uid, pageSize]);

  const loadMore = useCallback(async () => {
    if (!groupId || loadingMore || !hasMore) return;
    if (!oldestLoadedRef.current) return;

    setLoadingMore(true);
    try {
      const groupRef = doc(db, 'groups', groupId);
      const messagesRef = collection(groupRef, 'messages');
      const oldestDoc = oldestLoadedRef.current;
      const oldestData = oldestDoc.data() as any;
      const oldestTs = oldestData?.createdAt instanceof Timestamp
        ? oldestData.createdAt
        : (oldestData?.createdAt ? Timestamp.fromDate(new Date(oldestData.createdAt)) : null);

      if (!oldestTs) {
        setHasMore(false);
        setLoadingMore(false);
        return;
      }

      // Fetch messages older than current oldest
      const olderQ = query(
        messagesRef,
        where('createdAt', '<', oldestTs),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );

      const olderSnap = await getDocs(olderQ);
      const olderDesc = olderSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

      // Update pointer to oldest
      if (olderSnap.docs.length > 0) {
        oldestLoadedRef.current = olderSnap.docs[olderSnap.docs.length - 1];
      } else {
        setHasMore(false);
      }

      // Reverse and prepend
      const olderAsc = [...olderDesc].reverse();
      const merged = [...olderAsc, ...messages];
      setMessages(merged);
      updateMessages(groupId, merged);
    } catch (e) {
      console.error('Load more group messages failed:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [groupId, hasMore, loadingMore, messages, updateMessages]);

  // Mark as read without scanning all messages
  const markAsRead = useCallback(async () => {
    try {
      if (!groupId || !currentUser?.uid) return;
      await updateDoc(doc(db, 'groups', groupId), {
        [`readMarkers.${currentUser.uid}`]: serverTimestamp(),
      });
    } catch (e) {
      console.warn('markAsRead failed (group)', e);
    }
  }, [groupId, currentUser?.uid]);

  // Debounce markAsRead when messages change
  useEffect(() => {
    const t = setTimeout(() => {
      markAsRead();
    }, 800);
    return () => clearTimeout(t);
  }, [messages, markAsRead]);

  const sendText = useCallback(async (text: string, replyTo?: any) => {
    if (!groupId || !currentUser?.uid) return;
    const trimmed = (text || '').trim();
    if (!trimmed) return;
    const groupRef = doc(db, 'groups', groupId);
    const messagesRef = collection(groupRef, 'messages');
    const newMsg = {
      uid: currentUser.uid,
      text: trimmed,
      profileUrl: currentUser.profileUrl || null,
      senderName: currentUser.username || 'Bạn',
      createdAt: serverTimestamp(),
      status: 'sent',
      readBy: [],
      ...(replyTo ? { replyTo } : {}),
    };
    const added = await addDoc(messagesRef, newMsg);
    // Optionally update group metadata for lists
    await updateDoc(groupRef, {
      lastMessage: { text: trimmed, createdAt: serverTimestamp(), uid: currentUser.uid, status: 'sent' },
      updatedAt: serverTimestamp(),
    }).catch(() => {});
    addMessage(groupId, { id: added.id, ...newMsg });
  }, [groupId, currentUser?.uid, currentUser?.profileUrl, currentUser?.username, addMessage]);

  return {
    messages,
    loading,
    hasMore,
    loadingMore,
    loadMore,
    markAsRead,
    sendText,
  };
}
