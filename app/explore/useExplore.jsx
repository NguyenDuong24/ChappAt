
import { useState, useEffect } from 'react';
import { db } from '@/firebaseConfig';
import { collection, getDocs, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'; // Import thêm updateDoc, arrayUnion, arrayRemove

const useExplore = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortedPostsByLike, setSortedPostsByLike] = useState([]);

  const sortPostsByLikes = (posts) => {
    return posts.sort((a, b) => {
      const likesA = a.likes ? a.likes.length : 0;
      const likesB = b.likes ? b.likes.length : 0;
      return likesB - likesA;
    });
  };
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const postsCollection = collection(db, 'posts');
      const snapshot = await getDocs(postsCollection);
      const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(fetchedPosts);
      setSortedPostsByLike(sortPostsByLikes(fetchedPosts));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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


const addComment = async (postId, newComment) => {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      comments: arrayUnion(newComment),
    });
  };
  
  const deletePost = async (id) => {
    try {
      const postRef = doc(db, 'posts', id);
      await deleteDoc(postRef);
      setPosts((prevPosts) => prevPosts.filter(post => post.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

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
    fetchPosts
  };
};

export default useExplore;
