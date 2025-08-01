import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, limit, getDocs, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useUserContext } from '@/context/UserContext';

interface Post {
  id: string;
  content: string;
  images?: string[];
  address?: string;
  likes: string[];
  comments?: any[];
  shares: number;
  timestamp: any;
  userID: string;
}

interface PostWithUser extends Post {
  userInfo?: {
    uid: string;
    username: string;
    profileUrl?: string;
  };
}

export const useOptimizedPosts = (initialLimit: number = 10) => {
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const { getUsersInfo, preloadUsers } = useUserContext();

  // Load initial posts
  const loadPosts = useCallback(async (refresh: boolean = false) => {
    if (loading) return;
    
    setLoading(true);
    try {
      let q = query(
        collection(db, 'posts'),
        orderBy('timestamp', 'desc'),
        limit(initialLimit)
      );

      if (!refresh && lastDoc) {
        q = query(
          collection(db, 'posts'),
          orderBy('timestamp', 'desc'),
          startAfter(lastDoc),
          limit(initialLimit)
        );
      }

      const querySnapshot = await getDocs(q);
      const newPosts: Post[] = [];
      const userIds: string[] = [];

      querySnapshot.forEach((doc) => {
        const postData = { id: doc.id, ...doc.data() } as Post;
        newPosts.push(postData);
        if (postData.userID && !userIds.includes(postData.userID)) {
          userIds.push(postData.userID);
        }
      });

      // Preload user information for all posts
      if (userIds.length > 0) {
        await preloadUsers(userIds);
        const usersMap = await getUsersInfo(userIds);
        
        // Attach user info to posts
        const postsWithUsers: PostWithUser[] = newPosts.map(post => ({
          ...post,
          userInfo: usersMap.get(post.userID)
        }));

        if (refresh) {
          setPosts(postsWithUsers);
        } else {
          setPosts(prev => [...prev, ...postsWithUsers]);
        }
      } else {
        const postsWithUsers = newPosts.map(post => ({ ...post, userInfo: undefined }));
        if (refresh) {
          setPosts(postsWithUsers);
        } else {
          setPosts(prev => [...prev, ...postsWithUsers]);
        }
      }

      // Update pagination state
      if (querySnapshot.docs.length > 0) {
        setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setHasMore(querySnapshot.docs.length === initialLimit);
      } else {
        setHasMore(false);
      }

    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  }, [initialLimit, lastDoc, loading, getUsersInfo, preloadUsers]);

  // Load more posts (pagination)
  const loadMorePosts = useCallback(() => {
    if (hasMore && !loading) {
      loadPosts(false);
    }
  }, [hasMore, loading, loadPosts]);

  // Refresh posts
  const refreshPosts = useCallback(() => {
    setLastDoc(null);
    setHasMore(true);
    loadPosts(true);
  }, [loadPosts]);

  // Initial load
  useEffect(() => {
    loadPosts(true);
  }, []);

  return {
    posts,
    loading,
    hasMore,
    loadMorePosts,
    refreshPosts,
  };
};
