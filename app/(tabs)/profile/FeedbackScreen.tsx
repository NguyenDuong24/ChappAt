import React, { useEffect, useState, useCallback, useContext, useMemo, useRef, memo } from 'react';
import { StyleSheet, FlatList, RefreshControl, InteractionManager, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { db } from '@/firebaseConfig';
import { collection, getDocs, query, where, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import AddPostButton from '@/components/profile/AddPostButton';
import TopProfile from '@/components/profile/TopProfile';
import PostCard from '@/components/profile/PostCard';
import { useFocusEffect } from '@react-navigation/native';
import { convertTimestampToDate } from '@/utils/common';
import { PrivacyLevel } from '@/utils/postPrivacyUtils';
import { ThemeContext } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useRefresh } from '@/context/RefreshContext';
import LiquidScreen from '@/components/liquid/LiquidScreen';
import { RevealScalableView } from '@/components/reveal';
import AppDrawer, { FeatureDrawerKey } from '@/components/drawer/AppDrawer';
import FeatureActionDrawer from '@/components/drawer/FeatureActionDrawer';

// Define a Post shape compatible with PostCard props
interface Comment {
  id?: string;
  text: string;
  username: string;
  avatar?: string;
  timestamp: any;
  likes?: string[];
  replies?: any[];
  userId: string;
}

interface PostForCard {
  id: string;
  content: string;
  hashtags?: string[];
  images?: string[];
  address?: string;
  likes: string[];
  comments?: Comment[];
  shares: number;
  timestamp: any;
  userID: string;
  privacy?: 'public' | 'friends' | 'private';
  [key: string]: any;
}

// Constants
const FETCH_INTERVAL = 30000; // 30 seconds minimum between fetches

// Memoized Post Card
const MemoizedPostCard = memo(PostCard, (prevProps, nextProps) => {
  return (
    prevProps.post?.id === nextProps.post?.id &&
    prevProps.post?.likes?.length === nextProps.post?.likes?.length &&
    prevProps.post?.comments?.length === nextProps.post?.comments?.length &&
    prevProps.post?.privacy === nextProps.post?.privacy &&
    prevProps.user?.uid === nextProps.user?.uid
  );
});

// Memoized Header Component
const MemoizedTopProfile = memo(TopProfile);

const ProfileScreen = memo(() => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostForCard[]>([]);
  const [isScroll, setIsScroll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'filter' | 'settings'>('settings');
  const [featureDrawer, setFeatureDrawer] = useState<FeatureDrawerKey | null>(null);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const drawerOffset = useMemo(() => Math.min(width * 0.62, 250), [width]);
  const revealActive = drawerVisible || !!featureDrawer;

  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';

  // Refs for optimization
  const lastFetchTimeRef = useRef<number>(0);
  const isMountedRef = useRef(true);
  const { registerRefreshHandler } = useRefresh();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const toMillis = useCallback((p: Partial<PostForCard>): number => {
    const iso = convertTimestampToDate(p.timestamp ?? p.createdAt);
    return iso ? new Date(iso).getTime() : 0;
  }, []);

  const fetchPosts = useCallback(async () => {
    if (!user || !isMountedRef.current) return;

    try {
      const postsCollection = collection(db, 'posts');
      const userPostsQuery = query(postsCollection, where('userID', '==', user.uid));
      const postsSnapshot = await getDocs(userPostsQuery);

      const postsList: PostForCard[] = postsSnapshot.docs.map((docSnap) => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          content: typeof data?.content === 'string' ? data.content : '',
          hashtags: Array.isArray(data?.hashtags) ? data.hashtags : [],
          images: Array.isArray(data?.images) ? data.images : [],
          address: typeof data?.address === 'string' ? data.address : undefined,
          likes: Array.isArray(data?.likes) ? data.likes : [],
          comments: Array.isArray(data?.comments) ? data.comments : [],
          shares: typeof data?.shares === 'number' ? data.shares : 0,
          timestamp: data?.timestamp ?? data?.createdAt ?? null,
          userID: data?.userID ?? data?.userId ?? '',
          privacy: data?.privacy ?? 'public',
          ...data,
        };
      });

      const sortedPosts = postsList.sort((a, b) => toMillis(b) - toMillis(a));

      if (isMountedRef.current) {
        setPosts(sortedPosts);
        lastFetchTimeRef.current = Date.now();
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  }, [user, toMillis]);

  // Only fetch when tab is focused and data is stale
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      // Only fetch if it's been more than FETCH_INTERVAL since last fetch
      if (now - lastFetchTimeRef.current < FETCH_INTERVAL && posts.length > 0) {
        return;
      }

      const task = InteractionManager.runAfterInteractions(() => {
        if (isMountedRef.current) {
          fetchPosts();
        }
      });

      return () => task.cancel();
    }, [fetchPosts, posts.length])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  }, [fetchPosts]);

  useEffect(() => {
    if (registerRefreshHandler) {
      registerRefreshHandler('profile', onRefresh);
    }
  }, [registerRefreshHandler, onRefresh]);

  const handlePrivacyChange = useCallback((postId: string, newPrivacy: PrivacyLevel) => {
    // Optimistic update
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId ? { ...post, privacy: newPrivacy } : post
      )
    );
  }, []);

  const handleShared = useCallback(async () => {
    await fetchPosts();
  }, [fetchPosts]);

  const handleLike = useCallback(async (postId: string, userId: string, isLiked: boolean) => {
    try {
      const postRef = doc(db, 'posts', postId);
      if (isLiked) {
        await updateDoc(postRef, { likes: arrayRemove(userId) });
      } else {
        await updateDoc(postRef, { likes: arrayUnion(userId) });
      }

      // Optimistic update instead of refetching
      setPosts(prevPosts =>
        prevPosts.map(post => {
          if (post.id === postId) {
            const newLikes = isLiked
              ? post.likes.filter(id => id !== userId)
              : [...post.likes, userId];
            return { ...post, likes: newLikes };
          }
          return post;
        })
      );
    } catch (error) {
      console.error('Error updating like status:', error);
      // Refetch on error to sync state
      fetchPosts();
    }
  }, [fetchPosts]);

  const handleComment = useCallback(async (postId: string, comment: string) => {
    try {
      const postRef = doc(db, 'posts', postId);
      const newComment = {
        id: `${Date.now()}`,
        text: comment,
        username: user?.displayName || user?.username || t('chat.unknown_user'),
        userAvatar: user?.profileUrl || user?.avatar || '',
        userId: user?.uid || '',
        timestamp: new Date(),
        likes: [],
      };
      await updateDoc(postRef, { comments: arrayUnion(newComment) });

      // Optimistic update
      setPosts(prevPosts =>
        prevPosts.map(post => {
          if (post.id === postId) {
            return { ...post, comments: [...(post.comments || []), newComment] };
          }
          return post;
        })
      );
    } catch (error) {
      console.error('Error adding comment:', error);
      fetchPosts();
    }
  }, [user, fetchPosts, t]);

  const handleShare = useCallback(async (postId: string) => {
    console.log('Share post:', postId);
  }, []);

  const handleDelete = useCallback(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleUserPress = useCallback((userId: string) => {
    console.log('Navigate to user:', userId);
  }, []);

  const handleEditProfile = useCallback(() => {
    const navigate = (router as any)?.navigate;
    if (typeof navigate === 'function') {
      navigate('/(tabs)/profile/EditProfile');
      return;
    }
    router.push('/(tabs)/profile/EditProfile');
  }, [router]);

  const handleOpenSettings = useCallback(() => {
    setFeatureDrawer(null);
    setDrawerTab('settings');
    setDrawerVisible(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerVisible(false);
  }, []);

  const handleOpenFeatureDrawer = useCallback((key: FeatureDrawerKey) => {
    setDrawerVisible(false);
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        setFeatureDrawer(key);
      });
    });
  }, []);

  const handleCloseFeatureDrawer = useCallback(() => {
    setFeatureDrawer(null);
  }, []);

  const renderPost = useCallback(({ item }: { item: PostForCard }) => (
    <MemoizedPostCard
      post={item}
      user={user as any}
      onLike={handleLike}
      onDeletePost={handleDelete}
      onPrivacyChange={handlePrivacyChange}
      owner={true}
    />
  ), [user, handleLike, handleDelete, handlePrivacyChange]);

  const keyExtractor = useCallback((item: PostForCard) => item.id, []);

  const ListHeader = useMemo(() => (
    <>
      <MemoizedTopProfile
        onEditProfile={handleEditProfile}
        onOpenSettings={handleOpenSettings}
      />
    </>
  ), [handleEditProfile, handleOpenFeatureDrawer, handleOpenSettings]);


  const handleScroll = useCallback(() => setIsScroll(true), []);
  const handleScrollEnd = useCallback(() => setIsScroll(false), []);

  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#0EA5E9"
      colors={['#0EA5E9']}
    />
  ), [refreshing, onRefresh]);

  return (
    <LiquidScreen themeMode={theme}>
      <RevealScalableView
        revealed={revealActive}
        side="left"
        scale={0.86}
        offset={drawerOffset}
        style={styles.revealContainer}
      >
        <AddPostButton isScroll={isScroll} />
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.flatListContainer}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleScrollEnd}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!drawerVisible}
          // Performance optimizations
          initialNumToRender={3}
          maxToRenderPerBatch={2}
          windowSize={5}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={100}
          scrollEventThrottle={16}
        />
      </RevealScalableView>

      <AppDrawer
        visible={drawerVisible}
        tab={drawerTab}
        onClose={handleCloseDrawer}
      />

      <FeatureActionDrawer
        visible={!!featureDrawer}
        drawerKey={featureDrawer}
        onClose={handleCloseFeatureDrawer}
      />
    </LiquidScreen>
  );
});

const styles = StyleSheet.create({
  flatListContainer: {
    paddingBottom: 100,
  },
  revealContainer: {
    flex: 1,
  },
});

export default ProfileScreen;

