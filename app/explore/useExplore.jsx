import { useMemo } from 'react';
import {
  useExploreActions,
  useExploreState,
  useExploreLoading,
  useLatestPosts,
  useTrendingPosts,
  useFollowingPosts
} from '@/context/ExploreContext';

const useExplore = () => {
  const actions = useExploreActions();
  const state = useExploreState();
  const loading = useExploreLoading();
  const latest = useLatestPosts();
  const trending = useTrendingPosts();
  const following = useFollowingPosts();

  // Return a unified object for backward compatibility
  // Note: Using this hook will still cause re-renders if ANY of these contexts change.
  // For better performance, components should use the specific hooks directly.
  return useMemo(() => {
    if (!actions || !state || !loading || !latest || !trending || !following) {
      return {
        latestPosts: [],
        sortedPostsByLike: [],
        trendingPosts: [],
        followingPosts: [],
        loading: true,
        error: null,
        deletePost: async () => { },
        toggleLike: async () => { },
        addComment: async () => { },
        fetchPosts: async () => { },
        loadMore: async () => { },
        loadMoreTrending: async () => { },
        loadMoreFollowing: async () => { },
        hasMore: true,
        hasMoreTrending: true,
        hasMoreFollowing: true,
        loadingMore: false,
        loadingLatest: false,
        loadingTrending: false,
        loadingFollowing: false,
        toggleFollow: async () => { },
        followingIds: [],
        refresh: async () => { },
        isRefreshing: false,
      };
    }

    return {
      ...actions,
      ...state,
      ...loading,
      latestPosts: latest.posts,
      hasMore: latest.hasMore,
      trendingPosts: trending.posts,
      sortedPostsByLike: trending.posts,
      hasMoreTrending: trending.hasMore,
      followingPosts: following.posts,
      hasMoreFollowing: following.hasMore,
      followingIds: following.followingIds,
      loading: state.loadingInitial,
      fetchPosts: () => { }, // Handled by real-time
    };
  }, [actions, state, loading, latest, trending, following]);
};

export default useExplore;
