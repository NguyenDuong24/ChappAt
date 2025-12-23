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
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
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
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { giftService } from '@/services/giftService';
import GoTogetherConfirm from '@/components/hotspots/GoTogetherConfirm';
import ProximityTracker from '@/components/hotspots/ProximityTracker';
import { HotSpotInvite } from '@/types/hotSpotInvites';
import * as Clipboard from 'expo-clipboard';
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

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const HotSpotChatScreen = () => {
  const router = useRouter();
  const { chatRoomId, hotSpotId, hotSpotTitle } = useLocalSearchParams();
  const { user } = useAuth();
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const { playMessageReceivedSound, playMessageSentSound } = useSound();
  const previousMessageCountRef = useRef(0);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
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
        Alert.alert('Quyền truy cập vị trí', 'Cần cho phép truy cập vị trí để tracking');
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
          console.error('Error updating location:', error);
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
      const hotSpotRef = doc(db, 'hotSpots', hotSpotId as string);
      const hotSpotSnap = await getDoc(hotSpotRef);
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
        msgs.push({ id: doc.id, ...(doc.data() as any) } as Message);
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
        senderName: user.displayName || user.username || 'User',
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
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn');
    } finally {
      setSending(false);
    }
  };

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

  const uploadImage = async (uri: string) => {
    try {
      const blob = await (await fetch(uri)).blob();
      const storage = getStorage();
      const storageRef = ref(storage, `hotspot-chat-images/${chatRoomId}/${Date.now()}`);

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      // Send message with image URL
      const messagesRef = collection(db, 'hotSpotChats', chatRoomId as string, 'messages');
      await addDoc(messagesRef, {
        text: '',
        imageUrl: downloadURL,
        senderId: user?.uid,
        senderName: user?.displayName || user?.username || 'User',
        timestamp: Timestamp.now(),
        type: 'image',
      });

      // Update last message in chat room
      const chatRef = doc(db, 'hotSpotChats', chatRoomId as string);
      await updateDoc(chatRef, {
        lastMessage: `📷 Hình ảnh`,
        lastMessageTime: Timestamp.now(),
      });

      setNewMessage('');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      Alert.alert('Lỗi', 'Không thể tải lên ảnh');
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
        text: `Đã gửi quà: ${gift.icon} ${gift.name}`,
        senderId: user.uid,
        senderName: user.displayName || user.username || 'User',
        timestamp: Timestamp.now(),
        type: 'gift',
        gift: gift,
      });

      // Update last message in chat room
      const chatRef = doc(db, 'hotSpotChats', chatRoomId as string);
      await updateDoc(chatRef, {
        lastMessage: `🎁 ${gift.name}`,
        lastMessageTime: Timestamp.now(),
      });

      // Call gift service to handle coins and notifications
      await giftService.sendGift({
        senderUid: user.uid,
        senderName: user.username || user.displayName || 'Bạn',
        receiverUid: otherUser?.id,
        roomId: chatRoomId as string,
        giftId,
      });

      Alert.alert('Thành công', 'Đã gửi quà');
      setShowGifts(false);
    } catch (e: any) {
      const msg = String(e?.message || 'UNKNOWN');
      if (msg.includes('INSUFFICIENT_FUNDS')) {
        Alert.alert('Không đủ Bánh mì', 'Bạn không đủ Bánh mì để gửi quà này.');
      } else if (msg.includes('CANNOT_GIFT_SELF')) {
        Alert.alert('Không thể gửi quà', 'Bạn không thể tự tặng quà cho chính mình');
      } else {
        Alert.alert('Không thể gửi quà', e?.message || 'Lỗi không xác định');
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
      Alert.alert('Lỗi', 'Không thể sao chép tin nhắn');
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

  const renderReactions = (item: Message, isMyMessage: boolean) => {
    // Use shared MessageReactions for consistency
    return (
      <MessageReactions
        reactions={item.reactions || {}}
        onReactionPress={(emoji) => handleReactionPress(item, emoji)}
        currentUserId={user?.uid || ''}
      />
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.senderId === user?.uid;
    const isSystemMessage = item.type === 'system';

    if (isSystemMessage) {
      return (
        <View style={styles.systemMessage}>
          <Text style={styles.systemMessageText}>{item.text}</Text>
        </View>
      );
    }

    if (item.type === 'image') {
      return (
        <TouchableOpacity
          style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.otherMessage]}
          onLongPress={() => handleMessageLongPress(item)}
          activeOpacity={0.9}
        >
          {!isMyMessage && (
            <CustomImage
              source={otherUser?.profileUrl || 'https://via.placeholder.com/40'}
              style={styles.avatar}
              onLongPress={() => { }}
            />
          )}
          <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble]}>
            {!isMyMessage && <Text style={styles.senderName}>{item.senderName}</Text>}
            <CustomImage source={item.imageUrl} style={styles.messageImage} onLongPress={handleMessageLongPress} />
            {renderReactions(item, isMyMessage)}
            <Text style={[styles.timestamp, isMyMessage ? styles.myTimestamp : styles.otherTimestamp]}>
              {item.timestamp?.toDate?.().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    if (item.type === 'gift') {
      return (
        <TouchableOpacity
          style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.otherMessage]}
          onLongPress={() => handleMessageLongPress(item)}
          activeOpacity={0.9}
        >
          {!isMyMessage && (
            <CustomImage
              source={otherUser?.profileUrl || 'https://via.placeholder.com/40'}
              style={styles.avatar}
              onLongPress={() => { }}
            />
          )}
          <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble]}>
            {!isMyMessage && <Text style={styles.senderName}>{item.senderName}</Text>}
            <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
              {item.text}
            </Text>
            {renderReactions(item, isMyMessage)}
            <Text style={[styles.timestamp, isMyMessage ? styles.myTimestamp : styles.otherTimestamp]}>
              {item.timestamp?.toDate?.().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.otherMessage]}
        onLongPress={() => handleMessageLongPress(item)}
        activeOpacity={0.9}
      >
        {!isMyMessage && (
          <CustomImage
            source={otherUser?.profileUrl || 'https://via.placeholder.com/40'}
            style={styles.avatar}
            onLongPress={() => { }}
          />
        )}
        <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble]}>
          {!isMyMessage && <Text style={styles.senderName}>{item.senderName}</Text>}
          {/* Reply Context */}
          {item.replyTo && (
            <View style={styles.replyContainer}>
              <View style={styles.replyLine} />
              <View style={styles.replyContent}>
                <Text style={styles.replySender}>{item.replyTo.senderName}</Text>
                <Text style={styles.replyText} numberOfLines={1}>
                  {item.replyTo.type === 'image' ? '📷 Hình ảnh' : item.replyTo.text}
                </Text>
              </View>
            </View>
          )}
          <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
            {item.text}
          </Text>
          {renderReactions(item, isMyMessage)}
          <Text style={[styles.timestamp, isMyMessage ? styles.myTimestamp : styles.otherTimestamp]}>
            {item.timestamp?.toDate?.().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHotSpotInfo = () => {
    if (!hotSpotData) return null;

    return (
      <TouchableOpacity
        style={styles.hotSpotInfo}
        onPress={() => router.push({ pathname: '/(screens)/hotspots/HotSpotDetailScreen', params: { hotSpotId } })}
      >
        <LinearGradient
          colors={['#8B5CF6', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hotSpotGradient}
        >
          <View style={styles.hotSpotContent}>
            <Ionicons name="location" size={20} color="white" />
            <View style={styles.hotSpotTextContainer}>
              <Text style={styles.hotSpotLabel}>Đang trò chuyện về</Text>
              <Text style={styles.hotSpotTitle} numberOfLines={1}>
                {hotSpotTitle || hotSpotData.title}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="white" />
          </View>
        </LinearGradient>
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
      content: message.text || ((message as any).imageUrl ? 'Hình ảnh' : ''),
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

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <LinearGradient
        colors={['#8B5CF6', '#EC4899', '#F59E0B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <CustomImage
            source={otherUser?.profileUrl || 'https://via.placeholder.com/40'}
            style={styles.headerAvatar}
            onLongPress={() => { }}
          />
          <View>
            <Text style={styles.headerTitle}>{otherUser?.username || 'User'}</Text>
            <View style={styles.hotSpotBadge}>
              <Ionicons name="flame" size={12} color="#F59E0B" />

            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => router.push({ pathname: '/(screens)/hotspots/HotSpotDetailScreen', params: { hotSpotId } })}
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
            Alert.alert('🎉 Check-in thành công!', `Bạn nhận được ${reward.points} điểm thưởng!`);
          }}
        />
      )}

      {/* Hot Spot Info Banner */}
      {renderHotSpotInfo()}

      {/* Confirmation Buttons - Show when session is pending */}
      {sessionStatus === 'pending' && (
        <View style={styles.confirmationSection}>
          <LinearGradient
            colors={['#F0F9FF', '#E0F2FE']}
            style={styles.confirmationCard}
          >
            <Text style={styles.confirmationTitle}>
              Xác nhận buổi hẹn tại Hot Spot
            </Text>
            <Text style={styles.confirmationSubtitle}>
              {myConfirmation && !otherConfirmation && 'Đang chờ người kia xác nhận...'}
              {!myConfirmation && otherConfirmation && `${otherUser?.username} đã sẵn sàng!`}
              {!myConfirmation && !otherConfirmation && 'Cả hai cùng xác nhận để bắt đầu'}
              {myConfirmation && otherConfirmation && 'Cả hai đã xác nhận! Bắt đầu tracking...'}
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
                  {myConfirmation ? 'Đã xác nhận' : 'Xác nhận đi'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelMeeting}
              >
                <MaterialIcons name="close" size={20} color="#DC2626" />
                <Text style={styles.cancelButtonText}>Từ chối</Text>
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
                <Text style={styles.statusText}>Bạn</Text>
              </View>
              <View style={styles.statusItem}>
                <MaterialIcons
                  name={otherConfirmation ? "check-circle" : "radio-button-unchecked"}
                  size={16}
                  color={otherConfirmation ? "#10B981" : "#94A3B8"}
                />
                <Text style={styles.statusText}>{otherUser?.username || 'Người kia'}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Distance Tracker - Show when on_the_way */}
      {sessionStatus === 'on_the_way' && (
        <View style={styles.distanceSection}>
          <LinearGradient
            colors={['#FEF3C7', '#FDE68A']}
            style={styles.distanceCard}
          >
            <View style={styles.distanceHeader}>
              <Ionicons name="navigate" size={24} color="#F59E0B" />
              <Text style={styles.distanceTitle}>Đang tracking vị trí</Text>
            </View>

            {distance !== null ? (
              <View style={styles.distanceInfo}>
                <Text style={styles.distanceValue}>
                  {distance < 1
                    ? `${(distance * 1000).toFixed(0)} m`
                    : `${distance.toFixed(1)} km`}
                </Text>
                <Text style={styles.distanceLabel}>
                  Khoảng cách giữa bạn và {otherUser?.username}
                </Text>
              </View>
            ) : (
              <View style={styles.distanceInfo}>
                <ActivityIndicator size="small" color="#F59E0B" />
                <Text style={styles.distanceLabel}>Đang tính toán khoảng cách...</Text>
              </View>
            )}

            <Text style={styles.trackingNote}>
              📍 Cập nhật tự động mỗi 10 giây
            </Text>
          </LinearGradient>
        </View>
      )}

      {/* Messages */}
      <FlatList
        data={messages}
        keyExtractor={(item, index) => `${item.id}_${index}`}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        inverted={false}
      />

      {/* Input */}
      <View style={styles.inputContainer}>
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

        <View style={styles.inputWrapper}>
          <TouchableOpacity onPress={() => setShowGifts(true)} style={styles.iconButton}>
            <Text style={{ fontSize: 18 }}>🥖</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleImagePicker} style={styles.iconButton}>
            <MaterialIcons name="image" size={24} color="#666" />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Nhắn tin về Hot Spot này..."
            placeholderTextColor="#999"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sending}
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

        <View style={styles.modalSheet}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Gửi quà</Text>
            <TouchableOpacity onPress={() => setShowGifts(false)}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.giftGrid}>
            {giftCatalog.map((gift: any) => (
              <TouchableOpacity
                key={gift.id}
                style={styles.giftTile}
                onPress={() => handleSendGift(gift.id)}
              >
                <Text style={{ fontSize: 24 }}>{gift.icon}</Text>
                <Text style={styles.giftTitle}>{gift.name}</Text>
                <Text style={styles.giftPrice}>{gift.price} Bánh mì</Text>
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
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'white',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  hotSpotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
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
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  hotSpotGradient: {
    padding: 16,
  },
  hotSpotContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hotSpotTextContainer: {
    flex: 1,
  },
  hotSpotLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  hotSpotTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    marginTop: 2,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 12,
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
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 18,
  },
  myMessageBubble: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  otherMessageBubble: {
    backgroundColor: '#E5E5EA',
    alignSelf: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
    marginLeft: 40,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: 'white',
  },
  otherMessageText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
  },
  myTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  otherTimestamp: {
    color: '#8E8E93',
    textAlign: 'left',
  },
  giftImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  otherUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  // Reply styles
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  replyLine: {
    width: 2,
    height: '100%',
    backgroundColor: '#007AFF',
    marginRight: 8,
  },
  replyContent: {
    flex: 1,
  },
  replySender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  replyText: {
    fontSize: 14,
    color: '#666',
  },
  // Input styles
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFF',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  iconButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
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
    fontWeight: '600',
  },
  giftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  giftTile: {
    width: '30%',
    aspectRatio: 1,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
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
    elevation: 3,
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
    elevation: 4,
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
  messageImage: {
    width: 250,
    height: 250,
    borderRadius: 20,
  },
  systemMessage: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginVertical: 8,
  },
  systemMessageText: {
    fontSize: 12,
    color: '#64748B',
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
});

export default HotSpotChatScreen;
