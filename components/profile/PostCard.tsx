import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions
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
import HashtagText from '../common/HashtagText';
import HashtagDisplay from '../common/HashtagDisplay';
import PrivacySelector from '../common/PrivacySelector';
import { CommentSection } from '../common/CommentSection';

import PostHeader from '../common/PostHeader';
import { removeHashtagStats } from '@/utils/hashtagUtils';
import { updatePostPrivacy, PrivacyLevel } from '@/utils/postPrivacyUtils';
import contentModerationService from '@/services/contentModerationService';

interface PostImagesProps {
  images: string[];
}

interface Comment {
  id?: string;
  text: string;
  username: string;
  avatar?: string;
  timestamp: any;
  likes?: string[];
  replies?: any[];
  userId: string;
}

interface Post {
  id: string;
  content: string;
  hashtags?: string[];
  images?: string[];
  address?: string;
  likes: string[];
  comments?: Comment[];
  timestamp: any;
  userID: string;
  privacy?: 'public' | 'friends' | 'private';
}

interface User {
  uid: string;
  username?: string;
  profileUrl?: string;
}

interface UserInfo {
  username: string;
  profileUrl?: string;
}

interface PostCardProps {
  post: Post;
  user: User;
  onLike: (postId: string, userId: string, isLiked: boolean) => void;
  onDeletePost: () => void;
  onPrivacyChange?: (postId: string, newPrivacy: PrivacyLevel) => void;
  addComment: (postId: string, comment: Comment) => void;
  owner: boolean;
  postUserInfo?: UserInfo;
}

const { width: screenWidth } = Dimensions.get('window');
const containerPadding = 16;
const containerMargin = 16;
const innerWidth = screenWidth - (containerMargin * 2) - (containerPadding * 2);
const imageGap = 4; // Small gap for modern look
const halfWidth = (innerWidth - imageGap) / 2;

const PostImages: React.FC<PostImagesProps> = ({ images }) => {
  if (!images || images.length === 0) return null;

  const [singleImageHeight, setSingleImageHeight] = useState<number | null>(null);

  useEffect(() => {
    if (images.length === 1) {
      Image.getSize(
        images[0],
        (width, height) => {
          const aspectRatio = height / width;
          const calculatedHeight = innerWidth * aspectRatio;
          // Cap height between 200 and 400 for better feed flow
          setSingleImageHeight(Math.max(200, Math.min(calculatedHeight, 400)));
        },
        (error) => {
          console.error('Failed to get image size', error);
          setSingleImageHeight(300); // Fallback
        }
      );
    }
  }, [images]);

  if (images.length === 1) {
    if (singleImageHeight === null) return null; // Wait for calculation
    return (
      <View style={styles.imageContainer}>
        <CustomImage
          source={images[0]}
          style={[styles.singleImage, { height: singleImageHeight }]}
        />
      </View>
    );
  }

  if (images.length === 2) {
    return (
      <View style={[styles.imageContainer, styles.multiImageContainer]}>
        <View style={styles.twoImagesRow}>
          {images.map((img, idx) => (
            <CustomImage key={idx} source={img} style={styles.twoImage} />
          ))}
        </View>
      </View>
    );
  }

  if (images.length === 3) {
    return (
      <View style={[styles.imageContainer, styles.multiImageContainer]}>
        <CustomImage source={images[0]} style={styles.threeImageLarge} />
        <View style={styles.threeImagesBottom}>
          {images.slice(1).map((img, idx) => (
            <CustomImage key={idx} source={img} style={styles.threeImageSmall} />
          ))}
        </View>
      </View>
    );
  }

  // 4+ images: 2x2 grid with overlay if more than 4
  const displayImages = images.slice(0, 4);
  return (
    <View style={[styles.imageContainer, styles.multiImageContainer]}>
      <View style={styles.fourImagesGrid}>
        {displayImages.map((img, idx) => (
          <View key={idx} style={styles.fourImageWrapper}>
            <CustomImage source={img} style={styles.fourImage} />
            {idx === 3 && images.length > 4 && (
              <View style={styles.overlay}>
                <Text style={styles.overlayText}>+{images.length - 4}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const PostCard: React.FC<PostCardProps> = ({
  post,
  user,
  onLike,
  onDeletePost,
  onPrivacyChange,
  addComment,
  owner,
  postUserInfo
}) => {
  const { user: authUser } = useAuth();
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const { getUserInfo } = useUserContext();
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const currentUserId = authUser?.uid;
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(postUserInfo || null);
  const [showPrivacySelector, setShowPrivacySelector] = useState(false);

  useEffect(() => {
    const fetchUserInfoAsync = async () => {
      if (postUserInfo || !post.userID) return;
      try {
        const userData = await getUserInfo(post.userID);
        setUserInfo(userData);
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };
    fetchUserInfoAsync();
  }, [post.userID, postUserInfo, getUserInfo]);

  const handleDeletePost = () => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa bài viết này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đồng ý',
          onPress: async () => {
            try {
              const postRef = doc(db, 'posts', post.id);
              await deleteDoc(postRef);
              // Remove hashtag stats if needed
              if (post.hashtags) {
                await removeHashtagStats(post.hashtags, post.id, post.userID);
              }
              onDeletePost();
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Lỗi', 'Không thể xóa bài viết.');
            }
          },
        },
      ]
    );
  };

  const handleAddComment = async (commentText: string) => {
    // Luôn đi qua handler có kiểm duyệt và auto-clean
    await handleCommentWithNotification(commentText);
  };

  const handleCommentWithNotification = async (commentText: string) => {
    if (!currentUserId || !commentText?.trim()) return;

    let finalText = commentText.trim();
    try {
      const moderationResult = await contentModerationService.moderateText(finalText);
      if (!moderationResult.isClean) {
        // Tự động làm sạch để tránh nội dung nhạy cảm
        finalText = moderationResult.filteredText || finalText;
      }
    } catch (error) {
      console.warn('Comment moderation failed, proceeding with manual fallback:', error);
      // Cho phép tiếp tục nhưng finalText vẫn là trimmed
    }

    await performAddComment(finalText);

    if (post.userID !== currentUserId) {
      await socialNotificationService.createCommentNotification(
        post.id,
        post.userID,
        currentUserId,
        undefined,
        finalText
      );
    }
  };

  const performAddComment = async (finalText: string) => {
    if (!currentUserId || !finalText.trim()) return;

    const newComment: Comment = {
      userId: currentUserId!,
      text: finalText.trim(),
      timestamp: new Date(),
      username: authUser?.username || 'Anonymous',
      avatar: authUser?.profileUrl,
      likes: [],
      replies: [],
    };

    await addComment(post.id, newComment);
  };

  const handleLikeComment = (commentId: string) => {
    // Implement like logic here
  };

  const handleReplyComment = (commentId: string, replyText: string) => {
    // Implement reply logic here
  };

  const handleLikeWithNotification = async () => {
    if (!currentUserId) return;

    const isLiked = post.likes.includes(currentUserId);
    onLike(post.id, currentUserId, isLiked);

    if (post.userID !== currentUserId) {
      if (!isLiked) {
        await socialNotificationService.createLikeNotification(
          post.id,
          post.userID,
          currentUserId
        );
      } else {
        await socialNotificationService.removeLikeNotification(
          post.id,
          post.userID,
          currentUserId
        );
      }
    }
  };

  const handleHashtagPress = (hashtag: string) => {
    const cleanHashtag = hashtag.replace('#', '');
    router.push(`/HashtagScreen?hashtag=${cleanHashtag}`);
  };

  const handlePrivacyChange = async (newPrivacy: PrivacyLevel) => {
    const success = await updatePostPrivacy(post.id, newPrivacy);
    if (success) {
      onPrivacyChange?.(post.id, newPrivacy);
    }
    setShowPrivacySelector(false);
  };

  return (
    <Provider>
      <View style={[
        styles.container,
        { backgroundColor: currentThemeColors.background }
      ]}>
        <PostHeader
          userInfo={userInfo}
          timestamp={post.timestamp}
          userId={post.userID}
          isOwner={owner}
          postPrivacy={post.privacy || 'public'}
          onUserPress={() => router.push(`/UserProfileScreen?userId=${post.userID}`)}
          onDeletePost={handleDeletePost}
          onPrivacyChange={() => setShowPrivacySelector(true)}
        />

        {post.content && (
          <HashtagText
            text={post.content}
            onHashtagPress={handleHashtagPress}
            textStyle={[styles.contentText, { color: currentThemeColors.text }]}
            hashtagStyle={styles.hashtagStyle}
          />
        )}

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

        {post.images && post.images.length > 0 && (
          <PostImages images={post.images} />
        )}

        {post.address && (
          <View style={styles.addressContainer}>
            <EvilIcons name="location" size={20} color={currentThemeColors.icon} />
            <Text style={[styles.addressText, { color: currentThemeColors.icon }]}>
              {post.address}
            </Text>
          </View>
        )}

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLikeWithNotification}>
            <Ionicons
              name={post.likes.includes(currentUserId || '') ? 'heart' : 'heart-outline'}
              size={24}
              color={post.likes.includes(currentUserId || '') ? Colors.primary : currentThemeColors.icon}
            />
            <Text style={[styles.actionCount, { color: currentThemeColors.text }]}>
              {post.likes.length}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => setShowCommentInput(!showCommentInput)}>
            <Ionicons name="chatbubble-outline" size={24} color={currentThemeColors.icon} />
            <Text style={[styles.actionCount, { color: currentThemeColors.text }]}>
              {post.comments?.length || 0}
            </Text>
          </TouchableOpacity>
        </View>

        {showCommentInput && (
          <CommentSection
            comments={post.comments || []}
            onAddComment={handleCommentWithNotification}
            onLikeComment={handleLikeComment}
            onReplyComment={handleReplyComment}
            currentUserId={currentUserId || ''}
            currentUserAvatar={authUser?.profileUrl}
          />
        )}

        <PrivacySelector
          visible={showPrivacySelector}
          currentPrivacy={post.privacy || 'public'}
          onClose={() => setShowPrivacySelector(false)}
          onSelect={handlePrivacyChange}
        />
      </View>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    marginHorizontal: containerMargin,
    padding: containerPadding,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
    fontWeight: '400',
  },
  hashtagStyle: {
    color: Colors.primary,
    fontWeight: '600',
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    opacity: 0.7,
  },
  addressText: {
    fontSize: 13,
    marginLeft: 4,
  },
  imageContainer: {
    marginBottom: 12,
  },
  multiImageContainer: {
    overflow: 'hidden',
  },
  singleImage: {
    width: '100%',
    borderRadius: 16,
    resizeMode: 'cover',
  },
  twoImagesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  twoImage: {
    width: halfWidth,
    height: halfWidth * 1.33, // 3:4 aspect for portrait feel
    borderRadius: 16,
    resizeMode: 'cover',
  },
  threeImageLarge: {
    width: '100%',
    height: innerWidth * 0.6,
    borderRadius: 16,
    marginBottom: imageGap,
    resizeMode: 'cover',
  },
  threeImagesBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  threeImageSmall: {
    width: halfWidth,
    height: halfWidth * 0.75,
    borderRadius: 16,
    resizeMode: 'cover',
  },
  fourImagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  fourImageWrapper: {
    width: halfWidth,
    height: halfWidth,
    marginBottom: imageGap,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  fourImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionCount: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PostCard;