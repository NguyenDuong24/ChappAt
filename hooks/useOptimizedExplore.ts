import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/authContext';
import optimizedSocialService from '@/services/optimizedSocialService';
import optimizedHashtagService from '@/services/optimizedHashtagService';

interface UseOptimizedExploreReturn {
  // Posts data
  posts: any[];
  sortedPostsByLike: any[];
  latestPosts: any[];
  
  // Loading states
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  
  // Pagination
  hasMore: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  fetchPosts: () => Promise<void>;
  refreshPosts: () => Promise<void>;
  loadMorePosts: () => Promise<void>;
  toggleLike: (postId: string, isLiked: boolean) => Promise<void>;
  searchPosts: (query: string) => Promise<any[]>;
  
  // Hashtag related
  getTrendingHashtags: () => Promise<any[]>;
  getPostsByHashtag: (hashtag: string) => Promise<any[]>;
}

const useOptimizedExplore = (): UseOptimizedExploreReturn => {
  const { user } = useAuth();
  
  // State
  const [posts, setPosts] = useState<any[]>([]);
  const [sortedPostsByLike, setSortedPostsByLike] = useState<any[]>([]);
  const [latestPosts, setLatestPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch posts using optimized service
  const fetchPosts = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      setError(null);
      
      // Load different types of posts in parallel
      const [latestResult, popularResult, trendingResult] = await Promise.all([
        optimizedSocialService.loadPosts(user.uid, 'latest'),
        optimizedSocialService.loadPosts(user.uid, 'popular'), 
        optimizedSocialService.loadPosts(user.uid, 'trending')
      ]);

      // Set main posts (latest)
      setPosts(latestResult.posts);
      setLatestPosts(latestResult.posts);
      
      // Set sorted by likes (popular)
      setSortedPostsByLike(popularResult.posts);
      
      // Update pagination state
      setHasMore(latestResult.hasMore);
      
      console.log('✅ Fetched optimized explore posts:', {
        latest: latestResult.posts.length,
        popular: popularResult.posts.length,
        trending: trendingResult.posts.length
      });
      
    } catch (err: any) {
      console.error('❌ Error fetching posts:', err);
      setError(err.message || 'Failed to fetch posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  // Refresh posts
  const refreshPosts = useCallback(async () => {
    if (!user?.uid) return;
    
    setRefreshing(true);
    
    // Clear cache for fresh data
    optimizedSocialService.clearCache(user.uid);
    
    await fetchPosts();
  }, [user?.uid, fetchPosts]);

  // Load more posts for pagination  
  const loadMorePosts = useCallback(async () => {
    if (!user?.uid || !hasMore || loadingMore) return;
    
    try {
      setLoadingMore(true);
      
      const morePosts = await optimizedSocialService.loadMorePosts(user.uid, 'latest');
      
      if (morePosts.length > 0) {
        setPosts(prev => [...prev, ...morePosts]);
        setLatestPosts(prev => [...prev, ...morePosts]);
      } else {
        setHasMore(false);
      }
      
      console.log('✅ Loaded more posts:', morePosts.length);
      
    } catch (err: any) {
      console.error('❌ Error loading more posts:', err);
      setError(err.message || 'Failed to load more posts');
    } finally {
      setLoadingMore(false);
    }
  }, [user?.uid, hasMore, loadingMore]);

  // Toggle like optimized
  const toggleLike = useCallback(async (postId: string, isLiked: boolean) => {
    if (!user?.uid) return;
    
    try {
      // Optimistic update
      const updatePosts = (postsList: any[]) => 
        postsList.map(post => {
          if (post.id === postId) {
            const newLikes = isLiked 
              ? post.likes.filter((id: string) => id !== user.uid)
              : [...post.likes, user.uid];
            
            return {
              ...post,
              likes: newLikes,
              likeCount: newLikes.length,
              isLiked: !isLiked
            };
          }
          return post;
        });

      // Update all post arrays locally first
      setPosts(updatePosts);
      setSortedPostsByLike(updatePosts);
      setLatestPosts(updatePosts);
      
      // Then update on server
      await optimizedSocialService.toggleLike(postId, user.uid, isLiked);
      
      console.log('✅ Toggled like for post:', postId);
      
    } catch (err: any) {
      console.error('❌ Error toggling like:', err);
      
      // Revert optimistic update on error
      await fetchPosts();
      
      setError(err.message || 'Failed to update like');
    }
  }, [user?.uid, fetchPosts]);

  // Search posts
  const searchPosts = useCallback(async (query: string): Promise<any[]> => {
    if (!user?.uid || !query.trim()) return [];
    
    try {
      const results = await optimizedSocialService.searchPosts(query, user.uid);
      console.log('✅ Search results:', results.length);
      return results;
    } catch (err: any) {
      console.error('❌ Error searching posts:', err);
      return [];
    }
  }, [user?.uid]);

  // Get trending hashtags
  const getTrendingHashtags = useCallback(async (): Promise<any[]> => {
    try {
      const hashtags = await optimizedHashtagService.getTrendingHashtags(20);
      console.log('✅ Trending hashtags:', hashtags.length);
      return hashtags;
    } catch (err: any) {
      console.error('❌ Error getting trending hashtags:', err);
      return [];
    }
  }, []);

  // Get posts by hashtag
  const getPostsByHashtag = useCallback(async (hashtag: string): Promise<any[]> => {
    if (!user?.uid || !hashtag) return [];
    
    try {
      const posts = await optimizedHashtagService.getPostsByHashtag(hashtag);
      
      // Convert to social post format
      const convertedPosts = posts.map(post => ({
        ...post,
        isLiked: post.likes.includes(user.uid),
        likeCount: post.likes.length
      }));
      
      console.log('✅ Posts by hashtag:', convertedPosts.length);
      return convertedPosts;
    } catch (err: any) {
      console.error('❌ Error getting posts by hashtag:', err);
      return [];
    }
  }, [user?.uid]);

  // Initial load
  useEffect(() => {
    if (user?.uid) {
      fetchPosts();
    }
  }, [user?.uid, fetchPosts]);

  return {
    // Data
    posts,
    sortedPostsByLike,
    latestPosts,
    
    // States
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
    
    // Actions
    fetchPosts,
    refreshPosts,
    loadMorePosts,
    toggleLike,
    searchPosts,
    
    // Hashtag functions
    getTrendingHashtags,
    getPostsByHashtag
  };
};

export default useOptimizedExplore;
