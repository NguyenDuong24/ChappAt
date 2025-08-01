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
  onReply: (commentId: string, replyText: string) => void;
  onLike: (commentId: string) => void;
  currentUserId: string;
  isLiked?: boolean;
}

interface CommentSectionProps {
  comments: Comment[];
  onAddComment: (text: string) => void;
  onLikeComment: (commentId: string) => void;
  onReplyComment: (commentId: string, replyText: string) => void;
  currentUserId: string;
  currentUserAvatar?: string;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, onReply, onLike, currentUserId, isLiked = false }) => {
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');

  const handleReply = () => {
    if (replyText.trim()) {
      onReply(comment.id || '', replyText);
      setReplyText('');
      setShowReplyInput(false);
    }
  };

  return (
    <View style={styles.commentContainer}>
      <CustomImage
        source={comment.avatar || 'default_avatar_url_here'}
        style={styles.commentAvatar}
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
          
          <TouchableOpacity 
            onPress={() => onLike(comment.id || '')} 
            style={styles.commentActionButton}
          >
            <Text style={[
              styles.commentActionText, 
              { color: isLiked ? currentThemeColors.tint : currentThemeColors.subtleText }
            ]}>
              Like
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setShowReplyInput(!showReplyInput)}
            style={styles.commentActionButton}
          >
            <Text style={[styles.commentActionText, { color: currentThemeColors.subtleText }]}>
              Reply
            </Text>
          </TouchableOpacity>
          
          {comment.likes && comment.likes.length > 0 && (
            <View style={styles.commentLikes}>
              <Ionicons name="heart" size={12} color={currentThemeColors.tint} />
              <Text style={[styles.commentLikesText, { color: currentThemeColors.subtleText }]}>
                {comment.likes.length}
              </Text>
            </View>
          )}
        </View>

        {showReplyInput && (
          <View style={styles.replyContainer}>
            <CustomImage
              source={'default_avatar_url_here'} // Current user avatar
              style={styles.replyAvatar}
            />
            <View style={styles.replyInputContainer}>
              <TextInput
                style={[
                  styles.replyInput,
                  { 
                    backgroundColor: currentThemeColors.commentBackground,
                    color: currentThemeColors.text,
                    borderColor: currentThemeColors.border
                  }
                ]}
                placeholder="Write a reply..."
                placeholderTextColor={currentThemeColors.placeholderText}
                value={replyText}
                onChangeText={setReplyText}
                multiline
              />
              <TouchableOpacity 
                onPress={handleReply}
                disabled={!replyText.trim()}
                style={[
                  styles.replySendButton,
                  { backgroundColor: replyText.trim() ? currentThemeColors.tint : currentThemeColors.border }
                ]}
              >
                <Ionicons 
                  name="send" 
                  size={16} 
                  color={replyText.trim() ? 'white' : currentThemeColors.subtleText} 
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Render replies */}
        {comment.replies && comment.replies.map((reply: Reply, index: number) => (
          <View key={index} style={styles.replyItem}>
            <CustomImage
              source={reply.avatar || 'default_avatar_url_here'}
              style={styles.replyAvatar}
            />
            <View style={styles.replyContent}>
              <View style={[styles.commentBubble, { backgroundColor: currentThemeColors.commentBackground }]}>
                <Text style={[styles.commentUsername, { color: currentThemeColors.text }]}>
                  {reply.username}
                </Text>
                <Text style={[styles.commentText, { color: currentThemeColors.text }]}>
                  {reply.text}
                </Text>
              </View>
              <Text style={[styles.commentTime, { color: currentThemeColors.subtleText }]}>
                {formatTime(reply.timestamp)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const CommentSection: React.FC<CommentSectionProps> = ({ 
  comments = [], 
  onAddComment, 
  onLikeComment, 
  onReplyComment, 
  currentUserId,
  currentUserAvatar 
}) => {
  const { theme } = useContext(ThemeContext);
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
          onReply={onReplyComment}
          onLike={onLikeComment}
          currentUserId={currentUserId}
          isLiked={comment.likes?.includes(currentUserId)}
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
          source={currentUserAvatar || 'default_avatar_url_here'}
          style={styles.commentAvatar}
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
