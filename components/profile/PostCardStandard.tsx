import React, { useState, useEffect, useContext } from 'react';
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
  Animated
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
import CustomImage from '../common/CustomImage';
import SimpleImage from '../common/SimpleImage';
import HashtagText from '../common/HashtagText';
import HashtagDisplay from '../common/HashtagDisplay';
import PrivacySelector from '../common/PrivacySelector';
import { CommentSection } from '../common/CommentSection';
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
  replies?: any[];
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
  // Allow unknown extra fields from Firestore
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
  
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showFullContent, setShowFullContent] = useState(false);
  const [likeAnimation] = useState(new Animated.Value(1));
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageViewer, setShowImageViewer] = useState(false);
  
  const isLiked = post.likes.includes(currentUserId);
  const contentPreview = post.content.length > 150 
    ? post.content.substring(0, 150) + '...' 
    : post.content;

  // Format timestamp locally
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

  // Handle delete
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

  // Handle like with animation
  const handleLike = () => {
    // Animate like button
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
    
    onLike(post.id, currentUserId, isLiked);
  };

  // Handle comment
  const handleComment = () => {
    if (commentText.trim()) {
      onComment(post.id, commentText.trim());
      setCommentText('');
    }
  };

  // Handle share
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

  // Handle image press
  const handleImagePress = (index: number) => {
    setSelectedImageIndex(index);
    setShowImageViewer(true);
  };

  // Handle hashtag press
  const handleHashtagPress = (hashtag: string) => {
    const cleanHashtag = hashtag.replace('#', '');
    router.push(`/HashtagScreen?hashtag=${cleanHashtag}` as any);
  };
  console.log(12345, post);
  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => onUserPress?.(post.userID)}
        >
          <View style={styles.avatarContainer}>
            {currentUserAvatar ? (
              <Image source={{ uri: currentUserAvatar }} style={styles.avatarImage} />
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
              {/* Đã di chuyển phần địa chỉ xuống dưới ảnh */}
            </View>
          </View>
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
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

      {/* Content */}
      <View style={styles.contentContainer}>
        <HashtagText
          text={showFullContent ? post.content : contentPreview}
          onHashtagPress={handleHashtagPress}
          textStyle={[styles.content, { color: colors.text }]}
          hashtagStyle={styles.hashtagStyle}
        />
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

      {/* Hashtags */}
      {post.hashtags && post.hashtags.length > 0 && (
        <View style={styles.hashtagsContainer}>
          <HashtagDisplay
            hashtags={post.hashtags}
            maxDisplay={5}
            size="small"
            onHashtagPress={handleHashtagPress}
          />
        </View>
      )}

      {/* Images */}
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
            <>
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
            </>
          )}
        </View>
      )}
      {/* Location (address) below images */}
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

      {/* Actions */}
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
            {post.comments?.length || 0}
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

      {/* Comments Section */}
      {showComments && (
        <View style={styles.commentsSection}>
          {/* Comment Input */}
          <View style={styles.commentInputContainer}>
            <Image 
              source={{ uri: currentUserAvatar || 'https://via.placeholder.com/32' }}
              style={styles.commentAvatar}
            />
            <TextInput
              style={[styles.commentInput, { color: colors.text }]}
              placeholder="Viết bình luận..."
              placeholderTextColor={colors.subtleText || '#999'}
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <TouchableOpacity 
              style={styles.sendButton}
              onPress={handleComment}
              disabled={!commentText.trim()}
            >
              <Ionicons 
                name="send" 
                size={16} 
                color="white" 
              />
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          <View style={styles.commentsList}>
            {post.comments && post.comments.length > 0 ? (
              post.comments.map((comment, idx) => (
                <View key={idx} style={styles.comment}>
                  <Image 
                    source={{ uri: comment.userAvatar || 'https://via.placeholder.com/32' }}
                    style={styles.commentAvatar}
                  />
                  <View style={styles.commentContent}>
                    <Text style={[styles.commentUser, { color: colors.text }]}>
                      {comment.username}
                    </Text>
                    <Text style={[styles.commentText, { color: colors.text }]}>
                      {comment.text}
                    </Text>
                    <View style={styles.commentMeta}>
                      <Text style={styles.commentTime}>
                        {formatTimestamp(comment.timestamp)}
                      </Text>
                      <TouchableOpacity style={styles.commentLike}>
                        <Ionicons 
                          name="heart-outline" 
                          size={12} 
                          color="#999" 
                        />
                        <Text style={styles.commentTime}>
                          {comment.likes?.length || 0}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noComments}>Chưa có bình luận nào</Text>
            )}
          </View>
        </View>
      )}

      {/* Image Viewer Modal */}
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
  separator: {
    fontSize: 12,
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
    borderTopColor: '#f0f0f0',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
    gap: 12,
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentsList: {
    gap: 12,
  },
  comment: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 12,
  },
  commentUser: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 16,
  },
  commentTime: {
    fontSize: 12,
    color: '#999',
  },
  commentLike: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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

});

export default PostCardStandard;
