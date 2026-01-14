import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Animated,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useAuth } from '@/context/authContext';
import { useThemedColors } from '@/hooks/useThemedColors';
import PostCard from '@/components/profile/PostCard';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { formatTime } from '@/utils/common';
import socialNotificationService from '@/services/socialNotificationService';
import optimizedSocialService from '@/services/optimizedSocialService';

const { width } = Dimensions.get('window');

const PostDetailScreen = () => {
  const { postId } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const colors = useThemedColors();

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!postId) return;

    const postRef = doc(db, 'posts', postId as string);
    const unsubscribe = onSnapshot(postRef, (docSnap) => {
      if (docSnap.exists()) {
        setPost({ id: docSnap.id, ...docSnap.data() });
      } else {
        Alert.alert('Lỗi', 'Bài viết không tồn tại hoặc đã bị xóa');
        router.back();
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching post:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [postId]);

  const handleLike = async (postId: string, userId: string, isLiked: boolean) => {
    if (!user) return;
    try {
      const postRef = doc(db, 'posts', postId);
      if (isLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(userId)
        });
        await socialNotificationService.removeLikeNotification(postId, post.userID, userId);
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(userId)
        });
        if (post.userID !== userId) {
          await socialNotificationService.createLikeNotification(postId, post.userID, userId);
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim() || !user || submittingComment) return;

    setSubmittingComment(true);
    const trimmedText = commentText.trim();
    const newComment = {
      id: Date.now().toString(),
      userId: user.uid,
      username: user.username || 'Người dùng',
      avatar: user.profileUrl || '',
      text: trimmedText,
      timestamp: Date.now(),
    };

    try {
      await optimizedSocialService.addComment(post.id, newComment);
      if (post.userID !== user.uid) {
        await socialNotificationService.createCommentNotification(post.id, post.userID, user.uid, undefined, trimmedText);
      }
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Lỗi', 'Không thể gửi bình luận');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeletePost = () => {
    Alert.alert('Xác nhận', 'Bạn có chắc chắn muốn xóa bài viết này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await optimizedSocialService.deletePost(post.id);
            router.back();
          } catch (error) {
            console.error('Error deleting post:', error);
            Alert.alert('Lỗi', 'Không thể xóa bài viết');
          }
        }
      }
    ]);
  };

  const addComment = (postId: string, text: string) => {
    setCommentText(text);
    handleCommentSubmit();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!post) return null;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Custom Header */}
      <Animated.View style={[styles.header, { backgroundColor: colors.surface, opacity: headerOpacity }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Chi tiết bài viết</Text>
      </Animated.View>

      <TouchableOpacity
        style={[styles.backButton, { backgroundColor: colors.surface + '80' }]}
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Post Card */}
        <View style={styles.postWrapper}>
          <PostCard
            post={post}
            onLike={handleLike}
            onDeletePost={handleDeletePost}
            owner={post.userID === user?.uid}
          />
        </View>

        {/* Comments Section */}
        <View style={[styles.commentsSection, { backgroundColor: colors.surface }]}>
          <View style={styles.commentsHeader}>
            <Text style={[styles.commentsTitle, { color: colors.text }]}>
              Bình luận ({post.comments?.length || 0})
            </Text>
          </View>

          {post.comments && post.comments.length > 0 ? (
            post.comments.map((comment: any, index: number) => (
              <View key={comment.id || index} style={styles.commentItem}>
                <TouchableOpacity onPress={() => router.push(`/(screens)/user/UserProfileScreen?userId=${comment.userId}`)}>
                  <View style={styles.commentAvatarContainer}>
                    <View style={[styles.commentAvatar, { backgroundColor: colors.border }]}>
                      {comment.avatar ? (
                        <Animated.Image
                          source={{ uri: comment.avatar }}
                          style={styles.commentAvatarImage}
                        />
                      ) : (
                        <Ionicons name="person" size={20} color={colors.subtleText} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <Text style={[styles.commentUsername, { color: colors.text }]}>{comment.username}</Text>
                    <Text style={[styles.commentTime, { color: colors.subtleText }]}>
                      {formatTime(comment.timestamp)}
                    </Text>
                  </View>
                  <Text style={[styles.commentText, { color: colors.text }]}>{comment.text}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyComments}>
              <MaterialCommunityIcons name="comment-outline" size={48} color={colors.border} />
              <Text style={[styles.emptyCommentsText, { color: colors.subtleText }]}>
                Chưa có bình luận nào. Hãy là người đầu tiên!
              </Text>
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Comment Input */}
      <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
          placeholder="Viết bình luận..."
          placeholderTextColor={colors.subtleText}
          value={commentText}
          onChangeText={setCommentText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: commentText.trim() ? colors.primary : colors.border }]}
          onPress={handleCommentSubmit}
          disabled={!commentText.trim() || submittingComment}
        >
          {submittingComment ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="send" size={20} color="white" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    paddingTop: 45,
    alignItems: 'center',
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  backButton: {
    position: 'absolute',
    top: 45,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 11,
  },
  scrollContent: { paddingTop: 0, paddingBottom: 100 },
  postWrapper: { marginBottom: 8 },
  commentsSection: { flex: 1, paddingBottom: 20 },
  commentsHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  commentsTitle: { fontSize: 16, fontWeight: '600' },
  commentItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.02)' },
  commentAvatarContainer: { marginRight: 12 },
  commentAvatar: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  commentAvatarImage: { width: '100%', height: '100%' },
  commentContent: { flex: 1 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  commentUsername: { fontSize: 14, fontWeight: '600' },
  commentTime: { fontSize: 12 },
  commentText: { fontSize: 14, lineHeight: 20 },
  emptyComments: { padding: 40, alignItems: 'center' },
  emptyCommentsText: { marginTop: 12, textAlign: 'center' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingBottom: Platform.OS === 'ios' ? 30 : 12, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100, fontSize: 15 },
  sendButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
});

export default PostDetailScreen;