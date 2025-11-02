import React, { useContext, useRef } from 'react';
import { View, ActivityIndicator, Alert, Text, RefreshControl, Animated } from 'react-native';
import useExplore from '../../explore/useExplore';
import PostCard from '@/components/profile/PostCard';
import { useAuth } from '@/context/authContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useExploreHeader } from '@/context/ExploreHeaderContext';

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

  const { sortedPostsByLike, loading, error, deletePost, toggleLike, addComment, fetchPosts, loadMore, hasMore, loadingMore } = hookData;
  const { user } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);

  // header scroll binding - use safe hook
  const headerContext = useExploreHeader();
  const { scrollY, handleScroll, effectiveHeaderHeight } = headerContext || {};
  
  // Create default scroll handler if context is not available
  const defaultScrollY = useRef(new Animated.Value(0)).current;
  const defaultEffectiveHeaderHeight = useRef(new Animated.Value(300)).current; // Default to approximate HEADER_HEIGHT
  const onScroll = handleScroll || Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY || defaultScrollY } } }], 
    { 
      useNativeDriver: false, // Must be false for layout animations (paddingTop)
      listener: () => {}, // Optional scroll listener
    }
  );

  // Safe context usage with fallback
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
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
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingVertical: 12 }}>
        {[0,1,2].map(i => (
          <View key={`sk-${i}`} style={{ height: 180, borderRadius: 12, marginHorizontal: 16, marginBottom: 12, backgroundColor: currentThemeColors.cardBackground, opacity: 0.5 }} />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' }}>
        <ActivityIndicator size="large" color={currentThemeColors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' }}>
        <Text style={{ color: currentThemeColors.text }}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Animated.FlatList
        data={sortedPostsByLike}
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
            themeColors={currentThemeColors}
          />
        )}
        contentContainerStyle={{ 
          paddingTop: effectiveHeaderHeight || defaultEffectiveHeaderHeight,
          paddingBottom: 120,
          backgroundColor: 'transparent',
        }}
        style={{ backgroundColor: 'transparent' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        bounces={true}
        bouncesZoom={false}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasMore && !loading) loadMore();
        }}
        ListFooterComponent={renderFooter}
      />
    </View>
  );
};

export default Tab2Screen;