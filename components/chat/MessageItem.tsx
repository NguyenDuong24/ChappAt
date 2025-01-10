import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import React, { useState } from 'react';
import { Avatar } from 'react-native-paper';
import { formatTime } from '@/utils/common';
import { Image } from 'react-native';
import CustomImage from '../common/CustomImage';

export default function MessageItem({ message, currentUser }: any) {
  const isCurrentUser = message?.uid === currentUser?.uid;
  const [showTime, setShowTime] = useState(false); 

  const handlePress = () => {
    setShowTime(prev => !prev); 
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
            <CustomImage source={ message.imageUrl} style={[styles.image, { height: 150, width: 200}]}></CustomImage>
          ) : (
            <Text style={styles.messageText}>{message?.text}</Text>
          )}
        </View>
        {showTime && (
          <Text style={styles.timeText}>
            {formatTime(message?.createdAt)} {}
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
    color: '#888',
    marginTop: 0,
    textAlign: 'right',
  },
});
