import React, { useEffect, useRef, useState, useContext } from 'react'; 
import { View, StyleSheet, Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Text, Modal, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { TextInput, Appbar } from 'react-native-paper';
import { useAuth } from '@/context/authContext';
import { useChatPermission } from '@/hooks/useChatPermission';
import { BlockedChatView } from '@/components/common/BlockedChatView';
import { 
  addDoc, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  Timestamp, 
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  where,
  increment
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';

import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { Colors } from '@/constants/Colors';
import ChatRoomHeader from '@/components/chat/ChatRoomHeader';
import { getRoomId } from '@/utils/common';
import MessageList from '@/components/chat/MessageList';
import { ThemeContext } from '@/context/ThemeContext';
import ReplyPreview from '@/components/chat/ReplyPreview';
import { useMessageActions } from '@/hooks/useMessageActions';
import { useContentModeration } from '@/hooks/useContentModeration';
import { useOptimizedChatMessages } from '@/hooks/useOptimizedChatMessages';
import { useChat } from '@/context/OptimizedChatContext';
import messageBatchService from '@/services/messageBatchService';
import { MaterialIcons } from '@expo/vector-icons';
import { giftService } from '@/services/giftService';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
import { decode as atob } from 'base-64';
import ReportModalSimple from '@/components/common/ReportModalSimple';
import ExpoPushNotificationService from '@/services/expoPushNotificationService';
import { useSound } from '@/hooks/useSound';
import { ChatThemeProvider, useChatTheme } from '@/context/ChatThemeContext';
import ChatThemePicker from '@/components/chat/ChatThemePicker';

const storage = getStorage();
const PIC_INPUT_SHAPE = { width: 224, height: 224 };
const NSFW_CLASSES = { 0: 'Drawing', 1: 'Hentai', 2: 'Neutral', 3: 'Porn', 4: 'Sexy' };

// NSFW model assets (relative to this file)
const NSFW_MODEL_JSON = require('../../assets/model/model.json');
const NSFW_MODEL_WEIGHTS = [require('../../assets/model/group1-shard1of1.bin')];

function imageToTensor(rawImageData: any) {
  try {
    const TO_UINT8ARRAY = { useTArray: true } as any;
    const { width, height, data } = (jpeg as any).decode(rawImageData, TO_UINT8ARRAY);
    const buffer = new Uint8Array(width * height * 3);
    let offset = 0;
    for (let i = 0; i < buffer.length; i += 3) {
      buffer[i] = data[offset];
      buffer[i + 1] = data[offset + 1];
      buffer[i + 2] = data[offset + 2];
      offset += 4;
    }
    return (tf as any).tidy(() => (tf as any).tensor4d(buffer, [1, height, width, 3]).div(255));
  } catch (error) {
    console.error('Error in imageToTensor:', error);
    throw error;
  }
}

function ChatRoomInner() {
  const { id } = useLocalSearchParams();  
  const router = useRouter();
  const { user, coins, /* optional */ topupCoins } = useAuth();
  // Route param can be a peer user id OR a roomId (uidA-uidB). Normalize to peerId.
  const routeId: string = Array.isArray(id) ? id[0] : (id as string);
  const peerId: string = React.useMemo(() => {
    if (!routeId) return '';
    if (routeId.includes('-')) {
      const parts = routeId.split('-');
      // If current user known, pick the other id; else fallback to first part
      if (user?.uid) return parts.find(p => p !== user.uid) || parts[0];
      return parts[0];
    }
    return routeId;
  }, [routeId, user?.uid]);
  
  // Check if chat is allowed (block status)
  const { canChat, reason, loading: chatPermissionLoading } = useChatPermission(
    user?.uid,
    peerId
  );
  
  const [newMessage, setNewMessage] = useState('');
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<{
    text?: string;
    imageUrl?: string;
    senderName: string;
    uid: string;
    messageId: string;
  } | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [giftCatalog, setGiftCatalog] = useState<any[]>([]);
  const [showGifts, setShowGifts] = useState(false);
  const [nsfwModel, setNsfwModel] = useState<tf.LayersModel | null>(null);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<any>(null);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const scrollViewRef = useRef<any>(null);
  const messagePositionsRef = useRef<Record<string, number>>({});
  const latestMessagesRef = useRef<any[]>([]);
  const previousMessageCountRef = useRef(0);
  const { playMessageReceivedSound, playMessageSentSound } = useSound();

  // Use optimized chat messages hook
  const roomId = getRoomId(user?.uid as string, peerId);
  const { 
    messages, 
    loading: messagesLoading, 
    hasMore, 
    loadMoreMessages,
    refreshMessages 
  } = useOptimizedChatMessages({
    roomId,
    pageSize: 30,
    enableRealtime: true
  });

  const [displayMessages, setDisplayMessages] = useState<any[]>([]);

  // Keep local display list in sync initially
  useEffect(() => {
    setDisplayMessages(messages);
    latestMessagesRef.current = messages;
  }, [messages]);

  // Track newest timestamp for new messages listener
  const [newestTimestamp, setNewestTimestamp] = useState<any>(null);
  useEffect(() => {
    if (messages.length > 0) {
      setNewestTimestamp(messages[messages.length - 1].createdAt);
    } else {
      setNewestTimestamp(Timestamp.fromDate(new Date(0)));
    }
  }, [messages]);

  // Listener for new messages beyond the loaded window
  useEffect(() => {
    if (!roomId || !newestTimestamp) return;

    const roomDocRef = doc(db, 'rooms', roomId);
    const messagesRef = collection(roomDocRef, 'messages');

    const qNew = query(
      messagesRef,
      orderBy('createdAt', 'asc'),
      where('createdAt', '>', newestTimestamp)
    );

    const unsub = onSnapshot(qNew, (snap) => {
      const newMsgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (newMsgs.length > 0) {
        console.log('🔔 [Chat] New messages received:', newMsgs.length);
        
        // Check if any new message is from another user
        const hasMessageFromOther = newMsgs.some((msg: any) => msg.uid !== user?.uid);
        
        if (hasMessageFromOther) {
          console.log('🔊 [Chat] Playing sound for new message from other user');
          playMessageReceivedSound();
        } else {
          console.log('⏭️ [Chat] All messages are from current user, skipping sound');
        }
        
        setDisplayMessages(prev => {
          const combined = [...prev, ...newMsgs];
          combined.sort((a, b) => a.createdAt.seconds - b.createdAt.seconds);
          const unique = combined.filter((item, index, arr) => arr.findIndex(i => i.id === item.id) === index);
          return unique;
        });
        // Update latestMessagesRef and newestTimestamp outside setState
        setDisplayMessages(prev => {
          const combined = [...prev, ...newMsgs];
          combined.sort((a, b) => a.createdAt.seconds - b.createdAt.seconds);
          const unique = combined.filter((item, index, arr) => arr.findIndex(i => i.id === item.id) === index);
          latestMessagesRef.current = unique;
          const latest = unique[unique.length - 1].createdAt;
          setNewestTimestamp(latest);
          return unique;
        });
      }
    });

    return () => unsub();
  }, [roomId, newestTimestamp, playMessageReceivedSound, user?.uid]);

  // Realtime patch listener for the currently loaded window (oldest..newest)
  useEffect(() => {
    if (!roomId || !messages?.length) return;
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

      const unsub = onSnapshot(qRange, (snap) => {
        const changeMap = new Map<string, { removed?: boolean; data?: any }>();
        snap.docChanges().forEach((chg) => {
          if (chg.type === 'removed') {
            changeMap.set(chg.doc.id, { removed: true });
          } else {
            changeMap.set(chg.doc.id, { data: { id: chg.doc.id, ...chg.doc.data() } });
          }
        });
        if (changeMap.size === 0) return;

        const base = latestMessagesRef.current.length ? latestMessagesRef.current : messages;
        const seen = new Set<string>();
        const merged: any[] = [];

        // Merge updates/removals for existing items
        for (const m of base) {
          const entry = changeMap.get(m.id);
          seen.add(m.id);
          if (!entry) {
            merged.push(m);
          } else if (entry.removed) {
            // skip
          } else if (entry.data) {
            merged.push({ ...m, ...entry.data });
          }
        }

        // Append any newly added docs within range not present in base
        changeMap.forEach((entry, id) => {
          if (!entry.removed && entry.data && !seen.has(id)) {
            merged.push(entry.data);
          }
        });

        // Keep ascending order by createdAt
        merged.sort((a, b) => {
          const ta = a?.createdAt?.seconds || a?.createdAt?.toMillis?.() || 0;
          const tb = b?.createdAt?.seconds || b?.createdAt?.toMillis?.() || 0;
          return ta - tb;
        });

        const uniqueMerged = merged.filter((item, index, arr) => arr.findIndex(i => i.id === item.id) === index);
        setDisplayMessages(uniqueMerged);
        latestMessagesRef.current = uniqueMerged;
      });

      return () => {
        try { unsub(); } catch {}
      };
    } catch (e) {
      console.warn('range realtime listener failed', e);
    }
  }, [roomId, messages]);

  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light'; // Safely access theme with fallback
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const { addReply, isLoading } = useMessageActions();
  const { checkContent, isChecking } = useContentModeration({
    autoBlock: true,
    showWarning: true,
    onViolation: (result) => {
      console.log('Content violation detected:', result);
    }
  });
  const { loadTheme, currentTheme } = useChatTheme();

  const createRoomIfNotExists = async () => {
    const myUid = user?.uid as string;
    if (!myUid || !peerId) return;
    const rId = getRoomId(myUid, peerId);
    try {
      await setDoc(
        doc(db, 'rooms', rId),
        {
          roomId: rId,
          participants: [myUid, peerId],
          createdAt: Timestamp.fromDate(new Date()),
          updatedAt: Timestamp.fromDate(new Date()),
          lastMessage: null,
          unreadCounts: { [myUid]: 0, [peerId]: 0 },
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('createRoomIfNotExists failed', e);
    }
  };

  // Ensure room document exists as soon as we know roomId
  useEffect(() => {
    if (roomId) {
      createRoomIfNotExists();
    }
  }, [roomId]);

  const handleImagePicker = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
  
    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      await uploadImage(imageUri);
    }
  };

  const classifyImageNSFW = async (uri: string) => {
    if (!nsfwModel || !uri) {
      console.warn('NSFW model not loaded or invalid URI');
      return { isInappropriate: false, scores: {}, reason: 'Model not available' } as any;
    }

    console.group(`🔎 NSFW check for: ${uri}`);
    try {
      const resized = await manipulateAsync(
        uri,
        [{ resize: { width: PIC_INPUT_SHAPE.width, height: PIC_INPUT_SHAPE.height } }],
        { format: SaveFormat.JPEG, base64: true }
      );
      const base64: string = (resized as any).base64;
      const bytes = Uint8Array.from(atob(base64), (c: any) => (c as string).charCodeAt(0));
      const input = imageToTensor(bytes);
      const logits = (nsfwModel as tf.LayersModel).predict(input) as tf.Tensor;
      const values = await (logits as any).data();
      (logits as any).dispose?.();
      (input as any).dispose?.();

      const p = values[3] || 0; // Porn
      const h = values[1] || 0; // Hentai
      const s = values[4] || 0; // Sexy
      const n = values[2] || 0; // Neutral
      const d = values[0] || 0; // Drawing

      const isInappropriate = 
        p >= 0.5 ||  
        h >= 0.5 ||  
        s >= 0.7 ||  
        (p + h + s >= 0.8);  

      const reasonParts: string[] = [];
      if (p >= 0.45) reasonParts.push(`Porn: ${(p * 100).toFixed(1)}%`);
      if (h >= 0.45) reasonParts.push(`Hentai: ${(h * 100).toFixed(1)}%`);
      if (s >= 0.6) reasonParts.push(`Sexy: ${(s * 100).toFixed(1)}%`);
      const reason = reasonParts.join(', ') || 'An toàn';

      const scores = { p, h, s, n, d } as any;
      console.log('Scores:', scores);
      console.log('Is inappropriate:', isInappropriate);
      console.log('Reason:', reason);

      return { isInappropriate, scores, reason } as any;
    } catch (error) {
      console.error('NSFW classify error:', error);
      return { isInappropriate: true, scores: {}, reason: 'Lỗi xử lý ảnh - chặn để an toàn' } as any;
    } finally {
      console.groupEnd();
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      console.log('📤 [uploadImage] Start with URI:', uri);
      // Check image content with NSFW model
      const checkResult = await classifyImageNSFW(uri);
      if (checkResult.isInappropriate) {
        Alert.alert('Ảnh không phù hợp', `Ảnh bị chặn vì: ${checkResult.reason}`);
        console.log('⛔ [uploadImage] Image blocked by NSFW check');
        return; // Image blocked
      }
      console.log('✅ [uploadImage] Image passed NSFW check');

      const blob = await (await fetch(uri)).blob();
      const roomId = getRoomId(user?.uid as string, peerId);
      const storage = getStorage();
      const storageRef = ref(storage, `chat-images/${roomId}/${Date.now()}`);
  
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      console.log('✅ [uploadImage] Uploaded to storage, URL:', downloadURL);
  
      // Gửi tin nhắn với URL ảnh
      const docRef = doc(db, 'rooms', roomId);
      const messageRef = collection(docRef, 'messages');
      const nowTs = Timestamp.fromDate(new Date());
      await addDoc(messageRef, {
        uid: user?.uid,
        imageUrl: downloadURL,
        profileUrl: user?.profileUrl,
        senderName: user?.username,
        createdAt: nowTs,
        status: 'sent', // sent, delivered, read
        readBy: [], // array of user IDs who have read this message
      });
      console.log('📨 [uploadImage] Message document created');

      // Ensure room exists then update room metadata
      await createRoomIfNotExists();
      await setDoc(
        docRef,
        {
          updatedAt: nowTs,
          lastMessage: { imageUrl: downloadURL, createdAt: nowTs, uid: user?.uid, status: 'sent' },
          [`unreadCounts.${peerId}`]: increment(1),
        },
        { merge: true }
      );
      console.log('🧾 [uploadImage] Room metadata updated');

      // NEW: Gửi push notification qua Expo (FCM/APNs) cho người nhận khi có ảnh mới
      try {
        await ExpoPushNotificationService.sendPushToUser(peerId, {
          title: user?.username || user?.displayName || 'Tin nhắn mới',
          body: '📷 Đã gửi một hình ảnh',
          data: { type: 'message', chatId: roomId, senderId: user?.uid, receiverId: peerId },
        });
        console.log('📬 [uploadImage] Push sent to peer');
      } catch (e) {
        console.warn('⚠️ [uploadImage] Cannot send push:', e);
      }
    } catch (error: any) {
      console.error('❌ [uploadImage] Error:', error);
      Alert.alert('Image Upload', error.message);
    }
  };

  const fetchUserInfo = async () => {
    if (!peerId) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', peerId));
      if (userDoc.exists()) {
        setUserInfo(userDoc.data());
      } else {
        console.log('User not found');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Mark messages as delivered when user enters chat room - optimized
  const markMessagesAsDelivered = async (roomId: string) => {
    try {
      if (!user?.uid) return;
      const roomRef = doc(db, 'rooms', roomId);
      // Use setDoc merge to avoid "No document to update"
      await setDoc(
        roomRef,
        { [`unreadCounts.${user.uid}`]: 0 },
        { merge: true }
      );
    } catch (error) {
      console.error('Error marking messages as delivered:', error);
    }
  };

  // Mark messages as read - optimized: update unreadCounts and lastReadAt
  const markMessagesAsRead = async () => {
    if (isMarkingAsRead || !user?.uid) return;
    setIsMarkingAsRead(true);
    try {
      const roomRef = doc(db, 'rooms', roomId);
      await setDoc(
        roomRef,
        {
          [`unreadCounts.${user.uid}`]: 0,
          [`lastReadAt.${user.uid}`]: Timestamp.fromDate(new Date()),
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  // Listen to pinnedIds via room doc only
  useEffect(() => {
    const docRef = doc(db, 'rooms', roomId);
    const unsubRoom = onSnapshot(docRef, (roomSnap) => {
      const roomData = roomSnap.data() as any;
      const ids = Array.isArray(roomData?.pinnedMessages) ? roomData.pinnedMessages : [];
      setPinnedIds(ids);
    });

    const KeyboardDidShowListener = Keyboard.addListener('keyboardDidShow', updateScrollView);

    return () => {
      unsubRoom();
      KeyboardDidShowListener.remove();
    };
  }, [roomId]);

  // Mark messages as read when messages change
  useEffect(() => {
    if (messages.length > 0) {
      markMessagesAsRead();
      markMessagesAsDelivered(roomId);
    }
    updateScrollView();
  }, [messages, roomId]);

  const openReportForMessage = (message: any) => {
    try {
      const messageType = message?.imageUrl ? 'image' : 'text';
      setReportTarget({
        id: message?.id || message?.messageId,
        name: message?.senderName || 'Người dùng',
        content: message?.text || (message?.imageUrl ? 'Hình ảnh' : ''),
        messageType,
        messageText: messageType === 'text' ? (message?.text || '') : '',
        messageImageUrl: messageType === 'image' ? (message?.imageUrl || '') : '',
      });
      setReportVisible(true);
    } catch (e) {
      console.warn('openReportForMessage failed', e);
    }
  };

  const submitMessageReport = async (data: any) => {
    try {
      const sanitized = {
        ...data,
        images: Array.isArray(data?.images) ? data.images : [],
      };
      await addDoc(collection(db, 'reports'), {
        ...sanitized,
        context: 'private_chat',
        roomId,
        // Include original message snapshot
        reportedMessageId: reportTarget?.id || null,
        reportedMessageType: reportTarget?.messageType || null,
        reportedMessageText: reportTarget?.messageType === 'text' ? (reportTarget?.messageText || '') : '',
        reportedMessageImageUrl: reportTarget?.messageType === 'image' ? (reportTarget?.messageImageUrl || '') : '',
        createdAt: Timestamp.fromDate(new Date()),
      });
    } catch (e) {
      console.error('submitMessageReport error', e);
      throw e;
    }
  };

  const handleSend = async () => {
    const raw = newMessage;
    const message = raw.trim();
    if (!message) return;

    // Optimistic clear for smooth UX
    setNewMessage('');

    try {
      const isContentAllowed = await checkContent(message);
      if (!isContentAllowed) {
        // Restore input if blocked by moderation
        setNewMessage(raw);
        return;
      }

      const rId = getRoomId(user?.uid as string, peerId);
      const roomDocRef = doc(db, 'rooms', rId);
      const messageRef = collection(roomDocRef, 'messages');

      const nowTs = Timestamp.fromDate(new Date());
      const newDoc = await addDoc(messageRef, {
        uid: user?.uid,
        text: message,
        profileUrl: user?.profileUrl,
        senderName: user?.username,
        createdAt: nowTs,
        status: 'sent',
        readBy: [],
      });

      // Ensure room exists then update room metadata: lastMessage, updatedAt, increment peer unread
      const peerUid = peerId;
      await createRoomIfNotExists();
      await setDoc(
        roomDocRef,
        {
          lastMessage: { text: message, createdAt: nowTs, uid: user?.uid, status: 'sent' },
          updatedAt: nowTs,
          [`unreadCounts.${peerUid}`]: increment(1),
        },
        { merge: true }
      );

      // NEW: Gửi push notification qua Expo (FCM/APNs) cho người nhận khi có tin nhắn mới
      try {
        await ExpoPushNotificationService.sendPushToUser(peerUid, {
          title: user?.username || user?.displayName || 'Tin nhắn mới',
          body: message,
          data: { type: 'message', chatId: rId, senderId: user?.uid, receiverId: peerUid },
        });
        console.log('📬 [handleSend] Push sent to peer');
      } catch (e) {
        console.warn('⚠️ [handleSend] Cannot send push:', e);
      }

      playMessageSentSound();
      setReplyTo(null);
    } catch (error: any) {
      // Restore input so user can retry
      setNewMessage(raw);
      Alert.alert('Message', error.message);
    }
  };

  useEffect(() => {
    updateScrollView();
    const timeoutId = setTimeout(() => {
      markMessagesAsRead();
    }, 800);
    return () => clearTimeout(timeoutId);
  }, [messages]);

  const updateScrollView = () => {
    setTimeout(() => {
      scrollViewRef?.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleMessageLayout = (messageId: string, y: number) => {
    messagePositionsRef.current[messageId] = y;
  };

  const scrollToPinnedMessage = (messageId: string) => {
    const y = messagePositionsRef.current[messageId];
    if (typeof y === 'number') {
      // Offset a bit to avoid being hidden behind header
      scrollViewRef.current?.scrollTo({ y: Math.max(y - 60, 0), animated: true });
      // Highlight briefly
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 1500);
    }
  };

  const handleReplySelect = (message: any) => {
    try {
      setReplyTo({
        text: message?.text,
        imageUrl: message?.imageUrl,
        senderName: message?.senderName || 'Người dùng',
        uid: message?.uid,
        messageId: message?.id || message?.messageId,
      });
    } catch (e) {
      console.warn('Failed to set reply target', e);
    }
  };

  // Build otherUser object to help MessageItem compute roomId when needed
  const otherUser = userInfo ? { uid: peerId, id: peerId, ...userInfo } : undefined;

  // Derive pinned messages from pinnedIds and messages list
  const pinnedMessages = messages.filter((m) => pinnedIds.includes(m.id));

  // Disable send when no text or moderation running
  const sendDisabled = newMessage.trim().length === 0 || isChecking;

  useEffect(() => {
    (async () => {
      try {
        const items = await giftService.getGiftCatalog();
        setGiftCatalog(items);
      } catch (e) {
        console.warn('Failed to load gifts', e);
      }
    })();
  }, []);

  const handleSendGift = async (giftId: string) => {
    if (!user?.uid) return;
    try {
      await giftService.sendGift({
        senderUid: user.uid,
        senderName: user?.username || user?.displayName || 'Bạn',
        receiverUid: peerId,
        roomId,
        giftId,
      });
      refreshMessages?.();
      Alert.alert('Thành công', 'Đã gửi quà');
    } catch (e: any) {
      const msg = String(e?.message || 'UNKNOWN');
      if (msg.includes('INSUFFICIENT_FUNDS')) {
        Alert.alert(
          'Không đủ Bánh mì',
          'Bạn không đủ Bánh mì để gửi quà này.',
          [
            { text: 'Hủy', style: 'cancel' },
            {
              text: 'Nạp nhanh +50',
              onPress: async () => {
                try {
                  if (typeof topupCoins === 'function') {
                    await topupCoins(50, { reason: 'quick_topup_gift' });
                  }
                } catch {}
              },
            },
          ]
        );
      } else if (msg.includes('CANNOT_GIFT_SELF')) {
        Alert.alert('Không thể gửi quà', 'Bạn không thể tự tặng quà cho chính mình');
      } else {
        Alert.alert('Không thể gửi quà', e?.message || 'Lỗi không xác định');
      }
    }
  };

  // Realtime user info (avatar, presence)
  useEffect(() => {
    if (!peerId) return;
    const unsub = onSnapshot(doc(db, 'users', peerId), (snap) => {
      const data = snap.data() as any;
      if (!data) return;
      setUserInfo({
        id: snap.id,
        ...data,
        // normalize avatar url field names
        profileUrl: data?.profileUrl || data?.photoURL || data?.avatarUrl || '',
      });
    });
    return () => {
      try { unsub(); } catch {}
    };
  }, [peerId]);

  // Load NSFW model once
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        await (tf as any).ready();
        const model = await (tf as any).loadLayersModel(bundleResourceIO(NSFW_MODEL_JSON, NSFW_MODEL_WEIGHTS));
        if (isMounted) setNsfwModel(model as tf.LayersModel);
      } catch (e) {
        console.error('NSFW model load error:', e);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Load chat theme on mount
  useEffect(() => {
    if (roomId) {
      loadTheme(roomId);
    }
  }, [roomId, loadTheme]);

  // Show loading while checking permissions
  if (chatPermissionLoading) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: currentThemeColors.background, justifyContent: 'center', alignItems: 'center' }]}>
          <ChatRoomHeader router={router} user={userInfo} userId={peerId} chatTheme={currentTheme}/>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={{ color: currentThemeColors.text, marginTop: 12 }}>
              Đang kiểm tra...
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Don't show full BlockedChatView - just disable input
  // Users can still see old messages

  return (
    <KeyboardAvoidingView  
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: currentTheme?.backgroundColor || currentThemeColors.background }]}>
        <ChatRoomHeader router={router} user={userInfo} userId={peerId} onThemePress={() => setShowThemePicker(true)} chatTheme={currentTheme}/>

        {/* Gift picker modal */}
        <Modal
          visible={!!showGifts}
          animationType="slide"
          transparent
          onRequestClose={() => setShowGifts(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => setShowGifts(false)} style={styles.modalBackdrop} />
          <View style={[styles.modalSheet, { backgroundColor: currentThemeColors.surface }]}> 
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: currentThemeColors.text }]}>Chọn quà tặng</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 12, color: currentThemeColors.subtleText }}>Bánh mì:</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: currentThemeColors.text }}>🥖 {Number(coins || 0)}</Text>
              </View>
            </View>
            <ScrollView contentContainerStyle={styles.giftGrid} showsVerticalScrollIndicator={false}>
              {giftCatalog.map((g) => {
                const affordable = Number(coins || 0) >= Number(g.price || 0);
                return (
                  <TouchableOpacity
                    key={g.id}
                    onPress={async () => {
                      if (!affordable) {
                        Alert.alert(
                          'Không đủ Bánh mì',
                          `Cần 🥖 ${g.price}, bạn đang có 🥖 ${Number(coins || 0)}.`,
                          [
                            { text: 'Đóng', style: 'cancel' },
                            {
                              text: 'Nạp nhanh +50',
                              onPress: async () => {
                                try { if (typeof topupCoins === 'function') await topupCoins(50, { reason: 'quick_topup_gift_modal' }); } catch {}
                              }
                            }
                          ]
                        );
                        return;
                      }
                      await handleSendGift(g.id);
                      setShowGifts(false);
                    }}
                    style={[
                      styles.giftTile,
                      { borderColor: currentThemeColors.border, opacity: affordable ? 1 : 0.5 },
                    ]}
                    disabled={!affordable}
                  >
                    <Text style={{ fontSize: 22 }}>{g.icon || '🎁'}</Text>
                    <Text style={[styles.giftTitle, { color: currentThemeColors.text }]} numberOfLines={1}>{g.name}</Text>
                    <Text style={[styles.giftPrice, { color: currentThemeColors.subtleText }]}>🥖 {g.price}</Text>
                    {!affordable && (
                      <Text style={{ marginTop: 4, fontSize: 10, color: '#E53935' }}>Không đủ</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Modal>

        {/* Theme picker modal */}
        <ChatThemePicker 
          visible={showThemePicker} 
          onClose={() => setShowThemePicker(false)} 
          roomId={roomId} 
        />

        {/* Pinned messages section */}
        {pinnedMessages.length > 0 && (
          <View style={[styles.pinnedContainer, { backgroundColor: currentThemeColors.backgroundHeader, borderBottomColor: currentThemeColors.border }]}> 
            <View style={styles.pinnedHeaderRow}>
              <MaterialIcons name="push-pin" size={16} color="#FFA726" />
              <Text style={[styles.pinnedTitle, { color: currentThemeColors.text }]}>Tin nhắn đã ghim</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pinnedScroll}>
              {pinnedMessages.map((pm) => (
                <TouchableOpacity key={pm.id} onPress={() => scrollToPinnedMessage(pm.id)}
                  style={[styles.pinnedChip, { backgroundColor: currentThemeColors.surface, borderColor: currentThemeColors.border }]}> 
                  <Text style={[styles.pinnedText, { color: currentThemeColors.text }]} numberOfLines={1}>
                    {pm.imageUrl ? '📷 Hình ảnh' : pm.text || 'Tin nhắn' }
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        <View style={styles.messageListContainer}>
          <MessageList 
            scrollViewRef={scrollViewRef} 
            messages={displayMessages}
            currentUser={user} 
            otherUser={otherUser}
            onReply={handleReplySelect}
            onMessageLayout={handleMessageLayout}
            highlightedMessageId={highlightedMessageId || undefined}
            onReport={openReportForMessage}
            backgroundColor={currentTheme?.backgroundColor}
          />
        </View>
        {/* Reply preview above input - only show if can chat */}
        {canChat && (
          <ReplyPreview 
            replyTo={replyTo ? { text: replyTo.text, imageUrl: replyTo.imageUrl, senderName: replyTo.senderName, uid: replyTo.uid } : null}
            onClearReply={() => setReplyTo(null)}
            currentThemeColors={currentThemeColors}
          />
        )}

        {/* Show blocked banner or normal input bar */}
        {!canChat ? (
          <View style={[styles.blockedInputBar, { 
            backgroundColor: theme === 'dark' ? '#1E293B' : '#FEF2F2',
            borderTopColor: '#EF4444'
          }]}>
            <MaterialIcons name="block" size={20} color="#EF4444" />
            <Text style={[styles.blockedInputText, { color: theme === 'dark' ? '#FCA5A5' : '#991B1B' }]}>
              {reason.includes('đã chặn') 
                ? 'Bạn đã chặn người dùng này. Bỏ chặn để nhắn tin.'
                : 'Bạn không thể nhắn tin với người dùng này.'
              }
            </Text>
          </View>
        ) : (
          <View style={[styles.inputBar, { borderTopColor: currentTheme?.textColor || currentThemeColors.border }]}> 


            {/* Text input with inline image icon */}
            <View style={[styles.inputWrapper, { backgroundColor: currentTheme?.backgroundColor || currentThemeColors.inputBackground, borderColor: currentTheme?.textColor || currentThemeColors.border }]}> 
              <TouchableOpacity onPress={handleImagePicker} style={styles.inlineIcon}>
                <MaterialIcons name="image" size={22} color={currentTheme?.textColor || currentThemeColors.subtleText} />
              </TouchableOpacity>
              {/* Gift button */}
            <TouchableOpacity onPress={() => setShowGifts(true)} style={[styles.roundBtn]}> 
              <Text style={{ fontSize: 18 }}>🥖</Text>
            </TouchableOpacity>
              <TextInput
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message"
                mode="flat"
                style={[styles.textInput]}
                underlineColor="transparent"
                theme={{ colors: { primary: 'transparent', underlineColor: 'transparent' } }}
                placeholderTextColor={currentTheme?.textColor ? `${currentTheme.textColor}80` : currentThemeColors.placeholderText}
                textColor={currentTheme?.textColor || currentThemeColors.text}
                onSubmitEditing={handleSend}
                blurOnSubmit
                returnKeyType="send"
              />
            </View>

            {/* Send button */}
            <TouchableOpacity
              onPress={handleSend}
              disabled={sendDisabled}
              style={[styles.sendBtn, { backgroundColor: sendDisabled ? '#9CA3AF' : '#667eea' }]}
            >
              <MaterialIcons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ReportModalSimple
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        onSubmit={submitMessageReport}
        targetType="message"
        currentUser={{ uid: user?.uid || '' }}
        targetInfo={{
          id: reportTarget?.id || '',
          name: reportTarget?.name || '',
          content: reportTarget?.content || '',
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messageListContainer: {
    flex: 1,
    marginTop: 10,
  },
  pinnedContainer: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pinnedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 6,
    gap: 6,
  },
  pinnedTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  pinnedScroll: {
    paddingHorizontal: 10,
    paddingBottom: 6,
  },
  pinnedChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginHorizontal: 6,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 220,
  },
  pinnedText: {
    fontSize: 13,
  },
  // New bottom bar styles
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  roundBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  inlineIcon: {
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  textInput: {
    flex: 1,
    backgroundColor: 'transparent',
    marginLeft: 4,
    paddingBottom: 0,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)'
  },
  modalSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '60%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  giftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  giftTile: {
    width: '30%',
    minWidth: 100,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 6,
    marginBottom: 10,
  },
  giftTitle: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  giftPrice: {
    fontSize: 11,
    marginTop: 2,
  },
  blockedInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 2,
    gap: 10,
  },
  blockedInputText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
});

export default function ChatRoom() {
  return (
    <ChatThemeProvider>
      <ChatRoomInner />
    </ChatThemeProvider>
  );
}