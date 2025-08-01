import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import React, { useState, useContext } from 'react';
import { Avatar } from 'react-native-paper';
import { formatTime, formatDetailedTime } from '@/utils/common';
import { Image } from 'react-native';
import CustomImage from '../common/CustomImage';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';

export default function MessageItem({ message, currentUser }: any) {
  const isCurrentUser = message?.uid === currentUser?.uid;
  const [showTime, setShowTime] = useState(false);
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  const handlePress = () => {
    setShowTime(prev => !prev); 
  };

  const getStatusIcon = () => {
    if (!isCurrentUser) return null;
    
    switch (message?.status) {
      case 'sent':
        return <MaterialIcons name="done" size={14} color="#999" />;
      case 'delivered':
        return <MaterialIcons name="done-all" size={14} color="#999" />;
      case 'read':
        return <MaterialIcons name="done-all" size={14} color="#4CAF50" />;
      default:
        return <MaterialIcons name="schedule" size={14} color="#999" />;
    }
  };

  const formatMessageTime = () => {
    if (!message?.createdAt) return '';
    const time = formatTime(message.createdAt);
    return time;
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
          {message?.imageUrl ? (
            <CustomImage source={message.imageUrl} style={[styles.image, { height: 150, width: 200}]} />
          ) : (
            <Text style={[styles.messageText, { color: isCurrentUser ? '#000' : currentThemeColors.text }]}>
              {message?.text}
            </Text>
          )}
          
          {/* Time and status row */}
          <View style={styles.timeStatusContainer}>
            <Text style={[styles.timeText, { color: isCurrentUser ? '#666' : '#999' }]}>
              {formatMessageTime()}
            </Text>
            {getStatusIcon()}
          </View>
        </View>
        
        {showTime && (
          <View style={styles.detailedTimeContainer}>
            <Text style={[styles.detailedTimeText, { color: currentThemeColors.subtleText }]}>
              {message?.createdAt && formatDetailedTime(message.createdAt)}
            </Text>
            {isCurrentUser && message?.status && (
              <Text style={[styles.statusText, { color: currentThemeColors.subtleText }]}>
                {message.status === 'sent' && 'Đã gửi'}
                {message.status === 'delivered' && 'Đã nhận'}
                {message.status === 'read' && 'Đã xem'}
              </Text>
            )}
          </View>
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
  image: {
    
  },
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
    position: 'relative',
    minWidth: 80,
  },
  currentUserBubble: {
    backgroundColor: '#DCF8C6',
  },
  otherUserBubble: {
    backgroundColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  timeStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
  },
  timeText: {
    fontSize: 10,
    marginRight: 4,
  },
  detailedTimeContainer: {
    marginTop: 4,
    alignItems: 'flex-end',
  },
  detailedTimeText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  statusText: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
