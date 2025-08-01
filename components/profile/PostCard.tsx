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
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { formatTime } from '@/utils/common';
import { ThemeContext } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserContext';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import CustomImage from '../common/CustomImage';
import HashtagText from '../common/HashtagText';
import HashtagDisplay from '../common/HashtagDisplay';
import PrivacySelector from '../common/PrivacySelector';
import { CommentSection } from '../common/CommentSection';
import PostActions from '../common/PostActions';
import PostHeader from '../common/PostHeader';
import { removeHashtagStats } from '@/utils/hashtagUtils';
import { updatePostPrivacy, PrivacyLevel } from '@/utils/postPrivacyUtils';

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
  hashtags?: string[]; // Thêm field hashtags
  images?: string[];
  address?: string;
  likes: string[];
  comments?: Comment[];
  shares: number;
  timestamp: any;
  userID: string;
  privacy?: 'public' | 'friends' | 'private'; // Thêm privacy setting
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
  onShare: (postId: string) => void;
  onDeletePost: () => void;
  onPrivacyChange?: (postId: string, newPrivacy: PrivacyLevel) => void; // Thêm callback
  addComment: (postId: string, comment: Comment) => void;
  owner: boolean;
  postUserInfo?: UserInfo; // Add preloaded user info
}

const { width: screenWidth } = Dimensions.get('window');

const screenWidth1 = (screenWidth/2) - ((screenWidth * 10) / 100) 

const PostImages: React.FC<PostImagesProps> = ({ images }) => {
  if (!images || images.length === 0) return null;
  const [singleImageHeight, setSingleImageHeight] = useState(280);

  useEffect(() => {
    if (images.length === 1) {
      // Lấy kích thước gốc của ảnh
      Image.getSize(
        images[0],
        (width, height) => {
          const aspectRatio = height / width;
          // 280 là chiều rộng container mong muốn (bạn có thể thay đổi theo thiết kế của mình)
          const containerWidth = 280;
          const calculatedHeight = containerWidth * aspectRatio;
          // Giới hạn chiều cao tối đa là 360
          setSingleImageHeight(Math.min(calculatedHeight, 360));
        },
        (error) => {
          console.error('Failed to get image size', error);
        }
      );
    }
  }, [images]);

  if (images.length === 1) {
    return (
      <CustomImage
        source={images[0]}
        style={[styles.singleImage, { height: singleImageHeight }]}
      />
    );
  }

  if (images.length === 2) {
    return (
      <View style={styles.twoImagesContainer}>
        {images.map((img: string, idx: number) => (
          <CustomImage key={idx} source={img} style={styles.twoImage} />
        ))}
      </View>
    );
  }

  if (images.length === 3) {
    return (
      <View style={styles.threeImagesContainer}>
        <View style={styles.threeImagesTop}>
          <CustomImage source={images[0]} style={styles.threeImageLarge} />
        </View>
        <View style={styles.threeImagesBottom}>
          {images.slice(1).map((img: string, idx: number) => (
            <CustomImage key={idx} source={img} style={styles.threeImageSmall} />
          ))}
        </View>
      </View>
    );
  }

  // Hiển thị 4 hoặc nhiều ảnh: lưới 2 cột. Nếu nhiều hơn 4 ảnh thì overlay số ảnh còn lại
  const displayImages = images.slice(0, 4);
  return (
    <View style={styles.fourImagesContainer}>
      {displayImages.map((img: string, idx: number) => (
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
  );
};

const PostCard: React.FC<PostCardProps> = ({ 
  post, 
  user, 
  onLike, 
  onShare, 
  onDeletePost, 
  onPrivacyChange, 
  addComment, 
  owner, 
  postUserInfo 
}) => {
  const { theme } = useContext(ThemeContext);
  const { getUserInfo } = useUserContext();
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const currentUserId = user?.uid;
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(postUserInfo || null);
  const [showPrivacySelector, setShowPrivacySelector] = useState(false);

  const fetchUserInfo = async () => {
    // Only fetch if not provided via props
    if (!post.userID || postUserInfo) return;
    try {
      const userData = await getUserInfo(post.userID);
      setUserInfo(userData);
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  useEffect(() => {
    if (postUserInfo) {
      setUserInfo(postUserInfo);
    } else {
      fetchUserInfo();
    }
  }, [post.userID, postUserInfo]);

  const handleDeletePost = async () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: async () => {
            try {
              const postRef = doc(db, 'posts', post.id);
              await deleteDoc(postRef);
              console.log('Post deleted:', post.id);
              onDeletePost();
            } catch (error) {
              console.error('Error deleting post:', error);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleAddComment = async (commentText: string) => {
    const newComment: Comment = {
      userId: currentUserId || '',
      text: commentText,
      timestamp: new Date(),
      username: user.username || 'Unknown User',
      avatar: user.profileUrl || 'default_avatar_url_here',
    };

    await addComment(post.id, newComment);
    if (post.comments) {
      post.comments = [...post.comments, newComment];
    }
  };

  const handleLikeComment = (commentId: string) => {
    // Implement like comment logic
    console.log('Like comment:', commentId);
  };

  const handleReplyComment = (commentId: string, replyText: string) => {
    // Implement reply comment logic
    console.log('Reply to comment:', commentId, replyText);
  };

  const handleHashtagPress = (hashtag: string) => {
    console.log('🔍 DEBUG: Hashtag clicked:', hashtag);
    const cleanHashtag = hashtag.replace('#', '');
    console.log('🔍 DEBUG: Clean hashtag:', cleanHashtag);
    
    // Navigate to HashtagScreen
    console.log('🔍 DEBUG: Navigating to HashtagScreen...');
    router.push(`/(tabs)/explore/HashtagScreen?hashtag=${cleanHashtag}`);
  };

  const handlePrivacyChange = async (newPrivacy: PrivacyLevel) => {
    try {
      const success = await updatePostPrivacy(post.id, newPrivacy);
      if (success) {
        // Cập nhật local state
        post.privacy = newPrivacy;
        
        // Gọi callback để cập nhật parent component
        onPrivacyChange?.(post.id, newPrivacy);
        
        Alert.alert(
          'Thành công',
          'Đã cập nhật quyền riêng tư của bài viết',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Lỗi',
          'Không thể cập nhật quyền riêng tư. Vui lòng thử lại.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error updating privacy:', error);
      Alert.alert(
        'Lỗi',
        'Có lỗi xảy ra. Vui lòng thử lại.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <Provider>
      <View style={[styles.container, { backgroundColor: currentThemeColors.background, borderBottomColor: currentThemeColors.border }]}>
        {/* New Post Header Component */}
        <PostHeader
          userInfo={userInfo}
          timestamp={post.timestamp}
          userId={post.userID}
          isOwner={owner}
          postPrivacy={post.privacy || 'public'}
          onUserPress={() => {
            router.push({
              pathname: "/UserProfileScreen",
              params: { userId: post.userID }
            });
          }}
          onDeletePost={handleDeletePost}
          onPrivacyChange={() => setShowPrivacySelector(true)}
        />
        
        <HashtagText
          text={post.content}
          onHashtagPress={handleHashtagPress}
          textStyle={[styles.paragraph, { color: currentThemeColors.text }]}
          hashtagStyle={{
            color: Colors.info,
            fontSize: 16,
            marginTop: 5
          }}
        />

        {/* Display hashtags if available */}
        {post.hashtags && post.hashtags.length > 0 && (
          <View style={styles.hashtagsContainer}>
            <HashtagDisplay
              hashtags={post.hashtags}
              maxDisplay={6}
              size="medium"
              onHashtagPress={handleHashtagPress}
            />
          </View>
        )}

        {/* DEBUG: Test navigation button */}
        <Button
          mode="outlined"
          onPress={() => {
            console.log('🔍 DEBUG: Test button clicked');
            router.push('/(tabs)/explore/HashtagScreen?hashtag=test');
          }}
          style={{ margin: 8 }}
        >
          🔍 TEST HASHTAG NAVIGATION
        </Button>

        {Array.isArray(post.images) && post.images.length > 0 && (
          <PostImages images={post.images} />
        )}

        {post.address && (
          <View style={styles.addressContainer}>
            <EvilIcons name="location" size={24} color={currentThemeColors.icon} />
            <Text style={[styles.addressText, { color: currentThemeColors.addressText }]}>
              {post.address}
            </Text>
          </View>
        )}

        {/* New Post Actions Component */}
        <PostActions
          post={post}
          currentUserId={currentUserId || ''}
          onLike={onLike}
          onComment={() => setShowCommentInput(!showCommentInput)}
          onShare={onShare}
        />

        {/* New Comment Section Component */}
        {showCommentInput && (
          <CommentSection
            comments={post.comments || []}
            onAddComment={handleAddComment}
            onLikeComment={handleLikeComment}
            onReplyComment={handleReplyComment}
            currentUserId={currentUserId || ''}
            currentUserAvatar={user.profileUrl}
          />
        )}

        {/* Privacy Selector Modal */}
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
    marginHorizontal: 16,
    marginBottom: 16,
    paddingBottom: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    padding: 20,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  paragraph: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
    color: '#333',
    fontWeight: '400',
  },
  hashtagsContainer: {
    marginBottom: 12,
    marginTop: -8,
  },
  addressContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  addressText: {
    fontSize: 12,
    marginLeft: 4,
  },
  // Image styles
  singleImage: {
    width: '100%',
    borderRadius: 12,
    marginBottom: 12,
  },
  twoImagesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  twoImage: {
    width: screenWidth1,
    height: 200,
    borderRadius: 12,
  },
  threeImagesContainer: {
    marginBottom: 12,
  },
  threeImagesTop: {
    marginBottom: 4,
  },
  threeImageLarge: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  threeImagesBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  threeImageSmall: {
    width: screenWidth1,
    height: 100,
    borderRadius: 12,
  },
  fourImagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  fourImageWrapper: {
    position: 'relative',
    width: '48%',
    height: 150,
    marginBottom: 4,
  },
  fourImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  overlayText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PostCard;
