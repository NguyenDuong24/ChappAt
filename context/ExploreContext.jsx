import React, { createContext, useCallback, useEffect, useMemo, useRef, useState, useContext } from 'react';
import { db } from '@/firebaseConfig';
import { collection, query, orderBy, limit, getDocs, startAfter, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

const PAGE_SIZE = 20;

const ExploreContext = createContext(null);

export const ExploreProvider = ({ children }) => {
  const [posts, setPosts] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const inflightRef = useRef(null);
  const lastFetchTsRef = useRef(0);

  const fetchPage = useCallback(async (refresh = false) => {
    try {
      setError(null);

      // Set loading flags
      if (refresh || posts.length === 0) {
        setLoadingInitial(true);
      } else {
        setLoadingMore(true);
      }

      // Deduplicate concurrent calls
      if (inflightRef.current) {
        await inflightRef.current;
        return;
      }

      inflightRef.current = (async () => {
        const constraints = [orderBy('timestamp', 'desc'), limit(PAGE_SIZE)];
        if (!refresh && lastDoc) {
          constraints.splice(1, 0, startAfter(lastDoc));
        }

        const q = query(collection(db, 'posts'), ...constraints);
        const snapshot = await getDocs(q);

        const newItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        setPosts(prev => refresh ? newItems : [...prev, ...newItems]);
        setLastDoc(snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : lastDoc);
        setHasMore(snapshot.docs.length === PAGE_SIZE);
        lastFetchTsRef.current = Date.now();
      })();

      await inflightRef.current;
    } catch (err) {
      console.error('Explore fetch error:', err);
      setError(err?.message || 'Failed to load posts');
    } finally {
      inflightRef.current = null;
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  }, [lastDoc, posts.length]);

  const fetchPosts = useCallback(async () => {
    // Force refresh from first page
    setLastDoc(null);
    setHasMore(true);
    await fetchPage(true);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loadingInitial || !hasMore) return;
    await fetchPage(false);
  }, [loadingMore, loadingInitial, hasMore, fetchPage]);

  const toggleLike = useCallback(async (postId, userId, isLiked) => {
    const postRef = doc(db, 'posts', postId);
    try {
      // Optimistic update
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;
        const likes = Array.isArray(p.likes) ? p.likes : [];
        return isLiked
          ? { ...p, likes: likes.filter(l => l !== userId) }
          : { ...p, likes: [...likes, userId] };
      }));

      // Persist
      if (isLiked) {
        await updateDoc(postRef, { likes: arrayRemove(userId) });
      } else {
        await updateDoc(postRef, { likes: arrayUnion(userId) });
      }
    } catch (err) {
      console.error('Error updating like:', err);
      // Best-effort recovery: refetch current page
      await fetchPage(true);
    }
  }, [fetchPage]);

  const addComment = useCallback(async (postId, newComment) => {
    const postRef = doc(db, 'posts', postId);
    try {
      // Optimistic update
      setPosts(prev => prev.map(p => (p.id === postId
        ? { ...p, comments: [...(p.comments || []), newComment] }
        : p)));

      await updateDoc(postRef, { comments: arrayUnion(newComment) });
    } catch (err) {
      console.error('Error adding comment:', err);
      await fetchPage(true);
    }
  }, [fetchPage]);

  const deletePost = useCallback(async (id) => {
    try {
      await deleteDoc(doc(db, 'posts', id));
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting post:', err);
      setError(err?.message || 'Failed to delete post');
    }
  }, []);

  // Initial load once
  useEffect(() => {
    if (posts.length === 0) {
      fetchPage(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const latestPosts = posts; // already ordered by timestamp desc
  const sortedPostsByLike = useMemo(() => {
    return [...posts].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
  }, [posts]);

  const value = {
    latestPosts,
    sortedPostsByLike,
    loadingInitial,
    loadingMore,
    error,
    hasMore,
    fetchPosts,
    loadMore,
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
