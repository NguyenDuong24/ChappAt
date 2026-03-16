import React, { useContext, useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { View, ActivityIndicator, Alert, Text, RefreshControl, Animated, Platform, StyleSheet, InteractionManager, Dimensions } from 'react-native';
import { useLatestPosts, useExploreActions, useExploreState, useExploreLoading } from '@/context/ExploreContext';
import PostCard from '@/components/profile/PostCard';
import { useAuth } from '@/context/authContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useExploreHeader, HEADER_HEIGHT } from '@/context/ExploreHeaderContext';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

const ShimmerPlaceholder = React.memo(({ style }) => {
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

const PostSkeleton = React.memo(({ cardBackground }) => (
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

const LoadingView = React.memo(({ backgroundColor, cardBackground, effectiveHeaderHeight }) => (
    <View style={[styles.container, { backgroundColor }]}>
        <View style={{ paddingTop: effectiveHeaderHeight }}>
            <PostSkeleton cardBackground={cardBackground} />
            <PostSkeleton cardBackground={cardBackground} />
            <PostSkeleton cardBackground={cardBackground} />
        </View>
    </View>
));

const SkeletonFooter = React.memo(({ cardBackground, primaryColor, hasMore }) => {
    if (!hasMore) return <View style={styles.endReachedContainer}><Text style={[styles.endReachedText, { color: primaryColor }]}>Đã xem hết bài viết ✨</Text></View>;
    return (
        <View style={styles.footerContainer}>
            <View style={styles.loadingMoreRow}>
                <ActivityIndicator size="small" color={primaryColor} />
                <Text style={[styles.loadingMoreText, { color: primaryColor }]}>Đang tìm thêm bài viết mới...</Text>
            </View>
            <PostSkeleton cardBackground={cardBackground} />
        </View>
    );
});

const Tab1Screen = ({ isActive }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const themeContext = useContext(ThemeContext);
    const headerContext = useExploreHeader();
    const [canRender, setCanRender] = useState(false);

    const { posts: latestPosts, hasMore } = useLatestPosts() || { posts: [], hasMore: false };
    const { loadMore, deletePost, toggleLike, refresh, updatePostPrivacy } = useExploreActions() || {};
    const { loadingInitial, error, isRefreshing } = useExploreState() || {};
    const { loadingLatest } = useExploreLoading() || {};

    useEffect(() => {
        // Render once and keep it mounted
        if (isActive && !canRender) {
            const task = InteractionManager.runAfterInteractions(() => {
                setCanRender(true);
            });
            return () => task.cancel();
        }
    }, [isActive]);

    const { scrollY, handleScroll, effectiveHeaderHeight } = headerContext || {};
    const defaultScrollY = useRef(new Animated.Value(0)).current;

    const onScroll = useMemo(() =>
        handleScroll || Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY || defaultScrollY } } }],
            { useNativeDriver: true }
        ),
        [handleScroll, scrollY, defaultScrollY]
    );

    const theme = themeContext?.theme || 'light';
    const colors = theme === 'dark' ? Colors.dark : Colors.light;

    const renderItem = useCallback(({ item }) => (
        <PostCard
            post={item}
            onLike={async (postId, uId, isLiked) => await toggleLike(postId, uId, isLiked)}
            onDeletePost={() => {
                Alert.alert(t('social.delete_post_title'), t('social.delete_post_message'), [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('common.ok'), onPress: () => deletePost(item.id) },
                ]);
            }}
            onPrivacyChange={updatePostPrivacy}
            owner={user?.uid === item.userID}
        />
    ), [user, toggleLike, deletePost, updatePostPrivacy, t]);

    // ⚡️ Stabilized keyExtractor
    const keyExtractor = useCallback((item) => item.id, []);

    // ⚡️ Stabilized onEndReached
    const onEndReached = useCallback(() => {
        if (hasMore && !loadingLatest && loadMore) loadMore();
    }, [hasMore, loadingLatest, loadMore]);

    // ⚡️ Stabilized footer to prevent FlatList re-render
    const listFooter = useMemo(() => (
        <SkeletonFooter cardBackground={colors.cardBackground} primaryColor={colors.tint} hasMore={hasMore} />
    ), [colors.cardBackground, colors.tint, hasMore]);

    // ⚡️ Stabilized refreshControl
    const refreshControl = useMemo(() => (
        <RefreshControl refreshing={isRefreshing} onRefresh={() => refresh && refresh('latest')} tintColor={colors.tint} colors={[colors.tint]} />
    ), [isRefreshing, refresh, colors.tint]);

    // ⚡️ Stabilized contentContainerStyle
    const contentContainerStyle = useMemo(() => ({
        paddingTop: effectiveHeaderHeight || HEADER_HEIGHT,
        paddingBottom: 120,
        backgroundColor: colors.background,
    }), [effectiveHeaderHeight, colors.background]);

    if (!canRender || (loadingInitial && latestPosts.length === 0)) {
        return <LoadingView backgroundColor={colors.background} cardBackground={colors.cardBackground} effectiveHeaderHeight={effectiveHeaderHeight || HEADER_HEIGHT} />;
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Animated.FlatList
                data={latestPosts}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                contentContainerStyle={contentContainerStyle}
                refreshControl={refreshControl}
                onScroll={onScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                onEndReachedThreshold={0.5}
                onEndReached={onEndReached}
                ListFooterComponent={listFooter}
                initialNumToRender={4}
                maxToRenderPerBatch={4}
                windowSize={7}
                updateCellsBatchingPeriod={50}
                removeClippedSubviews={Platform.OS === 'android'}
                maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
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

export default React.memo(Tab1Screen);