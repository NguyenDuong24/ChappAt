import { useState, useEffect } from 'react';
import { db } from '@/firebaseConfig';
import { collection, getDocs, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

const useExplore = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortedPostsByLike, setSortedPostsByLike] = useState([]);
  const [latestPosts, setLatestPosts] = useState([]);

  // Sorting posts by the number of likes
  const sortPostsByLikes = (posts) => {
    return [...posts].sort((a, b) => {
      const likesA = a.likes ? a.likes.length : 0;
      const likesB = b.likes ? b.likes.length : 0;
      return likesB - likesA;
    });
  };

  // Sorting posts by timestamp (newest first)
  const sortPostsByTimestamp = (posts) => {
    return [...posts].sort((a, b) => {
      // Convert Firestore timestamp (seconds and nanoseconds) to milliseconds for comparison
      const timestampA = a.timestamp?.seconds * 1000 + a.timestamp?.nanoseconds / 1000000;
      const timestampB = b.timestamp?.seconds * 1000 + b.timestamp?.nanoseconds / 1000000;

      // Compare timestamps in descending order (most recent first)
      return timestampB - timestampA;
    });
  };

  // Fetch posts from Firestore
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const postsCollection = collection(db, 'posts');
      const snapshot = await getDocs(postsCollection);
      const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(fetchedPosts);

      // Sort by likes
      const sortedByLikes = sortPostsByLikes(fetchedPosts);
      setSortedPostsByLike(sortedByLikes);

      // Sort by timestamp (latest first)
      const sortedByDate = sortPostsByTimestamp(fetchedPosts);
      setLatestPosts(sortedByDate);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Like and unlike a post
  const toggleLike = async (postId, userId, isLiked) => {
    const postRef = doc(db, 'posts', postId);
    try {
      if (isLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(userId)
        });
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(userId)
        });
      }
      console.log('Like updated successfully');
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  // Add a comment to a post
  const addComment = async (postId, newComment) => {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      comments: arrayUnion(newComment),
    });
  };

  // Delete a post
  const deletePost = async (id) => {
    try {
      const postRef = doc(db, 'posts', id);
      await deleteDoc(postRef);
      setPosts((prevPosts) => prevPosts.filter(post => post.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  // Fetch posts on component mount
  useEffect(() => {
    fetchPosts();
  }, []);

  return {
    posts,
    loading,
    error,
    deletePost,
    toggleLike,
    addComment,
    sortedPostsByLike,
    latestPosts,
    fetchPosts
  };
};

export default useExplore;
