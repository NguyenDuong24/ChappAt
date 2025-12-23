import React, { useContext, useRef, useState, useCallback, useMemo, memo } from 'react';
import { View, ActivityIndicator, Alert, Text, RefreshControl, Animated, Platform, StyleSheet } from 'react-native';
import useExplore from '../../explore/useExplore';
import PostCard from '@/components/profile/PostCard';
import { useAuth } from '@/context/authContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useExploreHeader } from '@/context/ExploreHeaderContext';
import { useTranslation } from 'react-i18next';

const HEADER_HEIGHT = Platform.OS === 'ios' ? 280 : 260;

// Memoized Loading Component
const LoadingView = memo(({ backgroundColor, primaryColor }) => (
  <View style={[styles.centerContainer, { backgroundColor }]}>
    <ActivityIndicator size="large" color={primaryColor} />
  </View>
));

// Memoized Error Component
const ErrorView = memo(({ backgroundColor, textColor, error, t }) => (
  <View style={[styles.centerContainer, { backgroundColor }]}>
    <Text style={{ color: textColor }}>{t('common.error')}: {error}</Text>
  </View>
));

// Memoized Skeleton Footer
const SkeletonFooter = memo(({ cardBackground }) => (
  <View style={styles.footerContainer}>
    {[0, 1, 2].map(i => (
      <View
        key={`sk-${i}`}
        style={[styles.skeleton, { backgroundColor: cardBackground }]}
      />
    ))}
  </View>
));

// Memoized Post Card wrapper
const MemoizedPostCard = memo(PostCard, (prevProps, nextProps) => {
  return (
    prevProps.post?.id === nextProps.post?.id &&
    prevProps.post?.likes?.length === nextProps.post?.likes?.length &&
    prevProps.post?.comments?.length === nextProps.post?.comments?.length &&
    prevProps.user?.uid === nextProps.user?.uid
  );
});

const Tab2Screen = () => {
  const { t } = useTranslation();
  // Call hooks at the top level - NOT inside useMemo/useCallback
  const { user } = useAuth();
  const themeContext = useContext(ThemeContext);
  const headerContext = useExploreHeader();

  // Safe hook usage - call hook directly at top level
  let hookData;
  try {
    hookData = useExplore();
  } catch (error) {
    console.error('Error in useExplore hook:', error);
    hookData = {
      sortedPostsByLike: [],
      loading: false,
      error: t('common.no_data'),
      deletePost: () => { },
      toggleLike: () => { },
      addComment: () => { },
      fetchPosts: () => Promise.resolve(),
      loadMore: () => { },
      hasMore: false,
      loadingMore: false,
    };
  }

  const { sortedPostsByLike, loading, error, deletePost, toggleLike, addComment, fetchPosts, loadMore, hasMore, loadingMore } = hookData;
  const [refreshing, setRefreshing] = useState(false);

  // Header scroll binding
  const { scrollY, handleScroll, effectiveHeaderHeight } = headerContext || {};

  const defaultScrollY = useRef(new Animated.Value(0)).current;
  const defaultEffectiveHeaderHeight = useRef(new Animated.Value(HEADER_HEIGHT)).current;

  const onScroll = useMemo(() =>
    handleScroll || Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollY || defaultScrollY } } }],
      { useNativeDriver: false }
    ),
    [handleScroll, scrollY, defaultScrollY]
  );

  // Theme
  const theme = themeContext?.theme || 'light';
  const currentThemeColors = useMemo(() =>
    theme === 'dark' ? Colors.dark : Colors.light,
    [theme]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  }, [fetchPosts]);

  const handleDeletePost = useCallback((id) => {
    Alert.alert(
      t('social.delete_post_title'),
      t('social.delete_post_message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.ok'), onPress: () => deletePost(id) },
      ],
      { cancelable: true }
    );
  }, [deletePost, t]);

  const handleLike = useCallback(async (postId, userId, isLiked) => {
    await toggleLike(postId, userId, isLiked);
  }, [toggleLike]);

  const handleComment = useCallback((id) => {
    console.log(`Commented on post ${id}`);
  }, []);

  const handleShare = useCallback((id) => {
    console.log(`Shared post ${id}`);
  }, []);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return <SkeletonFooter cardBackground={currentThemeColors.cardBackground} />;
  }, [loadingMore, currentThemeColors.cardBackground]);

  const keyExtractor = useCallback((item) => item.id, []);

  const renderItem = useCallback(({ item }) => (
    <MemoizedPostCard
      post={item}
      currentUserId={user?.uid || ''}
      currentUserAvatar={user?.profileUrl}
      onLike={handleLike}
      onComment={(postId, comment) => addComment(postId, { text: comment })}
      onShare={handleShare}
      onDelete={() => handleDeletePost(item.id)}
      isOwner={user?.uid === item.userID}
      onUserPress={(userId) => console.log('User pressed:', userId)}
    />
  ), [user, handleLike, handleShare, handleDeletePost, addComment]);

  const handleEndReached = useCallback(() => {
    if (hasMore && !loading) loadMore();
  }, [hasMore, loading, loadMore]);

  const contentContainerStyle = useMemo(() => ({
    paddingTop: effectiveHeaderHeight || defaultEffectiveHeaderHeight,
    paddingBottom: 120,
    backgroundColor: currentThemeColors.background,
  }), [effectiveHeaderHeight, defaultEffectiveHeaderHeight, currentThemeColors.background]);

  const refreshControl = useMemo(() => (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  ), [refreshing, onRefresh]);

  if (loading) {
    return <LoadingView backgroundColor={currentThemeColors.background} primaryColor={currentThemeColors.primary} />;
  }

  if (error) {
    return <ErrorView backgroundColor={currentThemeColors.background} textColor={currentThemeColors.text} error={error} t={t} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <Animated.FlatList
        data={sortedPostsByLike}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={contentContainerStyle}
        style={{ backgroundColor: currentThemeColors.background }}
        refreshControl={refreshControl}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        bounces={true}
        bouncesZoom={false}
        onEndReachedThreshold={0.4}
        onEndReached={handleEndReached}
        ListFooterComponent={renderFooter}
        // Performance optimizations
        initialNumToRender={5}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={100}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerContainer: {
    paddingVertical: 12,
  },
  skeleton: {
    height: 180,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    opacity: 0.5,
  },
});

export default memo(Tab2Screen);