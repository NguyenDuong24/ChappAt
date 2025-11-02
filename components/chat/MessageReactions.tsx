import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface MessageReactionsProps {
  reactions: { [emoji: string]: string[] }; // emoji -> array of user IDs
  onReactionPress: (emoji: string) => void;
  currentUserId: string;
}

const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  onReactionPress,
  currentUserId,
}) => {
  console.log('🎭 MessageReactions render:', { reactions, currentUserId });
  
  if (!reactions || Object.keys(reactions).length === 0) {
    console.log('🎭 No reactions to display');
    return null;
  }

  return (
    <View style={styles.container}>
      {Object.entries(reactions).map(([emoji, userIds]) => {
        const count = userIds.length;
        const hasCurrentUser = userIds.includes(currentUserId);
        
        return (
          <TouchableOpacity
            key={emoji}
            style={[
              styles.reactionBubble,
              hasCurrentUser && styles.reactionBubbleActive
            ]}
            onPress={() => onReactionPress(emoji)}
          >
            <Text style={styles.emoji}>{emoji}</Text>
            {count > 1 && (
              <Text style={[
                styles.count,
                hasCurrentUser && styles.countActive
              ]}>
                {count}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginHorizontal: 2,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reactionBubbleActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  emoji: {
    fontSize: 14,
  },
  count: {
    fontSize: 12,
    marginLeft: 4,
    color: '#666',
    fontWeight: '500',
  },
  countActive: {
    color: '#2196F3',
    fontWeight: '600',
  },
});

export default MessageReactions;
