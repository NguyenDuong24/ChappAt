import React, { useEffect, useState, useCallback, useContext } from 'react';
import { StyleSheet, View, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { db } from '@/firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';
import AddPostButton from '@/components/profile/AddPostButton';
import TopProfile from '@/components/profile/TopProfile';
import PostCard from '@/components/profile/PostCard';
import { useFocusEffect } from '@react-navigation/native';
import { convertTimestampToDate } from '@/utils/common';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';

const ProfileScreen = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [isScroll, setIsScroll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  const fetchPosts = useCallback(async () => {
    if (!user) return;
    try {
      const postsCollection = collection(db, 'posts');
      const userPostsQuery = query(postsCollection, where('userID', '==', user.uid));
      const postsSnapshot = await getDocs(userPostsQuery);
      const postsList = postsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      const sortedPosts = postsList.sort((a, b) => {
        const dateA = convertTimestampToDate(a.timestamp);
        const dateB = convertTimestampToDate(b.timestamp);
        return new Date(dateB) - new Date(dateA);
      });

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

  const handleLike = (id) => {
    console.log(`Liked post ${id}`);
  };

  const handleComment = (id) => {
    console.log(`Commented on post ${id}`);
  };

  const handleShare = (id) => {
    console.log(`Shared post ${id}`);
  };

  const handleScroll = () => {
    setIsScroll(true);
  };

  const handleScrollEnd = () => {
    setIsScroll(false);
  };

  const renderPost = ({ item }) => (
    <PostCard
      owner={true}
      post={item}
      onLike={handleLike}
      onComment={handleComment}
      onShare={handleShare}
      onDeletePost={fetchPosts}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <AddPostButton isScroll={isScroll} router={router} onRefresh={onRefresh} />
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <TopProfile user={user} onEditProfile={() => console.log('Edit Profile Pressed')} />
        }
        contentContainerStyle={styles.flatListContainer}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScrollEnd}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
  },
});

export default ProfileScreen;
