import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { db } from '@/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import AddPostButton from '@/components/profile/AddPostButton';
import ProfileHeader from '@/components/profile/ProfileHeader';
import PostCard from '@/components/profile/PostCard';

const ProfileScreen = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [isScroll, setIsScroll] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const postsCollection = collection(db, 'posts');
        const postsSnapshot = await getDocs(postsCollection);
        const postsList = postsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPosts(postsList);
      } catch (error) {
        console.error('Error fetching posts:', error);
      }
    };

    fetchPosts();
  }, []);

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
      post={item}
      onLike={handleLike}
      onComment={handleComment}
      onShare={handleShare}
    />
  );

  return (
    <View style={{ position: 'relative' }}>
      <AddPostButton isScroll={isScroll} router={router} />
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<ProfileHeader user={user} onEditProfile={() => console.log('Edit Profile Pressed')} />}
        contentContainerStyle={styles.container}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScrollEnd}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
  },
});

export default ProfileScreen;
