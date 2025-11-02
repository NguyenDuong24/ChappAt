import React, { useState, useContext } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { TextInput } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { addDoc, collection, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useContentModeration } from '@/hooks/useContentModeration';

interface GroupMessageInputProps {
  groupId: string;
  currentUser: any;
  group: any;
}

const GroupMessageInput = ({ groupId, currentUser, group }: GroupMessageInputProps) => {
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { checkContent, isChecking } = useContentModeration({
    autoBlock: true,
    showWarning: true,
    onViolation: (result) => {
      console.log('Group message violation detected:', result);
    }
  });

  const sendMessage = async () => {
    if (!message.trim() || sending || !currentUser?.uid) {
      return;
    }

    try {
      setSending(true);

      // Check message content with moderation service
      const isContentAllowed = await checkContent(message.trim());
      if (!isContentAllowed) {
        setSending(false);
        return; // Content blocked, warning already shown
      }
      
      // Create message object
      const messageData = {
        text: message.trim(),
        senderId: currentUser.uid,
        senderName: currentUser.username || currentUser.displayName || 'Unknown User',
        senderAvatar: currentUser.profileUrl || currentUser.photoURL,
        createdAt: serverTimestamp(),
        type: 'text'
      };

      // Add message to group messages collection
      const groupDocRef = doc(db, 'groups', groupId);
      const messagesRef = collection(groupDocRef, 'messages');
      await addDoc(messagesRef, messageData);

      // Update group's last message and updatedAt
      await updateDoc(groupDocRef, {
        lastMessage: {
          text: message.trim(),
          senderId: currentUser.uid,
          senderName: messageData.senderName,
          createdAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });

      // Clear input
      setMessage('');
    } catch (error) {
      console.error('Error sending group message:', error);
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng thử lại.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.backgroundHeader }]}>
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachButton}>
          <MaterialCommunityIcons 
            name="attachment" 
            size={24} 
            color={currentThemeColors.subtleText} 
          />
        </TouchableOpacity>

        <TextInput
          style={[styles.textInput, { backgroundColor: currentThemeColors.surface }]}
          value={message}
          onChangeText={setMessage}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor={currentThemeColors.subtleText}
          multiline
          maxLength={1000}
          textColor={currentThemeColors.text}
          contentStyle={styles.textInputContent}
        />

        <TouchableOpacity 
          style={[
            styles.sendButton,
            { backgroundColor: message.trim() ? '#667eea' : '#e5e7eb' }
          ]}
          onPress={sendMessage}
          disabled={!message.trim() || sending}
        >
          <MaterialCommunityIcons 
            name={sending ? "loading" : "send"} 
            size={20} 
            color="white" 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 32, // Extra padding for bottom safe area
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  attachButton: {
    padding: 8,
    marginBottom: 4,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    borderRadius: 20,
  },
  textInputContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
});

export default GroupMessageInput;
