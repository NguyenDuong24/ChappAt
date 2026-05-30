import React, { useEffect, useState, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useAuth } from '@/context/authContext';
import { Colors } from '@/constants/Colors';
import { ThemeContext } from '@/context/ThemeContext';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  Timestamp,
  updateDoc,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import { uploadLocalFileToStorage } from '@/utils/storageUpload';
import { giftService } from '@/services/giftService';
import GoTogetherConfirm from '@/components/hotspots/GoTogetherConfirm';
import ProximityTracker from '@/components/hotspots/ProximityTracker';
import { HotSpotInvite } from '@/types/hotSpotInvites';
import ReportModalSimple from '@/components/common/ReportModalSimple';
import { submitReport } from '@/services/supportService';
import ReplyPreview from '@/components/chat/ReplyPreview';
import * as Location from 'expo-location';
import { getDistance } from 'geolib';
import CustomImage from '@/components/common/CustomImage';
import MessageActionSheet from '@/components/chat/MessageActionSheet';
import MessageReactions from '@/components/chat/MessageReactions';
import EditMessageModal from '@/components/chat/EditMessageModal';
import { useMessageActions } from '@/hooks/useMessageActions';
import { useSound } from '@/hooks/useSound';
import { useTranslation } from 'react-i18next';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: any;
  type: 'text' | 'image' | 'gift' | 'system';
  imageUrl?: string;
  gift?: any;
  replyTo?: {
    messageId: string;
    senderName: string;
    text: string;
    type: string;
  };
  reactions?: Record<string, string[]>; // emoji -> [userIds]
}

const { width: screenWidth } = Dimensions.get('window');
const MESSAGE_IMAGE_WIDTH = Math.min(screenWidth * 0.58, 236);

const normalizeMojibakeText = (value: string = ''): string => {
  const text = String(value || '');
  const hasMojibake = /[\u00C3\u00C2\uFFFD]/.test(text);
  const isHotSpotMatchMsg = /match/i.test(text) && /hot\s*spot/i.test(text);

  if (hasMojibake && isHotSpotMatchMsg) {
    return 'Hai ban da match tai Hot Spot nay! Cung tro chuyen va len keo di cung nhe!';
  }

  return text;
};

const HotSpotChatScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { chatRoomId, hotSpotId, hotSpotTitle } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { user } = useAuth();
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const isDark = theme === 'dark';
  const currentThemeColors = Colors[theme] || Colors.light;
  const { playMessageReceivedSound, playMessageSentSound } = useSound();
  const previousMessageCountRef = useRef(0);
  const chatPalette = {
    background: isDark ? '#07110F' : '#F7F8FB',
    surface: isDark ? '#10201D' : '#FFFFFF',
    surfaceSoft: isDark ? '#172B27' : '#F1F5F9',
    border: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.08)',
    text: isDark ? '#F8FAFC' : '#111827',
    muted: isDark ? '#A7B7B3' : '#64748B',
    sent: '#0F766E',
    received: isDark ? '#152A26' : '#FFFFFF',
    accent: '#F97316',
  };

  const tt = (key: string, fallback: string) => {
    const value = t(key);
    return !value || value === key || value.startsWith('hotspots.') ? fallback : value;
  };

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [hotSpotData, setHotSpotData] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [giftCatalog, setGiftCatalog] = useState<any[]>([]);
  const [showGifts, setShowGifts] = useState(false);
  const [invite, setInvite] = useState<HotSpotInvite | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<any>(null);

  // Session and confirmation states
  const [sessionStatus, setSessionStatus] = useState<'pending' | 'on_the_way' | null>('pending');
  const [myConfirmation, setMyConfirmation] = useState(false);
  const [otherConfirmation, setOtherConfirmation] = useState(false);
  const [myLocation, setMyLocation] = useState<any>(null);
  const [otherLocation, setOtherLocation] = useState<any>(null);
  const [distance, setDistance] = useState<number | null>(null);

  // Reuse unified message actions like regular chat
  const {
    toggleReaction,
    pinMessage,
    deleteMessage,
    editMessage,
    copyToClipboard,
    showDeleteConfirm,
    isLoading: actionsLoading,
  } = useMessageActions();

  const [showEditModal, setShowEditModal] = useState(false);
  // Prefix the room id to mark context as HotSpot for the shared hook
  const roomIdForActions = `hotSpot:${chatRoomId || ''}` as string;

  useEffect(() => {
    loadHotSpotData();
    loadOtherUser();
    const unsubscribe = subscribeToMessages();
    loadGiftCatalog();
    loadInvite();
    return () => unsubscribe();
  }, [chatRoomId]);

  // Track session status and confirmations
  useEffect(() => {
    if (!chatRoomId) return;

    const chatRef = doc(db, 'hotSpotChats', chatRoomId as string);
    const unsubscribe = onSnapshot(chatRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSessionStatus(data.sessionStatus || 'pending');

        // Check confirmations
        const confirmations = data.confirmations || {};
        setMyConfirmation(confirmations[user?.uid || ''] === true);

        // Find other user confirmation
        const participants = data.participants || [];
        const otherUserId = participants.find((id: string) => id !== user?.uid);
        setOtherConfirmation(confirmations[otherUserId] === true);

        // If both confirmed, update status to on_the_way
        if (confirmations[user?.uid || ''] && confirmations[otherUserId] && data.sessionStatus !== 'on_the_way') {
          updateDoc(chatRef, { sessionStatus: 'on_the_way' });
        }
      }
    });

    return () => unsubscribe();
  }, [chatRoomId, user?.uid]);

  // Track location when on_the_way
  useEffect(() => {
    if (sessionStatus !== 'on_the_way' || !chatRoomId) return;

    let locationInterval: any;

    const startTracking = async () => {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('hotspots.chat.location_permission_title'), t('hotspots.chat.location_permission_message'));
        return;
      }

      // Update location every 10s
      locationInterval = setInterval(async () => {
        try {
          const location = await Location.getCurrentPositionAsync({});
          const coords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: Date.now(),
          };

          setMyLocation(coords);

          // Update to Firestore
          const chatRef = doc(db, 'hotSpotChats', chatRoomId as string);
          await updateDoc(chatRef, {
            [`locations.${user?.uid}`]: coords,
          });
        } catch (error) {
          console.error('Error upmatch location:', error);
        }
      }, 10000); // Update every 10 seconds
    };

    startTracking();

    return () => {
      if (locationInterval) clearInterval(locationInterval);
    };
  }, [sessionStatus, chatRoomId, user?.uid]);

  // Listen to other user's location
  useEffect(() => {
    if (sessionStatus !== 'on_the_way' || !chatRoomId) return;

    const chatRef = doc(db, 'hotSpotChats', chatRoomId as string);
    const unsubscribe = onSnapshot(chatRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const locations = data.locations || {};

        // Find other user's location
        const participants = data.participants || [];
        const otherUserId = participants.find((id: string) => id !== user?.uid);

        if (otherUserId && locations[otherUserId]) {
          setOtherLocation(locations[otherUserId]);
        }
      }
    });

    return () => unsubscribe();
  }, [sessionStatus, chatRoomId, user?.uid]);

  // Calculate distance between two users
  useEffect(() => {
    if (!myLocation || !otherLocation) return;

    const dist = getDistance(
      { latitude: myLocation.latitude, longitude: myLocation.longitude },
      { latitude: otherLocation.latitude, longitude: otherLocation.longitude }
    ) / 1000; // Convert to kilometers

    setDistance(dist);
  }, [myLocation, otherLocation]);

  const loadHotSpotData = async () => {
    if (!hotSpotId) return;
    try {
      let hotSpotSnap = await getDoc(doc(db, 'hotSpots', hotSpotId as string));
      if (!hotSpotSnap.exists()) {
        hotSpotSnap = await getDoc(doc(db, 'hotspots', hotSpotId as string));
      }
      if (hotSpotSnap.exists()) {
        setHotSpotData({ id: hotSpotSnap.id, ...hotSpotSnap.data() });
      }
    } catch (error) {
      console.error('Error loading hot spot data:', error);
    }
  };

  const loadOtherUser = async () => {
    if (!chatRoomId) return;
    try {
      const chatRef = doc(db, 'hotSpotChats', chatRoomId as string);
      const chatSnap = await getDoc(chatRef);
      if (chatSnap.exists()) {
        const chatData = chatSnap.data();
        const otherUserId = (chatData as any).participants?.find((id: string) => id !== user?.uid);
        if (otherUserId) {
          const userRef = doc(db, 'users', otherUserId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setOtherUser({ id: userSnap.id, ...userSnap.data() });
          }
        }
      }
    } catch (error) {
      console.error('Error loading other user:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!chatRoomId) return () => { };

    const messagesRef = collection(db, 'hotSpotChats', chatRoomId as string, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    return onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        const raw = doc.data() as any;
        msgs.push({
          id: doc.id,
          ...raw,
          text: normalizeMojibakeText(raw?.text || ''),
          senderName: normalizeMojibakeText(raw?.senderName || ''),
        } as Message);
      });

      // Play sound if new message received from another user
      if (msgs.length > previousMessageCountRef.current && previousMessageCountRef.current > 0) {
        const latestMessage = msgs[msgs.length - 1];
        if (latestMessage.senderId !== user?.uid) {
          playMessageReceivedSound();
        }
      }
      previousMessageCountRef.current = msgs.length;

      setMessages(msgs);
      setLoading(false);
    });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chatRoomId || !user) return;

    setSending(true);
    try {
      const messageData: any = {
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: user.displayName || user.username || t('groups.user'),
        timestamp: Timestamp.now(),
        type: 'text',
      };

      // Add reply information if replying
      if (replyingTo) {
        messageData.replyTo = {
          messageId: replyingTo.id,
          senderName: replyingTo.senderName,
          text: replyingTo.text,
          type: replyingTo.type,
        };
      }

      const messagesRef = collection(db, 'hotSpotChats', chatRoomId as string, 'messages');
      await addDoc(messagesRef, messageData);

      // Update last message in chat room
      const chatRef = doc(db, 'hotSpotChats', chatRoomId as string);
      await updateDoc(chatRef, {
        lastMessage: newMessage.trim(),
        lastMessageTime: Timestamp.now(),
      });

      playMessageSentSound();
      setNewMessage('');
      setReplyingTo(null); // Clear reply after sending
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert(t('common.error'), t('hotspots.chat.send_message_error'));
    } finally {
      setSending(false);
    }
  };

  const handleImagePicker = async () => {
    if (!chatRoomId || !user?.uid || uploadingImage) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert(
        t('common.error'),
        tt('hotspots.chat.photo_permission_error', 'Please allow photo library access to send images.')
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.82,
    });

    if (!result.canceled && result.assets?.[0]) {
      await uploadImage(result.assets[0]);
    }
  };

  const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!chatRoomId || !user?.uid) return;

    setUploadingImage(true);
    try {
      const rawFileName = asset.fileName || '';
      const rawExtension = rawFileName.split('.').pop()?.toLowerCase();
      const extension = rawExtension && ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(rawExtension)
        ? rawExtension
        : 'jpg';
      const safeChatRoomId = String(chatRoomId).replace(/[\/?#\[\]]/g, '_');
      const storagePath = `hotspot-chat-images/${user.uid}/${safeChatRoomId}/${Date.now()}.${extension}`;
      const downloadURL = await uploadLocalFileToStorage({
        uri: asset.uri,
        path: storagePath,
        contentType: asset.mimeType || 'image/jpeg',
        metadata: {
          customMetadata: {
            ownerId: user.uid,
            chatRoomId: String(chatRoomId),
            kind: 'hotspot-chat-image',
          },
        },
        maxRetries: 2,
      });

      const messageData: any = {
        text: '',
        imageUrl: downloadURL,
        senderId: user.uid,
        senderName: user.displayName || user.username || t('groups.user'),
        timestamp: Timestamp.now(),
        type: 'image',
      };

      if (replyingTo) {
        messageData.replyTo = {
          messageId: replyingTo.id,
          senderName: replyingTo.senderName,
          text: replyingTo.text,
          type: replyingTo.type,
        };
      }

      // Send message with image URL
      const messagesRef = collection(db, 'hotSpotChats', chatRoomId as string, 'messages');
      await addDoc(messagesRef, messageData);

      // Update last message in chat room
      const chatRef = doc(db, 'hotSpotChats', chatRoomId as string);
      await updateDoc(chatRef, {
        lastMessage: t('chat.image'),
        lastMessageTime: Timestamp.now(),
      });

      playMessageSentSound();
      setNewMessage('');
      setReplyingTo(null);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      Alert.alert(t('common.error'), tt('hotspots.chat.upload_image_error', 'Unable to upload image.'));
    } finally {
      setUploadingImage(false);
    }
  };

  const loadGiftCatalog = async () => {
    try {
      const items = await giftService.getGiftCatalog();
      setGiftCatalog(items || []);
    } catch (e: any) {
      // Silently handle gift catalog errors - it's not critical
      console.log('[HotSpotChat] Gift catalog unavailable:', e?.code || e?.message);
      // Set empty array to prevent errors
      setGiftCatalog([]);
    }
  };

  const loadInvite = async () => {
    if (!chatRoomId) return;
    try {
      const q = query(collection(db, 'hotSpotInvites'), where('chatRoomId', '==', chatRoomId));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const inviteDoc = snapshot.docs[0];
        setInvite({ id: inviteDoc.id, ...inviteDoc.data() } as HotSpotInvite);
      }
    } catch (error) {
      console.error('Error loading invite:', error);
    }
  };

  const handleSendGift = async (giftId: string) => {
    if (!user?.uid || !chatRoomId) return;
    try {
      const gift = giftCatalog.find(g => g.id === giftId);
      if (!gift) return;

      // Send gift message
      const messagesRef = collection(db, 'hotSpotChats', chatRoomId as string, 'messages');
      await addDoc(messagesRef, {
        text: `Sent gift: ${gift.icon} ${gift.name}`,
        senderId: user.uid,
        senderName: user.displayName || user.username || t('groups.user'),
        timestamp: Timestamp.now(),
        type: 'gift',
        gift: gift,
      });

      // Update last message in chat room
      const chatRef = doc(db, 'hotSpotChats', chatRoomId as string);
      await updateDoc(chatRef, {
        lastMessage: `Gift: ${gift.name}`,
        lastMessageTime: Timestamp.now(),
      });

      // Call gift service to handle coins and notifications
      await giftService.sendGift({
        senderUid: user.uid,
        senderName: user.username || user.displayName || t('common.you'),
        receiverUid: otherUser?.id,
        roomId: chatRoomId as string,
        giftId,
      });

      Alert.alert(t('common.success'), t('hotspots.chat.gift_sent'));
      setShowGifts(false);
    } catch (e: any) {
      const msg = String(e?.message || t('hotspots.chat.unknown_error'));
      if (msg.includes('INSUFFICIENT_FUNDS')) {
        Alert.alert(t('chat.gift_insufficient'), t('chat.gift_insufficient_desc'));
      } else if (msg.includes('CANNOT_GIFT_SELF')) {
        Alert.alert(t('hotspots.chat.cannot_send_gift_title'), t('hotspots.chat.cannot_gift_self'));
      } else {
        Alert.alert(t('hotspots.chat.cannot_send_gift_title'), e?.message || t('hotspots.chat.unknown_error'));
      }
    }
  };

  const handleMessageLongPress = (message: Message) => {
    setSelectedMessage(message);
    setShowMessageActions(true);
  };

  const handleCopyMessage = async () => {
    if (!selectedMessage || !selectedMessage.text) return;
    try {
      await copyToClipboard(selectedMessage.text);
    } catch (error) {
      Alert.alert(t('common.error'), t('hotspots.chat.copy_error'));
    }
    setShowMessageActions(false);
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessage || !chatRoomId || !user?.uid) return;
    const isCurrentUser = selectedMessage.senderId === user.uid;
    showDeleteConfirm(async () => {
      await deleteMessage(roomIdForActions, selectedMessage.id, isCurrentUser);
    }, isCurrentUser);
    setShowMessageActions(false);
  };

  const handleEditStart = () => {
    if (!selectedMessage?.text) return;
    setShowEditModal(true);
  };

  const handleEditSave = async (newText: string) => {
    if (!selectedMessage) return;
    await editMessage(roomIdForActions, selectedMessage.id, newText);
    setShowEditModal(false);
    setShowMessageActions(false);
  };

  const handlePinSelected = async () => {
    if (!selectedMessage) return;
    await pinMessage(roomIdForActions, selectedMessage.id, !!(selectedMessage as any)?.isPinned);
    setShowMessageActions(false);
  };

  const handleReactionBarPick = async (emoji: string) => {
    if (!selectedMessage || !user?.uid) return;
    await toggleReaction(roomIdForActions, selectedMessage.id, emoji, user.uid);
    setShowMessageActions(false);
  };

  const handleReactionPress = async (message: Message, emoji: string) => {
    if (!user?.uid) return;
    await toggleReaction(roomIdForActions, message.id, emoji, user.uid);
  };

  const renderReactions = (item: Message) => {
    if (!item.reactions || Object.keys(item.reactions).length === 0) return null;

    return (
      <View style={styles.reactionStrip}>
        <MessageReactions
          reactions={item.reactions || {}}
          onReactionPress={(emoji) => handleReactionPress(item, emoji)}
          currentUserId={user?.uid || ''}
        />
      </View>
    );
  };

  const formatMessageTime = (timestamp: any) => {
    const date = timestamp?.toDate?.();
    return date ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
  };

  const renderAvatar = (avatarUrl: string | undefined, style: any, iconSize = 18) => {
    if (avatarUrl) {
      return <Image source={{ uri: avatarUrl }} style={style} contentFit="cover" />;
    }

    return (
      <View style={[style, styles.avatarFallback, { backgroundColor: isDark ? '#1E3A34' : '#E0F2F1' }]}>
        <MaterialIcons name="person" size={iconSize} color={chatPalette.sent} />
      </View>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.senderId === user?.uid;
    const isSystemMessage = item.type === 'system';
    const messageTime = formatMessageTime(item.timestamp);
    const bubbleStyle = [
      styles.messageBubble,
      isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
      item.type === 'image' && styles.imageMessageBubble,
      item.type === 'gift' && styles.giftMessageBubble,
      !isMyMessage && item.type !== 'image' && {
        backgroundColor: chatPalette.received,
        borderColor: chatPalette.border,
      },
    ];
    const textColor = isMyMessage ? '#FFFFFF' : chatPalette.text;
    const metaColor = item.type === 'image'
      ? chatPalette.muted
      : isMyMessage ? 'rgba(255,255,255,0.74)' : chatPalette.muted;

    if (isSystemMessage) {
      return (
        <View style={[styles.systemMessage, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)' }]}>
          <Ionicons name="sparkles" size={13} color={chatPalette.accent} />
          <Text style={[styles.systemMessageText, { color: chatPalette.muted }]}>{item.text}</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.otherMessage]}
        onLongPress={() => handleMessageLongPress(item)}
        activeOpacity={0.9}
      >
        {!isMyMessage && renderAvatar(otherUser?.profileUrl, styles.avatar)}

        <View style={[styles.messageStack, isMyMessage ? styles.messageStackRight : styles.messageStackLeft]}>
          {!isMyMessage && <Text style={[styles.senderName, { color: chatPalette.muted }]}>{item.senderName}</Text>}

          <View style={bubbleStyle}>
            {item.replyTo && (
              <View
                style={[
                  styles.replyContainer,
                  {
                    backgroundColor: isMyMessage ? 'rgba(255,255,255,0.14)' : isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.05)',
                    borderLeftColor: isMyMessage ? 'rgba(255,255,255,0.75)' : chatPalette.sent,
                  },
                ]}
              >
                <View style={styles.replyContent}>
                  <Text style={[styles.replySender, { color: isMyMessage ? '#FFFFFF' : chatPalette.sent }]}>
                    {item.replyTo.senderName}
                  </Text>
                  <Text
                    style={[styles.replyText, { color: isMyMessage ? 'rgba(255,255,255,0.78)' : chatPalette.muted }]}
                    numberOfLines={1}
                  >
                    {item.replyTo.type === 'image' ? t('chat.image') : item.replyTo.text}
                  </Text>
                </View>
              </View>
            )}

            {item.type === 'image' ? (
              <View style={styles.imageContent}>
                <CustomImage
                  source={item.imageUrl}
                  style={styles.messageImage}
                  onLongPress={() => handleMessageLongPress(item)}
                />
                {item.text ? (
                  <Text style={[styles.messageText, styles.imageCaptionText, { color: textColor }]}>
                    {item.text}
                  </Text>
                ) : null}
              </View>
            ) : item.type === 'gift' ? (
              <View style={styles.giftContent}>
                <LinearGradient
                  colors={isMyMessage ? ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.10)'] : ['#FFF7ED', '#ECFDF5']}
                  style={styles.giftIconBox}
                >
                  <Text style={styles.giftIconText}>{item.gift?.icon || 'Gift'}</Text>
                </LinearGradient>
                <View style={styles.giftTextBlock}>
                  <Text style={[styles.giftLabel, { color: isMyMessage ? 'rgba(255,255,255,0.76)' : chatPalette.muted }]}>
                    {t('chat.gift')}
                  </Text>
                  <Text style={[styles.messageText, styles.giftMessageText, { color: textColor }]}>
                    {item.gift?.name || item.text}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={[styles.messageText, { color: textColor }]}>
                {item.text}
              </Text>
            )}

            <View style={styles.messageMetaRow}>
              <Text style={[styles.timestamp, { color: metaColor }]}>
                {messageTime}
              </Text>
              {isMyMessage && (
                <MaterialIcons name="done" size={13} color={metaColor} />
              )}
            </View>
          </View>

          {renderReactions(item)}
        </View>
      </TouchableOpacity>
    );
  };

  const renderHotSpotInfo = () => {
    if (!hotSpotData) return null;
    const hotSpotImage = hotSpotData.thumbnail || hotSpotData.imageUrl || hotSpotData.images?.[0];

    return (
      <TouchableOpacity
        style={[styles.hotSpotInfo, { backgroundColor: chatPalette.surface, borderColor: chatPalette.border }]}
        onPress={() => router.push({ pathname: '/(screens)/hotspots/HotSpotDetailScreen', params: { hotSpotId } })}
        activeOpacity={0.88}
      >
        <View style={styles.hotSpotContent}>
          <View style={styles.hotSpotThumbWrap}>
            {hotSpotImage ? (
              <Image source={{ uri: hotSpotImage }} style={styles.hotSpotThumb} contentFit="cover" />
            ) : (
              <LinearGradient colors={['#0F766E', '#F97316']} style={styles.hotSpotThumbFallback}>
                <Ionicons name="location" size={18} color="#FFFFFF" />
              </LinearGradient>
            )}
          </View>
          <View style={styles.hotSpotTextContainer}>
            <Text style={[styles.hotSpotLabel, { color: chatPalette.muted }]}>
              {tt('hotspots.chat.talking_about', 'Talking about')}
            </Text>
            <Text style={[styles.hotSpotTitle, { color: chatPalette.text }]} numberOfLines={1}>
              {hotSpotTitle || hotSpotData.title}
            </Text>
          </View>
          <View style={[styles.hotSpotChevron, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }]}>
            <Ionicons name="chevron-forward" size={18} color={chatPalette.muted} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Stubs/handlers referenced later
  const handleConfirmGoing = () => { };
  const handleCancelMeeting = () => { };
  const handleCancelReply = () => setReplyingTo(null);

  const handleOpenReport = (message: Message) => {
    const messageType = (message as any)?.imageUrl ? 'image' : 'text';
    setReportTarget({
      id: message.id,
      name: message.senderName,
      content: message.text || ((message as any).imageUrl ? 'Image' : ''),
      messageType,
      messageText: messageType === 'text' ? (message.text || '') : '',
      messageImageUrl: messageType === 'image' ? ((message as any).imageUrl || '') : '',
    });
    setReportVisible(true);
  };

  const handleSubmitReport = async (data: any) => {
    try {
      const sanitized = { ...data, images: Array.isArray(data?.images) ? data.images : [] };
      const reportedFields = {
        reportedMessageId: reportTarget?.id || null,
        reportedMessageType: reportTarget?.messageType || null,
        reportedMessageText: reportTarget?.messageType === 'text' ? (reportTarget?.messageText || '') : '',
        reportedMessageImageUrl: reportTarget?.messageType === 'image' ? (reportTarget?.messageImageUrl || '') : '',
      };
      // Prefer central service if available
      if (typeof submitReport === 'function') {
        await submitReport({ ...sanitized, ...reportedFields, context: 'hotspot_chat', chatRoomId });
        return;
      }
      const refCol = collection(db, 'reports');
      await addDoc(refCol, { ...sanitized, ...reportedFields, context: 'hotspot_chat', chatRoomId, createdAt: Timestamp.now() });
    } catch (e) {
      console.error('handleSubmitReport failed', e);
      throw e;
    }
  };

  const renderEmptyMessages = () => (
    <View style={styles.emptyMessages}>
      <View style={[styles.emptyIcon, { backgroundColor: isDark ? 'rgba(249,115,22,0.16)' : '#FFF7ED' }]}>
        <Ionicons name="chatbubble-ellipses" size={26} color={chatPalette.accent} />
      </View>
      <Text style={[styles.emptyTitle, { color: chatPalette.text }]}>
        {tt('chat.empty_messages', 'No messages yet. Send a greeting!')}
      </Text>
      <Text style={[styles.emptySubtitle, { color: chatPalette.muted }]}>
        {tt('hotspots.chat.empty_hint', 'Start planning your Hot Spot meetup here.')}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: chatPalette.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        { backgroundColor: chatPalette.background },
        Platform.OS === 'android' && { paddingBottom: keyboardHeight },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <LinearGradient
        colors={['#0F766E', '#F97316', '#EF4444']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity style={styles.headerIconButton} onPress={() => router.back()} activeOpacity={0.82}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {renderAvatar(otherUser?.profileUrl, styles.headerAvatar, 21)}
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {otherUser?.username || otherUser?.displayName || tt('hotspots.chat.other_user', 'Other user')}
            </Text>
            <View style={styles.hotSpotBadge}>
              <Ionicons name="flame" size={12} color="#F59E0B" />
              <Text style={styles.hotSpotBadgeText}>Hot Spot chat</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => router.push({ pathname: '/(screens)/hotspots/HotSpotDetailScreen', params: { hotSpotId } })}
          activeOpacity={0.82}
        >
          <MaterialIcons name="info-outline" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Go Together Confirmation */}
      {invite && invite.status === 'accepted' && (
        <GoTogetherConfirm
          inviteId={invite.id}
          userId={user?.uid || ''}
          chatRoomId={chatRoomId as string}
        />
      )}

      {/* Proximity Tracker for Meetup */}
      {invite && invite.status === 'confirmed_going' && (
        <ProximityTracker
          inviteId={invite.id}
          userId={user?.uid || ''}
          hotSpotLocation={invite.hotSpotLocation.coordinates}
          hotSpotTitle={invite.hotSpotTitle}
          onCheckInComplete={(reward) => {
            Alert.alert(t('hotspots.chat.checkin_success_title'), t('hotspots.chat.checkin_success_message'));
          }}
        />
      )}

      {/* Hot Spot Info Banner */}
      {renderHotSpotInfo()}

      {/* Confirmation Buttons - Show when session is pending */}
      {false && !invite && sessionStatus === 'pending' && (
        <View style={styles.confirmationSection}>
          <LinearGradient
            colors={['#F0F9FF', '#E0F2FE']}
            style={styles.confirmationCard}
          >
            <Text style={styles.confirmationTitle}>
              Confirm meetup at Hot Spot
            </Text>
            <Text style={styles.confirmationSubtitle}>
              {myConfirmation && !otherConfirmation && 'Waiting for the other user to confirm...'}
              {!myConfirmation && otherConfirmation && `${otherUser?.username} is ready!`}
              {!myConfirmation && !otherConfirmation && 'Both users need to confirm to start'}
              {myConfirmation && otherConfirmation && 'Both confirmed. Starting tracking...'}
            </Text>

            <View style={styles.confirmationButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, myConfirmation && styles.confirmButtonActive]}
                onPress={handleConfirmGoing}
                disabled={myConfirmation}
              >
                <MaterialIcons
                  name={myConfirmation ? "check-circle" : "check"}
                  size={20}
                  color="white"
                />
                <Text style={styles.confirmButtonText}>
                  {myConfirmation ? 'Confirmed' : 'Confirm'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelMeeting}
              >
                <MaterialIcons name="close" size={20} color="#DC2626" />
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>

            {/* Show confirmation status */}
            <View style={styles.confirmationStatus}>
              <View style={styles.statusItem}>
                <MaterialIcons
                  name={myConfirmation ? "check-circle" : "radio-button-unchecked"}
                  size={16}
                  color={myConfirmation ? "#10B981" : "#94A3B8"}
                />
                <Text style={styles.statusText}>You</Text>
              </View>
              <View style={styles.statusItem}>
                <MaterialIcons
                  name={otherConfirmation ? "check-circle" : "radio-button-unchecked"}
                  size={16}
                  color={otherConfirmation ? "#10B981" : "#94A3B8"}
                />
                <Text style={styles.statusText}>{otherUser?.username || t('hotspots.chat.other_user')}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Distance Tracker - Show when on_the_way */}
      {false && !invite && sessionStatus === 'on_the_way' && (
        <View style={styles.distanceSection}>
          <LinearGradient
            colors={['#FEF3C7', '#FDE68A']}
            style={styles.distanceCard}
          >
            <View style={styles.distanceHeader}>
              <Ionicons name="navigate" size={24} color="#F59E0B" />
              <Text style={styles.distanceTitle}>{t('hotspots.chat.tracking_location')}</Text>
            </View>

            {distance !== null ? (
              <View style={styles.distanceInfo}>
                <Text style={styles.distanceValue}>
                  {(distance ?? 0) < 1
                    ? `${((distance ?? 0) * 1000).toFixed(0)} m`
                    : `${(distance ?? 0).toFixed(1)} km`}
                </Text>
                <Text style={styles.distanceLabel}>
                  Distance between you and {otherUser?.username}
                </Text>
              </View>
            ) : (
              <View style={styles.distanceInfo}>
                <ActivityIndicator size="small" color="#F59E0B" />
                <Text style={styles.distanceLabel}>{t('hotspots.chat.calculating_distance')}</Text>
              </View>
            )}

            <Text style={styles.trackingNote}>
              Auto update every 10 seconds
            </Text>
          </LinearGradient>
        </View>
      )}

      {/* Messages */}
      <FlatList
        data={messages}
        keyExtractor={(item, index) => `${item.id}_${index}`}
        renderItem={renderMessage}
        contentContainerStyle={[styles.messagesList, messages.length === 0 && styles.messagesListEmpty]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={renderEmptyMessages}
        initialNumToRender={18}
        windowSize={8}
        removeClippedSubviews={Platform.OS === 'android'}
        inverted={false}
      />

      {/* Input */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: chatPalette.surface,
            borderTopColor: chatPalette.border,
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        {/* Reply Preview */}
        {replyingTo && (
          <ReplyPreview
            replyTo={{
              text: replyingTo.text,
              imageUrl: replyingTo.imageUrl,
              senderName: replyingTo.senderName,
              uid: replyingTo.senderId,
            }}
            onClearReply={handleCancelReply}
            currentThemeColors={currentThemeColors}
          />
        )}

        <View style={[styles.inputWrapper, { backgroundColor: chatPalette.surfaceSoft, borderColor: chatPalette.border }]}>
          <TouchableOpacity onPress={() => setShowGifts(true)} style={styles.iconButton} activeOpacity={0.78}>
            <MaterialIcons name="card-giftcard" size={22} color={chatPalette.accent} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleImagePicker}
            style={[styles.iconButton, uploadingImage && styles.iconButtonDisabled]}
            disabled={uploadingImage}
            activeOpacity={0.78}
          >
            {uploadingImage ? (
              <ActivityIndicator size="small" color={chatPalette.sent} />
            ) : (
              <MaterialIcons name="image" size={23} color={chatPalette.sent} />
            )}
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { color: chatPalette.text }]}
            placeholder={tt('hotspots.chat.message_placeholder', 'Message about this Hot Spot...')}
            placeholderTextColor={chatPalette.muted}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            activeOpacity={0.82}
          >
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <MaterialIcons name="send" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Gift Modal */}
      <Modal
        visible={showGifts}
        animationType="slide"
        transparent
        onRequestClose={() => setShowGifts(false)}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => setShowGifts(false)} style={styles.modalBackdrop} />

        <View style={[styles.modalSheet, { backgroundColor: chatPalette.surface, paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
          <View style={styles.modalHeaderRow}>
            <Text style={[styles.modalTitle, { color: chatPalette.text }]}>{t('chat.send_gift')}</Text>
            <TouchableOpacity onPress={() => setShowGifts(false)} style={styles.modalCloseButton} activeOpacity={0.78}>
              <MaterialIcons name="close" size={22} color={chatPalette.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.giftGrid}>
            {giftCatalog.length === 0 ? (
              <Text style={[styles.giftEmptyText, { color: chatPalette.muted }]}>
                {tt('gift_picker.empty', 'No gifts found')}
              </Text>
            ) : giftCatalog.map((gift: any) => (
              <TouchableOpacity
                key={gift.id}
                style={[styles.giftTile, { backgroundColor: chatPalette.surfaceSoft, borderColor: chatPalette.border }]}
                onPress={() => handleSendGift(gift.id)}
                activeOpacity={0.84}
              >
                <Text style={{ fontSize: 24 }}>{gift.icon}</Text>
                <Text style={[styles.giftTitle, { color: chatPalette.text }]} numberOfLines={1}>{gift.name}</Text>
                <Text style={[styles.giftPrice, { color: chatPalette.muted }]}>{gift.price} Bread</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Unified Message Action Sheet */}
      <MessageActionSheet
        visible={showMessageActions}
        onClose={() => setShowMessageActions(false)}
        onReply={() => { setReplyingTo(selectedMessage); setShowMessageActions(false); }}
        onEdit={() => { setShowEditModal(true); }}
        onDelete={() => { handleDeleteMessage(); }}
        onPin={() => { handlePinSelected(); }}
        onCopy={() => { handleCopyMessage(); }}
        onReaction={(e) => { handleReactionBarPick(e); }}
        isCurrentUser={selectedMessage?.senderId === user?.uid}
        isPinned={(selectedMessage as any)?.isPinned}
        message={selectedMessage}
        onReport={() => selectedMessage && handleOpenReport(selectedMessage)}
      />

      {/* Edit Message Modal */}
      <EditMessageModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleEditSave}
        originalText={selectedMessage?.text || ''}
        loading={actionsLoading}
      />

      {/* Report modal remains */}
      <ReportModalSimple
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        onSubmit={(data) => handleSubmitReport(data)}
        targetType="message"
        currentUser={{ uid: user?.uid || '' }}
        targetInfo={{
          id: reportTarget?.id || selectedMessage?.id || '',
          name: reportTarget?.name || selectedMessage?.senderName || '',
          content: reportTarget?.content || selectedMessage?.text || '',
        }}
      />

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    paddingHorizontal: 14,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    minWidth: 0,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.75)',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: 'white',
  },
  hotSpotBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginTop: 4,
    gap: 4,
  },
  hotSpotBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  infoButton: {
    padding: 8,
  },
  hotSpotInfo: {
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 6,
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  hotSpotContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hotSpotThumbWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 10,
  },
  hotSpotThumb: {
    width: '100%',
    height: '100%',
  },
  hotSpotThumbFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotSpotTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  hotSpotLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  hotSpotTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  hotSpotChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  messagesList: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
  },
  messagesListEmpty: {
    justifyContent: 'center',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 5,
  },
  myMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 2,
  },
  messageStack: {
    maxWidth: '80%',
  },
  messageStackRight: {
    alignItems: 'flex-end',
    marginLeft: 46,
  },
  messageStackLeft: {
    alignItems: 'flex-start',
  },
  reactionStrip: {
    marginTop: 3,
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  myMessageBubble: {
    backgroundColor: '#0F766E',
    borderColor: 'rgba(15,118,110,0.24)',
    alignSelf: 'flex-end',
    borderTopRightRadius: 8,
  },
  otherMessageBubble: {
    alignSelf: 'flex-start',
    borderTopLeftRadius: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 7,
  },
  imageMessageBubble: {
    padding: 0,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    overflow: 'visible',
  },
  giftMessageBubble: {
    minWidth: 190,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginLeft: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  imageCaptionText: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  giftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  giftIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftIconText: {
    fontSize: 22,
    fontWeight: '700',
  },
  giftTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  giftLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  giftMessageText: {
    fontWeight: '700',
  },
  messageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 5,
  },
  timestamp: {
    fontSize: 10,
    fontWeight: '600',
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderLeftWidth: 3,
  },
  replyContent: {
    flex: 1,
    minWidth: 0,
  },
  replySender: {
    fontSize: 12,
    fontWeight: '700',
  },
  replyText: {
    fontSize: 12,
    marginTop: 2,
  },
  imageContent: {
    width: MESSAGE_IMAGE_WIDTH,
  },
  messageImage: {
    width: MESSAGE_IMAGE_WIDTH,
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  inputContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 8,
    minHeight: 48,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDisabled: {
    opacity: 0.7,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Platform.OS === 'ios' ? 10 : 7,
    paddingHorizontal: 6,
    maxHeight: 110,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F766E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    maxHeight: '70%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  giftTile: {
    width: '30%',
    minHeight: 104,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  giftEmptyText: {
    width: '100%',
    textAlign: 'center',
    paddingVertical: 28,
  },
  // Confirmation section styles
  confirmationSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  confirmationCard: {
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  confirmationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0369A1',
    marginBottom: 4,
  },
  confirmationSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  confirmationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  confirmButtonActive: {
    backgroundColor: '#059669',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DC2626',
  },
  confirmationStatus: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  // Distance tracker styles
  distanceSection: {
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  distanceCard: {
    padding: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 247, 222, 0.95)',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  distanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
  },
  distanceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  distanceInfo: {
    alignItems: 'center',
    paddingVertical: 4,
    backgroundColor: 'rgba(253, 230, 138, 0.3)',
    borderRadius: 10,
  },
  distanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D97706',
    textShadowColor: '#FDE68A',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  distanceLabel: {
    fontSize: 12,
    color: '#78716C',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 2,
  },
  trackingNote: {
    fontSize: 11,
    color: '#92400E',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  systemMessage: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    marginVertical: 8,
  },
  systemMessageText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  giftTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginTop: 8,
  },
  giftPrice: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  emptyMessages: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
  },
});

export default HotSpotChatScreen;


