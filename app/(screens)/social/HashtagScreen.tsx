import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Chip } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { useThemedColors } from '@/hooks/useThemedColors';
import { useAuth } from '@/context/authContext';
import { useUserContext } from '@/context/UserContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getPostsByHashtag } from '@/utils/hashtagUtils';
import PostCard from '@/components/profile/PostCard';
import { doc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { followService } from '@/services/followService';

interface PostData {
  id: string;
  content: string;
  hashtags?: string[];
  images?: string[];
  timestamp: any;
  userID: string;
  username: string;
  likes?: string[];
  comments?: any[];
  shares?: number;
  address?: string;
}

const HashtagScreen: React.FC = () => {
  const { t } = useTranslation();
  const colors = useThemedColors();
  const { user } = useAuth();
  const { getUserInfo, getUsersInfo } = useUserContext();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  useEffect(() => {
    if (user?.uid) {
      followService.getFollowing(user.uid).then(follows => {
        setFollowingIds(follows.map(f => f.followingId));
      });
    }
  }, [user?.uid]);



  const hashtag = params.hashtag as string || '';
  const displayHashtag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;

  useEffect(() => {
    console.log('[HashtagScreen] mounted with hashtag:', hashtag);

    if (hashtag && hashtag.trim()) {
      loadPosts();
    } else {
      console.warn('[HashtagScreen] No valid hashtag parameter found!');
      setLoading(false);
      Alert.alert(t('common.error'), t('hashtag_screen.not_found'), [
        { text: t('common.ok'), onPress: () => router.back() }
      ]);
    }
  }, [hashtag]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      console.log('[HashtagScreen] Calling getPostsByHashtag with:', displayHashtag);

      // Fetch posts by hashtag
      const hashtagPosts = await getPostsByHashtag(displayHashtag, 50);
      console.log('[HashtagScreen] Found posts:', hashtagPosts.length);

      // Sort newest first
      const sortedPosts = hashtagPosts.sort((a, b) => {
        const timeA = a.timestamp?.toDate?.() || (a.timestamp instanceof Date ? a.timestamp : new Date());
        const timeB = b.timestamp?.toDate?.() || (b.timestamp instanceof Date ? b.timestamp : new Date());
        return timeB.getTime() - timeA.getTime();
      });

      setPosts(sortedPosts);



    } catch (error) {
      console.error('[HashtagScreen] Error loading hashtag posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const handleLike = async (postId: string, userId: string, isLiked: boolean) => {
    try {
      const postRef = doc(db, 'posts', postId);
      if (isLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(userId),
        });
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(userId),
        });
      }
      console.log(`Successfully updated like status for post ${postId}`);
      loadPosts(); // Refresh posts to reflect changes
    } catch (error) {
      console.error('Error updating like status:', error);
    }
  };

  const handleShare = async (postId: string) => {
    // Implement share functionality
    console.log('Share post:', postId);
  };

  const handleDeletePost = () => {
    // Refresh posts after delete
    loadPosts();
  };

  const addComment = async (postId: string, comment: string) => {
    try {
      const postRef = doc(db, 'posts', postId);
      const newComment = {
        id: `${Date.now()}`,
        text: comment,
        username: user?.displayName || t('chat.unknown_user'),
        userAvatar: user?.avatar || '',
        userId: user?.uid || '',
        timestamp: new Date(),
        likes: [],
      };
      await updateDoc(postRef, {
        comments: arrayUnion(newComment),
      });
      console.log(`Successfully added comment to post ${postId}`);
      loadPosts(); // Refresh posts to reflect changes
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleToggleFollow = async (targetUserId: string) => {
    if (!user?.uid) return;
    try {
      await followService.followUser(user.uid, targetUserId);
      setFollowingIds(prev => [...prev, targetUserId]);
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const renderPostItem = ({ item: post }: { item: PostData }) => {
    const isOwner = user?.uid === post.userID;

    const postWithDefaults = {
      ...post,
      likes: post.likes || [],
      shares: post.shares || 0,
      comments: post.comments || []
    };

    return (
      <PostCard
        post={postWithDefaults}
        onLike={handleLike}
        onDeletePost={handleDeletePost}
        owner={isOwner}
        isFollowing={followingIds.includes(post.userID)}
        onToggleFollow={() => handleToggleFollow(post.userID)}
      />
    );
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.headerContent}>
        <Text style={[styles.hashtagTitle, { color: colors.primary }]}>
          {displayHashtag}
        </Text>
        <Text style={[styles.postCount, { color: colors.subtleText }]}>
          {t('hashtag_screen.post_count', { count: posts.length })}
        </Text>
      </View>

      <View style={styles.headerActions}>
        <Chip
          style={[styles.trendingChip, { backgroundColor: colors.accent + '20' }]}
          textStyle={{ color: colors.accent, fontSize: 12 }}
          compact
        >
          {t('social.trending_now')}</Chip>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="tag" size={80} color={colors.subtleText} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {t('hashtag_screen.empty_title')}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.subtleText }]}>
                {t('hashtag_screen.empty_subtitle', { hashtag: displayHashtag })}
      </Text>
      <TouchableOpacity
        style={[styles.createPostButton, { backgroundColor: colors.primary }]}
        onPress={() => {
          router.dismiss();
          router.push('/(tabs)/profile/create');
        }}
      >
        <MaterialIcons name="add" size={20} color="white" />
        <Text style={styles.createPostText}>{t('hashtag_screen.create_post')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <FlatList
        data={posts}
        renderItem={renderPostItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={posts.length === 0 ? styles.emptyContentContainer : styles.listContainer}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        style={styles.flatList}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 20,
  },
  headerContent: {
    flex: 1,
  },
  hashtagTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  postCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  headerActions: {
    alignItems: 'flex-end',
  },
  trendingChip: {
    height: 28,
  },
  flatList: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  listContainer: {
    paddingTop: 0,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyContentContainer: {
    flexGrow: 1,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  createPostText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  separator: {
    height: 4,
  },
});

export default HashtagScreen;

