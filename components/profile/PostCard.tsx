import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  TextInput,
  Image,
  Dimensions
} from 'react-native';
import { IconButton, Menu, Provider } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import EvilIcons from '@expo/vector-icons/EvilIcons';
import { deleteDoc, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/firebaseConfig';
import { formatTime } from '@/utils/common';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import CustomImage from '../common/CustomImage';
import HashtagText from '../common/HashtagText';

const { width: screenWidth } = Dimensions.get('window');

const screenWidth1 = (screenWidth/2) - ((screenWidth * 10) / 100) 

const PostImages = ({ images }) => {
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
        {images.map((img, idx) => (
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
          {images.slice(1).map((img, idx) => (
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
  );
};

const PostCard = ({ post, user = {}, onLike, onShare, onDeletePost, addComment, owner }) => {
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const currentUserId = user?.uid;
  const [menuVisible, setMenuVisible] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);
  const isLiked = post.likes && post.likes.includes(currentUserId);
  const [userInfo, setUserInfo] = useState();

  const fetchUserInfo = async () => {
    if (!post.userID) return;
    try {
      const userRef = doc(db, 'users', post.userID);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setUserInfo(userSnap.data());
      } else {
        console.log('No such user!');
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, [post]);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleDeletePost = async () => {
    closeMenu();
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

  const handleAddComment = async () => {
    if (commentText.trim()) {
      const newComment = {
        userId: currentUserId,
        text: commentText,
        timestamp: new Date(),
        username: user.username || 'Unknown User',
        avatar: user.profileUrl || 'default_avatar_url_here',
      };

      await addComment(post.id, newComment);
      post.comments = [...post.comments, newComment];
      setCommentText('');
      setShowCommentInput(false);
    }
  };

  const handleHashtagPress = (hashtag) => {
    console.log('Hashtag được nhấn:', hashtag);
    // Ví dụ: chuyển hướng đến trang hiển thị bài viết theo hashtag
    // router.push(`/hashtag/${hashtag.substring(1)}`); // loại bỏ dấu #
  };
  const toggleComments = () => setIsCommentsExpanded(!isCommentsExpanded);

  return (
    <Provider>
      <View style={[styles.container, { backgroundColor: currentThemeColors.background, borderBottomColor: currentThemeColors.border }]}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => {
              router.push({
                pathname: "/UserProfileScreen",
                params: { userId: post.userID }
              });
            }}
            style={styles.headerUserContainer}
          >
            <CustomImage
              source={userInfo?.profileUrl || 'default_avatar_url_here'}
              style={styles.avatar}
            />
            <Text style={[styles.username, { color: currentThemeColors.text }]}>
              {userInfo?.username || 'Unknown User'}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.time, { color: currentThemeColors.subtleText }]}>
            {formatTime(post.timestamp)}
          </Text>
          {owner && (
            <Menu
              style={{ position: 'absolute', top: 35, width: 'auto' }}
              visible={menuVisible}
              onDismiss={closeMenu}
              anchor={
                <TouchableOpacity onPress={openMenu}>
                  <MaterialIcons name="more-vert" size={24} color={currentThemeColors.icon} />
                </TouchableOpacity>
              }
            >
              <Menu.Item onPress={handleDeletePost} title="Xóa bài viết" />
            </Menu>
          )}
        </View>
        <HashtagText
              text={post.content}
              onHashtagPress={handleHashtagPress}
              textStyle={[styles.paragraph, { color: currentThemeColors.text }]}
              hashtagStyle={{
                color : Colors.info,
                fontSize : 16,
                marginTop: 5
              }}
        />

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

        <View style={styles.content}>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => onLike(post.id, currentUserId, isLiked)} style={styles.actionButton}>
              <IconButton icon="heart" size={20} iconColor={isLiked ? currentThemeColors.tint : currentThemeColors.icon} />
              <Text style={[styles.actionText, { color: currentThemeColors.text }]}>
                {post.likes.length}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCommentInput(!showCommentInput)} style={styles.actionButton}>
              <IconButton icon="comment" size={20} iconColor={currentThemeColors.icon} />
              <Text style={[styles.actionText, { color: currentThemeColors.text }]}>
                {post.comments ? post.comments.length : 0}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onShare(post.id)} style={styles.actionButton}>
              <IconButton icon="share" size={20} iconColor={currentThemeColors.icon} />
              <Text style={[styles.actionText, { color: currentThemeColors.text }]}>
                {post.shares}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {showCommentInput && (
          <View style={styles.commentInputContainer}>
            <TextInput
              style={[styles.commentInput, { borderColor: currentThemeColors.border, color: currentThemeColors.text }]}
              placeholder="Add a comment..."
              value={commentText}
              onChangeText={setCommentText}
              onSubmitEditing={handleAddComment}
              placeholderTextColor={currentThemeColors.placeholderText}
            />
            <TouchableOpacity onPress={handleAddComment}>
              <Text style={[styles.commentButton, { color: currentThemeColors.tint }]}>
                Send
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {post.comments && post.comments.length > 0 && (
          <TouchableOpacity onPress={toggleComments} style={styles.expandButton}>
            <MaterialIcons
              name={isCommentsExpanded ? 'expand-less' : 'expand-more'}
              size={24}
              color={currentThemeColors.icon}
            />
            <Text style={[styles.expandText, { color: currentThemeColors.text }]}>
              {isCommentsExpanded ? 'Hide Comments' : 'Show Comments'}
            </Text>
          </TouchableOpacity>
        )}

        {isCommentsExpanded && post.comments && post.comments.map((comment, index) => (
          <View key={index} style={[styles.commentContainer, { backgroundColor: currentThemeColors.background }]}>
            <CustomImage
              source={comment.avatar || 'default_avatar_url_here'}
              style={styles.avatar}
            />
            <View style={styles.commentContent}>
              <Text style={[styles.commentUser, { color: currentThemeColors.text }]}>
                {comment.username || 'Unknown User'}
              </Text>
              <Text style={[styles.commentText, { color: currentThemeColors.text }]}>
                {comment.text}
              </Text>
              <Text style={[styles.commentTime, { color: currentThemeColors.subtleText }]}>
                {formatTime(comment.timestamp)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    padding: 15,
  },
  header: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerUserContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    width: '90%',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 18,
    flex: 1,
  },
  paragraph: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 12,
  },
  time: {
    fontSize: 12,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'flex-end',
  },
  actions: {
    width: '50%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    marginLeft: 4,
    fontSize: 14,
  },
  commentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  commentContent: {
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  commentUser: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  commentText: {
    fontSize: 14,
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 12,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 5,
    padding: 8,
    marginRight: 8,
  },
  commentButton: {
    fontWeight: 'bold',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandText: {
    fontSize: 12,
    marginLeft: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  addressText: {
    fontSize: 12,
  },
  singleImage: {
    width: '100%',
    borderRadius: 8,
    marginBottom: 12,
  },
  twoImagesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  twoImage: {
    width: screenWidth1,
    height: 200,
    borderRadius: 8,
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
    borderRadius: 8,
  },
  threeImagesBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  threeImageSmall: {
    width: screenWidth1,
    height: 100,
    borderRadius: 8,
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
    borderRadius: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  overlayText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default PostCard;
