import React, { useContext, useRef, useState, useEffect, useCallback, useMemo, memo } from 'react';
import { View, ActivityIndicator, Alert, Text, RefreshControl, Animated, StyleSheet, Platform, InteractionManager, Dimensions } from 'react-native';
import { useFollowingPosts, useExploreActions, useExploreState, useExploreLoading } from '@/context/ExploreContext';
import PostCard from '@/components/profile/PostCard';
import { useAuth } from '@/context/authContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useExploreHeader } from '@/context/ExploreHeaderContext';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = Platform.OS === 'ios' ? 280 : 260;

// Reusable Shimmer Component
const ShimmerPlaceholder = memo(({ style }) => {
    const shimmerAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
                Animated.timing(shimmerAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    return <Animated.View style={[style, { opacity: shimmerAnim }]} />;
});

// Premium Post Skeleton
const PostSkeleton = memo(({ cardBackground }) => (
    <View style={[styles.skeletonCard, { backgroundColor: cardBackground }]}>
        <View style={styles.skeletonHeader}>
            <ShimmerPlaceholder style={styles.skeletonAvatar} />
            <View style={styles.skeletonHeaderText}>
                <ShimmerPlaceholder style={styles.skeletonName} />
                <ShimmerPlaceholder style={styles.skeletonTime} />
            </View>
        </View>
        <ShimmerPlaceholder style={styles.skeletonContent} />
        <ShimmerPlaceholder style={styles.skeletonImage} />
        <View style={styles.skeletonFooter}>
            <ShimmerPlaceholder style={styles.skeletonAction} />
            <ShimmerPlaceholder style={styles.skeletonAction} />
        </View>
    </View>
));

// Full Page Skeleton
const LoadingView = memo(({ backgroundColor, cardBackground, effectiveHeaderHeight }) => (
    <View style={[styles.container, { backgroundColor, paddingTop: effectiveHeaderHeight }]}>
        {[1, 2, 3].map(i => <PostSkeleton key={i} cardBackground={cardBackground} />)}
    </View>
));

// Skeleton Footer
const SkeletonFooter = memo(({ cardBackground, primaryColor, hasMore }) => {
    if (!hasMore) return <View style={styles.endReachedContainer}><Text style={[styles.endReachedText, { color: primaryColor }]}>Đã xem hết bài viết ✨</Text></View>;

    return (
        <View style={styles.footerContainer}>
            <View style={styles.loadingMoreRow}>
                <ActivityIndicator size="small" color={primaryColor} />
                <Text style={[styles.loadingMoreText, { color: primaryColor }]}>Đang tìm thêm bài viết từ bạn bè...</Text>
            </View>
            <PostSkeleton cardBackground={cardBackground} />
        </View>
    );
});

// Memoized Post Card wrapper
const MemoizedPostCard = memo(PostCard, (prevProps, nextProps) => {
    return (
        prevProps.post?.id === nextProps.post?.id &&
        prevProps.post?.likes?.length === nextProps.post?.likes?.length &&
        prevProps.post?.comments?.length === nextProps.post?.comments?.length &&
        prevProps.post?.privacy === nextProps.post?.privacy
    );
});

const Tab3Screen = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const themeContext = useContext(ThemeContext);
    const headerContext = useExploreHeader();

    const { posts: followingPosts, hasMore } = useFollowingPosts() || { posts: [], hasMore: false };
    const { loadMoreFollowing, deletePost, toggleLike, addComment, refresh, updatePostPrivacy } = useExploreActions() || {};
    const { loadingInitial, error, isRefreshing } = useExploreState() || {};
    const { loadingFollowing } = useExploreLoading() || {};

    const [isTransitioning, setIsTransitioning] = useState(true);

    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            setIsTransitioning(false);
        });
        return () => task.cancel();
    }, []);

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

    const theme = themeContext?.theme || 'light';
    const currentThemeColors = useMemo(() =>
        theme === 'dark' ? Colors.dark : Colors.light,
        [theme]
    );

    const onRefresh = useCallback(async () => {
        if (refresh) await refresh('following');
    }, [refresh]);

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

    const renderFooter = useCallback(() => {
        if (loadingInitial) return null;
        return <SkeletonFooter cardBackground={currentThemeColors.cardBackground} primaryColor={currentThemeColors.tint} hasMore={hasMore} />;
    }, [loadingFollowing, loadingInitial, hasMore, currentThemeColors]);

    const keyExtractor = useCallback((item) => item.id, []);

    const renderItem = useCallback(({ item }) => (
        <MemoizedPostCard
            post={item}
            onLike={handleLike}
            onDeletePost={() => handleDeletePost(item.id)}
            onPrivacyChange={updatePostPrivacy}
            owner={user?.uid === item.userID}
        />
    ), [user, handleLike, handleDeletePost, updatePostPrivacy]);

    const handleEndReached = useCallback(() => {
        if (hasMore && !loadingFollowing && loadMoreFollowing) loadMoreFollowing();
    }, [hasMore, loadingFollowing, loadMoreFollowing]);

    const contentContainerStyle = useMemo(() => ({
        paddingTop: effectiveHeaderHeight || defaultEffectiveHeaderHeight,
        paddingBottom: 120,
        backgroundColor: currentThemeColors.background,
        flexGrow: 1,
    }), [effectiveHeaderHeight, defaultEffectiveHeaderHeight, currentThemeColors.background]);

    const refreshControl = useMemo(() => (
        <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={currentThemeColors.tint}
            colors={[currentThemeColors.tint]}
        />
    ), [isRefreshing, onRefresh, currentThemeColors.tint]);

    if (loadingInitial && followingPosts.length === 0) {
        return (
            <LoadingView
                backgroundColor={currentThemeColors.background}
                cardBackground={currentThemeColors.cardBackground}
                effectiveHeaderHeight={effectiveHeaderHeight || HEADER_HEIGHT}
            />
        );
    }

    if (error && followingPosts.length === 0) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: currentThemeColors.background }]}>
                <Text style={{ color: currentThemeColors.text, textAlign: 'center', padding: 20 }}>{t('common.error')}: {error}</Text>
            </View>
        );
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
                onEndReachedThreshold={0.5}
                onEndReached={handleEndReached}
                ListFooterComponent={renderFooter}
                initialNumToRender={4}
                maxToRenderPerBatch={5}
                windowSize={11}
                removeClippedSubviews={Platform.OS === 'android'}
                updateCellsBatchingPeriod={50}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    footerContainer: { paddingVertical: 20, alignItems: 'center' },
    loadingMoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, gap: 10 },
    loadingMoreText: { fontSize: 14, fontWeight: '600', opacity: 0.8 },

    // Skeleton Styles
    skeletonCard: { width: '94%', alignSelf: 'center', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
    skeletonHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    skeletonAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E1E1E1' },
    skeletonHeaderText: { marginLeft: 12, flex: 1 },
    skeletonName: { width: '40%', height: 14, borderRadius: 7, backgroundColor: '#E1E1E1', marginBottom: 6 },
    skeletonTime: { width: '25%', height: 10, borderRadius: 5, backgroundColor: '#E1E1E1' },
    skeletonContent: { width: '90%', height: 12, borderRadius: 6, backgroundColor: '#E1E1E1', marginBottom: 12 },
    skeletonImage: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#E1E1E1', marginBottom: 12 },
    skeletonFooter: { flexDirection: 'row', gap: 20 },
    skeletonAction: { width: 60, height: 12, borderRadius: 6, backgroundColor: '#E1E1E1' },

    endReachedContainer: { paddingVertical: 40, alignItems: 'center' },
    endReachedText: { fontSize: 14, fontWeight: '600', opacity: 0.6 }
});

export default memo(Tab3Screen);
