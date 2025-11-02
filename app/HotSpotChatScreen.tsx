import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/authContext';
import { Colors } from '@/constants/Colors';
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
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: any;
  type: 'text' | 'system';
}

const HotSpotChatScreen = () => {
  const router = useRouter();
  const { chatRoomId, hotSpotId, hotSpotTitle } = useLocalSearchParams();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hotSpotData, setHotSpotData] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);

  useEffect(() => {
    loadHotSpotData();
    loadOtherUser();
    const unsubscribe = subscribeToMessages();
    return () => unsubscribe();
  }, [chatRoomId]);

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
        const otherUserId = chatData.participants.find((id: string) => id !== user?.uid);
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
    if (!chatRoomId) return () => {};

    const messagesRef = collection(db, 'hotSpotChats', chatRoomId as string, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    return onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
      setLoading(false);
    });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chatRoomId || !user) return;

    setSending(true);
    try {
      const messagesRef = collection(db, 'hotSpotChats', chatRoomId as string, 'messages');
      await addDoc(messagesRef, {
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: user.displayName || user.username || 'User',
        timestamp: Timestamp.now(),
        type: 'text',
      });

      // Update last message in chat room
      const chatRef = doc(db, 'hotSpotChats', chatRoomId as string);
      await updateDoc(chatRef, {
        lastMessage: newMessage.trim(),
        lastMessageTime: Timestamp.now(),
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn');
    } finally {
      setSending(false);
    }
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

    return (
      <View style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.otherMessage]}>
        {!isMyMessage && (
          <Image
            source={{ uri: otherUser?.profileUrl || 'https://via.placeholder.com/40' }}
            style={styles.avatar}
          />
        )}
        <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble]}>
          {!isMyMessage && <Text style={styles.senderName}>{item.senderName}</Text>}
          <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
            {item.text}
          </Text>
          <Text style={[styles.timestamp, isMyMessage ? styles.myTimestamp : styles.otherTimestamp]}>
            {item.timestamp?.toDate?.().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const renderHotSpotInfo = () => {
    if (!hotSpotData) return null;

    return (
      <TouchableOpacity
        style={styles.hotSpotInfo}
        onPress={() => router.push({ pathname: '/HotSpotDetailScreen', params: { hotSpotId } })}
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
          <Image
            source={{ uri: otherUser?.profileUrl || 'https://via.placeholder.com/40' }}
            style={styles.headerAvatar}
          />
          <View>
            <Text style={styles.headerTitle}>{otherUser?.username || 'User'}</Text>
            <View style={styles.hotSpotBadge}>
              <Ionicons name="flame" size={12} color="#F59E0B" />
              <Text style={styles.hotSpotBadgeText}>Hot Spot</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => router.push({ pathname: '/HotSpotDetailScreen', params: { hotSpotId } })}
        >
          <MaterialIcons name="info-outline" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Hot Spot Info Banner */}
      {renderHotSpotInfo()}

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
        <View style={styles.inputWrapper}>
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
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <MaterialIcons name="send" size={24} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
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
    marginBottom: 12,
    alignItems: 'flex-end',
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
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  myMessageBubble: {
    backgroundColor: '#8B5CF6',
    borderBottomRightRadius: 4,
    marginLeft: 'auto',
  },
  otherMessageBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
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
    color: '#999',
  },
  systemMessage: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMessageText: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default HotSpotChatScreen;
