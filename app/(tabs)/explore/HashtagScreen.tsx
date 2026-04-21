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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemeContext, useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/authContext';
import { useUserContext } from '@/context/UserContext';
import { Colors } from '@/constants/Colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import PostCard from '@/components/profile/PostCard';
import { db } from '@/firebaseConfig';
import { collection, query as fsQuery, where, orderBy, limit as fsLimit, startAfter, getDocs, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

interface PostData {
  id: string;
  content: string;
  hashtags?: string[];
  images?: string[];
  timestamp: any;
  userID: string;
  username: string;
  likes: string[];
  comments?: any[];
  shares?: number;
  address?: string;
}

const HashtagScreen: React.FC = () => {
  const { theme, isDark, palette } = useTheme();
  const currentThemeColors = isDark ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const { preloadUsers } = useUserContext();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();

  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const hashtag = (params.hashtag as string) || '';
  const displayHashtag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
  const normalizedHashtag = displayHashtag.toLowerCase();

  useEffect(() => {
    if (hashtag) {
      loadPosts(true);
    } else {
      Alert.alert(t('common.error'), t('hashtag_screen.not_found'), [{ text: t('common.ok'), onPress: () => router.back() }]);
    }
  }, [hashtag]);

  const loadPosts = async (refresh: boolean = false) => {
    try {
      if (refresh) {
        setLoading(true);
        setLastDoc(null);
        setHasMore(true);
      }

      const limitCount = 20;
      const constraints: any[] = [
        where('hashtags', 'array-contains', normalizedHashtag),
        orderBy('timestamp', 'desc'),
        fsLimit(limitCount),
      ];
      if (!refresh && lastDoc) {
        constraints.splice(2, 0, startAfter(lastDoc));
      }

      let q = fsQuery(collection(db, 'posts'), ...constraints);
      let snapshot = await getDocs(q);

      if (refresh && snapshot.empty) {
        const fbConstraints: any[] = [
          where('hashtags', 'array-contains', displayHashtag),
          orderBy('timestamp', 'desc'),
          fsLimit(limitCount),
        ];
        q = fsQuery(collection(db, 'posts'), ...fbConstraints);
        snapshot = await getDocs(q);
      }

      const pagePosts = snapshot.docs.map(d => ({ id: d.id, likes: [], ...d.data() as any } as PostData));
      const nextLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : lastDoc;

      const newList = refresh ? pagePosts : [...posts, ...pagePosts.filter(p => !posts.some(e => e.id === p.id))];
      setPosts(newList);
      setLastDoc(nextLastDoc);
      setHasMore(snapshot.docs.length === limitCount);

      const userIds = [...new Set(newList.map(p => p.userID).filter(Boolean))];
      if (userIds.length > 0) {
        preloadUsers(userIds as string[]);
      }
    } catch (error) {
      console.error('Error loading hashtag posts:', error);
      Alert.alert(t('common.error'), t('hashtag_screen.load_error'));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts(true);
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (!hasMore || loading) return;
    await loadPosts(false);
  };

  const handleLike = async () => {};

  const handleDeletePost = () => {
    loadPosts(true);
  };

  const renderPostItem = ({ item: post }: { item: PostData }) => {
    const isOwner = user?.uid === post.userID;
    return <PostCard post={post} onLike={handleLike} onDeletePost={handleDeletePost} owner={isOwner} />;
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: currentThemeColors.surface }]}>
      <TouchableOpacity style={[styles.backButton, { backgroundColor: `${currentThemeColors.background}80` }]} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={24} color={currentThemeColors.text} />
      </TouchableOpacity>

      <View style={styles.headerContent}>
        <Text style={[styles.hashtagTitle, { color: Colors.primary }]}>{displayHashtag}</Text>
        <Text style={[styles.postCount, { color: currentThemeColors.subtleText }]}>{t('hashtag_screen.post_count', { count: posts.length })}</Text>
      </View>

      <View style={styles.headerActions}>
        <Chip style={[styles.trendingChip, { backgroundColor: `${Colors.accent}20` }]} textStyle={{ color: Colors.accent, fontSize: 12 }} compact>
          {t('hashtag_screen.hot')}
        </Chip>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="tag" size={80} color={currentThemeColors.subtleText} />
      <Text style={[styles.emptyTitle, { color: currentThemeColors.text }]}>{t('hashtag_screen.empty_title')}</Text>
      <Text style={[styles.emptySubtitle, { color: currentThemeColors.subtleText }]}>{t('hashtag_screen.empty_subtitle', { hashtag: displayHashtag })}</Text>
      <TouchableOpacity
        style={[styles.createPostButton, { backgroundColor: Colors.primary }]}
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? 'transparent' : currentThemeColors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" />
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.loadingText, { color: currentThemeColors.text }]}>{t('hashtag_screen.loading_for', { hashtag: displayHashtag })}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? 'transparent' : currentThemeColors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" />
      <FlatList
        data={posts}
        renderItem={renderPostItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={posts.length === 0 ? styles.emptyContentContainer : undefined}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: { padding: 8, marginRight: 12, borderRadius: 20 },
  headerContent: { flex: 1 },
  hashtagTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  postCount: { fontSize: 14, fontWeight: '500' },
  headerActions: { alignItems: 'flex-end' },
  trendingChip: { height: 28 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  loadingText: { marginTop: 16, fontSize: 16, textAlign: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingTop: 60 },
  emptyContentContainer: { flexGrow: 1 },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 24, marginBottom: 12, textAlign: 'center' },
  emptySubtitle: { fontSize: 16, textAlign: 'center', marginBottom: 32, lineHeight: 24 },
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
  createPostText: { color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  separator: { height: 8 },
});

export default HashtagScreen;
