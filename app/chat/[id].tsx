import React, { useEffect, useRef, useState, useContext } from 'react'; 
import { View, StyleSheet, Alert, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { TextInput, Appbar } from 'react-native-paper';
import { useAuth } from '@/context/authContext';
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

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
  const [userInfo, setUserInfo] = useState(null);
  const scrollViewRef = useRef(null);

  const { theme } = useContext(ThemeContext); // Lấy theme từ context
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light; // Apply theme colors dynamically

  const createRoomIfNotExists = async () => {
    let roomId = getRoomId(user?.uid, id);
    await setDoc(doc(db, "rooms", roomId), {
      roomId,
      createdAt: Timestamp.fromDate(new Date()),
    });
  };

  const fetchUserInfo = async () => {
    if (!id) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', id));
      if (userDoc.exists()) {
        setUserInfo(userDoc.data());
      } else {
        console.log('User not found');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    createRoomIfNotExists();
    fetchUserInfo();

    const roomId = getRoomId(user?.uid, id);
    const docRef = doc(db, "rooms", roomId);
    const messagesRef = collection(docRef, "messages");
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsub = onSnapshot(q, (snapshot) => {
      let allMessages = snapshot.docs.map((doc) => {
        return doc.data();
      });
      setMessages([...allMessages]);
    });

    const KeyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow', updateScrollView
    );

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
      });
    } catch (error: any) {
      Alert.alert('Message', error.message);
    }
  };

  useEffect(() => {
    updateScrollView();
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
        <ChatRoomHeader router={router} user={userInfo} />
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
            placeholderTextColor={currentThemeColors.placeholderText} // Set placeholder text color dynamically
            textColor={currentThemeColors.text} // Set text color dynamically
            right={<TextInput.Icon icon="send" onPress={handleSend} />}
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
