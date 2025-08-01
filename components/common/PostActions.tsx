import React, { useContext, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { IconButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import LikedByModal from './LikedByModal';

interface PostActionsProps {
  post: {
    id: string;
    likes: string[];
    comments?: any[];
    shares: number;
  };
  currentUserId: string;
  onLike: (postId: string, userId: string, isLiked: boolean) => void;
  onComment: () => void;
  onShare: (postId: string) => void;
}

const PostActions: React.FC<PostActionsProps> = ({ 
  post, 
  currentUserId, 
  onLike, 
  onComment, 
  onShare 
}) => {
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const isLiked = post.likes && post.likes.includes(currentUserId);
  const [showLikedByModal, setShowLikedByModal] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.actionsRow}>
        {/* Like Button */}
        <TouchableOpacity 
          onPress={() => onLike(post.id, currentUserId, isLiked)} 
          style={[
            styles.actionButton,
            isLiked && { backgroundColor: currentThemeColors.tint + '20' }
          ]}
        >
          <Ionicons 
            name={isLiked ? "heart" : "heart-outline"} 
            size={24} 
            color={isLiked ? currentThemeColors.tint : currentThemeColors.icon} 
          />
          <Text style={[
            styles.actionText, 
            { color: isLiked ? currentThemeColors.tint : currentThemeColors.text }
          ]}>
            {post.likes.length > 0 ? post.likes.length : ''}
          </Text>
        </TouchableOpacity>

        {/* Comment Button */}
        <TouchableOpacity onPress={onComment} style={styles.actionButton}>
          <Ionicons 
            name="chatbubble-outline" 
            size={22} 
            color={currentThemeColors.icon} 
          />
          <Text style={[styles.actionText, { color: currentThemeColors.text }]}>
            {post.comments ? post.comments.length : 0}
          </Text>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity onPress={() => onShare(post.id)} style={styles.actionButton}>
          <Ionicons 
            name="share-outline" 
            size={22} 
            color={currentThemeColors.icon} 
          />
          <Text style={[styles.actionText, { color: currentThemeColors.text }]}>
            {post.shares > 0 ? post.shares : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Like Summary */}
      {post.likes.length > 0 && (
        <TouchableOpacity 
          style={styles.likeSummary}
          onPress={() => setShowLikedByModal(true)}
          activeOpacity={0.7}
        >
          <View style={styles.likeIcon}>
            <Ionicons name="heart" size={12} color="white" />
          </View>
          <Text style={[styles.likeSummaryText, { color: currentThemeColors.subtleText }]}>
            {post.likes.length === 1 ? '1 person likes this' : `${post.likes.length} people like this`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Liked By Modal */}
      <LikedByModal
        visible={showLikedByModal}
        onClose={() => setShowLikedByModal(false)}
        likedUserIds={post.likes || []}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    justifyContent: 'center',
  },
  actionText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  likeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  likeIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1877F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  likeSummaryText: {
    fontSize: 13,
    fontWeight: '400',
  },
});

export default PostActions;
