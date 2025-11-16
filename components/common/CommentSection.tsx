import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { formatTime } from '@/utils/common';
import CustomImage from '../common/CustomImage';

interface Comment {
  id?: string;
  text: string;
  username: string;
  avatar?: string;
  timestamp: any;
  likes?: string[];
  replies?: Reply[];
  userId: string;
}

interface Reply {
  id?: string;
  text: string;
  username: string;
  avatar?: string;
  timestamp: any;
  userId: string;
}

interface CommentItemProps {
  comment: Comment;
  currentUserId: string;
}

interface CommentSectionProps {
  comments: Comment[];
  onAddComment: (text: string) => void;
  currentUserId: string;
  currentUserAvatar?: string;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, currentUserId }) => {
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  return (
    <View style={styles.commentContainer}>
      <CustomImage
        source={comment.avatar || 'https://via.placeholder.com/150'}
        style={styles.commentAvatar}
        onLongPress={() => {}}
      />
      <View style={styles.commentContent}>
        <View style={[styles.commentBubble, { backgroundColor: currentThemeColors.commentBackground }]}>
          <Text style={[styles.commentUsername, { color: currentThemeColors.text }]}>
            {comment.username || 'Unknown User'}
          </Text>
          <Text style={[styles.commentText, { color: currentThemeColors.text }]}>
            {comment.text}
          </Text>
        </View>
        
        <View style={styles.commentActions}>
          <Text style={[styles.commentTime, { color: currentThemeColors.subtleText }]}>
            {formatTime(comment.timestamp)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const CommentSection: React.FC<CommentSectionProps> = ({ 
  comments = [], 
  onAddComment, 
  currentUserId,
  currentUserAvatar 
}) => {
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const [commentText, setCommentText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAddComment = () => {
    if (commentText.trim()) {
      onAddComment(commentText);
      setCommentText('');
    }
  };

  const displayedComments = isExpanded ? comments : comments.slice(0, 2);

  return (
    <View style={styles.commentsSection}>
      {/* Comments List */}
      {displayedComments.map((comment, index) => (
        <CommentItem
          key={comment.id || index}
          comment={comment}
          currentUserId={currentUserId}
        />
      ))}

      {/* View More Comments Button */}
      {comments.length > 2 && (
        <TouchableOpacity 
          onPress={() => setIsExpanded(!isExpanded)}
          style={styles.viewMoreButton}
        >
          <Text style={[styles.viewMoreText, { color: currentThemeColors.subtleText }]}>
            {isExpanded 
              ? 'Hide comments' 
              : `View ${comments.length - 2} more comments`
            }
          </Text>
        </TouchableOpacity>
      )}

      {/* Add Comment Input */}
      <View style={styles.addCommentContainer}>
        <CustomImage
          source={currentUserAvatar || 'https://via.placeholder.com/150'}
          style={styles.commentAvatar}
          onLongPress={() => {}}
        />
        <View style={styles.commentInputContainer}>
          <TextInput
            style={[
              styles.commentInput,
              { 
                backgroundColor: currentThemeColors.commentBackground,
                color: currentThemeColors.text,
                borderColor: currentThemeColors.border
              }
            ]}
            placeholder="Write a comment..."
            placeholderTextColor={currentThemeColors.placeholderText}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            onPress={handleAddComment}
            disabled={!commentText.trim()}
            style={[
              styles.sendButton,
              { backgroundColor: commentText.trim() ? currentThemeColors.tint : currentThemeColors.border }
            ]}
          >
            <Ionicons 
              name="send" 
              size={18} 
              color={commentText.trim() ? 'white' : currentThemeColors.subtleText} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  commentsSection: {
    marginTop: 8,
  },
  commentContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  commentContent: {
    flex: 1,
  },
  commentBubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  commentUsername: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 18,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 12,
    marginRight: 16,
  },
  commentActionButton: {
    marginRight: 16,
  },
  commentActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  commentLikes: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  commentLikesText: {
    fontSize: 12,
    marginLeft: 4,
  },
  replyContainer: {
    flexDirection: 'row',
    marginTop: 8,
    marginLeft: 12,
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  replyInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  replyInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 80,
    fontSize: 14,
    borderWidth: 1,
  },
  replySendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  replyItem: {
    flexDirection: 'row',
    marginTop: 8,
    marginLeft: 40,
  },
  replyContent: {
    flex: 1,
  },
  viewMoreButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  addCommentContainer: {
    flexDirection: 'row',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  commentInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

export { CommentSection, CommentItem };
