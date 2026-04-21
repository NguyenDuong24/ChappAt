import React, { createContext, useCallback, useEffect, useMemo, useState, useContext, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { db } from '@/firebaseConfig';
import { doc, updateDoc, arrayUnion, arrayRemove, deleteDoc, increment } from 'firebase/firestore';
import postService from '@/services/postService';
import { Image } from 'expo-image';
import { followService } from '@/services/followService';
import { useAuth } from '@/context/authContext';
import { useUserContext } from '@/context/UserContext';

const PAGE_SIZE = 20;
const MAX_PREFETCH_IMAGES = 12;

const LatestPostsContext = createContext(null);
const TrendingPostsContext = createContext(null);
const FollowingPostsContext = createContext(null);
const FollowingIdsContext = createContext(null);
const ExploreActionsContext = createContext(null);
const ExploreStateContext = createContext(null);
const ExploreLoadingContext = createContext(null);

export const ExploreProvider = ({ children }) => {
    const { user } = useAuth();
    const { preloadUsers } = useUserContext();

    const [latestPosts, setLatestPosts] = useState([]);
    const [latestLastDoc, setLatestLastDoc] = useState(null);
    const [latestHasMore, setLatestHasMore] = useState(true);
    const [loadingLatest, setLoadingLatest] = useState(false);

    const [trendingPosts, setTrendingPosts] = useState([]);
    const [trendingLastDoc, setTrendingLastDoc] = useState(null);
    const [trendingHasMore, setTrendingHasMore] = useState(true);
    const [loadingTrending, setLoadingTrending] = useState(false);

    const [followingPosts, setFollowingPosts] = useState([]);
    const [followingLastDoc, setFollowingLastDoc] = useState(null);
    const [followingHasMore, setFollowingHasMore] = useState(true);
    const [loadingFollowing, setLoadingFollowing] = useState(false);
    const [followingIds, setFollowingIds] = useState([]);

    const [error, setError] = useState(null);
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [activeFeeds, setActiveFeeds] = useState({ latest: true, trending: false, following: false });
    const [screenActive, setScreenActive] = useState(true);
    const latestUpdateTaskRef = useRef(null);
    const trendingUpdateTaskRef = useRef(null);
    const followingUpdateTaskRef = useRef(null);

    const ensureFeedReady = useCallback((type) => {
        if (type !== 'trending' && type !== 'following') return;
        setActiveFeeds(prev => (prev[type] ? prev : { ...prev, [type]: true }));
    }, []);

    const setExploreScreenActive = useCallback((isActive) => {
        setScreenActive(!!isActive);
    }, []);

    const cancelTask = useCallback((taskRef) => {
        if (taskRef.current?.cancel) {
            taskRef.current.cancel();
        }
        taskRef.current = null;
    }, []);

    const scheduleAfterInteractions = useCallback((taskRef, fn) => {
        cancelTask(taskRef);
        taskRef.current = InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() => {
                fn();
            });
        });
    }, [cancelTask]);

    const prefetchImages = useCallback((posts) => {
        if (!posts || posts.length === 0) return;
        const imageUrls = posts
            .flatMap(p => p.images || [])
            .filter(Boolean)
            .slice(0, MAX_PREFETCH_IMAGES);
        if (imageUrls.length > 0) {
            InteractionManager.runAfterInteractions(() => {
                imageUrls.forEach((url) => Image.prefetch(url));
            });
        }
    }, []);

    const preloadUsersFromPosts = useCallback((posts) => {
        if (!posts || posts.length === 0) return;
        const userIds = [...new Set(posts.map(p => p.userID).filter(Boolean))];
        InteractionManager.runAfterInteractions(() => {
            if (userIds.length > 0) preloadUsers(userIds);
            prefetchImages(posts);
        });
    }, [preloadUsers, prefetchImages]);

    const fetchFollowingIds = useCallback(async () => {
        if (!user?.uid) return [];
        try {
            const following = await followService.getFollowing(user.uid);
            const ids = following.map(f => f.followingId);
            setFollowingIds(ids);
            return ids;
        } catch (err) { return []; }
    }, [user?.uid]);

    const loadMoreLatest = useCallback(async () => {
        if (loadingLatest || !latestHasMore || !latestLastDoc) return;
        setLoadingLatest(true);
        try {
            const { posts, lastDoc, hasMore } = await postService.fetchNextPage({ type: 'latest', pageSize: PAGE_SIZE }, latestLastDoc);
            if (posts.length > 0) {
                setLatestPosts(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const uniqueNewPosts = posts.filter(p => !existingIds.has(p.id));
                    return [...prev, ...uniqueNewPosts];
                });
            }
            setLatestLastDoc(lastDoc);
            setLatestHasMore(hasMore);
            preloadUsersFromPosts(posts);
        } catch (err) { setError(err.message); } finally { setLoadingLatest(false); }
    }, [loadingLatest, latestHasMore, latestLastDoc, preloadUsersFromPosts]);

    const loadMoreTrending = useCallback(async () => {
        if (loadingTrending || !trendingHasMore || !trendingLastDoc) return;
        setLoadingTrending(true);
        try {
            const { posts, lastDoc, hasMore } = await postService.fetchNextPage({ type: 'trending', pageSize: PAGE_SIZE }, trendingLastDoc);
            if (posts.length > 0) {
                setTrendingPosts(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const uniqueNewPosts = posts.filter(p => !existingIds.has(p.id));
                    return [...prev, ...uniqueNewPosts];
                });
            }
            setTrendingLastDoc(lastDoc);
            setTrendingHasMore(hasMore);
            preloadUsersFromPosts(posts);
        } catch (err) { setError(err.message); } finally { setLoadingTrending(false); }
    }, [loadingTrending, trendingHasMore, trendingLastDoc, preloadUsersFromPosts]);

    const loadMoreFollowing = useCallback(async () => {
        if (loadingFollowing || !followingHasMore || !followingLastDoc) return;
        setLoadingFollowing(true);
        try {
            const { posts, lastDoc, hasMore } = await postService.fetchNextPage({ type: 'following', followingIds, pageSize: PAGE_SIZE }, followingLastDoc);
            if (posts.length > 0) {
                setFollowingPosts(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const uniqueNewPosts = posts.filter(p => !existingIds.has(p.id));
                    return [...prev, ...uniqueNewPosts];
                });
            }
            setFollowingLastDoc(lastDoc);
            setFollowingHasMore(hasMore);
            preloadUsersFromPosts(posts);
        } catch (err) { setError(err.message); } finally { setLoadingFollowing(false); }
    }, [loadingFollowing, followingHasMore, followingLastDoc, followingIds, preloadUsersFromPosts]);

    const toggleLike = useCallback(async (postId, userId, isLiked) => {
        const postRef = doc(db, 'posts', postId);
        try {
            const updateList = (prev) => prev.map(p => {
                if (p.id !== postId) return p;
                const likes = Array.isArray(p.likes) ? p.likes : [];
                return isLiked
                    ? { ...p, likes: likes.filter(l => l !== userId), likesCount: (p.likesCount || 0) - 1 }
                    : { ...p, likes: [...likes, userId], likesCount: (p.likesCount || 0) + 1 };
            });
            setLatestPosts(updateList);
            setTrendingPosts(updateList);
            setFollowingPosts(updateList);
            await updateDoc(postRef, {
                likes: isLiked ? arrayRemove(userId) : arrayUnion(userId),
                likesCount: increment(isLiked ? -1 : 1)
            });
        } catch (err) { }
    }, []);

    const addComment = useCallback(async (postId, newComment) => {
        const postRef = doc(db, 'posts', postId);
        try {
            const updateList = (prev) => prev.map(p => (p.id === postId
                ? { ...p, comments: [...(p.comments || []), newComment], commentsCount: (p.commentsCount || 0) + 1 }
                : p));
            setLatestPosts(updateList);
            setFollowingPosts(updateList);
            await updateDoc(postRef, { comments: arrayUnion(newComment), commentsCount: increment(1) });
        } catch (err) { }
    }, []);

    const toggleFollow = useCallback(async (followerId, followingId, isFollowing) => {
        try {
            if (isFollowing) {
                await followService.unfollowUser(followerId, followingId);
                setFollowingIds(prev => prev.filter(id => id !== followingId));
                setFollowingPosts(prev => prev.filter(p => p.userID !== followingId));
            } else {
                await followService.followUser(followerId, followingId);
                setFollowingIds(prev => [...prev, followingId]);
            }
        } catch (err) { }
    }, []);

    const deletePost = useCallback(async (id) => {
        try {
            await deleteDoc(doc(db, 'posts', id));
            const filterList = (prev) => prev.filter(p => p.id !== id);
            setLatestPosts(filterList);
            setFollowingPosts(filterList);
        } catch (err) { }
    }, []);

    const updatePostPrivacy = useCallback(async (postId, newPrivacy) => {
        try {
            const updateList = (prev) => prev.map(p => p.id === postId ? { ...p, privacy: newPrivacy } : p);
            setLatestPosts(updateList);
            setTrendingPosts(updateList);
            setFollowingPosts(updateList);
        } catch (err) { console.error(err); }
    }, []);

    const refresh = useCallback(async (type) => {
        setIsRefreshing(true);
        setLoadingInitial(true);
        try {
            if (type === 'latest') { setLatestLastDoc(null); setLatestHasMore(true); }
            else if (type === 'trending') {
                ensureFeedReady('trending');
                setTrendingLastDoc(null);
                setTrendingHasMore(true);
                setTrendingPosts([]);
            }
            else if (type === 'following') {
                ensureFeedReady('following');
                setFollowingLastDoc(null);
                setFollowingHasMore(true);
                await fetchFollowingIds();
            }
            setRefreshTrigger(prev => prev + 1);
        } finally { setIsRefreshing(false); }
    }, [fetchFollowingIds, ensureFeedReady]);

    useEffect(() => {
        if (!screenActive) return;
        if (latestPosts.length === 0) setLoadingInitial(true);
        return postService.subscribeToFirstPage({ type: 'latest', pageSize: PAGE_SIZE }, (posts, lastDoc, hasMore) => {
            scheduleAfterInteractions(latestUpdateTaskRef, () => {
                setLatestPosts(prev => {
                    const newIds = new Set(posts.map(p => p.id));
                    const remainingPosts = prev.filter(p => !newIds.has(p.id));
                    return [...posts, ...remainingPosts];
                });
                setLatestLastDoc(prev => prev || lastDoc);
                setLatestHasMore(hasMore);
                setLoadingInitial(false);
                preloadUsersFromPosts(posts);
            });
        });
    }, [screenActive, refreshTrigger, preloadUsersFromPosts, scheduleAfterInteractions]);

    useEffect(() => {
        if (!screenActive) return;
        if (!loadingInitial && !loadingLatest && latestHasMore && latestPosts.length < 10) {
            loadMoreLatest();
        }
    }, [screenActive, latestPosts.length, latestHasMore, loadingLatest, loadingInitial, loadMoreLatest]);

    useEffect(() => {
        if (!screenActive) return;
        if (!activeFeeds.trending) return;
        return postService.subscribeToFirstPage({ type: 'trending', pageSize: PAGE_SIZE }, (posts, lastDoc, hasMore) => {
            scheduleAfterInteractions(trendingUpdateTaskRef, () => {
                setTrendingPosts(prev => {
                    const newIds = new Set(posts.map(p => p.id));
                    const remainingPosts = prev.filter(p => !newIds.has(p.id));
                    return [...posts, ...remainingPosts];
                });
                setTrendingLastDoc(prev => prev || lastDoc);
                setTrendingHasMore(hasMore);
                setLoadingInitial(false);
                preloadUsersFromPosts(posts);
            });
        });
    }, [screenActive, activeFeeds.trending, refreshTrigger, preloadUsersFromPosts, scheduleAfterInteractions]);

    useEffect(() => {
        if (!screenActive) return;
        if (!activeFeeds.trending) return;
        if (!loadingInitial && !loadingTrending && trendingHasMore && trendingPosts.length < 10) {
            loadMoreTrending();
        }
    }, [screenActive, activeFeeds.trending, trendingPosts.length, trendingHasMore, loadingTrending, loadingInitial, loadMoreTrending]);

    useEffect(() => {
        if (!screenActive) return;
        if (!activeFeeds.following) return;
        if (!user?.uid) return;
        let unsub = () => { };
        fetchFollowingIds().then(ids => {
            if (ids.length > 0) {
                unsub = postService.subscribeToFirstPage({ type: 'following', followingIds: ids, pageSize: PAGE_SIZE }, (posts, lastDoc, hasMore) => {
                    scheduleAfterInteractions(followingUpdateTaskRef, () => {
                        setFollowingPosts(prev => {
                            const newIds = new Set(posts.map(p => p.id));
                            const remainingPosts = prev.filter(p => !newIds.has(p.id));
                            return [...posts, ...remainingPosts];
                        });
                        setFollowingLastDoc(prev => prev || lastDoc);
                        setFollowingHasMore(hasMore);
                        setLoadingInitial(false);
                        preloadUsersFromPosts(posts);
                    });
                });
            } else { setLoadingInitial(false); }
        });
        return () => unsub();
    }, [screenActive, activeFeeds.following, user?.uid, fetchFollowingIds, refreshTrigger, preloadUsersFromPosts, scheduleAfterInteractions]);

    useEffect(() => () => {
        cancelTask(latestUpdateTaskRef);
        cancelTask(trendingUpdateTaskRef);
        cancelTask(followingUpdateTaskRef);
    }, [cancelTask]);

    useEffect(() => {
        if (!screenActive) return;
        if (!activeFeeds.following) return;
        if (!loadingInitial && !loadingFollowing && followingHasMore && followingPosts.length < 5) {
            loadMoreFollowing();
        }
    }, [screenActive, activeFeeds.following, followingPosts.length, followingHasMore, loadingFollowing, loadingInitial, loadMoreFollowing]);

    const latestValue = useMemo(() => ({ posts: latestPosts, hasMore: latestHasMore }), [latestPosts, latestHasMore]);
    const trendingValue = useMemo(() => ({ posts: trendingPosts, hasMore: trendingHasMore }), [trendingPosts, trendingHasMore]);
    const followingValue = useMemo(() => ({ posts: followingPosts, hasMore: followingHasMore }), [followingPosts, followingHasMore]);
    const followingIdsValue = useMemo(() => ({ followingIds }), [followingIds]);

    const actionsValue = useMemo(() => ({
        loadMore: loadMoreLatest,
        loadMoreTrending,
        loadMoreFollowing,
        deletePost,
        toggleLike,
        addComment,
        toggleFollow,
        refresh,
        ensureFeedReady,
        setExploreScreenActive,
        updatePostPrivacy,
    }), [loadMoreLatest, loadMoreTrending, loadMoreFollowing, deletePost, toggleLike, addComment, toggleFollow, refresh, ensureFeedReady, setExploreScreenActive, updatePostPrivacy]);

    const stateValue = useMemo(() => ({ loadingInitial, isRefreshing, error }), [loadingInitial, isRefreshing, error]);

    const loadingValue = useMemo(() => ({
        loadingLatest,
        loadingTrending,
        loadingFollowing,
        loadingMore: loadingLatest || loadingTrending || loadingFollowing,
    }), [loadingLatest, loadingTrending, loadingFollowing]);

    return (
        <ExploreActionsContext.Provider value={actionsValue}>
            <ExploreStateContext.Provider value={stateValue}>
                <ExploreLoadingContext.Provider value={loadingValue}>
                    <FollowingIdsContext.Provider value={followingIdsValue}>
                        <LatestPostsContext.Provider value={latestValue}>
                            <TrendingPostsContext.Provider value={trendingValue}>
                                <FollowingPostsContext.Provider value={followingValue}>
                                    {children}
                                </FollowingPostsContext.Provider>
                            </TrendingPostsContext.Provider>
                        </LatestPostsContext.Provider>
                    </FollowingIdsContext.Provider>
                </ExploreLoadingContext.Provider>
            </ExploreStateContext.Provider>
        </ExploreActionsContext.Provider>
    );
};

export const useExploreActions = () => useContext(ExploreActionsContext);
export const useExploreState = () => useContext(ExploreStateContext);
export const useExploreLoading = () => useContext(ExploreLoadingContext);
export const useLatestPosts = () => useContext(LatestPostsContext);
export const useTrendingPosts = () => useContext(TrendingPostsContext);
export const useFollowingPosts = () => useContext(FollowingPostsContext);
export const useFollowingIds = () => useContext(FollowingIdsContext);

export const useExploreContext = () => {
    const actions = useExploreActions();
    const state = useExploreState();
    const loading = useExploreLoading();
    const latest = useLatestPosts();
    const trending = useTrendingPosts();
    const following = useFollowingPosts();
    const { followingIds } = useFollowingIds();

    return useMemo(() => ({
        ...actions, ...state, ...loading,
        latestPosts: latest.posts, hasMore: latest.hasMore,
        trendingPosts: trending.posts, sortedPostsByLike: trending.posts, hasMoreTrending: trending.hasMore,
        followingPosts: following.posts, hasMoreFollowing: following.hasMore,
        followingIds, loading: state.loadingInitial,
    }), [actions, state, loading, latest, trending, following, followingIds]);
};

export default ExploreStateContext;
