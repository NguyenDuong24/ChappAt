import { db } from '@/firebaseConfig';
import { formatTime, getRoomId } from '@/utils/common';
import { useRouter, useSegments } from 'expo-router';
import { collection, doc, DocumentData, onSnapshot, orderBy, query, limit, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/authContext';
import { useTranslation } from 'react-i18next';
import { normalizeDisplayText } from '@/utils/textEncoding';
import UnifiedChatItem from './UnifiedChatItem';

const ChatItem = ({ item, noBorder = false, currenUser, lastMessage: externalLastMessage = null, unreadCount: externalUnreadCount, chatType, chatRoomId, hotSpotId, hotSpotTitle, onLongPress, isPinned = false, roomType, eventId }: { item: any, noBorder?: boolean, currenUser: any, lastMessage?: DocumentData | null, unreadCount?: number, chatType?: string, chatRoomId?: string, hotSpotId?: string, hotSpotTitle?: string, onLongPress?: () => void, isPinned?: boolean, roomType?: string, eventId?: string }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const segments = useSegments();
  const [internalLastMessage, setInternalLastMessage] = useState<DocumentData | null>(null);
  const [internalUnreadCount, setInternalUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [roomMeta, setRoomMeta] = useState<{ type?: string; eventId?: string } | null>(null);
  const [eventActive, setEventActive] = useState<boolean | null>(null);
  const [eventEndMs, setEventEndMs] = useState<number | null>(null);
  const { user: viewer } = useAuth();
  const viewerShowOnline = viewer?.showOnlineStatus !== false;
  const expiryTimerRef = useRef<any>(null);

  const lastMessage = externalLastMessage ?? internalLastMessage;
  const unreadCount = typeof externalUnreadCount === 'number' ? externalUnreadCount : internalUnreadCount;
  const hasEventMeta = Boolean(roomMeta?.eventId) || roomMeta?.type === 'event_match';
  const isHotSpot = chatType === 'hotspot' || (hasEventMeta && eventActive === true);

  useEffect(() => {
    if (roomType || eventId) {
      setRoomMeta({ type: roomType, eventId: eventId });
    }
  }, [roomType, eventId]);

  useEffect(() => {
    const clearTimer = () => { if (expiryTimerRef.current) { clearTimeout(expiryTimerRef.current); expiryTimerRef.current = null; } };
    clearTimer();

    const setupFromEndMs = (endMs?: number) => {
      setEventEndMs(endMs || null);
      if (!endMs || isNaN(endMs)) {
        setEventActive(true);
        return;
      }
      const now = Date.now();
      if (now >= endMs) {
        setEventActive(false);
        return;
      }
      setEventActive(true);
      expiryTimerRef.current = setTimeout(() => setEventActive(false), endMs - now);
    };

    const extractEndMs = (data: any): number | undefined => {
      try {
        const d: any = data || {};
        const iso = d?.eventInfo?.endDate || d?.endDate || d?.endsAt || d?.endTime;
        if (iso && typeof iso === 'string') {
          const t = Date.parse(iso);
          if (!isNaN(t)) return t;
        }
        const ts = d?.endAt || d?.eventInfo?.endAt;
        if (ts?.toMillis) return ts.toMillis();
        if (typeof ts?.seconds === 'number') return ts.seconds * 1000;
      } catch { }
      return undefined;
    };

    const loadEndTime = async (eventId?: string) => {
      if (!eventId) { setEventActive(null); return; }
      try {
        const hotRef = doc(db, 'hotSpots', eventId);
        const hotSnap = await getDoc(hotRef);
        if (hotSnap.exists()) {
          setupFromEndMs(extractEndMs(hotSnap.data()));
          return;
        }
        const evRef = doc(db, 'events', eventId);
        const evSnap = await getDoc(evRef);
        if (evSnap.exists()) {
          setupFromEndMs(extractEndMs(evSnap.data()));
          return;
        }
        setEventActive(false);
      } catch {
        setEventActive(false);
      }
    };

    loadEndTime(roomMeta?.eventId);
    return clearTimer;
  }, [roomMeta?.eventId]);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    if (!item?.id || !currenUser?.uid) { setIsLoading(false); return; }
    if (externalLastMessage !== null && typeof externalUnreadCount === 'number') { setIsLoading(false); return; }
    try {
      const roomId = getRoomId(currenUser.uid, item.id);
      const docRef = doc(db, 'rooms', roomId);
      const messagesRef = collection(docRef, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));

      unsub = onSnapshot(q, (snapshot) => {
        try {
          const lmDoc = snapshot.docs[0];
          setInternalLastMessage(lmDoc ? lmDoc.data() : null);
          setInternalUnreadCount(0);
          setIsLoading(false);
        } catch (error) { setIsLoading(false); }
      }, () => { setIsLoading(false); });
    } catch (error) { setIsLoading(false); }

    return () => { if (unsub) { try { unsub(); } catch (error) {} } };
  }, [item?.id, currenUser?.uid, externalLastMessage, externalUnreadCount]);

  if (!item?.id || !currenUser?.uid) return null;

  const genderIconColor = item.gender === 'male' ? '#0EA5E9' : item.gender === 'female' ? '#06B6D4' : '#999';

  const handlePress = () => {
    try {
      if (!item?.id) return;
      try {
        const roomId = getRoomId(currenUser.uid, item.id);
        const readStatusRef = doc(db, 'rooms', roomId, 'readStatus', currenUser.uid);
        setDoc(readStatusRef, { lastReadAt: serverTimestamp() }, { merge: true }).catch(() => { });
      } catch { }

      if (chatType === 'hotspot' && chatRoomId) {
        router.push({
          pathname: '/(screens)/hotspots/HotSpotChatScreen',
          params: { chatRoomId, hotSpotId: hotSpotId || '', hotSpotTitle: hotSpotTitle || '' },
        });
      } else {
        router.push(`/chat/${item.id}` as any);
      }
    } catch (error) { console.error(error); }
  };

  return (
    <UnifiedChatItem
      item={item}
      isGroup={false}
      currentUser={currenUser}
      lastMessage={lastMessage}
      unreadCount={unreadCount}
      onPress={handlePress}
      onLongPress={onLongPress}
      isPinned={isPinned}
      isHotSpot={isHotSpot}
      genderIconColor={genderIconColor}
      viewerShowOnline={viewerShowOnline}
      noBorder={noBorder}
    />
  );
};

export default React.memo(ChatItem);

