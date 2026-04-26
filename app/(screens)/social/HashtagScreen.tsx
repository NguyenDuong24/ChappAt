import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { arrayRemove, arrayUnion, collection, doc, DocumentData, getDocs, limit, orderBy, query, QueryDocumentSnapshot, startAfter, updateDoc, where } from 'firebase/firestore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import PostCard from '@/components/profile/PostCard';
import { useAuth } from '@/context/authContext';
import { useUserContext } from '@/context/UserContext';
import { useThemedColors } from '@/hooks/useThemedColors';
import { db } from '@/firebaseConfig';
import { followService } from '@/services/followService';

interface PostData {
  id: string;
  content: string;
  hashtags?: string[];
  images?: string[];
  timestamp: any;
  userID: string;
  username?: string;
  likes?: string[];
  comments?: any[];
  address?: string;
  privacy?: 'public' | 'friends' | 'private';
}

const PAGE_SIZE = 10;

const normalizeHashtag = (value: string) => {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
};

const getTimestampMs = (timestamp: any) => {
  if (!timestamp) return 0;
  if (typeof timestamp.toDate === 'function') return timestamp.toDate().getTime();
  if (timestamp.seconds) return timestamp.seconds * 1000;
  if (timestamp instanceof Date) return timestamp.getTime();
  return 0;
};

const HashtagSkeleton = React.memo(({ colors }: { colors: any }) => (
  <View style={[styles.skeletonCard, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF', borderColor: colors.border }]}>
    <View style={styles.skeletonHeader}>
      <View style={[styles.skeletonAvatar, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.11)' : '#E5E7EB' }]} />
      <View style={styles.skeletonTextGroup}>
        <View style={[styles.skeletonLineLarge, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.11)' : '#E5E7EB' }]} />
        <View style={[styles.skeletonLineSmall, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : '#EEF2F7' }]} />
      </View>
    </View>
    <View style={[styles.skeletonBody, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }]} />
  </View>
));

const HashtagScreen: React.FC = () => {
  const { t } = useTranslation();
  const colors = useThemedColors();
  const { user } = useAuth();
  const { preloadUsers } = useUserContext();
  const router = useRouter();
  const params = useLocalSearchParams();

  const rawHashtag = Array.isArray(params.hashtag) ? params.hashtag[0] : params.hashtag || '';
  const displayHashtag = useMemo(() => normalizeHashtag(String(rawHashtag)), [rawHashtag]);
  const searchFormats = useMemo(() => {
    if (!displayHashtag) return [];
    const withoutHash = displayHashtag.replace(/^#/, '');
    return Array.from(new Set([
      displayHashtag.toLowerCase(),
      displayHashtag,
      `#${withoutHash.toLowerCase()}`,
      `#${withoutHash}`,
    ].filter(Boolean)));
  }, [displayHashtag]);

  const [posts, setPosts] = useState<PostData[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  const cursorsRef = useRef<Record<string, QueryDocumentSnapshot<DocumentData> | null>>({});
  const hasMoreByFormatRef = useRef<Record<string, boolean>>({});
  const loadingRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);
  const endReachedDuringMomentumRef = useRef(false);

  useEffect(() => {
    if (!displayHashtag) {
      setLoadingInitial(false);
      Alert.alert(t('common.error'), t('hashtag_screen.not_found'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    }
  }, [displayHashtag, router, t]);

  useEffect(() => {
    if (!user?.uid) return;
    followService.getFollowing(user.uid)
      .then(follows => setFollowingIds(follows.map(f => f.followingId)))
      .catch(() => setFollowingIds([]));
  }, [user?.uid]);

  const mergePosts = useCallback((current: PostData[], incoming: PostData[]) => {
    const byId = new Map<string, PostData>();
    [...current, ...incoming].forEach(post => {
      if (post?.id) byId.set(post.id, { likes: [], comments: [], ...post });
    });
    return Array.from(byId.values()).sort((a, b) => getTimestampMs(b.timestamp) - getTimestampMs(a.timestamp));
  }, []);

  const loadPosts = useCallback(async (mode: 'refresh' | 'more' = 'refresh') => {
    if (!displayHashtag || loadingRef.current) return;

    loadingRef.current = true;
    setLoadError(false);
    if (mode === 'refresh') {
      setLoadingInitial(!hasLoadedOnceRef.current);
      cursorsRef.current = {};
      hasMoreByFormatRef.current = {};
      searchFormats.forEach(format => {
        cursorsRef.current[format] = null;
        hasMoreByFormatRef.current[format] = true;
      });
    } else {
      setLoadingMore(true);
    }

    try {
      const pages = await Promise.all(searchFormats.map(async format => {
        if (mode === 'more' && hasMoreByFormatRef.current[format] === false) {
          return [];
        }

        const constraints: any[] = [
          where('hashtags', 'array-contains', format),
          orderBy('timestamp', 'desc'),
        ];
        const cursor = cursorsRef.current[format];
        if (mode === 'more' && cursor) {
          constraints.push(startAfter(cursor));
        }
        constraints.push(limit(PAGE_SIZE));

        const snapshot = await getDocs(query(collection(db, 'posts'), ...constraints));
        cursorsRef.current[format] = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : cursor || null;
        hasMoreByFormatRef.current[format] = snapshot.docs.length === PAGE_SIZE;

        return snapshot.docs.map(item => ({
          id: item.id,
          likes: [],
          comments: [],
          ...item.data(),
        } as PostData));
      }));

      const pagePosts = pages.flat();
      setPosts(prev => mode === 'refresh' ? mergePosts([], pagePosts) : mergePosts(prev, pagePosts));
      setHasMore(Object.values(hasMoreByFormatRef.current).some(Boolean));

      const userIds = Array.from(new Set(pagePosts.map(post => post.userID).filter(Boolean)));
      if (userIds.length > 0) {
        preloadUsers(userIds);
      }
    } catch (error) {
      console.error('[HashtagScreen] load posts error:', error);
      setLoadError(true);
      if (mode === 'refresh') {
        Alert.alert(t('common.error'), t('hashtag_screen.load_error'));
      }
    } finally {
      loadingRef.current = false;
      hasLoadedOnceRef.current = true;
      setLoadingInitial(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [displayHashtag, mergePosts, preloadUsers, searchFormats, t]);

  useEffect(() => {
    if (displayHashtag) {
      loadPosts('refresh');
    }
  }, [displayHashtag, loadPosts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPosts('refresh');
  }, [loadPosts]);

  const loadMore = useCallback(() => {
    if (endReachedDuringMomentumRef.current || loadingRef.current || loadingMore || loadingInitial || !hasMore || posts.length === 0) return;
    endReachedDuringMomentumRef.current = true;
    loadPosts('more');
  }, [hasMore, loadPosts, loadingInitial, loadingMore, posts.length]);

  const handleLike = useCallback(async (postId: string, userId: string, isLiked: boolean) => {
    setPosts(prev => prev.map(post => {
      if (post.id !== postId) return post;
      const currentLikes = post.likes || [];
      const nextLikes = isLiked ? currentLikes.filter(id => id !== userId) : Array.from(new Set([...currentLikes, userId]));
      return { ...post, likes: nextLikes };
    }));

    try {
      await updateDoc(doc(db, 'posts', postId), {
        likes: isLiked ? arrayRemove(userId) : arrayUnion(userId),
      });
    } catch (error) {
      console.error('[HashtagScreen] like error:', error);
      loadPosts('refresh');
    }
  }, [loadPosts]);

  const handleDeletePost = useCallback(() => {
    loadPosts('refresh');
  }, [loadPosts]);

  const handleToggleFollow = useCallback(async (targetUserId: string) => {
    if (!user?.uid || !targetUserId || followingIds.includes(targetUserId)) return;
    setFollowingIds(prev => Array.from(new Set([...prev, targetUserId])));
    try {
      await followService.followUser(user.uid, targetUserId);
    } catch (error) {
      console.error('[HashtagScreen] follow error:', error);
      setFollowingIds(prev => prev.filter(id => id !== targetUserId));
      Alert.alert(t('common.error'), t('groups.follow_toggle_error'));
    }
  }, [followingIds, t, user?.uid]);

  const renderPostItem = useCallback(({ item: post }: { item: PostData }) => {
    const postWithDefaults = {
      ...post,
      likes: post.likes || [],
      comments: post.comments || [],
    };

    return (
      <PostCard
        post={postWithDefaults}
        onLike={handleLike}
        onDeletePost={handleDeletePost}
        owner={user?.uid === post.userID}
        isFollowing={followingIds.includes(post.userID)}
        onToggleFollow={() => handleToggleFollow(post.userID)}
      />
    );
  }, [followingIds, handleDeletePost, handleLike, handleToggleFollow, user?.uid]);

  const renderHeader = useCallback(() => (
    <View style={styles.headerWrap}>
      <LinearGradient
        colors={colors.isDark ? ['rgba(30,41,59,0.98)', 'rgba(15,23,42,0.96)'] : ['#FFF7ED', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { borderColor: colors.isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.07)' }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF' }]}
            onPress={() => router.back()}
            activeOpacity={0.75}
          >
            <MaterialIcons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={[styles.hotBadge, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '24' }]}>
            <MaterialIcons name="local-fire-department" size={15} color={colors.primary} />
            <Text style={[styles.hotBadgeText, { color: colors.primary }]}>{t('hashtag_screen.hot')}</Text>
          </View>
        </View>

        <Text style={[styles.kicker, { color: colors.subtleText }]}>{t('hashtag_screen.kicker')}</Text>
        <Text style={[styles.hashtagTitle, { color: colors.text }]} numberOfLines={1}>{displayHashtag}</Text>
        <Text style={[styles.postCount, { color: colors.subtleText }]}>
          {t('hashtag_screen.post_count', { count: posts.length })}
        </Text>
      </LinearGradient>
    </View>
  ), [colors.isDark, colors.primary, colors.subtleText, colors.text, displayHashtag, posts.length, router, t]);

  const renderEmptyState = useCallback(() => {
    if (loadingInitial) return null;

    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '14' }]}>
          <MaterialIcons name="tag" size={38} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('hashtag_screen.empty_title')}</Text>
        <Text style={[styles.emptySubtitle, { color: colors.subtleText }]}>
          {t('hashtag_screen.empty_subtitle', { hashtag: displayHashtag })}
        </Text>
        <TouchableOpacity
          style={[styles.createPostButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            router.dismiss();
            router.push('/(tabs)/profile/create');
          }}
          activeOpacity={0.78}
        >
          <MaterialIcons name="add" size={20} color="white" />
          <Text style={styles.createPostText}>{t('hashtag_screen.create_post')}</Text>
        </TouchableOpacity>
      </View>
    );
  }, [colors.primary, colors.subtleText, colors.text, displayHashtag, loadingInitial, router, t]);

  const renderFooter = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={[styles.footerText, { color: colors.subtleText }]}>{t('hashtag_screen.loading_more')}</Text>
        </View>
      );
    }

    if (loadError && posts.length > 0) {
      return (
        <TouchableOpacity style={styles.footer} onPress={() => loadPosts('more')} activeOpacity={0.75}>
          <Text style={[styles.footerText, { color: colors.primary }]}>{t('hashtag_screen.tap_to_retry')}</Text>
        </TouchableOpacity>
      );
    }

    if (!hasMore && posts.length > 0) {
      return (
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.subtleText }]}>{t('hashtag_screen.end_reached')}</Text>
        </View>
      );
    }

    return <View style={styles.footerSpacer} />;
  }, [colors.primary, colors.subtleText, hasMore, loadError, loadPosts, loadingMore, posts.length, t]);

  const keyExtractor = useCallback((item: PostData) => item.id, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <FlatList
        data={posts}
        renderItem={renderPostItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={posts.length === 0 ? styles.emptyContentContainer : styles.listContainer}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.35}
        onEndReached={loadMore}
        onMomentumScrollBegin={() => {
          endReachedDuringMomentumRef.current = false;
        }}
        initialNumToRender={4}
        maxToRenderPerBatch={5}
        windowSize={7}
        removeClippedSubviews
      />

      {loadingInitial && (
        <Animated.View style={styles.initialOverlay} pointerEvents="none">
          <HashtagSkeleton colors={colors} />
          <HashtagSkeleton colors={colors} />
          <View style={styles.loadingInline}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.subtleText }]}>
              {t('hashtag_screen.loading_for', { hashtag: displayHashtag })}
            </Text>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  header: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.10,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotBadge: {
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  hotBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  kicker: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 5,
  },
  hashtagTitle: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: 0,
  },
  postCount: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    marginTop: 5,
  },
  listContainer: {
    paddingBottom: 28,
  },
  emptyContentContainer: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop: 64,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 9,
  },
  emptySubtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 24,
  },
  createPostButton: {
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  createPostText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
  },
  footer: {
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  footerSpacer: {
    height: 24,
  },
  initialOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 160,
    paddingTop: 12,
  },
  skeletonCard: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  skeletonAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  skeletonTextGroup: {
    flex: 1,
  },
  skeletonLineLarge: {
    width: '52%',
    height: 14,
    borderRadius: 7,
    marginBottom: 8,
  },
  skeletonLineSmall: {
    width: '32%',
    height: 10,
    borderRadius: 5,
  },
  skeletonBody: {
    height: 150,
    borderRadius: 18,
  },
  loadingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default HashtagScreen;
