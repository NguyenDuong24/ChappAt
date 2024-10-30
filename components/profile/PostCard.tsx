// components/PostCard.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, Alert, TextInput } from 'react-native';
import { IconButton, Menu, Provider } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { deleteDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db } from '@/firebaseConfig';
import { formatTime } from '@/utils/common';

const PostCard = ({ post, user, onLike, onShare, onDeletePost, addComment }) => {
  const currentUserId = user?.uid;
  const [imageHeight, setImageHeight] = useState(250);
  const [menuVisible, setMenuVisible] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const isLiked = post.likes && post.likes.includes(currentUserId);

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
              onDeletePost(); // Refresh posts after deletion
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
        username: user.username, // Thay bằng tên thực của người dùng
        avatar: user.profileUrl, // Thay bằng URL thật của avatar
      };
      
      await addComment(post.id, newComment); // Cập nhật hàm addComment để chấp nhận newComment
  
      post.comments = [...post.comments, newComment]; // Cập nhật danh sách bình luận trong bài viết
      setCommentText(''); // Reset comment input
      setShowCommentInput(false); // Ẩn TextInput sau khi gửi
    }
  };

  return (
    <Provider>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.time}>{formatTime(post.timestamp)}</Text>
          {post.ownerId === currentUserId && (
            <Menu
              style={{ position: 'absolute', top: 35, width: 'auto' }}
              visible={menuVisible}
              onDismiss={closeMenu}
              anchor={
                <TouchableOpacity onPress={openMenu}>
                  <MaterialIcons name="more-vert" size={24} color="black" />
                </TouchableOpacity>
              }
            >
              <Menu.Item onPress={handleDeletePost} title="Delete Post" />
            </Menu>
          )}
        </View>
        <Text style={styles.paragraph}>{post.content}</Text>

        {post.image && (
          <TouchableOpacity onPress={() => console.log(post.id)} style={[styles.imageContainer, { height: imageHeight }]}>
            <Image source={{ uri: post.image }} style={styles.image} resizeMode="contain" />
          </TouchableOpacity>
        )}

        <View style={styles.content}>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => onLike(post.id, currentUserId, isLiked)} style={styles.actionButton}>
              <IconButton icon="heart" size={20} iconColor={isLiked ? 'red' : 'grey'} />
              <Text style={styles.actionText}>{post.likes.length}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCommentInput(!showCommentInput)} style={styles.actionButton}>
              <IconButton icon="comment" size={20} />
              <Text style={styles.actionText}>{post.comments ? post.comments.length : 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onShare(post.id)} style={styles.actionButton}>
              <IconButton icon="share" size={20} />
              <Text style={styles.actionText}>{post.shares}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showCommentInput && (
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              value={commentText}
              onChangeText={setCommentText}
              onSubmitEditing={handleAddComment} // Gọi hàm thêm bình luận khi nhấn Enter
            />
            <TouchableOpacity onPress={handleAddComment}>
              <Text style={styles.commentButton}>Send</Text>
            </TouchableOpacity>
          </View>
        )}

{
  console.log(1234, formatTime(post.comments[0]?.timestamp))
}
        {showCommentInput && post.comments && post.comments.map((comment, index) => (
          <View key={index} style={styles.commentContainer}>
            <Image source={{ uri: comment.avatar }} style={styles.avatar} />
            <View style={styles.commentContent}>
              <Text style={styles.commentUser}>{comment.username}</Text>
              <Text style={styles.commentText}>{comment.text}</Text>
              <Text style={styles.commentTime}>{formatTime(comment.timestamp)}</Text>
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
    borderBottomColor: '#ddd',
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    padding: 15
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: '#999',
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
    color: '#333',
  },
  commentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 50,
    marginRight: 8,
  },
  commentContent: {
    flex: 1,
    paddingVertical: 4,
  },
  commentUser: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#333',
  },
  commentText: {
    fontSize: 13,
    color: '#333',
    marginBottom: 2,
  },
  commentTime: {
    fontSize: 12,
    color: '#999',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 8,
    marginRight: 8,
  },
  commentButton: {
    color: '#007BFF',
    fontWeight: 'bold',
  },
});

export default PostCard;
