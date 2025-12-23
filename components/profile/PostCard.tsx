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
  Animated,
  ScrollView
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
import PostHeader from '../common/PostHeader';
import { removeHashtagStats } from '@/utils/hashtagUtils';
import { updatePostPrivacy, PrivacyLevel } from '@/utils/postPrivacyUtils';
import contentModerationService from '@/services/contentModerationService';
import optimizedSocialService from '@/services/optimizedSocialService';
import { followService } from '@/services/followService';

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
          images={images}
          initialIndex={0}
          style={[styles.singleImage, { height: singleImageHeight }]}
          onLongPress={() => { }}
        />
      </View>
    );
  }

  if (images.length === 2) {
    return (
      <View style={[styles.imageContainer, styles.multiImageContainer]}>
        <View style={styles.twoImagesRow}>
          {images.map((img, idx) => (
            <CustomImage
              key={idx}
              source={img}
              images={images}
              initialIndex={idx}
              style={styles.twoImage}
              onLongPress={() => { }}
            />
          ))}
        </View>
      </View>
    );
  }

  if (images.length === 3) {
    return (
      <View style={[styles.imageContainer, styles.multiImageContainer]}>
        <CustomImage
          source={images[0]}
          images={images}
          initialIndex={0}
          style={styles.threeImageLarge}
          onLongPress={() => { }}
        />
        <View style={styles.threeImagesBottom}>
          {images.slice(1).map((img, idx) => (
            <CustomImage
              key={idx}
              source={img}
              images={images}
              initialIndex={idx + 1}
              style={styles.threeImageSmall}
              onLongPress={() => { }}
            />
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
            <CustomImage
              source={img}
              images={images}
              initialIndex={idx}
              style={styles.fourImage}
              onLongPress={() => { }}
            />
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
  const [isFollowing, setIsFollowing] = useState(false);

  // Comment related state
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>(post.comments || []);
  const [showComments, setShowComments] = useState(false);
  const ignoreNextCommentsSync = useRef(false);

  // Helper: ensure each comment/reply has an id and sane defaults
  const normalizeComments = (comments: Comment[] = [], path: string[] = []): Comment[] => {
    return (comments || []).map((c, idx) => {
      let baseTs: number;
      if (c?.timestamp?.seconds) {
        baseTs = c.timestamp.seconds * 1000;
      } else if (c?.timestamp?._seconds) {
        baseTs = c.timestamp._seconds * 1000;
      } else if (c?.timestamp?.toDate) {
        baseTs = c.timestamp.toDate().getTime();
      } else if (typeof c?.timestamp === 'number') {
        baseTs = c.timestamp;
      } else if (typeof c?.timestamp === 'string') {
        baseTs = new Date(c.timestamp).getTime();
      } else {
        baseTs = Date.now();
      }

      if (isNaN(baseTs)) baseTs = Date.now();

      const safeId = c.id || `${c.userId || 'u'}_${baseTs}_${idx}_${path.join('-')}`;
      return {
        ...c,
        id: safeId,
        timestamp: baseTs, // Normalize to number
        likes: Array.isArray(c.likes) ? c.likes : [],
        replies: c.replies && c.replies.length > 0 ? normalizeComments(c.replies, [...path, String(idx)]) : [],
      };
    });
  };

  const [localComments, setLocalComments] = useState<Comment[]>(
    normalizeComments(post.comments || []).sort((a, b) => b.timestamp - a.timestamp)
  );

  useEffect(() => {
    if (ignoreNextCommentsSync.current) {
      ignoreNextCommentsSync.current = false;
      return;
    }
    const sortedComments = normalizeComments(post.comments || []).sort((a, b) => b.timestamp - a.timestamp);
    setLocalComments(sortedComments);
  }, [post.comments]);

  // Check follow status
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
        // Optional: Send notification
        await socialNotificationService.createFollowNotification(post.userID, currentUserId);
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  // Resolve avatar URL
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
          <View style={[styles.commentContent, { backgroundColor: currentThemeColors.cardBackground || '#f8f9fa' }]}>
            <Text style={[styles.commentUser, { color: currentThemeColors.text }]}>
              {comment.username}
            </Text>
            <Text style={[styles.commentText, { color: currentThemeColors.text }]}>
              {comment.text}
            </Text>
            <View style={styles.commentMeta}>
              <Text style={[styles.commentTime, { color: currentThemeColors.subtleText }]}>
                {formatTime(comment.timestamp)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim()) return;

    const trimmedText = commentText.trim();
    const newComment: Comment = {
      id: Date.now().toString(),
      userId: currentUserId!,
      username: authUser?.username || authUser?.displayName || 'You',
      avatar: authUser?.profileUrl,
      text: trimmedText,
      timestamp: Date.now(),
      likes: [],
      replies: [],
    };

    // Optimistic update - prepend new comment
    const updatedComments = [newComment, ...localComments];
    ignoreNextCommentsSync.current = true;
    setLocalComments(updatedComments);
    setComments(updatedComments);
    setCommentText('');

    // Call existing notification logic
    await handleCommentWithNotification(trimmedText);
  };

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

    // await addComment(post.id, newComment);
    try {
      await optimizedSocialService.addComment(post.id, newComment);
    } catch (e) {
      console.warn('⚠️ Failed to add comment with push:', e);
    }
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
    router.push(`/(screens)/social/HashtagScreen?hashtag=${cleanHashtag}` as any);
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
          onUserPress={() => router.push(`/(screens)/user/UserProfileScreen?userId=${post.userID}`)}
          onDeletePost={handleDeletePost}
          onPrivacyChange={() => setShowPrivacySelector(true)}
          isFollowing={isFollowing}
          onFollowPress={handleFollow}
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

          <TouchableOpacity style={styles.actionButton} onPress={() => setShowComments(!showComments)}>
            <Ionicons name="chatbubble-outline" size={24} color={showComments ? Colors.primary : currentThemeColors.icon} />
            <Text style={[styles.actionCount, { color: currentThemeColors.text }]}>
              {localComments.length}
            </Text>
          </TouchableOpacity>
        </View>

        {showComments && (
          <View style={[styles.commentsSection, { borderTopColor: currentThemeColors.border }]}>
            <View style={[styles.commentInputContainer, { backgroundColor: currentThemeColors.cardBackground || '#f8f9fa' }]}>
              {authUser?.profileUrl ? (
                <Image
                  source={{ uri: authUser.profileUrl }}
                  style={styles.commentAvatar}
                  onError={(e) => console.log('User avatar load error:', e.nativeEvent.error)}
                />
              ) : (
                <View style={[styles.commentAvatar, { backgroundColor: Colors.primary + '20', justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="person" size={14} color={Colors.primary} />
                </View>
              )}
              <TextInput
                style={[styles.commentInput, { color: currentThemeColors.text }]}
                placeholder={"Viết bình luận..."}
                placeholderTextColor={currentThemeColors.placeholderText || currentThemeColors.subtleText}
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

            <ScrollView style={styles.commentsList} nestedScrollEnabled={true}>
              {localComments && localComments.length > 0 ? (
                localComments.map((comment, idx) => (
                  <CommentItem key={comment.id || idx} comment={comment} level={0} />
                ))
              ) : (
                <Text style={[styles.noComments, { color: currentThemeColors.subtleText }]}>Chưa có bình luận nào</Text>
              )}
            </ScrollView>
          </View>
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
  commentsList: {
    gap: 12,
    maxHeight: 300,
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
  },
  noComments: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
});

export default PostCard;