import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
  TextInput,
  Share,
  Animated,
  Text as RNText
} from 'react-native';
import { Menu, Provider, Button } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import EvilIcons from '@expo/vector-icons/EvilIcons';
import { Ionicons } from '@expo/vector-icons';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { formatTime } from '@/utils/common';
import { ThemeContext } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserContext';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import socialNotificationService from '@/services/socialNotificationService';
import optimizedSocialService from '@/services/optimizedSocialService';
import { followService } from '@/services/followService';
import SimpleImage from '../common/SimpleImage';
import ImageViewerModal from '../common/ImageViewerModal';

import PostHeader from '../common/PostHeader';
import { removeHashtagStats } from '@/utils/hashtagUtils';
import { updatePostPrivacy, PrivacyLevel } from '@/utils/postPrivacyUtils';

interface Comment {
  id?: string;
  text: string;
  username: string;
  userAvatar?: string;
  userId: string;
  timestamp: any;
  likes?: string[];
  replies?: Comment[];
}

interface Post {
  id: string;
  content: string;
  hashtags?: string[];
  images?: string[];
  likes: string[];
  comments?: Comment[];
  shares: number;
  timestamp: any;
  userID: string;
  username?: string;
  userAvatar?: string;
  address?: string;
  privacy?: 'public' | 'friends' | 'private';
  [key: string]: any;
}

interface PostCardProps {
  post: Post;
  currentUserId: string;
  currentUserAvatar?: string;
  onLike: (postId: string, userId: string, isLiked: boolean) => void;
  onComment: (postId: string, comment: string) => void;
  onShare: (postId: string) => void;
  onDelete: () => void;
  onUserPress?: (userId: string) => void;
  isOwner: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

const PostCardStandard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  currentUserAvatar,
  onLike,
  onComment,
  onShare,
  onDelete,
  onUserPress,
  isOwner
}) => {
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const colors = theme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const { user } = useAuth();
  const viewerShowOnline = user?.showOnlineStatus !== false;

  // Helper: ensure each comment/reply has an id and sane defaults
  const normalizeComments = (comments: Comment[] = [], path: string[] = []): Comment[] => {
    return (comments || []).map((c, idx) => {
      const baseTs = c?.timestamp?.seconds ?? c?.timestamp?._seconds ?? (c?.timestamp?.toDate ? c.timestamp.toDate().getTime() : (typeof c?.timestamp === 'number' ? c.timestamp : Date.now()));
      const safeId = c.id || `${c.userId || 'u'}_${baseTs || Date.now()}_${idx}_${path.join('-')}`;
      return {
        ...c,
        id: safeId,
        likes: Array.isArray(c.likes) ? c.likes : [],
        replies: c.replies && c.replies.length > 0 ? normalizeComments(c.replies, [...path, String(idx)]) : [],
      };
    });
  };

  // Prevent backend resync from overriding optimistic updates
  const ignoreNextCommentsSync = useRef(false);

  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>(post.comments || []);
  const [showComments, setShowComments] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  const [likeAnimation] = useState(new Animated.Value(1));
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [localComments, setLocalComments] = useState<Comment[]>(normalizeComments(post.comments || []));
  const [isFollowing, setIsFollowing] = useState(false);

  const isLiked = post.likes.includes(currentUserId);
  const contentPreview = post.content.length > 150
    ? post.content.substring(0, 150) + '...'
    : post.content;

  useEffect(() => {
    const checkFollowStatus = async () => {
      if (currentUserId && post.userID && currentUserId !== post.userID) {
        const following = await followService.isFollowing(currentUserId, post.userID);
        setIsFollowing(following);
      }
    };
    checkFollowStatus();
  }, [currentUserId, post.userID]);

  const handleFollow = async () => {
    if (!currentUserId || !post.userID) return;
    try {
      const success = await followService.followUser(currentUserId, post.userID);
      if (success) {
        setIsFollowing(true);
        await socialNotificationService.createFollowNotification(post.userID, currentUserId);
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleUnfollow = async () => {
    if (!currentUserId || !post.userID) return;
    try {
      const success = await followService.unfollowUser(currentUserId, post.userID);
      if (success) {
        setIsFollowing(false);
        // Optionally remove follow notification if implemented
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  useEffect(() => {
    if (ignoreNextCommentsSync.current) {
      // Skip one sync cycle just after optimistic local update
      ignoreNextCommentsSync.current = false;
      return;
    }
    setLocalComments(normalizeComments(post.comments || []));
  }, [post.comments]);

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
  };

  const handleDelete = () => {
    Alert.alert(
      'Xóa bài viết',
      'Bạn có chắc muốn xóa bài viết này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'posts', post.id));
              onDelete();
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Lỗi', 'Không thể xóa bài viết');
            }
          },
        },
      ]
    );
  };

  const handleLike = async () => {
    // Animation
    Animated.sequence([
      Animated.timing(likeAnimation, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(likeAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Call parent handler
    onLike(post.id, currentUserId, isLiked);

    // Send notification to post owner (only when liking, not unliking)
    if (!isLiked && post.userID !== currentUserId) {
      try {
        await socialNotificationService.createLikeNotification(
          post.id,
          post.userID,
          currentUserId,
          user?.username || user?.displayName || 'Ai đó',
          user?.profileUrl || currentUserAvatar
        );
        console.log('✅ Like notification sent to post owner');
      } catch (error) {
        console.warn('⚠️ Failed to send like notification:', error);
      }
    } else if (isLiked && post.userID !== currentUserId) {
      // Remove notification when unliking
      try {
        await socialNotificationService.removeLikeNotification(
          post.id,
          post.userID,
          currentUserId
        );
        console.log('✅ Like notification removed');
      } catch (error) {
        console.warn('⚠️ Failed to remove like notification:', error);
      }
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim())
      return;

    const trimmedText = commentText.trim();
    const newComment: Comment = {
      id: Date.now().toString(),
      userId: currentUserId,
      username: user?.username || user?.displayName || 'You',
      userAvatar: currentUserAvatar,
      text: trimmedText,
      timestamp: new Date().toISOString(),
    };

    // Optimistic update - show comment immediately
    const updatedComments = [...localComments, newComment];
    ignoreNextCommentsSync.current = true;
    setLocalComments(updatedComments);
    setComments(updatedComments);
    setCommentText('');

    try {
      // Save comment to Firestore - notification được gửi bên trong addComment
      // Không cần gọi socialNotificationService riêng nữa
      await optimizedSocialService.addComment(post.id, newComment);
      console.log('✅ Comment added successfully');
    } catch (e) {
      console.warn('⚠️ Failed to add comment:', e);
      // Rollback on error
      setLocalComments(localComments);
      setComments(comments);
      Alert.alert('Lỗi', 'Không thể gửi bình luận. Vui lòng thử lại.');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${post.content}\n\n- ${post.username}`,
        title: 'Chia sẻ bài viết',
      });
      onShare(post.id);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleImagePress = (index: number) => {
    setSelectedImageIndex(index);
    setShowImageViewer(true);
  };

  const handleHashtagPress = (hashtag: string) => {
    const cleanHashtag = hashtag.replace('#', '');
    router.push(`/(screens)/social/HashtagScreen?hashtag=${cleanHashtag}` as any);
  };

  // Resolve avatar URL from multiple possible fields to improve compatibility
  const resolveCommentAvatar = (c: any): string | undefined => {
    return (
      c?.userAvatar ||
      c?.avatar ||
      c?.photoURL ||
      c?.profileImage ||
      c?.user?.photoURL ||
      c?.user?.avatar ||
      undefined
    );
  };

  const CommentItem: React.FC<{ comment: Comment; level?: number }> = ({ comment, level = 0 }) => {
    const isCommentLiked = comment.likes?.includes(currentUserId) || false;

    // Debug log to check comment data
    console.log('Comment data:', {
      id: comment.id,
      username: comment.username,
      userAvatar: (comment as any)?.userAvatar,
      resolvedAvatar: resolveCommentAvatar(comment),
      text: comment.text,
      likes: comment.likes,
      hasReplies: comment.replies?.length || 0
    });

    const [avatarError, setAvatarError] = useState(false);
    const avatarUri = !avatarError ? resolveCommentAvatar(comment) : undefined;

    return (
      <View>
        <View style={[styles.comment, { marginLeft: level * 16 }]}>
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={styles.commentAvatar}
              onError={() => setAvatarError(true)}
            />
          ) : (
            <View style={[styles.commentAvatar, { backgroundColor: Colors.primary + '20', justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="person" size={14} color={Colors.primary} />
            </View>
          )}
          <View style={[styles.commentContent, { backgroundColor: colors.commentBackground }]}>
            <Text style={[styles.commentUser, { color: colors.text }]}>
              {comment.username}
            </Text>
            <Text style={[styles.commentText, { color: colors.text }]}>
              {comment.text}
            </Text>
            <View style={styles.commentMeta}>
              <Text style={[styles.commentTime, { color: colors.subtleText }]}>
                {formatTimestamp(comment.timestamp)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => onUserPress?.(post.userID)}
        >
          <View style={styles.avatarContainer}>
            {post.userAvatar ? (
              <Image source={{ uri: post.userAvatar }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: Colors.primary + '20' }]}>
                <Ionicons name="person" size={24} color={Colors.primary} />
              </View>
            )}
            {viewerShowOnline ? (
              <View style={[styles.onlineIndicator, { backgroundColor: Colors.success }]} />
            ) : null}
          </View>
          <View style={styles.userDetails}>
            <Text style={[styles.username, { color: colors.text }]}>
              {post.username || 'Unknown User'}
            </Text>
            <View style={styles.metaInfo}>
              <Text style={[styles.timestamp, { color: colors.subtleText || '#999' }]}>
                {formatTimestamp(post.timestamp)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          {!isOwner && (
            <>
              {isFollowing ? (
                <TouchableOpacity
                  style={[styles.followButton, styles.followedButton]}
                  onPress={handleUnfollow}
                >
                  <Text style={[styles.followText, styles.followedText]}>Đã theo dõi</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.followButton}
                  onPress={handleFollow}
                >
                  <Text style={styles.followText}>Theo dõi</Text>
                </TouchableOpacity>
              )}
            </>
          )}
          {post.privacy && (
            <View style={styles.privacyBadge}>
              <Ionicons
                name={post.privacy === 'private' ? 'lock-closed' :
                  post.privacy === 'friends' ? 'people' : 'globe'}
                size={12}
                color={colors.subtleText || '#999'}
              />
            </View>
          )}
          {isOwner && (
            <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.contentContainer}>
        <Text style={[styles.content, { color: colors.text }]}>
          {showFullContent ? post.content : contentPreview}
        </Text>
        {post.content.length > 150 && (
          <TouchableOpacity
            onPress={() => setShowFullContent(!showFullContent)}
            style={styles.readMoreButton}
          >
            <Text style={[styles.readMoreText, { color: Colors.primary }]}>
              {showFullContent ? 'Thu gọn' : 'Xem thêm'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {post.hashtags && post.hashtags.length > 0 && (
        <View style={styles.hashtagsContainer}>
          {post.hashtags.slice(0, 5).map((hashtag, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => handleHashtagPress(hashtag)}
              style={styles.hashtagChip}
            >
              <Text style={styles.hashtagStyle}>{hashtag}</Text>
            </TouchableOpacity>
          ))}
          {post.hashtags.length > 5 && (
            <Text style={styles.moreHashtags}>+{post.hashtags.length - 5}</Text>
          )}
        </View>
      )}

      {post.images && post.images.length > 0 && (
        <View style={styles.imagesContainer}>
          {post.images.length === 1 ? (
            <TouchableOpacity onPress={() => handleImagePress(0)}>
              <SimpleImage
                source={post.images[0]}
                style={styles.singleImage}
              />
            </TouchableOpacity>
          ) : post.images.length === 2 ? (
            <View style={styles.imagesRow}>
              {post.images.map((img, idx) => (
                <TouchableOpacity key={idx} onPress={() => handleImagePress(idx)}>
                  <SimpleImage
                    source={img}
                    style={styles.twoImages}
                  />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.imagesRow}>
              <TouchableOpacity onPress={() => handleImagePress(0)}>
                <SimpleImage
                  source={post.images[0]}
                  style={styles.multipleImages}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={{ position: 'relative' }}
                onPress={() => handleImagePress(1)}
              >
                <SimpleImage
                  source={post.images[1]}
                  style={styles.multipleImages}
                />
                {post.images.length > 2 && (
                  <View style={styles.moreImagesOverlay}>
                    <Text style={styles.moreImagesText}>+{post.images.length - 2}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {post.address && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="location-outline" size={14} color={colors.subtleText || '#999'} style={{ marginRight: 4 }} />
          <Text
            style={[styles.location, { color: colors.subtleText || '#999', flex: 1, maxWidth: '90%' }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {post.address}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              isLiked && { backgroundColor: Colors.error + '10' }
            ]}
            onPress={handleLike}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={22}
              color={isLiked ? Colors.error : colors.icon || '#666'}
            />
            <Text style={[styles.actionText, { color: colors.text }]}>
              {post.likes.length}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={[
            styles.actionButton,
            showComments && { backgroundColor: Colors.primary + '10' }
          ]}
          onPress={() => setShowComments(!showComments)}
        >
          <Ionicons
            name="chatbubble-outline"
            size={22}
            color={showComments ? Colors.primary : colors.icon || '#666'}
          />
          <Text style={[styles.actionText, { color: colors.text }]}>
            {localComments.length}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleShare}
        >
          <Ionicons
            name="share-outline"
            size={22}
            color={colors.icon || '#666'}
          />
          <Text style={[styles.actionText, { color: colors.text }]}>
            {post.shares || 0}
          </Text>
        </TouchableOpacity>
      </View>

      {showComments && (
        <View style={[styles.commentsSection, { borderTopColor: colors.border }]}>
          <View style={[styles.commentInputContainer, { backgroundColor: colors.commentBackground }]}>
            {currentUserAvatar ? (
              <Image
                source={{ uri: currentUserAvatar }}
                style={styles.commentAvatar}
                onError={(e) => console.log('User avatar load error:', e.nativeEvent.error)}
              />
            ) : (
              <View style={[styles.commentAvatar, { backgroundColor: Colors.primary + '20', justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="person" size={14} color={Colors.primary} />
              </View>
            )}
            <TextInput
              style={[styles.commentInput, { color: colors.text }]}
              placeholder={"Viết bình luận..."}
              placeholderTextColor={colors.placeholderText || colors.subtleText}
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, !commentText.trim() && { opacity: 0.5 }]}
              onPress={handleCommentSubmit}
              disabled={!commentText.trim()}
            >
              <Ionicons name="send" size={16} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.commentsList}>
            {localComments && localComments.length > 0 ? (
              localComments.map((comment, idx) => (
                <CommentItem key={comment.id || idx} comment={comment} level={0} />
              ))
            ) : (
              <Text style={[styles.noComments, { color: colors.subtleText }]}>Chưa có bình luận nào</Text>
            )}
          </View>
        </View>
      )}

      <ImageViewerModal
        images={post.images || []}
        visible={showImageViewer}
        initialIndex={selectedImageIndex}
        onClose={() => setShowImageViewer(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '500',
  },
  location: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  privacyBadge: {
    padding: 4,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#fff5f5',
  },
  followButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginRight: 4,
  },
  followedButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  followText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  followedText: {
    color: '#fff',
  },
  contentContainer: {
    marginBottom: 16,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  readMoreButton: {
    marginTop: 8,
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  imagesContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  singleImage: {
    width: '100%',
    height: 280,
    borderRadius: 16,
  },
  twoImages: {
    width: (screenWidth - 72) / 2,
    height: 200,
    borderRadius: 12,
  },
  multipleImages: {
    width: (screenWidth - 72) / 2,
    height: 140,
    borderRadius: 12,
  },
  imagesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  moreImagesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  moreImagesText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  commentsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    padding: 4,
  },
  commentsList: {
    gap: 12,
  },
  comment: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 10,
  },
  commentUser: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 13,
    lineHeight: 18,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 12,
  },
  commentTime: {
    fontSize: 11,
    color: '#999',
  },
  noComments: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  hashtagStyle: {
    color: Colors.primary,
    fontWeight: '600',
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 0,
    gap: 8,
  },
  hashtagChip: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  moreHashtags: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    alignSelf: 'center',
  },
});

export default PostCardStandard;