import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, Alert, TextInput } from 'react-native';
import { IconButton, Menu, Provider } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from '@/firebaseConfig';
import { formatTime } from '@/utils/common';
import { ThemeContext } from '@/context/ThemeContext'; // Import ThemeContext
import { Colors } from '@/constants/Colors'; // Import Colors
import { useRouter } from 'expo-router';
import CustomImage from '../common/CustomImage'

const PostCard = ({ post, user = {}, onLike, onShare, onDeletePost, addComment }) => {
  const { theme } = useContext(ThemeContext); // Lấy theme từ context
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light; // Chọn màu theo theme
  const router = useRouter();
  const currentUserId = user?.uid;
  const [imageHeight, setImageHeight] = useState(250);
  const [menuVisible, setMenuVisible] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const isLiked = post.likes && post.likes.includes(currentUserId);
  console.log(321, post.image)
  useEffect(() => {
    if (post.image) {
      Image.getSize(post.image, (width, height) => {
        const aspectRatio = height / width;
        const containerWidth = 350;
        const calculatedHeight = containerWidth * aspectRatio;

        setImageHeight(Math.min(calculatedHeight, 400));
      });
    }
  }, [post.image]);

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

  return (
    <Provider>
      <View style={[styles.container, { backgroundColor: currentThemeColors.background, borderBottomColor: currentThemeColors.border }]}>
        <View style={styles.header}>
          <Image source={{ uri: user.profileUrl || 'default_avatar_url_here' }} style={styles.avatar} />
          <Text style={[styles.username, { color: currentThemeColors.text }]}>{user.username || 'Unknown User'}</Text>
          <Text style={[styles.time, { color: currentThemeColors.subtleText }]}>{formatTime(post.timestamp)}</Text>
          {post.ownerId === currentUserId && (
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
              <Menu.Item onPress={handleDeletePost} title="Delete Post" />
            </Menu>
          )}
        </View>
        <Text style={[styles.paragraph, { color: currentThemeColors.text }]}>{post.content}</Text>

        {post.image && (
          <CustomImage source={post.image} style={[styles.imageContainer, { height: imageHeight }]}></CustomImage>
        )}

        <View style={styles.content}>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => onLike(post.id, currentUserId, isLiked)} style={styles.actionButton}>
              <IconButton icon="heart" size={20} iconColor={isLiked ? currentThemeColors.tint : currentThemeColors.icon} />
              <Text style={[styles.actionText, { color: currentThemeColors.text }]}>{post.likes.length}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCommentInput(!showCommentInput)} style={styles.actionButton}>
              <IconButton icon="comment" size={20} iconColor={currentThemeColors.icon} />
              <Text style={[styles.actionText, { color: currentThemeColors.text }]}>{post.comments ? post.comments.length : 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onShare(post.id)} style={styles.actionButton}>
              <IconButton icon="share" size={20} iconColor={currentThemeColors.icon} />
              <Text style={[styles.actionText, { color: currentThemeColors.text }]}>{post.shares}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showCommentInput && (
          <View style={styles.commentInputContainer}>
            <TextInput
              style={[styles.commentInput, { borderColor: currentThemeColors.border }]}
              placeholder="Add a comment..."
              value={commentText}
              onChangeText={setCommentText}
              onSubmitEditing={handleAddComment}
              placeholderTextColor={currentThemeColors.placeholderText}
            />
            <TouchableOpacity onPress={handleAddComment}>
              <Text style={[styles.commentButton, { color: currentThemeColors.tint }]}>Send</Text>
            </TouchableOpacity>
          </View>
        )}

        {post.comments && post.comments.map((comment, index) => (
          <View key={index} style={[styles.commentContainer, { backgroundColor: currentThemeColors.background }]}>
            <Image source={{ uri: comment.avatar || 'default_avatar_url_here' }} style={styles.avatar} />
            <View style={styles.commentContent}>
              <Text style={[styles.commentUser, { color: currentThemeColors.text }]}>{comment.username || 'Unknown User'}</Text>
              <Text style={[styles.commentText, { color: currentThemeColors.text }]}>{comment.text}</Text>
              <Text style={[styles.commentTime, { color: currentThemeColors.subtleText }]}>{formatTime(comment.timestamp)}</Text>
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
    shadowOffset: {
      width: 0,
      height: 1,
    },
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'flex-end',
  },
  paragraph: {
    fontSize: 20,
    lineHeight: 26,
    marginBottom: 12,
  },
  time: {
    fontSize: 14,
    marginBottom: 8,
  },
  actions: {
    width: '50%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    marginLeft: 4,
    fontSize: 16,
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
});

export default PostCard;
