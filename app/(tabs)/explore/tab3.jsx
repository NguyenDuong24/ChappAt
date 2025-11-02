import React, { useContext, useRef, useState, useEffect } from 'react';
import { View, ActivityIndicator, Alert, Text, RefreshControl, Animated } from 'react-native';
import PostCard from '@/components/profile/PostCard';
import { useAuth } from '@/context/authContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useExploreHeader } from '@/context/ExploreHeaderContext';
import { collection, query, where, getDocs, limit, startAfter, doc, deleteDoc, updateDoc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { followService } from '@/services/followService';

const POSTS_PER_PAGE = 10;

const Tab3Screen = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [followingIds, setFollowingIds] = useState([]);
  const [followingFetched, setFollowingFetched] = useState(false);

  // header scroll binding
  const headerContext = useExploreHeader();
  const { scrollY, handleScroll, effectiveHeaderHeight } = headerContext || {};
  
  const defaultScrollY = useRef(new Animated.Value(0)).current;
  const defaultEffectiveHeaderHeight = useRef(new Animated.Value(300)).current;
  const onScroll = handleScroll || Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY || defaultScrollY } } }], 
    { 
      useNativeDriver: false,
      listener: () => {},
    }
  );

  // Safe context usage with fallback
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  // Fetch list of users the current user is following
  const fetchFollowingUsers = async () => {
    try {
      if (!user?.uid) return [];
      
      const following = await followService.getFollowing(user.uid);
      const ids = following.map(f => f.followingId);
      return ids;
    } catch (error) {
      console.error('Error fetching following users:', error);
      return [];
    }
  };

  // Fetch posts from users that current user is following
  const fetchFollowingPosts = async (isLoadMore = false) => {
    try {
      if (!user?.uid) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      // Get list of following users
      let ids = followingIds;
      if (!isLoadMore && !followingFetched) {
        ids = await fetchFollowingUsers();
        setFollowingIds(ids);
        setFollowingFetched(true);
      }

      if (ids.length === 0) {
        setPosts([]);
        setLoading(false);
        setLoadingMore(false);
        setHasMore(false);
        return;
      }

      // Query posts from all following users in batches to reduce requests
      let allPosts = [];
      const batchSize = 10; // Firestore 'in' query limit is 10
      
      for (let i = 0; i < ids.length; i += batchSize) {
        const batchIds = ids.slice(i, i + batchSize);
        
        // Query batch of users
        const q = query(
          collection(db, 'posts'),
          where('userID', 'in', batchIds),
          limit(500) // Get more posts per batch since we're batching users
        );

        const snapshot = await getDocs(q);
        const batchPosts = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        allPosts = [...allPosts, ...batchPosts];
      }

      // Sort all posts by createdAt on client side
      allPosts.sort((a, b) => {
        const aTime = a.timestamp?.toMillis?.() || a.timestamp?.seconds * 1000 || 0;
        const bTime = b.timestamp?.toMillis?.() || b.timestamp?.seconds * 1000 || 0;
        return bTime - aTime;
      });

      // Implement pagination on client side
      const startIndex = isLoadMore ? posts.length : 0;
      const endIndex = startIndex + POSTS_PER_PAGE;
      const pagePosts = allPosts.slice(startIndex, endIndex);
      
      // Check if we have more posts
      setHasMore(endIndex < allPosts.length);

      if (isLoadMore) {
        setPosts(prev => [...prev, ...pagePosts]);
      } else {
        setPosts(pagePosts);
      }
      
      setLoading(false);
      setLoadingMore(false);
    } catch (err) {
      console.error('Error fetching following posts:', err);
      setError(err.message);
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchFollowingPosts();
  }, [user?.uid]);

  const onRefresh = async () => {
    setRefreshing(true);
    setLastDoc(null);
    setHasMore(true);
    setFollowingFetched(false); // Reset to re-fetch following on refresh
    await fetchFollowingPosts(false);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      fetchFollowingPosts(true);
    }
  };

  const handleDeletePost = async (postId) => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa bài viết này?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xóa', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'posts', postId));
              setPosts(prev => prev.filter(p => p.id !== postId));
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Lỗi', 'Không thể xóa bài viết');
            }
          }
        },
      ]
    );
  };

  const handleLike = async (postId, userId, isLiked) => {
    try {
      // Optimistic update
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === postId) {
            const newLikes = isLiked 
              ? (post.likes || []).filter(id => id !== userId)
              : [...(post.likes || []), userId];
            return { ...post, likes: newLikes };
          }
          return post;
        })
      );

      // Update in Firestore
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      
      if (postSnap.exists()) {
        const currentLikes = postSnap.data().likes || [];
        const newLikes = isLiked
          ? currentLikes.filter(id => id !== userId)
          : [...currentLikes, userId];
        
        await updateDoc(postRef, { likes: newLikes });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert on error
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === postId) {
            const newLikes = !isLiked 
              ? (post.likes || []).filter(id => id !== userId)
              : [...(post.likes || []), userId];
            return { ...post, likes: newLikes };
          }
          return post;
        })
      );
    }
  };

  const addComment = async (postId, commentData) => {
    try {
      const commentsRef = collection(db, 'posts', postId, 'comments');
      await addDoc(commentsRef, {
        ...commentData,
        createdAt: serverTimestamp(),
      });
      
      // Update local state
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === postId) {
            return { 
              ...post, 
              commentsCount: (post.commentsCount || 0) + 1 
            };
          }
          return post;
        })
      );
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Lỗi', 'Không thể thêm bình luận');
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingVertical: 12 }}>
        {[0,1,2].map(i => (
          <View 
            key={`sk-${i}`} 
            style={{ 
              height: 180, 
              borderRadius: 12, 
              marginHorizontal: 16, 
              marginBottom: 12, 
              backgroundColor: currentThemeColors.cardBackground, 
              opacity: 0.5 
            }} 
          />
        ))}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      paddingTop: 100,
      paddingHorizontal: 32 
    }}>
      <Text style={{ 
        color: currentThemeColors.textMuted, 
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 8
      }}>
        Chưa có bài viết
      </Text>
      <Text style={{ 
        color: currentThemeColors.textMuted, 
        fontSize: 14,
        textAlign: 'center'
      }}>
        Theo dõi người khác để xem bài viết của họ ở đây
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' }}>
        <ActivityIndicator size="large" color={currentThemeColors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent', paddingHorizontal: 32 }}>
        <Text style={{ color: currentThemeColors.text, textAlign: 'center' }}>Lỗi: {error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Animated.FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard 
            post={item} 
            user={user}
            onLike={handleLike} 
            onComment={(id) => console.log(`Commented on post ${id}`)} 
            onShare={(id) => console.log(`Shared post ${id}`)} 
            onDeletePost={handleDeletePost} 
            addComment={addComment}
            themeColors={currentThemeColors}
          />
        )}
        contentContainerStyle={{ 
          paddingTop: effectiveHeaderHeight || defaultEffectiveHeaderHeight,
          paddingBottom: 120,
          backgroundColor: 'transparent',
          flexGrow: 1,
        }}
        style={{ backgroundColor: 'transparent' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        bounces={true}
        bouncesZoom={false}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
};

export default Tab3Screen;
