import React, { useEffect, useState, useContext } from 'react';
import { StyleSheet, View, FlatList, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import TopProfileUserProfileScreen from '@/components/profile/TopProfileUserProfileScreen';
import PostCard from '@/components/profile/PostCard';
import { convertTimestampToDate } from '@/utils/common';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { db } from '@/firebaseConfig';
import ButtonToChat from './ButtonToChat'

const UserProfileScreen = () => {
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setUser({ id: userDoc.id, ...userDoc.data() });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
    fetchPosts();
  }, [userId]);

  const fetchPosts = async () => {
    if (!userId) return;
    try {
      const postsCollection = collection(db, 'posts');
      const userPostsQuery = query(postsCollection, where('userID', '==', userId));
      const postsSnapshot = await getDocs(userPostsQuery);
      const postsList = postsSnapshot.docs.map((doc) => ({
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
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const renderPost = ({ item }) => (
    <PostCard
      owner={false}
      post={item}
      onLike={() => console.log(`Liked post ${item.id}`)}
      onComment={() => console.log(`Commented on post ${item.id}`)}
      onShare={() => console.log(`Shared post ${item.id}`)}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          user && (
            <TopProfileUserProfileScreen
              user={user}
            />
          )
        }
        contentContainerStyle={styles.flatListContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
      <ButtonToChat id={userId}></ButtonToChat> 
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

export default UserProfileScreen;
