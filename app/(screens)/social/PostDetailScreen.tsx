import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '@/firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import PostCardStandard from '@/components/profile/PostCardStandard';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import socialNotificationService from '@/services/socialNotificationService';
import optimizedSocialService from '@/services/optimizedSocialService';

const { width, height } = Dimensions.get('window');

const PostDetailScreen = () => {
  const { postId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  const [post, setPost] = useState<any>(null);
  const [postUser, setPostUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scrollY] = useState(new Animated.Value(0));

  useEffect(() => {
    if (postId) {
      loadPost();
    }
  }, [postId]);

  const loadPost = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading post:', postId);

      const postRef = doc(db, 'posts', postId as string);
      const postSnap = await getDoc(postRef);

      if (postSnap.exists()) {
        const postData = { id: postSnap.id, ...postSnap.data() } as any;
        setPost(postData);

        if (postData.userID) {
          const userRef = doc(db, 'users', postData.userID);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            setPostUser({
              uid: userSnap.id,
              ...userSnap.data()
            });
          }
        }

        console.log('✅ Post loaded successfully');
      } else {
        console.log('❌ Post not found');
        setError('Bài viết không tồn tại hoặc đã bị xóa');
      }
    } catch (error) {
      console.error('❌ Error loading post:', error);
      setError('Không thể tải bài viết. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string, userId: string, isLiked: boolean) => {
    if (!user?.uid) return;

    try {
      const postRef = doc(db, 'posts', postId);

      if (isLiked) {
        // Unlike - remove userId from likes array
        await updateDoc(postRef, {
          likes: arrayRemove(userId)
        });
        // Update local state
        if (post) {
          setPost({
            ...post,
            likes: post.likes.filter((id: string) => id !== userId)
          });
        }
        // Remove notification
        if (post?.userID !== userId) {
          await socialNotificationService.removeLikeNotification(postId, post?.userID, userId);
        }
      } else {
        // Like - add userId to likes array
        await updateDoc(postRef, {
          likes: arrayUnion(userId)
        });
        // Update local state
        if (post) {
          setPost({
            ...post,
            likes: [...post.likes, userId]
          });
        }
        // Send notification to post owner
        if (post?.userID !== userId) {
          await socialNotificationService.createLikeNotification(
            postId,
            post?.userID,
            userId,
            user?.displayName || user?.email || 'Ai đó',
            user?.photoURL
          );
          console.log('✅ Like notification sent');
        }
      }
      console.log('Like toggled:', postId, isLiked ? 'unliked' : 'liked');
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleDeletePost = async () => {
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
              await deleteDoc(doc(db, 'posts', postId as string));
              console.log('✅ Post deleted successfully');
              router.back();
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Lỗi', 'Không thể xóa bài viết');
            }
          }
        }
      ]
    );
  };

  const addComment = async (postId: string, comment: any) => {
    if (!user?.uid || !comment?.text?.trim()) return;

    try {
      const newComment = {
        id: Date.now().toString(),
        userId: user.uid,
        username: user.displayName || user.email || 'Anonymous',
        userAvatar: user.photoURL,
        text: comment.text.trim(),
        timestamp: new Date().toISOString(),
        likes: [],
        replies: []
      };

      // Save comment to Firestore - notification được gửi bên trong addComment
      await optimizedSocialService.addComment(postId, newComment);

      // Update local state
      if (post) {
        const updatedComments = [...(post.comments || []), newComment];
        setPost({
          ...post,
          comments: updatedComments
        });
      }

      console.log('✅ Comment added:', postId);
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Lỗi', 'Không thể gửi bình luận');
    }
  };

  const handleShare = async (postId: string) => {
    console.log('Share post:', postId);
  };

  // Animated header opacity
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0.95, 1],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
        <StatusBar
          barStyle={theme === 'dark' ? "light-content" : "dark-content"}
          translucent
          backgroundColor="transparent"
        />

        <LinearGradient
          colors={theme === 'dark'
            ? ['rgba(18,18,18,0.98)', 'rgba(18,18,18,0.95)']
            : ['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.95)']}
          style={styles.header}
        >
          <SafeAreaView>
            <View style={styles.headerContent}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={[styles.iconButton, { backgroundColor: currentThemeColors.surface }]}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={22} color={currentThemeColors.text} />
              </TouchableOpacity>

              <Text style={[styles.headerTitle, { color: currentThemeColors.text }]}>
                Đang tải...
              </Text>

              <View style={styles.iconButton} />
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.centerContainer}>
          <View style={[styles.loadingCard, { backgroundColor: currentThemeColors.surface }]}>
            <View style={styles.loadingDots}>
              <View style={[styles.dot, { backgroundColor: currentThemeColors.tint }]} />
              <View style={[styles.dot, { backgroundColor: currentThemeColors.tint }]} />
              <View style={[styles.dot, { backgroundColor: currentThemeColors.tint }]} />
            </View>
            <Text style={[styles.loadingTitle, { color: currentThemeColors.text }]}>
              Đang tải bài viết
            </Text>
            <Text style={[styles.loadingSubtext, { color: currentThemeColors.mutedText }]}>
              Vui lòng chờ trong giây lát
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
        <StatusBar
          barStyle={theme === 'dark' ? "light-content" : "dark-content"}
          translucent
          backgroundColor="transparent"
        />

        <LinearGradient
          colors={theme === 'dark'
            ? ['rgba(18,18,18,0.98)', 'rgba(18,18,18,0.95)']
            : ['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.95)']}
          style={styles.header}
        >
          <SafeAreaView>
            <View style={styles.headerContent}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={[styles.iconButton, { backgroundColor: currentThemeColors.surface }]}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={22} color={currentThemeColors.text} />
              </TouchableOpacity>

              <Text style={[styles.headerTitle, { color: currentThemeColors.text }]}>
                Lỗi
              </Text>

              <View style={styles.iconButton} />
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.centerContainer}>
          <View style={[styles.errorCard, { backgroundColor: currentThemeColors.surface }]}>
            <View style={styles.errorIconContainer}>
              <LinearGradient
                colors={['#ff6b6b', '#ee5a6f']}
                style={styles.errorIconGradient}
              >
                <Ionicons name="alert-circle" size={40} color="#fff" />
              </LinearGradient>
            </View>

            <Text style={[styles.errorTitle, { color: currentThemeColors.text }]}>
              Không thể tải bài viết
            </Text>

            <Text style={[styles.errorMessage, { color: currentThemeColors.mutedText }]}>
              {error || 'Bài viết có thể đã bị xóa hoặc không tồn tại'}
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadPost}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.retryGradient}
              >
                <Ionicons name="refresh" size={20} color="#fff" />
                <Text style={styles.retryText}>Thử lại</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={[styles.backButtonText, { color: currentThemeColors.mutedText }]}>
                Quay lại
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }



  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <StatusBar
        barStyle={theme === 'dark' ? "light-content" : "dark-content"}
        translucent
        backgroundColor="transparent"
      />

      <Animated.View style={{ opacity: headerOpacity }}>
        <LinearGradient
          colors={theme === 'dark'
            ? ['rgba(18,18,18,0.98)', 'rgba(18,18,18,0.95)']
            : ['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.95)']}
          style={styles.header}
        >
          <SafeAreaView>
            <View style={styles.headerContent}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={[styles.iconButton, { backgroundColor: currentThemeColors.surface }]}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={22} color={currentThemeColors.text} />
              </TouchableOpacity>

              <View style={styles.headerTitleContainer}>
                <Text style={[styles.headerTitle, { color: currentThemeColors.text }]}>
                  Bài viết
                </Text>
                {postUser && (
                  <Text style={[styles.headerSubtitle, { color: currentThemeColors.mutedText }]}>
                    @{postUser?.username || postUser?.displayName || 'user'}
                  </Text>
                )}
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={[styles.iconButton, { backgroundColor: currentThemeColors.surface }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="ellipsis-horizontal" size={22} color={currentThemeColors.text} />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <View style={[styles.postCard, { backgroundColor: currentThemeColors.surface }]}>
          <PostCardStandard
            post={post}
            currentUserId={user?.uid || ''}
            currentUserAvatar={user?.photoURL}
            onLike={handleLike}
            onComment={(postId, comment) => addComment(postId, {
              text: comment,
              userId: user?.uid,
              username: user?.displayName || user?.email
            })}
            onShare={handleShare}
            onDelete={handleDeletePost}
            onUserPress={(userId) => router.push({ pathname: '/(screens)/user/UserProfileScreen', params: { userId } })}
            isOwner={post.userID === user?.uid}
          />
        </View>

      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 48 : 8,
    minHeight: 56,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.7,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  scrollView: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 100 : 112,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  statsContainer: {
    marginHorizontal: 16,
    marginTop: 4,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 120 : 140,
  },
  loadingCard: {
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    width: width * 0.85,
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 15,
    textAlign: 'center',
    opacity: 0.7,
  },
  errorCard: {
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    width: width * 0.85,
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  errorIconContainer: {
    marginBottom: 24,
  },
  errorIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    opacity: 0.8,
  },
  retryButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  retryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  postCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});

export default PostDetailScreen;
