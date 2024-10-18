import { View, Text, StyleSheet } from 'react-native';
import React from 'react';
import { Avatar } from 'react-native-paper';

export default function MessageItem({ message, currentUser }: any) {
  const isCurrentUser = message?.userId === currentUser?.userId;

  return (
    <View
      style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
      ]}
    >
      {!isCurrentUser && (
        <Avatar.Image
          size={40}
          source={{ uri: message.profileUrl }}
          style={styles.avatar}
        />
      )}
      <View
        style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
        ]}
      >
        <Text style={styles.messageText}>{message?.text}</Text>
      </View>
      {isCurrentUser && (
        <Avatar.Image
          size={40}
          source={{ uri: currentUser?.profileUrl }}
          style={styles.avatar}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
});
 