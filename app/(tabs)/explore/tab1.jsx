
import React, { useState, useEffect } from 'react';
import { View, FlatList, ActivityIndicator, Alert, Text } from 'react-native';
import useExplore from '../../explore/useExplore'; 
import PostCard from '@/components/profile/PostCard';
import { useAuth } from '@/context/authContext';

const Tab1Screen = () => {
  const { posts, loading, error, deletePost, toggleLike, addComment } = useExplore();
  const { user } = useAuth();
  const [updatedPosts, setUpdatedPosts] = useState(posts);

  useEffect(() => {
    setUpdatedPosts(posts);
  }, [posts]);

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
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  if (error) {
    return <Text>Error: {error}</Text>;
  }

  return (
    <View style={{ flex: 1, paddingTop: 100 }}>
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
          />
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
};

export default Tab1Screen;
