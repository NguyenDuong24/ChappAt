import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSound } from '../../hooks/useSound';
import ChatSoundManager from './ChatSoundManager';
import NotificationSoundManager from '../common/NotificationSoundManager';

export const ChatExample = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [notification, setNotification] = useState(null);
  const [lastSentMessage, setLastSentMessage] = useState(null);
  const [lastReceivedMessage, setLastReceivedMessage] = useState(null);

  const {
    playSuccessSound,
    playErrorSound,
    playOutgoingCallSound,
    stopCallSounds
  } = useSound();

  const sendMessage = () => {
    if (message.trim()) {
      const newMessage = {
        id: Date.now(),
        text: message,
        sender: 'me',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, newMessage]);
      setLastSentMessage(Date.now()); // Trigger sound
      setMessage('');
      
      // Simulate receiving a reply after 2 seconds
      setTimeout(() => {
        const reply = {
          id: Date.now() + 1,
          text: 'Đây là tin nhắn phản hồi tự động',
          sender: 'other',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, reply]);
        setLastReceivedMessage(Date.now()); // Trigger sound
      }, 2000);
    }
  };

  const handleTyping = (text) => {
    setMessage(text);
    setIsTyping(Date.now()); // Trigger typing sound
  };

  const testSuccessSound = () => {
    playSuccessSound();
    setNotification({ message: 'Thành công!', type: 'success' });
    setTimeout(() => setNotification(null), 2000);
  };

  const testErrorSound = () => {
    playErrorSound();
    setNotification({ message: 'Có lỗi xảy ra!', type: 'error' });
    setTimeout(() => setNotification(null), 2000);
  };

  const testNotificationSound = () => {
    setNotification({ message: 'Thông báo mới!', type: 'default' });
    setTimeout(() => setNotification(null), 2000);
  };

  const testCallSound = () => {
    Alert.alert(
      'Test cuộc gọi',
      'Chọn âm thanh cuộc gọi để test',
      [
        {
          text: 'Cuộc gọi đi',
          onPress: () => {
            playOutgoingCallSound();
            setTimeout(() => stopCallSounds(), 5000); // Auto stop after 5s
          }
        },
        {
          text: 'Dừng âm thanh',
          onPress: () => stopCallSounds()
        },
        { text: 'Hủy', style: 'cancel' }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Sound Managers */}
      <ChatSoundManager
        onMessageSent={lastSentMessage}
        onMessageReceived={lastReceivedMessage}
        onTyping={isTyping}
      />
      <NotificationSoundManager
        notification={notification}
        type={notification?.type}
      />

      <Text style={styles.title}>Demo Âm thanh Chat</Text>

      {/* Test Buttons */}
      <View style={styles.testButtons}>
        <TouchableOpacity style={styles.button} onPress={testSuccessSound}>
          <Text style={styles.buttonText}>Test Success</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={testErrorSound}>
          <Text style={styles.buttonText}>Test Error</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={testNotificationSound}>
          <Text style={styles.buttonText}>Test Notification</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={testCallSound}>
          <Text style={styles.buttonText}>Test Call</Text>
        </TouchableOpacity>
      </View>

      {/* Messages Display */}
      <View style={styles.messagesContainer}>
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBox,
              msg.sender === 'me' ? styles.myMessage : styles.otherMessage
            ]}
          >
            <Text style={styles.messageText}>{msg.text}</Text>
          </View>
        ))}
      </View>

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={message}
          onChangeText={handleTyping}
          placeholder="Nhập tin nhắn..."
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Gửi</Text>
        </TouchableOpacity>
      </View>

      {/* Notification Display */}
      {notification && (
        <View style={[
          styles.notification,
          notification.type === 'error' && styles.errorNotification,
          notification.type === 'success' && styles.successNotification
        ]}>
          <Text style={styles.notificationText}>{notification.message}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  testButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
    marginBottom: 20,
  },
  messageBox: {
    padding: 10,
    marginVertical: 5,
    borderRadius: 10,
    maxWidth: '80%',
  },
  myMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  otherMessage: {
    backgroundColor: '#e0e0e0',
    alignSelf: 'flex-start',
  },
  messageText: {
    color: 'white',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    backgroundColor: 'white',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  notification: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#333',
    zIndex: 1000,
  },
  errorNotification: {
    backgroundColor: '#ff4444',
  },
  successNotification: {
    backgroundColor: '#44ff44',
  },
  notificationText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default ChatExample;
