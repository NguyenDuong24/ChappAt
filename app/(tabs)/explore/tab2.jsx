import React, { useState, useEffect, useContext } from 'react';
import { View, FlatList, ActivityIndicator, Alert, Text, RefreshControl } from 'react-native';
import useExplore from '../../explore/useExplore';
import PostCard from '@/components/profile/PostCard';
import { useAuth } from '@/context/authContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';

const Tab2Screen = () => {
  // Safe hook usage with error boundary
  let hookData;
  try {
    hookData = useExplore();
  } catch (error) {
    console.error('Error in useExplore hook:', error);
    hookData = {
      sortedPostsByLike: [],
      loading: false,
      error: 'Failed to load posts',
      deletePost: () => {},
      toggleLike: () => {},
      addComment: () => {},
      fetchPosts: () => Promise.resolve()
    };
  }

  const { sortedPostsByLike, loading, error, deletePost, toggleLike, addComment, fetchPosts } = hookData;
  const { user } = useAuth();
  const [updatedPosts, setUpdatedPosts] = useState(sortedPostsByLike || []);
  const [refreshing, setRefreshing] = useState(false);

  // Safe context usage with fallback
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  useEffect(() => {
    if (sortedPostsByLike && Array.isArray(sortedPostsByLike)) {
      setUpdatedPosts(sortedPostsByLike);
    }
  }, [sortedPostsByLike]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts(); // Fetch posts when refreshing
    setRefreshing(false);
  };

  const handleDeletePost = (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: () => deletePost(id) },
      ],
      { cancelable: true }
    );
  };

  const handleLike = async (postId, userId, isLiked) => {
    await toggleLike(postId, userId, isLiked);
    const newPosts = updatedPosts.map(post => {
      if (post.id === postId) {
        if (isLiked) {
          return { ...post, likes: post.likes.filter(like => like !== userId) };
        } else {
          return { ...post, likes: [...post.likes, userId] };
        }
      }
      return post;
    });
    setUpdatedPosts(newPosts);
  };

  if (loading) {
    return <ActivityIndicator size="large" color={currentThemeColors.primary} />;
  }

  if (error) {
    return <Text style={{ color: currentThemeColors.text }}>Error: {error}</Text>;
  }

  return (
    <View style={{ flex: 1, paddingTop: 20, backgroundColor: currentThemeColors.background }}>
      <FlatList
        data={updatedPosts}
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
            themeColors={currentThemeColors} // Chuyển theme colors vào PostCard
          />
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
};

export default Tab2Screen;
