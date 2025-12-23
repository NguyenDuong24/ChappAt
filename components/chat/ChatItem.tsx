import { db } from '@/firebaseConfig';
import { formatTime, getRoomId } from '@/utils/common';
import { useRouter, useSegments } from 'expo-router';
import { collection, doc, DocumentData, onSnapshot, orderBy, query, limit, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import VibeAvatar from '@/components/vibe/VibeAvatar';
import { useAuth } from '@/context/authContext';
import { useTranslation } from 'react-i18next';

const ChatItem = ({ item, noBorder = false, currenUser, lastMessage: externalLastMessage = null, unreadCount: externalUnreadCount, chatType, chatRoomId, hotSpotId }: { item: any, noBorder?: boolean, currenUser: any, lastMessage?: DocumentData | null, unreadCount?: number, chatType?: string, chatRoomId?: string, hotSpotId?: string }) => {
  const { t } = useTranslation();
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const segments = useSegments();
  const [internalLastMessage, setInternalLastMessage] = useState<DocumentData | null>(null);
  const [internalUnreadCount, setInternalUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [roomMeta, setRoomMeta] = useState<{ type?: string; eventId?: string } | null>(null);
  // Start as null (unknown) to avoid flicker; only decide after we load event end time
  const [eventActive, setEventActive] = useState<boolean | null>(null);
  const [eventEndMs, setEventEndMs] = useState<number | null>(null);
  const { user: viewer } = useAuth();
  const viewerShowOnline = viewer?.showOnlineStatus !== false;
  const expiryTimerRef = useRef<any>(null);
  const maxLength = 25;

  const lastMessage = externalLastMessage ?? internalLastMessage;
  const unreadCount = typeof externalUnreadCount === 'number' ? externalUnreadCount : internalUnreadCount;
  const hasEventMeta = Boolean(roomMeta?.eventId) || roomMeta?.type === 'event_match';
  // Check if it's a Hot Spot chat from props or room meta
  const isHotSpot = chatType === 'hotspot' || (hasEventMeta && eventActive === true);

  // Subscribe to room meta to detect hotspot/event chats
  useEffect(() => {
    if (!item?.id || !currenUser?.uid) return;
    const rId = getRoomId(currenUser.uid, item.id);
    const unsub = onSnapshot(doc(db, 'rooms', rId), (snap) => {
      const d: any = snap.data();
      setRoomMeta(d ? { type: d?.type, eventId: d?.eventId } : null);
    }, (e) => {
      // swallow
    });
    return () => { try { unsub(); } catch { } };
  }, [item?.id, currenUser?.uid]);

  // When we know eventId, fetch its end time and auto-expire the badge/card
  useEffect(() => {
    const clearTimer = () => { if (expiryTimerRef.current) { clearTimeout(expiryTimerRef.current); expiryTimerRef.current = null; } };
    clearTimer();

    const setupFromEndMs = (endMs?: number) => {
      setEventEndMs(endMs || null);
      if (!endMs || isNaN(endMs)) {
        // No end time -> treat as active to show badge
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
        // Prefer nested eventInfo.endDate (ISO)
        const iso = d?.eventInfo?.endDate || d?.endDate || d?.endsAt || d?.endTime;
        if (iso && typeof iso === 'string') {
          const t = Date.parse(iso);
          if (!isNaN(t)) return t;
        }
        // Support Firestore Timestamp-like
        const ts = d?.endAt || d?.eventInfo?.endAt;
        if (ts?.toMillis) return ts.toMillis();
        if (typeof ts?.seconds === 'number') return ts.seconds * 1000;
      } catch { }
      return undefined;
    };

    const loadEndTime = async (eventId?: string) => {
      // If we don't yet have an eventId, don't force-hide; keep unknown to avoid flicker
      if (!eventId) { setEventActive(null); return; }
      try {
        // Try hotSpots/{eventId} first
        const hotRef = doc(db, 'hotSpots', eventId);
        const hotSnap = await getDoc(hotRef);
        if (hotSnap.exists()) {
          setupFromEndMs(extractEndMs(hotSnap.data()));
          return;
        }
        // Fallback: events/{eventId}
        const evRef = doc(db, 'events', eventId);
        const evSnap = await getDoc(evRef);
        if (evSnap.exists()) {
          setupFromEndMs(extractEndMs(evSnap.data()));
          return;
        }
        // Unknown event -> hide badge
        setEventActive(false);
      } catch {
        // On error, hide badge conservatively
        setEventActive(false);
      }
    };

    loadEndTime(roomMeta?.eventId);
    return clearTimer;
  }, [roomMeta?.eventId]);

  // Subscribe to latest message ONLY if parent didn't provide data
  useEffect(() => {
    let unsub: (() => void) | null = null;

    if (!item?.id || !currenUser?.uid) {
      setIsLoading(false);
      return;
    }

    if (externalLastMessage !== null && typeof externalUnreadCount === 'number') {
      // Parent controls data; skip subscription
      setIsLoading(false);
      return;
    }

    try {
      const roomId = getRoomId(currenUser.uid, item.id);
      const docRef = doc(db, 'rooms', roomId);
      const messagesRef = collection(docRef, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));

      unsub = onSnapshot(
        q,
        (snapshot) => {
          try {
            const lmDoc = snapshot.docs[0];
            const lm = lmDoc ? lmDoc.data() : null;
            setInternalLastMessage(lm);
            // We cannot cheaply compute unreadCount here without scanning; default to 0
            setInternalUnreadCount(0);
            setIsLoading(false);
          } catch (error) {
            console.error('Error processing messages:', error);
            setIsLoading(false);
          }
        },
        (error) => {
          console.error('Error fetching messages:', error);
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error('Error setting up listener:', error);
      setIsLoading(false);
    }

    return () => {
      if (unsub) {
        try { unsub(); } catch (error) { console.error('Error unsubscribing:', error); }
      }
    };
  }, [item?.id, currenUser?.uid, externalLastMessage, externalUnreadCount]);

  if (!item?.id || !currenUser?.uid) {
    return null;
  }

  const genderIconColor = item.gender === 'male' ? '#667eea' : item.gender === 'female' ? '#f093fb' : '#999';

  const renderTime = () => {
    if (isLoading) return '';
    if (lastMessage) {
      try {
        return formatTime(lastMessage.createdAt || lastMessage.lastMessageTime);
      } catch (error) {
        console.error('Error formatting time:', error);
        return '';
      }
    }
    return '';
  };

  const renderLastMessage = () => {
    if (isLoading) return t('common.loading');

    if (lastMessage) {
      try {
        const prefix = currenUser?.uid === lastMessage?.uid ? `${t('common.you')}: ` : '';
        const statusIcon = getLastMessageStatusIcon();
        const text = lastMessage?.text || (lastMessage?.imageUrl ? `📷 ${t('chat.image')}` : '');
        return `${prefix}${text} ${statusIcon}`.trim();
      } catch (error) {
        console.error('Error rendering last message:', error);
        return 'Error loading message';
      }
    } else {
      return t('chat.say_hi', { defaultValue: 'Say hi 👋' });
    }
  };

  const getLastMessageStatusIcon = () => {
    if (!lastMessage || currenUser?.uid !== lastMessage?.uid) return '';

    switch (lastMessage?.status) {
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return '✓✓';
      default:
        return '';
    }
  };

  const renderUsername = () => {
    if (!item?.username) return t('chat.unknown_user', { defaultValue: 'Unknown User' });
    try {
      return item.username.length > maxLength ? `${item.username.slice(0, maxLength)}...` : item.username;
    } catch (error) {
      console.error('Error rendering username:', error);
      return t('chat.unknown_user', { defaultValue: 'Unknown User' });
    }
  };

  const handlePress = () => {
    try {
      if (!item?.id) {
        console.error('Cannot navigate: item.id is missing');
        return;
      }

      // Update read status (mark all as read now)
      try {
        const roomId = getRoomId(currenUser.uid, item.id);
        const readStatusRef = doc(db, 'rooms', roomId, 'readStatus', currenUser.uid);
        setDoc(readStatusRef, { lastReadAt: serverTimestamp() }, { merge: true }).catch(() => { });
      } catch { }

      // Navigate to Hot Spot chat if it's a hot spot conversation
      if (chatType === 'hotspot' && chatRoomId) {
        router.push({
          pathname: '/(screens)/hotspots/HotSpotChatScreen',
          params: {
            chatRoomId,
            hotSpotId: hotSpotId || '',
            hotSpotTitle: '',
          },
        });
      } else {
        // Navigate to regular chat - always use /chat/[id] path
        router.push(`/chat/${item.id}` as any);
      }
    } catch (error) {
      console.error('Error navigating to chat:', error);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: currentThemeColors.background }]}
      onPress={handlePress}
    >
      <View style={[styles.chatCard, isHotSpot && styles.hotSpotCard, { backgroundColor: isHotSpot ? currentThemeColors.hotSpotsBackground : currentThemeColors.cardBackground }]}>
        {/* Avatar Section */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarWrapper}>
            <VibeAvatar
              avatarUrl={item.profileUrl}
              size={56}
              currentVibe={item.currentVibe || null}
              showAddButton={false}
              storyUser={{ id: item.id, username: item.username, profileUrl: item.profileUrl }}
            />
            {viewerShowOnline && (
              <View style={[
                styles.statusIndicator,
                item.isOnline
                  ? {
                    backgroundColor: Colors.success,
                    borderColor: currentThemeColors.cardBackground,
                    shadowColor: Colors.success,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.4,
                    shadowRadius: 4,
                    elevation: 4,
                  }
                  : {
                    backgroundColor: Colors.warning,
                    borderColor: currentThemeColors.cardBackground,
                    shadowColor: Colors.warning,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 2,
                    elevation: 2,
                  }
              ]} />
            )}
          </View>
        </View>
        {/* Content Section */}
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <View style={styles.userInfoRow}>
              <Text style={[styles.username, { color: currentThemeColors.text }]}>
                {renderUsername()}
              </Text>
              {(isHotSpot || chatType === 'hotspot') && (
                <View style={[styles.hotSpotBadge, { backgroundColor: currentThemeColors.hotSpotsSurfaceLight, borderColor: currentThemeColors.hotSpotsAccent }]}>
                  <MaterialCommunityIcons name="fire" size={12} color={currentThemeColors.hotSpotsPrimary} />
                  <Text style={[styles.hotSpotBadgeText, { color: currentThemeColors.hotSpotsPrimary }]}>Hot Spot</Text>
                </View>
              )}
              {item.gender && (
                <View style={[styles.genderContainer, { backgroundColor: currentThemeColors.inputBackground }]}>
                  <MaterialCommunityIcons
                    name={item.gender === 'male' ? 'gender-male' : 'gender-female'}
                    size={16}
                    color={genderIconColor}
                  />
                  {typeof item.age === 'number' && (
                    <Text style={[styles.age, { color: genderIconColor }]}>
                      {item.age}
                    </Text>
                  )}
                </View>
              )}
            </View>
            <View style={styles.rightSection}>
              <Text style={[styles.time, { color: currentThemeColors.subtleText }]}>
                {renderTime()}
              </Text>

            </View>
            {unreadCount > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: '#F43F5E', position: 'absolute', top: 30, right: 0 }]}>
                <Text style={styles.unreadText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.lastMessage, { color: currentThemeColors.subtleText }]} numberOfLines={1}>
            {renderLastMessage()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 8,
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    marginVertical: 2,
  },
  hotSpotCard: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFCC80',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    backgroundColor: '#f0f4ff',
  },
  statusIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    position: 'absolute',
    top: -6,
    right: -6,
    borderWidth: 3,
    zIndex: 2,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  username: {
    fontSize: 17,
    fontWeight: '700',
    marginRight: 4,
  },
  hotSpotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#FFF3E0',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FFB74D',
  },
  hotSpotBadgeText: {
    fontSize: 10,
    color: '#FB8C00',
    fontWeight: '700',
  },
  genderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  age: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  unreadBadge: {
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default ChatItem;
