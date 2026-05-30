import React, { useContext, useRef, useState, useCallback, useMemo, useEffect } from 'react';
import {
    View, ActivityIndicator, Alert, Text, RefreshControl,
    Animated, Platform, StyleSheet, InteractionManager, useWindowDimensions
} from 'react-native';
import PostCard from '@/components/profile/PostCard';
import { useAuth } from '@/context/authContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useExploreHeader, HEADER_HEIGHT } from '@/context/ExploreHeaderContext';
import { useTranslation } from 'react-i18next';
import { useThemedColors } from '@/hooks/useThemedColors';

interface BaseExploreTabProps {
    isActive: boolean;
    posts: any[];
    hasMore: boolean;
    loadMore?: () => void;
    loadingSpecific: boolean;
    refreshType: 'latest' | 'trending' | 'following';
    footerLoadingText: string;
    deletePost?: (id: string) => void;
    toggleLike?: (postId: string, userId: string, isLiked: boolean) => Promise<void>;
    refresh?: (type: string) => void;
    updatePostPrivacy?: (postId: string, privacy: any) => void;
    loadingInitial: boolean;
    isRefreshing: boolean;
    onTabScroll?: (event: any) => void;
}

const ShimmerPlaceholder = React.memo(({ style }: { style: any }) => {
    return <View style={[style, styles.skeletonStatic]} />;
});

const PostSkeleton = React.memo(({ cardBackground }: { cardBackground: string }) => (
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

const LoadingView = React.memo(({ backgroundColor, cardBackground, effectiveHeaderHeight }: any) => (
    <View style={[styles.container, { backgroundColor }]}>
        <View style={{ paddingTop: effectiveHeaderHeight }}>
            <PostSkeleton cardBackground={cardBackground} />
            <PostSkeleton cardBackground={cardBackground} />
            <PostSkeleton cardBackground={cardBackground} />
        </View>
    </View>
));

const SkeletonFooter = React.memo(({ cardBackground, primaryColor, hasMore, loadingText, isLoading }: any) => {
    if (!hasMore) {
        return (
            <View style={styles.endReachedContainer}>
                <Text style={[styles.endReachedText, { color: primaryColor }]}>Đã xem hết bài viết ✨</Text>
            </View>
        );
    }
    if (!isLoading) {
        return <View style={styles.footerSpacer} />;
    }
    return (
        <View style={styles.footerContainer}>
            <View style={styles.loadingMoreRow}>
                <ActivityIndicator size="small" color={primaryColor} />
                <Text style={[styles.loadingMoreText, { color: primaryColor }]}>{loadingText}</Text>
            </View>
            <PostSkeleton cardBackground={cardBackground} />
        </View>
    );
});

const BaseExploreTab = ({
    isActive,
    posts,
    hasMore,
    loadMore,
    loadingSpecific,
    refreshType,
    footerLoadingText,
    deletePost,
    toggleLike,
    refresh,
    updatePostPrivacy,
    loadingInitial,
    isRefreshing,
    onTabScroll,
}: BaseExploreTabProps, ref: any) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const themeContext = useContext(ThemeContext);
    const headerContext = useExploreHeader();
    const [canRender, setCanRender] = useState(false);
    const hasTriggeredEndReachedRef = useRef(false);
    const { height: windowHeight } = useWindowDimensions();

    useEffect(() => {
        if (isActive && !canRender) {
            const task = InteractionManager.runAfterInteractions(() => setCanRender(true));
            return () => task.cancel();
        }
    }, [isActive]);

    const { scrollY: scrollYFromContext, scrollValues, handleScroll: handleScrollFromContext, effectiveHeaderHeight } = headerContext || {};
    const defaultScrollY = useRef(new Animated.Value(0)).current;

    const myScrollY = useMemo(() => {
        if (!scrollValues) return scrollYFromContext || defaultScrollY;
        return scrollValues[refreshType] || scrollYFromContext || defaultScrollY;
    }, [scrollValues, refreshType, scrollYFromContext]);

    const onScroll = useMemo(() => {
        if (handleScrollFromContext) return handleScrollFromContext;
        return Animated.event(
            [{ nativeEvent: { contentOffset: { y: myScrollY } } }],
            { useNativeDriver: true }
        );
    }, [handleScrollFromContext, myScrollY]);

    const handleScrollCombined = useCallback((event: any) => {
        if (onScroll) {
            onScroll(event);
        }
        if (onTabScroll) {
            onTabScroll(event);
        }
    }, [onScroll, onTabScroll]);

    const colors = useThemedColors();
    const { palette, isDark } = useContext(ThemeContext) as any;

    const renderItem = useCallback(({ item }: any) => (
        <PostCard
            post={item}
            onLike={async (postId, uId, isLiked) => await toggleLike?.(postId, uId, isLiked)}
            onDeletePost={() => {
                Alert.alert(t('social.delete_post_title'), t('social.delete_post_message'), [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('common.ok'), onPress: () => deletePost?.(item.id) },
                ]);
            }}
            onPrivacyChange={updatePostPrivacy}
            owner={user?.uid === item.userID}
        />
    ), [user?.uid, toggleLike, deletePost, updatePostPrivacy, t]);

    const keyExtractor = useCallback((item: any) => item.id, []);
    const listStyle = useMemo(() => ({ backgroundColor: 'transparent' }), []);

    const estimatedPostHeight = useMemo(() => Math.max(520, Math.round(windowHeight * 0.72)), [windowHeight]);

    const getItemLayout = useCallback((_: any, index: number) => ({
        length: estimatedPostHeight,
        offset: estimatedPostHeight * index,
        index,
    }), [estimatedPostHeight]);

    const onEndReached = useCallback(() => {
        if (!isActive || hasTriggeredEndReachedRef.current || !hasMore || loadingSpecific || !loadMore) return;
        hasTriggeredEndReachedRef.current = true;
        loadMore();
    }, [isActive, hasMore, loadingSpecific, loadMore]);

    const onMomentumScrollBegin = useCallback(() => {
        hasTriggeredEndReachedRef.current = false;
    }, []);

    useEffect(() => {
        hasTriggeredEndReachedRef.current = false;
    }, [posts.length, hasMore, loadingSpecific]);

    const listFooter = useMemo(() => (
        <SkeletonFooter
            cardBackground={colors.cardBackground}
            primaryColor={colors.tint}
            hasMore={hasMore}
            loadingText={footerLoadingText}
            isLoading={loadingSpecific}
        />
    ), [colors.cardBackground, colors.tint, hasMore, footerLoadingText, loadingSpecific]);

    const refreshControl = useMemo(() => (
        <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => refresh?.(refreshType)}
            tintColor={colors.tint}
            colors={[colors.tint]}
        />
    ), [isRefreshing, refresh, refreshType, colors.tint]);

    const contentContainerStyle = useMemo(() => ({
        paddingTop: effectiveHeaderHeight || HEADER_HEIGHT,
        paddingBottom: 120,
        backgroundColor: 'transparent',
    }), [effectiveHeaderHeight]);

    if (!canRender) {
        if (!isActive) return null;
        return <LoadingView backgroundColor="transparent" cardBackground={colors.cardBackground} effectiveHeaderHeight={effectiveHeaderHeight || HEADER_HEIGHT} />;
    }

    if (loadingInitial && posts.length === 0) {
        return <LoadingView backgroundColor="transparent" cardBackground={colors.cardBackground} effectiveHeaderHeight={effectiveHeaderHeight || HEADER_HEIGHT} />;
    }

    return (
        <View
            style={[styles.container, { 
                backgroundColor: 'transparent',
                borderColor: colors.border
            }]}
        >
            <Animated.FlatList
                ref={ref}
                data={posts}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                style={listStyle}
                contentContainerStyle={contentContainerStyle}
                refreshControl={refreshControl}
                onScroll={handleScrollCombined}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                onEndReachedThreshold={0.5}
                onEndReached={onEndReached}
                onMomentumScrollBegin={onMomentumScrollBegin}
                ListFooterComponent={listFooter}
                initialNumToRender={4}
                maxToRenderPerBatch={8}
                windowSize={11}
                updateCellsBatchingPeriod={40}
                removeClippedSubviews={true}
                decelerationRate={Platform.OS === 'ios' ? 'normal' : 0.98}
                bounces={true}
                overScrollMode="always"
                scrollEnabled={isActive}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    footerContainer: { paddingVertical: 20, alignItems: 'center' },
    loadingMoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, gap: 10 },
    loadingMoreText: { fontSize: 14, fontWeight: '600', opacity: 0.8 },
    skeletonCard: { width: '100%', alignSelf: 'stretch', borderRadius: 0, padding: 16, marginBottom: 16, elevation: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0, shadowRadius: 0 },
    skeletonStatic: { opacity: 0.38 },
    skeletonHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    skeletonAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E1E1E1' },
    skeletonHeaderText: { marginLeft: 12, flex: 1 },
    skeletonName: { width: '40%', height: 14, borderRadius: 7, backgroundColor: '#E1E1E1', marginBottom: 6 },
    skeletonTime: { width: '25%', height: 10, borderRadius: 5, backgroundColor: '#E1E1E1' },
    skeletonContent: { width: '90%', height: 12, borderRadius: 6, backgroundColor: '#E1E1E1', marginBottom: 12 },
    skeletonImage: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#E1E1E1', marginBottom: 12 },
    skeletonFooter: { flexDirection: 'row', gap: 20 },
    skeletonAction: { width: 60, height: 12, borderRadius: 6, backgroundColor: '#E1E1E1' },
    footerSpacer: { height: 16 },
    endReachedContainer: { paddingVertical: 40, alignItems: 'center' },
    endReachedText: { fontSize: 14, fontWeight: '600', opacity: 0.6 }
});

export default React.memo(React.forwardRef(BaseExploreTab));


