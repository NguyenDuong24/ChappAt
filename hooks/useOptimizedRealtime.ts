import { useEffect, useRef, useCallback } from 'react';
import { 
  doc, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';

interface UseOptimizedRealtimeProps {
  roomId: string;
  messages: any[];
  newestTimestamp: any;
  onNewMessages: (messages: any[]) => void;
  onSoundTrigger: () => void;
  currentUserId?: string;
}

export const useOptimizedRealtime = ({
  roomId,
  messages,
  newestTimestamp,
  onNewMessages,
  onSoundTrigger,
  currentUserId
}: UseOptimizedRealtimeProps) => {
  const listenersRef = useRef<(() => void)[]>([]);
  const isActiveRef = useRef(true);

  // Cleanup function to remove all listeners
  const cleanup = useCallback(() => {
    listenersRef.current.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        console.warn('Error unsubscribing listener:', error);
      }
    });
    listenersRef.current = [];
  }, []);

  // Optimized new messages listener
  useEffect(() => {
    if (!roomId || !newestTimestamp || !isActiveRef.current) return;

    const roomDocRef = doc(db, 'rooms', roomId);
    const messagesRef = collection(roomDocRef, 'messages');

    const qNew = query(
      messagesRef,
      orderBy('createdAt', 'asc'),
      where('createdAt', '>', newestTimestamp)
    );

    const unsubscribe = onSnapshot(qNew, (snap) => {
      if (!isActiveRef.current) return;
      
      const newMsgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (newMsgs.length > 0) {
        console.log('🔔 [Chat] New messages received:', newMsgs.length);
        
        // Check if any new message is from another user
        const hasMessageFromOther = newMsgs.some((msg: any) => msg.uid !== currentUserId);
        
        if (hasMessageFromOther) {
          onSoundTrigger();
        }
        
        onNewMessages(newMsgs);
      }
    }, (error) => {
      console.error('New messages listener error:', error);
    });

    listenersRef.current.push(unsubscribe);
    return unsubscribe;
  }, [roomId, newestTimestamp, currentUserId, onNewMessages, onSoundTrigger]);

  // Optimized range listener for existing messages
  useEffect(() => {
    if (!roomId || !messages?.length || !isActiveRef.current) return;
    
    const oldest = messages[0]?.createdAt;
    const newest = messages[messages.length - 1]?.createdAt;
    if (!oldest || !newest) return;

    const roomDocRef = doc(db, 'rooms', roomId);
    const messagesRef = collection(roomDocRef, 'messages');

    try {
      const qRange = query(
        messagesRef,
        orderBy('createdAt', 'asc'),
        where('createdAt', '>=', oldest),
        where('createdAt', '<=', newest)
      );

      const unsubscribe = onSnapshot(qRange, (snap) => {
        if (!isActiveRef.current) return;
        
        const changeMap = new Map<string, { removed?: boolean; data?: any }>();
        snap.docChanges().forEach((chg) => {
          if (chg.type === 'removed') {
            changeMap.set(chg.doc.id, { removed: true });
          } else if (chg.type === 'modified' || chg.type === 'added') {
            changeMap.set(chg.doc.id, { data: { id: chg.doc.id, ...chg.doc.data() } });
          }
        });

        if (changeMap.size > 0) {
          // Notify parent about changes (parent will handle the merge)
          const changes = Array.from(changeMap.entries()).map(([id, change]) => ({
            id,
            ...change
          }));
          // Could add another callback here if needed for range updates
        }
      }, (error) => {
        console.warn('Range realtime listener error:', error);
      });

      listenersRef.current.push(unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.warn('Range realtime listener setup failed:', error);
    }
  }, [roomId, messages]);

  // Cleanup on unmount or when component becomes inactive
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // Pause/resume listeners based on app state
  const pauseListeners = useCallback(() => {
    isActiveRef.current = false;
    cleanup();
  }, [cleanup]);

  const resumeListeners = useCallback(() => {
    isActiveRef.current = true;
    // Listeners will be recreated by the effects
  }, []);

  return {
    pauseListeners,
    resumeListeners,
    cleanup
  };
};
