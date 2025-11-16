import React, { useContext, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActionSheetIOS, Platform, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { IconButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import LikedByModal from './LikedByModal';
import { buildPostDeepLink } from '@/utils/shareUtils';
import socialNotificationService from '@/services/socialNotificationService';
import { useAuth } from '@/context/authContext';
import ExpoPushNotificationService from '@/services/expoPushNotificationService';

interface PostActionsProps {
  post: {
    id: string;
    likes: string[];
    comments?: any[];
    shares: number;
    authorId?: string; // Add author ID for notifications
    authorName?: string; // Add author name for notifications
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
  const { user } = useAuth();
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'dark';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const isLiked = post.likes && post.likes.includes(currentUserId);
  const [showLikedByModal, setShowLikedByModal] = useState(false);

  // Enhanced like handler with notifications
  const handleLikeWithNotification = async (postId: string, userId: string, wasLiked: boolean) => {
    try {
      // Call the original like handler
      onLike(postId, userId, wasLiked);
      
      // Handle notifications
      if (user?.uid && post.authorId && post.authorId !== user.uid) {
        if (!wasLiked) {
          // User is liking the post - create notification
          await socialNotificationService.createLikeNotification(
            postId,
            post.authorId,
            user.uid,
            user.displayName || 'Unknown User',
            user.photoURL
          );
          // Fallback: send Expo push directly to post owner
          try {
            await ExpoPushNotificationService.sendPushToUser(post.authorId, {
              title: '❤️ Lượt thích mới',
              body: `${user.displayName || 'Ai đó'} đã thích bài viết của bạn`,
              data: { type: 'like', postId, userId: user.uid },
            });
          } catch (e) {
            console.warn('⚠️ Fallback push like failed:', e);
          }
          console.log('✅ Like notification created');
        } else {
          // User is unliking the post - remove notification
          await socialNotificationService.removeLikeNotification(
            postId,
            post.authorId,
            user.uid
          );
        }
      }
    } catch (error) {
      console.error('❌ Error handling like notification:', error);
      // Don't fail the like action if notification fails
    }
  };

  const handleSharePress = () => {
    // Default: call provided share handler
    onShare(post.id);
  };

  const handleShareLongPress = async () => {
    const link = buildPostDeepLink(post.id);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Huỷ', 'Chia sẻ...', 'Sao chép liên kết'],
          cancelButtonIndex: 0,
          userInterfaceStyle: theme === 'dark' ? 'dark' : 'light',
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            onShare(post.id);
          } else if (buttonIndex === 2) {
            try {
              await Clipboard.setStringAsync(link);
              Alert.alert('Đã sao chép', 'Liên kết bài viết đã được sao chép.');
            } catch (e) {
              Alert.alert('Lỗi', 'Không thể sao chép liên kết.');
            }
          }
        }
      );
    } else {
      // Android: simple alert with copy option
      Alert.alert('Chia sẻ bài viết', link, [
        { text: 'Sao chép', onPress: async () => {
            try {
              await Clipboard.setStringAsync(link);
              Alert.alert('Đã sao chép', 'Liên kết bài viết đã được sao chép.');
            } catch {}
          } 
        },
        { text: 'Chia sẻ...', onPress: () => onShare(post.id) },
        { text: 'Đóng', style: 'cancel' },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.actionsRow}>
        {/* Like Button */}
        <TouchableOpacity 
          onPress={() => handleLikeWithNotification(post.id, currentUserId, isLiked)} 
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

        {/* Share Button with long press options */}
        <TouchableOpacity onPress={handleSharePress} onLongPress={handleShareLongPress} style={styles.actionButton}>
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
