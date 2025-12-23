import React, { useContext, useRef, useState, useEffect, useCallback, useMemo, memo } from 'react';
import { View, ActivityIndicator, Alert, Text, RefreshControl, Animated, StyleSheet, Platform } from 'react-native';
import PostCard from '@/components/profile/PostCard';
import { useAuth } from '@/context/authContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useExploreHeader } from '@/context/ExploreHeaderContext';
import { useTranslation } from 'react-i18next';
import useExplore from '../../explore/useExplore';

const HEADER_HEIGHT = Platform.OS === 'ios' ? 280 : 260;

// Memoized Loading Component
const LoadingView = memo(({ backgroundColor, primaryColor }) => (
    <View style={[styles.centerContainer, { backgroundColor }]}>
        <ActivityIndicator size="large" color={primaryColor} />
    </View>
));

// Memoized Error Component
const ErrorView = memo(({ backgroundColor, textColor, error, t }) => (
    <View style={[styles.centerContainer, styles.paddedContainer, { backgroundColor }]}>
        <Text style={[styles.errorText, { color: textColor }]}>{t('common.error')}: {error}</Text>
    </View>
));

// Memoized Empty State
const EmptyView = memo(({ headerTextColor, t }) => (
    <View style={styles.emptyContainer}>
        <Text style={[styles.emptyTitle, { color: headerTextColor }]}>
            {t('social.no_posts')}
        </Text>
        <Text style={[styles.emptySubtitle, { color: headerTextColor }]}>
            {t('social.following_desc', { defaultValue: 'Follow others to see their posts here' })}
        </Text>
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
        prevProps.post?.commentsCount === nextProps.post?.commentsCount &&
        prevProps.currentUserId === nextProps.currentUserId
    );
});

const Tab3Screen = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const themeContext = useContext(ThemeContext);
    const headerContext = useExploreHeader();

    const {
        followingPosts,
        loading,
        error,
        deletePost,
        toggleLike,
        addComment,
        fetchPosts,
        loadMoreFollowing,
        hasMoreFollowing,
        loadingMore
    } = useExplore();

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

    // Refresh handler
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

    const handleShare = useCallback((id) => {
        console.log(`Shared post ${id}`);
    }, []);

    const renderFooter = useCallback(() => {
        if (!loadingMore) return null;
        return <SkeletonFooter cardBackground={currentThemeColors.cardBackground} />;
    }, [loadingMore, currentThemeColors.cardBackground]);

    const renderEmpty = useCallback(() => (
        <EmptyView headerTextColor={currentThemeColors.headerText} t={t} />
    ), [currentThemeColors.headerText, t]);

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
        if (hasMoreFollowing && !loading) loadMoreFollowing();
    }, [hasMoreFollowing, loading, loadMoreFollowing]);

    const contentContainerStyle = useMemo(() => ({
        paddingTop: effectiveHeaderHeight || defaultEffectiveHeaderHeight,
        paddingBottom: 120,
        backgroundColor: currentThemeColors.background,
        flexGrow: 1,
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
                data={followingPosts}
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
                ListEmptyComponent={renderEmpty}
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
    paddedContainer: {
        paddingHorizontal: 32,
    },
    errorText: {
        textAlign: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
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

export default memo(Tab3Screen);
