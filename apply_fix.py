import re

# Read the file
with open('components/chat/MessageItem.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Add currentUser?.uid to deleteMessage call
content = content.replace(
    '() => deleteMessage(roomId, msgId, isCurrentUser),',
    '() => deleteMessage(roomId, msgId, isCurrentUser, currentUser?.uid),'
)

# Fix 2: Add recalled/deleted message check
insertion_point = "  const isReplyingToVibe = message?.replyTo?.type === 'vibe';\n  const isImageMessage = !!message?.imageUrl && !message?.text;\n  const isGiftMessage = message?.type === 'gift' && message?.gift;\n\n  return ("

new_code = """  const isReplyingToVibe = message?.replyTo?.type === 'vibe';
  const isImageMessage = !!message?.imageUrl && !message?.text;
  const isGiftMessage = message?.type === 'gift' && message?.gift;

  // Check for recalled/deleted messages
  const isRecalled = message?.isRecalled === true;
  const isDeletedForCurrentUser = Array.isArray(message?.deletedFor) && message.deletedFor.includes(currentUid);

  if (isRecalled || isDeletedForCurrentUser) {
    return (
      <View style={[styles.messageContainer, isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage]}>
        {!isCurrentUser && (
          <Avatar.Image
            size={32}
            source={{ uri: message.profileUrl }}
            style={styles.avatar}
          />
        )}
        <View style={[styles.messageContent, { maxWidth: '80%' }]}>
          <View style={[
            styles.bubbleContainer,
            isCurrentUser ? styles.bubbleContainerRight : styles.bubbleContainerLeft
          ]}>
            <View style={[
              styles.bubble,
              isCurrentUser ? styles.bubbleRight : styles.bubbleLeft,
            ]}>
              <View style={[
                styles.bubbleContent,
                { backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F0F0F0', opacity: 0.7 }
              ]}>
                <Text style={[
                  styles.messageText,
                  {
                    color: theme === 'dark' ? '#888' : '#666',
                    fontStyle: 'italic',
                    fontSize: 14
                  }
                ]}>
                  {isRecalled ? '🚫 Tin nhắn đã được thu hồi' : '🗑️ Tin nhắn đã xóa'}
                </Text>
                <View style={styles.timeStatusRow}>
                  <Text style={[styles.timeText, { color: theme === 'dark' ? '#666' : '#999' }]}>
                    {formatMessageTime()}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        {isCurrentUser && (
          <Avatar.Image
            size={32}
            source={{ uri: currentUser?.profileUrl }}
            style={styles.avatar}
          />
        )}
      </View>
    );
  }

  return ("""

content = content.replace(insertion_point, new_code)

# Write back
with open('components/chat/MessageItem.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Successfully applied changes to MessageItem.tsx")
