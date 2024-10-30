// hooks/useExplore.js
import { useState, useEffect } from 'react';
import { db } from '@/firebaseConfig'; // Đảm bảo đường dẫn chính xác
import { collection, getDocs, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'; // Import thêm updateDoc, arrayUnion, arrayRemove

const useExplore = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortedPostsByLike, setSortedPostsByLike] = useState([]);

  const sortPostsByLikes = (posts) => {
    return posts.sort((a, b) => {
      const likesA = a.likes ? a.likes.length : 0; // Số lượt thích bài viết A
      const likesB = b.likes ? b.likes.length : 0; // Số lượt thích bài viết B
      return likesB - likesA; // Sắp xếp giảm dần
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
      setSortedPostsByLike(sortPostsByLikes(fetchedPosts));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Toggle like on a post
  const toggleLike = async (postId, userId, isLiked) => {
    const postRef = doc(db, 'posts', postId);
    try {
      if (isLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(userId) // Bỏ thích
        });
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(userId) // Thêm thích
        });
      }
      console.log('Like updated successfully');
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

// Hook useExplore.js
// Hook useExplore.js

const addComment = async (postId, newComment) => {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      comments: arrayUnion(newComment), // Sử dụng arrayUnion để thêm bình luận mới
    });
  };
  

  // Delete post by id
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
    sortedPostsByLike
  };
};

export default useExplore;
