import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Chip } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemeContext } from '@/context/ThemeContext';
import { useAuth } from '@/context/authContext';
import { useUserContext } from '@/context/UserContext';
import { Colors } from '@/constants/Colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getPostsByHashtag } from '@/utils/hashtagUtils';
import PostCard from '@/components/profile/PostCard';

interface PostData {
  id: string;
  content: string;
  hashtags?: string[];
  images?: string[];
  timestamp: any;
  userID: string;
  username: string;
  likes?: string[];
  comments?: any[];
  shares?: number;
  address?: string;
}

const HashtagScreen: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const { getUserInfo } = useUserContext();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userInfoCache, setUserInfoCache] = useState<{[key: string]: any}>({});
  
  const hashtag = params.hashtag as string || '';
  const displayHashtag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;

  useEffect(() => {
    console.log('🔍 HashtagScreen mounted');
    console.log('🔍 HashtagScreen params:', params);
    console.log('🔍 HashtagScreen hashtag:', hashtag);
    
    if (hashtag) {
      console.log('🔍 Loading posts for hashtag:', hashtag);
      loadPosts();
    } else {
      console.warn('🔍 No hashtag parameter found!');
    }
  }, [hashtag]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      console.log('🔍 Calling getPostsByHashtag with:', displayHashtag);
      
      // Gọi API để lấy posts theo hashtag
      const hashtagPosts = await getPostsByHashtag(displayHashtag, 50);
      console.log('🔍 Found posts:', hashtagPosts.length);
      
      // Sắp xếp theo thời gian mới nhất trước
      const sortedPosts = hashtagPosts.sort((a, b) => {
        const timeA = a.timestamp?.toDate?.() || (a.timestamp instanceof Date ? a.timestamp : new Date());
        const timeB = b.timestamp?.toDate?.() || (b.timestamp instanceof Date ? b.timestamp : new Date());
        return timeB.getTime() - timeA.getTime();
      });
      
      setPosts(sortedPosts);
      
      // Preload thông tin user cho tất cả posts
      const userIds = [...new Set(sortedPosts.map(post => post.userID))];
      const userInfoPromises = userIds.map(async (userId) => {
        if (!userInfoCache[userId]) {
          try {
            const userInfo = await getUserInfo(userId);
            return { userId, userInfo };
          } catch (error) {
            console.error('Error fetching user info:', error);
            return { userId, userInfo: null };
          }
        }
        return { userId, userInfo: userInfoCache[userId] };
      });
      
      const userInfoResults = await Promise.all(userInfoPromises);
      const newUserInfoCache = { ...userInfoCache };
      userInfoResults.forEach(({ userId, userInfo }) => {
        if (userInfo) {
          newUserInfoCache[userId] = userInfo;
        }
      });
      setUserInfoCache(newUserInfoCache);
      
    } catch (error) {
      console.error('🔍 Error loading hashtag posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const handleLike = async (postId: string, userId: string, isLiked: boolean) => {
    // Implement like functionality
    console.log('Like post:', postId, userId, isLiked);
  };

  const handleShare = async (postId: string) => {
    // Implement share functionality
    console.log('Share post:', postId);
  };

  const handleDeletePost = () => {
    // Refresh posts after delete
    loadPosts();
  };

  const addComment = async (postId: string, comment: any) => {
    // Implement add comment functionality
    console.log('Add comment:', postId, comment);
  };

  const renderPostItem = ({ item: post }: { item: PostData }) => {
    const userInfo = userInfoCache[post.userID];
    const isOwner = user?.uid === post.userID;

    // Ensure required fields have default values
    const postWithDefaults = {
      ...post,
      likes: post.likes || [],
      shares: post.shares || 0,
      comments: post.comments || []
    };

    return (
      <PostCard
        post={postWithDefaults}
        user={user}
        onLike={handleLike}
        onShare={handleShare}
        onDeletePost={handleDeletePost}
        addComment={addComment}
        owner={isOwner}
        postUserInfo={userInfo}
      />
    );
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: currentThemeColors.surface }]}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <MaterialIcons name="arrow-back" size={24} color={currentThemeColors.text} />
      </TouchableOpacity>
      
      <View style={styles.headerContent}>
        <Text style={[styles.hashtagTitle, { color: Colors.primary }]}>
          {displayHashtag}
        </Text>
        <Text style={[styles.postCount, { color: currentThemeColors.subtleText }]}>
          {posts.length} bài viết • Sắp xếp mới nhất
        </Text>
      </View>
      
      <View style={styles.headerActions}>
        <Chip
          style={[styles.trendingChip, { backgroundColor: Colors.accent + '20' }]}
          textStyle={{ color: Colors.accent, fontSize: 12 }}
          compact
        >
          🔥 Hot
        </Chip>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="tag" size={80} color={currentThemeColors.subtleText} />
      <Text style={[styles.emptyTitle, { color: currentThemeColors.text }]}>
        Chưa có bài viết nào
      </Text>
      <Text style={[styles.emptySubtitle, { color: currentThemeColors.subtleText }]}>
        Chưa có ai sử dụng hashtag {displayHashtag}.{'\n'}
        Hãy là người đầu tiên tạo bài viết với hashtag này!
      </Text>
      <TouchableOpacity
        style={[styles.createPostButton, { backgroundColor: Colors.primary }]}
        onPress={() => {
          router.dismiss();
          router.push('/(tabs)/profile/create');
        }}
      >
        <MaterialIcons name="add" size={20} color="white" />
        <Text style={styles.createPostText}>Tạo bài viết</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
        <StatusBar
          barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={currentThemeColors.background}
        />
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.loadingText, { color: currentThemeColors.text }]}>
            Đang tải bài viết cho {displayHashtag}...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={currentThemeColors.background}
      />
      <FlatList
        data={posts}
        renderItem={renderPostItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={posts.length === 0 ? styles.emptyContentContainer : undefined}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 20,
  },
  headerContent: {
    flex: 1,
  },
  hashtagTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  postCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  headerActions: {
    alignItems: 'flex-end',
  },
  trendingChip: {
    height: 28,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyContentContainer: {
    flexGrow: 1,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  createPostText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  separator: {
    height: 8,
  },
});

export default HashtagScreen;
