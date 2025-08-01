import React, { useEffect, useRef, useState, useContext } from 'react'; 
import { View, StyleSheet, Alert, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { TextInput, Appbar } from 'react-native-paper';
import { useAuth } from '@/context/authContext';
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, setDoc, Timestamp, updateDoc, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { Colors } from '@/constants/Colors';
import ChatRoomHeader from '@/components/chat/ChatRoomHeader';
import { getRoomId } from '@/utils/common';
import MessageList from '@/components/chat/MessageList';
import { ThemeContext } from '@/context/ThemeContext'; // Import ThemeContext

export default function ChatRoom() {
  const { id } = useLocalSearchParams();  
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
  const scrollViewRef = useRef<any>(null);

  const { theme } = useContext(ThemeContext); // Lấy theme từ context
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light; // Apply theme colors dynamically

  const createRoomIfNotExists = async () => {
    let roomId = getRoomId(user?.uid, id);
    await setDoc(doc(db, "rooms", roomId), {
      roomId,
      createdAt: Timestamp.fromDate(new Date()),
    });
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
      const roomId = getRoomId(user?.uid, id);
      const storage = getStorage();
      const storageRef = ref(storage, `chat-images/${roomId}/${Date.now()}`);
  
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
  
      // Gửi tin nhắn với URL ảnh
      const docRef = doc(db, "rooms", roomId);
      const messageRef = collection(docRef, "messages");
      await addDoc(messageRef, {
        uid: user?.uid,
        imageUrl: downloadURL,
        profileUrl: user?.profileUrl,
        senderName: user?.username,
        createdAt: Timestamp.fromDate(new Date()),
        status: 'sent', // sent, delivered, read
        readBy: [], // array of user IDs who have read this message
      });
    } catch (error: any) {
      Alert.alert('Image Upload', error.message);
    }
  };

  const fetchUserInfo = async () => {
    if (!id) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', id as string));
      if (userDoc.exists()) {
        setUserInfo(userDoc.data());
      } else {
        console.log('User not found');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Mark messages as delivered when user enters chat room
  const markMessagesAsDelivered = async (roomId: string) => {
    try {
      const messagesRef = collection(doc(db, "rooms", roomId), "messages");
      // Get all messages first, then filter in memory to avoid composite index
      const snapshot = await getDocs(messagesRef);
      
      const updatePromises = snapshot.docs
        .filter(messageDoc => {
          const data = messageDoc.data();
          return data.uid !== user?.uid && data.status === 'sent';
        })
        .map(async (messageDoc) => {
          await updateDoc(messageDoc.ref, {
            status: 'delivered'
          });
        });
      
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error marking messages as delivered:', error);
    }
  };

  // Mark messages as read when user views the chat
  const markMessagesAsRead = async () => {
    if (isMarkingAsRead) return; // Prevent multiple simultaneous calls
    setIsMarkingAsRead(true);
    
    try {
      const roomId = getRoomId(user?.uid, id);
      const messagesRef = collection(doc(db, "rooms", roomId), "messages");
      // Get only recent messages to reduce load
      const q = query(messagesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const updatePromises = snapshot.docs
        .filter(messageDoc => {
          const data = messageDoc.data();
          const readBy = data.readBy || [];
          return data.uid !== user?.uid && !readBy.includes(user?.uid);
        })
        .slice(0, 20) // Only process last 20 messages to avoid performance issues
        .map(async (messageDoc) => {
          const messageData = messageDoc.data();
          const readBy = messageData.readBy || [];
          
          await updateDoc(messageDoc.ref, {
            status: 'read',
            readBy: [...readBy, user?.uid]
          });
        });
      
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  useEffect(() => {
    createRoomIfNotExists();
    fetchUserInfo();

    const roomId = getRoomId(user?.uid, id);
    const docRef = doc(db, "rooms", roomId);
    const messagesRef = collection(docRef, "messages");
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsub = onSnapshot(q, async (snapshot) => {
      let allMessages = snapshot.docs.map((doc) => {
        return { id: doc.id, ...doc.data() };
      });
      setMessages([...allMessages]);
      
      // Mark messages as delivered when user enters the chat room
      await markMessagesAsDelivered(roomId);
    });

    const KeyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow', updateScrollView
    );

    // Mark messages as read when component mounts (user is viewing the chat)
    markMessagesAsRead();

    return () => {
      unsub();
      KeyboardDidShowListener.remove();
    };
  }, [id]);

  const handleSend = async () => {
    const message = newMessage.trim();
    if (!message) return;

    try {
      const roomId = getRoomId(user?.uid, id);
      const docRef = doc(db, "rooms", roomId);
      const messageRef = collection(docRef, "messages");

      if (newMessage) {
        setNewMessage(''); // Clear the input field after sending the message
      }

      await addDoc(messageRef, {
        uid: user?.uid,
        text: message,
        profileUrl: user?.profileUrl,
        senderName: user?.username,
        createdAt: Timestamp.fromDate(new Date()),
        status: 'sent', // sent, delivered, read
        readBy: [], // array of user IDs who have read this message
      });
    } catch (error: any) {
      Alert.alert('Message', error.message);
    }
  };

  useEffect(() => {
    updateScrollView();
    // Debounce marking messages as read
    const timeoutId = setTimeout(() => {
      markMessagesAsRead();
    }, 1000); // Wait 1 second after messages change before marking as read

    return () => clearTimeout(timeoutId);
  }, [messages]);

  const updateScrollView = () => {
    setTimeout(() => {
      scrollViewRef?.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <KeyboardAvoidingView  
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
        <ChatRoomHeader router={router} user={userInfo} userId={id}/>
        <View style={styles.messageListContainer}>
          <MessageList scrollViewRef={scrollViewRef} messages={messages} currentUser={user} />
        </View>
        <View style={styles.inputContainer}>
          
          <TextInput
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message"
            mode="outlined"
            style={[styles.input, { backgroundColor: currentThemeColors.inputBackground }]}
            theme={{ roundness: 50 }}
            placeholderTextColor={currentThemeColors.placeholderText}
            textColor={currentThemeColors.text}
            right={<TextInput.Icon icon="send" onPress={handleSend} />}
            left={<TextInput.Icon icon="image" onPress={handleImagePicker} />}
          />
        </View>
      </View>
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
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    marginRight: 10,
  },
});
