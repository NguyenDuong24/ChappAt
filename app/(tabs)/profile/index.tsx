import React, { useEffect, useState, useCallback, useContext } from 'react';
import { StyleSheet, View, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { db } from '@/firebaseConfig';
import { collection, getDocs, query, where, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import AddPostButton from '@/components/profile/AddPostButton';
import TopProfile from '@/components/profile/TopProfile';
import PostCardStandard from '@/components/profile/PostCardStandard';
import { useFocusEffect } from '@react-navigation/native';
import { convertTimestampToDate } from '@/utils/common';
import { PrivacyLevel } from '@/utils/postPrivacyUtils';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';

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
  // Allow unknown extra fields from Firestore
  [key: string]: any;
}

const ProfileScreen = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostForCard[]>([]);
  const [isScroll, setIsScroll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  const toMillis = (p: Partial<PostForCard>): number => {
    const iso = convertTimestampToDate(p.timestamp ?? p.createdAt);
    return iso ? new Date(iso).getTime() : 0;
  };

  const fetchPosts = useCallback(async () => {
    if (!user) return;
    try {
      const postsCollection = collection(db, 'posts');
      const userPostsQuery = query(postsCollection, where('userID', '==', user.uid));
      const postsSnapshot = await getDocs(userPostsQuery);
      const postsList: PostForCard[] = postsSnapshot.docs.map((docSnap) => {
        const data = docSnap.data() as any;
        const post: PostForCard = {
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
          // keep other fields if any
          ...data,
        };
        
        // Debug log for hashtags
        if (__DEV__ && data?.hashtags) {
          console.log('🔍 PROFILE DEBUG - Post hashtags:', {
            postId: docSnap.id,
            rawHashtags: data.hashtags,
            processedHashtags: post.hashtags,
            hashtagsType: typeof data.hashtags,
            isArray: Array.isArray(data.hashtags)
          });
        }
        
        return post;
      });

      const sortedPosts = postsList.sort((a, b) => toMillis(b) - toMillis(a));
      setPosts(sortedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [fetchPosts])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const handlePrivacyChange = (postId: string, newPrivacy: PrivacyLevel) => {
    console.log('Privacy changed for post:', postId, 'to:', newPrivacy);
    fetchPosts();
  };

  const handleShared = async () => {
    await fetchPosts();
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
      fetchPosts(); // Refresh posts to reflect changes
    } catch (error) {
      console.error('Error updating like status:', error);
    }
  };

  const handleComment = async (postId: string, comment: string) => {
    try {
      const postRef = doc(db, 'posts', postId);
      const newComment = {
        id: `${Date.now()}`,
        text: comment,
        username: user?.displayName || user?.username || 'Unknown User',
        userAvatar: user?.profileUrl || user?.avatar || '',
        userId: user?.uid || '',
        timestamp: new Date(),
        likes: [],
      };
      await updateDoc(postRef, {
        comments: arrayUnion(newComment),
      });
      fetchPosts(); // Refresh posts to reflect changes
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleShare = async (postId: string) => {
    console.log('Share post:', postId);
  };

  const renderPost = ({ item }: { item: PostForCard }) => (
    <PostCardStandard
      post={item}
      currentUserId={user?.uid || ''}
      currentUserAvatar={user?.profileUrl || user?.avatar}
      onLike={handleLike}
      onComment={handleComment}
      onShare={handleShare}
      onDelete={() => { fetchPosts(); }}
      onUserPress={(userId: string) => console.log('Navigate to user:', userId)}
      isOwner={true}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <AddPostButton isScroll={isScroll} />
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<TopProfile onEditProfile={() => console.log('Edit Profile Pressed')} />}
        contentContainerStyle={[styles.flatListContainer, { paddingHorizontal: 16 }]}
        onScroll={() => setIsScroll(true)}
        onMomentumScrollEnd={() => setIsScroll(false)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flatListContainer: {
    paddingTop: 20,
    paddingBottom: 20,
  },
});

export default ProfileScreen;
