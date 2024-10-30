import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import React, { useState } from 'react';
import { Avatar } from 'react-native-paper';
import { formatTime } from '@/utils/common';

export default function MessageItem({ message, currentUser }: any) {
  const isCurrentUser = message?.uid === currentUser?.uid;
  const [showTime, setShowTime] = useState(false); // State để quản lý việc hiển thị thời gian

  // Hàm để xử lý nhấn vào tin nhắn
  const handlePress = () => {
    setShowTime(prev => !prev); // Chuyển đổi trạng thái hiển thị thời gian
  };

  return (
    <TouchableOpacity onPress={handlePress} style={[styles.messageContainer, isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage]}>
      {!isCurrentUser && (
        <Avatar.Image
          size={40}
          source={{ uri: message.profileUrl }}
          style={styles.avatar}
        />
      )}
      <View>
        <View
          style={[
            styles.messageBubble,
            isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          ]}
        >
          <Text style={styles.messageText}>{message?.text}</Text>
        </View>
        {showTime && ( // Hiển thị thời gian nếu showTime là true
          <Text style={styles.timeText}>
            {formatTime(message?.createdAt)} {/* Hiển thị thời gian */}
          </Text>
        )}
      </View>
      {isCurrentUser && (
        <Avatar.Image
          size={40}
          source={{ uri: currentUser?.profileUrl }}
          style={styles.avatar}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 8,
    paddingHorizontal: 10,
    maxWidth: '80%',
    alignSelf: 'flex-start',
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
  },
  avatar: {
    marginRight: 10,
    marginLeft: 10,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 15,
    position: 'relative', // Để có thể đặt thời gian bên dưới
  },
  currentUserBubble: {
    backgroundColor: '#DCF8C6',
  },
  otherUserBubble: {
    backgroundColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 16,
  },
  timeText: {
    fontSize: 12,
    color: '#888', // Màu sắc cho thời gian
    marginTop: 0, // Khoảng cách giữa tin nhắn và thời gian
    textAlign: 'right', // Căn chỉnh bên phải
  },
});
