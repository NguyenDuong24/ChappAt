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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '@/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import PostCard from '@/components/profile/PostCard';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';

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

  useEffect(() => {
    if (postId) {
      loadPost();
    }
  }, [postId]);

  const loadPost = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading post:', postId);

      // Try to load post from posts collection
      const postRef = doc(db, 'posts', postId as string);
      const postSnap = await getDoc(postRef);

      if (postSnap.exists()) {
        const postData = { id: postSnap.id, ...postSnap.data() } as any;
        setPost(postData);
        
        // Load post author info
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
    // Implement like functionality
    console.log('Like post:', postId, userId, isLiked);
  };

  const handleDeletePost = () => {
    // Implement delete functionality
    Alert.alert(
      'Xóa bài viết',
      'Bạn có chắc muốn xóa bài viết này?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xóa', 
          style: 'destructive',
          onPress: () => {
            // Delete post and go back
            router.back();
          }
        }
      ]
    );
  };

  const addComment = async (postId: string, comment: any) => {
    // Implement add comment functionality
    console.log('Add comment:', postId, comment);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
        <StatusBar 
          barStyle={theme === 'dark' ? "light-content" : "dark-content"} 
          backgroundColor={currentThemeColors.background} 
        />
        
        {/* Modern Header with Blur Effect */}
        <LinearGradient
          colors={theme === 'dark' 
            ? ['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.7)'] 
            : ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.8)']}
          style={styles.modernHeader}
        >
          <SafeAreaView>
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => router.back()} style={styles.modernBackButton}>
                <View style={[styles.iconContainer, { backgroundColor: currentThemeColors.surface }]}>
                  <Ionicons name="arrow-back" size={20} color={currentThemeColors.text} />
                </View>
              </TouchableOpacity>
              <Text style={[styles.modernTitle, { color: currentThemeColors.text }]}>Chi tiết bài viết</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity style={[styles.iconContainer, { backgroundColor: currentThemeColors.surface }]}>
                  <Ionicons name="share-outline" size={18} color={currentThemeColors.text} />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* Modern Loading State */}
        <View style={styles.modernLoadingContainer}>
          <View style={[styles.loadingCard, { backgroundColor: currentThemeColors.surface }]}>
            <ActivityIndicator size="large" color={currentThemeColors.tint} />
            <Text style={[styles.modernLoadingText, { color: currentThemeColors.text }]}>
              Đang tải bài viết...
            </Text>
            <Text style={[styles.loadingSubtext, { color: currentThemeColors.mutedText }]}>
              Vui lòng chờ trong giây lát
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
        <StatusBar 
          barStyle={theme === 'dark' ? "light-content" : "dark-content"} 
          backgroundColor={currentThemeColors.background} 
        />
        
        {/* Modern Header */}
        <LinearGradient
          colors={theme === 'dark' 
            ? ['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.7)'] 
            : ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.8)']}
          style={styles.modernHeader}
        >
          <SafeAreaView>
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => router.back()} style={styles.modernBackButton}>
                <View style={[styles.iconContainer, { backgroundColor: currentThemeColors.surface }]}>
                  <Ionicons name="arrow-back" size={20} color={currentThemeColors.text} />
                </View>
              </TouchableOpacity>
              <Text style={[styles.modernTitle, { color: currentThemeColors.text }]}>Bài viết không tồn tại</Text>
              <View style={styles.headerActions} />
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* Modern Error State */}
        <View style={styles.modernLoadingContainer}>
          <View style={[styles.errorCard, { backgroundColor: currentThemeColors.surface }]}>
            <View style={[styles.errorIconContainer, { backgroundColor: '#ff4757' + '20' }]}>
              <Ionicons name="alert-circle-outline" size={48} color="#ff4757" />
            </View>
            <Text style={[styles.errorTitle, { color: currentThemeColors.text }]}>
              Không thể tải bài viết
            </Text>
            <Text style={[styles.errorMessage, { color: currentThemeColors.mutedText }]}>
              {error}
            </Text>
            <TouchableOpacity style={styles.modernRetryButton} onPress={loadPost}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.retryButtonGradient}
              >
                <Ionicons name="refresh" size={20} color="#fff" />
                <Text style={styles.retryButtonText}>Thử lại</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Bài viết</Text>
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="info-outline" size={64} color="#6c757d" />
          <Text style={styles.errorTitle}>Không tìm thấy bài viết</Text>
          <Text style={styles.errorMessage}>Bài viết có thể đã bị xóa hoặc không tồn tại.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <StatusBar 
        barStyle={theme === 'dark' ? "light-content" : "dark-content"} 
        backgroundColor={currentThemeColors.background} 
      />
      
      {/* Modern Header with Floating Design */}
      <LinearGradient
        colors={theme === 'dark' 
          ? ['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.8)'] 
          : ['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.9)']}
        style={styles.modernHeader}
      >
        <SafeAreaView>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.modernBackButton}>
              <View style={[styles.iconContainer, { backgroundColor: currentThemeColors.surface }]}>
                <Ionicons name="arrow-back" size={20} color={currentThemeColors.text} />
              </View>
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.modernTitle, { color: currentThemeColors.text }]}>
                Bài viết
              </Text>
              {post && (
                <Text style={[styles.headerSubtitle, { color: currentThemeColors.mutedText }]}>
                  {postUser?.username || postUser?.displayName || 'Người dùng'}
                </Text>
              )}
            </View>
            
            <View style={styles.headerActions}>
              <TouchableOpacity style={[styles.iconContainer, { backgroundColor: currentThemeColors.surface }]}>
                <Ionicons name="share-outline" size={18} color={currentThemeColors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconContainer, { backgroundColor: currentThemeColors.surface, marginLeft: 8 }]}>
                <Ionicons name="ellipsis-vertical" size={18} color={currentThemeColors.text} />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Main Content with Modern Styling */}
      <ScrollView 
        style={styles.modernContent} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Post Card with Enhanced Container */}
        <View style={[styles.postContainer, { backgroundColor: currentThemeColors.surface }]}>
          <PostCard
            post={post}
            user={postUser || { uid: post.userID }}
            onLike={handleLike}
            onDeletePost={handleDeletePost}
            addComment={addComment}
            owner={post.userID === user?.uid}
            postUserInfo={postUser ? {
              username: postUser.username || postUser.displayName || 'Unknown User',
              profileUrl: postUser.profileUrl || postUser.photoURL
            } : undefined}
          />
        </View>
        
        {/* Modern Post Meta Info */}
        <View style={[styles.modernPostInfo, { backgroundColor: currentThemeColors.surface }]}>
          <View style={styles.metaRow}>
            <Ionicons name="information-circle-outline" size={16} color={currentThemeColors.mutedText} />
            <Text style={[styles.metaText, { color: currentThemeColors.mutedText }]}>
              Post ID: {postId}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="navigate-outline" size={16} color={currentThemeColors.mutedText} />
            <Text style={[styles.metaText, { color: currentThemeColors.mutedText }]}>
              Mở từ thông báo
            </Text>
          </View>
          {post?.timestamp && (
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={16} color={currentThemeColors.mutedText} />
              <Text style={[styles.metaText, { color: currentThemeColors.mutedText }]}>
                {new Date(post.timestamp.seconds * 1000).toLocaleDateString('vi-VN')}
              </Text>
            </View>
          )}
        </View>

        {/* Floating Action Button */}
        <TouchableOpacity style={styles.floatingActionButton}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.fabGradient}
          >
            <Ionicons name="heart-outline" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // Legacy styles for fallback
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  postInfo: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    margin: 16,
    borderRadius: 8,
  },
  postInfoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },

  // Modern UI Styles
  modernHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    height: 56,
  },
  modernBackButton: {
    marginRight: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  modernTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Loading States
  modernLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 120,
  },
  loadingCard: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: width * 0.7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modernLoadingText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
  },

  // Error States
  errorCard: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: width * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modernRetryButton: {
    marginTop: 24,
    borderRadius: 25,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },

  // Content Styles
  modernContent: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  postContainer: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modernPostInfo: {
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Floating Action Button
  floatingActionButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PostDetailScreen;

