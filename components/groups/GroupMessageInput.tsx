import React, { useState, useContext } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
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

const GroupMessageInput = ({ groupId, currentUser }: GroupMessageInputProps) => {
  const { t } = useTranslation();
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const currentThemeColors = Colors[theme] || Colors.light;
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { checkContent } = useContentModeration({
    autoBlock: true,
    showWarning: true,
    onViolation: (result) => {
      console.log('Group message violation detected:', result);
    },
  });

  const sendMessage = async () => {
    if (!message.trim() || sending || !currentUser?.uid) return;

    try {
      setSending(true);

      const isContentAllowed = await checkContent(message.trim());
      if (!isContentAllowed) {
        setSending(false);
        return;
      }

      const messageData = {
        text: message.trim(),
        senderId: currentUser.uid,
        senderName: currentUser.username || currentUser.displayName || t('chat.unknown_user'),
        senderAvatar: currentUser.profileUrl || currentUser.photoURL,
        createdAt: serverTimestamp(),
        type: 'text',
      };

      const groupDocRef = doc(db, 'groups', groupId);
      const messagesRef = collection(groupDocRef, 'messages');
      await addDoc(messagesRef, messageData);

      await updateDoc(groupDocRef, {
        lastMessage: {
          text: message.trim(),
          senderId: currentUser.uid,
          senderName: messageData.senderName,
          createdAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      });

      setMessage('');
    } catch (error) {
      console.error('Error sending group message:', error);
      Alert.alert(t('common.error'), t('groups.send_error'));
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.backgroundHeader }]}> 
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachButton}>
          <MaterialCommunityIcons name="attachment" size={24} color={currentThemeColors.subtleText} />
        </TouchableOpacity>

        <TextInput
          style={[styles.textInput, { backgroundColor: currentThemeColors.surface }]}
          value={message}
          onChangeText={setMessage}
          placeholder={t('chat.type_message')}
          placeholderTextColor={currentThemeColors.subtleText}
          multiline
          maxLength={1000}
          textColor={currentThemeColors.text}
          contentStyle={styles.textInputContent}
        />

        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: message.trim() ? '#0EA5E9' : '#e5e7eb' }]}
          onPress={sendMessage}
          disabled={!message.trim() || sending}
        >
          <MaterialCommunityIcons name={sending ? 'loading' : 'send'} size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 32,
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

