import { useState, useEffect, useCallback, useMemo, useRef, useContext } from 'react';
import ExploreContext from '@/context/ExploreContext';

const useExplore = () => {
  const ctx = useContext(ExploreContext);
  if (!ctx) {
    // Fallback to avoid crash if provider not mounted
    return {
      latestPosts: [],
      sortedPostsByLike: [],
      loading: true,
      error: null,
      deletePost: async () => {},
      toggleLike: async () => {},
      addComment: async () => {},
      fetchPosts: async () => {},
      loadMore: async () => {},
      hasMore: true,
    };
  }

  const { latestPosts, sortedPostsByLike, loadingInitial, loadingMore, error, deletePost, toggleLike, addComment, fetchPosts, loadMore, hasMore } = ctx;

  return {
    latestPosts,
    sortedPostsByLike,
    loading: loadingInitial && latestPosts.length === 0,
    error,
    deletePost,
    toggleLike,
    addComment,
    fetchPosts,
    loadMore,
    hasMore,
    loadingMore,
  };
};

export default useExplore;
