import React, { createContext, useCallback, useEffect, useMemo, useRef, useState, useContext } from 'react';
import { InteractionManager } from 'react-native';
import { db } from '@/firebaseConfig';
import { collection, query, orderBy, limit, getDocs, startAfter, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove, onSnapshot, increment } from 'firebase/firestore';
import postService from '@/services/postService';
import { followService } from '@/services/followService';
import { useAuth } from '@/context/authContext';

const PAGE_SIZE = 20;

const ExploreContext = createContext(null);

export const ExploreProvider = ({ children }) => {
  const { user } = useAuth();

  // Latest Posts State
  const [latestPosts, setLatestPosts] = useState([]);
  const [latestLastDoc, setLatestLastDoc] = useState(null);
  const [latestHasMore, setLatestHasMore] = useState(true);
  const [loadingLatest, setLoadingLatest] = useState(false);

  // Trending Posts State (Sorted by likes)
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [trendingLastDoc, setTrendingLastDoc] = useState(null);
  const [trendingHasMore, setTrendingHasMore] = useState(true);
  const [loadingTrending, setLoadingTrending] = useState(false);

  // Following Posts State
  const [followingPosts, setFollowingPosts] = useState([]);
  const [followingLastDoc, setFollowingLastDoc] = useState(null);
  const [followingHasMore, setFollowingHasMore] = useState(true);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [followingIds, setFollowingIds] = useState([]);

  const [error, setError] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Real-time subscriptions
  const latestUnsubRef = useRef(null);
  const followingUnsubRef = useRef(null);

  // Fetch following IDs once
  const fetchFollowingIds = useCallback(async () => {
    if (!user?.uid) return [];
    try {
      const following = await followService.getFollowing(user.uid);
      const ids = following.map(f => f.followingId);
      setFollowingIds(ids);
      return ids;
    } catch (err) {
      console.error('Error fetching following IDs:', err);
      return [];
    }
  }, [user?.uid]);

  // Initialize Latest Posts Subscription
  useEffect(() => {
    setLoadingInitial(true);
    const unsub = postService.subscribeToFirstPage({ type: 'latest', pageSize: PAGE_SIZE }, (posts, lastDoc) => {
      setLatestPosts(posts);
      setLatestLastDoc(lastDoc);
      setLatestHasMore(posts.length === PAGE_SIZE);
      setLoadingInitial(false);
    });
    latestUnsubRef.current = unsub;
    return () => unsub();
  }, []);

  // Initialize Following Posts Subscription
  useEffect(() => {
    if (!user?.uid) return;

    let unsub = () => { };
    fetchFollowingIds().then(ids => {
      if (ids.length > 0) {
        unsub = postService.subscribeToFirstPage({ type: 'following', followingIds: ids, pageSize: PAGE_SIZE }, (posts, lastDoc) => {
          setFollowingPosts(posts);
          setFollowingLastDoc(lastDoc);
          setFollowingHasMore(posts.length === PAGE_SIZE);
        });
        followingUnsubRef.current = unsub;
      }
    });

    return () => unsub();
  }, [user?.uid, fetchFollowingIds]);

  const loadMoreLatest = useCallback(async () => {
    if (loadingLatest || !latestHasMore || !latestLastDoc) return;
    setLoadingLatest(true);
    try {
      const { posts, lastDoc, hasMore } = await postService.fetchNextPage({ type: 'latest', pageSize: PAGE_SIZE }, latestLastDoc);
      setLatestPosts(prev => [...prev, ...posts]);
      setLatestLastDoc(lastDoc);
      setLatestHasMore(hasMore);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingLatest(false);
    }
  }, [loadingLatest, latestHasMore, latestLastDoc]);

  const loadMoreFollowing = useCallback(async () => {
    if (loadingFollowing || !followingHasMore || !followingLastDoc) return;
    setLoadingFollowing(true);
    try {
      const { posts, lastDoc, hasMore } = await postService.fetchNextPage({
        type: 'following',
        followingIds,
        pageSize: PAGE_SIZE
      }, followingLastDoc);
      setFollowingPosts(prev => [...prev, ...posts]);
      setFollowingLastDoc(lastDoc);
      setFollowingHasMore(hasMore);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingFollowing(false);
    }
  }, [loadingFollowing, followingHasMore, followingLastDoc, followingIds]);

  // Trending is derived from latest for now, or could be a separate fetch
  const sortedPostsByLike = useMemo(() => {
    return [...latestPosts].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
  }, [latestPosts]);

  const toggleLike = useCallback(async (postId, userId, isLiked) => {
    const postRef = doc(db, 'posts', postId);
    try {
      // Optimistic update for all lists
      const updateList = (prev) => prev.map(p => {
        if (p.id !== postId) return p;
        const likes = Array.isArray(p.likes) ? p.likes : [];
        return isLiked
          ? { ...p, likes: likes.filter(l => l !== userId) }
          : { ...p, likes: [...likes, userId] };
      });

      setLatestPosts(updateList);
      setFollowingPosts(updateList);

      if (isLiked) {
        await updateDoc(postRef, { likes: arrayRemove(userId) });
      } else {
        await updateDoc(postRef, { likes: arrayUnion(userId) });
      }
    } catch (err) {
      console.error('Error updating like:', err);
    }
  }, []);

  const addComment = useCallback(async (postId, newComment) => {
    const postRef = doc(db, 'posts', postId);
    try {
      const updateList = (prev) => prev.map(p => (p.id === postId
        ? { ...p, comments: [...(p.comments || []), newComment], commentsCount: (p.commentsCount || 0) + 1 }
        : p));

      setLatestPosts(updateList);
      setFollowingPosts(updateList);

      await updateDoc(postRef, {
        comments: arrayUnion(newComment),
        commentsCount: increment(1)
      });
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  }, []);

  const deletePost = useCallback(async (id) => {
    try {
      await deleteDoc(doc(db, 'posts', id));
      const filterList = (prev) => prev.filter(p => p.id !== id);
      setLatestPosts(filterList);
      setFollowingPosts(filterList);
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  }, []);

  const value = {
    latestPosts,
    sortedPostsByLike,
    followingPosts,
    loadingInitial,
    loadingMore: loadingLatest || loadingFollowing,
    error,
    hasMore: latestHasMore, // Simplified for now
    hasMoreFollowing: followingHasMore,
    fetchPosts: () => { }, // Handled by real-time
    loadMore: loadMoreLatest,
    loadMoreFollowing,
    deletePost,
    toggleLike,
    addComment,
  };

  return (
    <ExploreContext.Provider value={value}>
      {children}
    </ExploreContext.Provider>
  );
};

export const useExploreContext = () => useContext(ExploreContext);

export default ExploreContext;
