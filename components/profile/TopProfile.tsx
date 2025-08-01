import React, { useContext, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  Clipboard,
} from 'react-native';
import { Title, Paragraph, Divider, Text } from 'react-native-paper';
import { AntDesign } from '@expo/vector-icons';
import { db } from '@/firebaseConfig';
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  setDoc,
  increment,
  arrayUnion,
} from 'firebase/firestore';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import CustomImage from '../common/CustomImage';
import { useAuth } from '@/context/authContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';

const extractHashtags = (text: string) => {
  const regex = /#[a-zA-Z0-9_]+/g;
  return text.match(regex) || [];
};

interface TopProfileProps {
  onEditProfile?: () => void;
  handleLogout?: () => void;
}

const TopProfile = ({ onEditProfile, handleLogout }: TopProfileProps) => {
  const [isEditingBio, setIsEditingBio] = useState(false);
  const { user } = useAuth();
  const [bio, setBio] = useState('');
  const router = useRouter();
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);

  // Update bio when user changes
  useEffect(() => {
    if (user?.bio) {
      setBio(user.bio);
    }
  }, [user]);

  useEffect(() => {
    if (!user || !user.uid) return;

    const qFollowers = query(
      collection(db, 'follows'),
      where('followingId', '==', user.uid)
    );
    const unsubscribeFollowers = onSnapshot(qFollowers, (snapshot) => {
      setFollowersCount(snapshot.size);
    });

    const qFollowing = query(
      collection(db, 'follows'),
      where('followerId', '==', user.uid)
    );
    const unsubscribeFollowing = onSnapshot(qFollowing, (snapshot) => {
      setFollowingCount(snapshot.size);
    });

    const qPosts = query(
      collection(db, 'posts'),
      where('userId', '==', user.uid)
    );
    const unsubscribePosts = onSnapshot(qPosts, (snapshot) => {
      setPostsCount(snapshot.size);
    });

    return () => {
      unsubscribeFollowers();
      unsubscribeFollowing();
      unsubscribePosts();
    };
  }, [user]);

  const handleSaveBio = async () => {
    try {
      if (user && user.uid) {
        const userDoc = doc(db, 'users', user.uid);
        await updateDoc(userDoc, { bio });
        setIsEditingBio(false);
        await updateBioHashtags(bio);
      }
    } catch (error) {
      console.error('Error updating bio:', error);
    }
  };

  const updateBioHashtags = async (newBio: string) => {
    if (!user?.uid) return; // Add safety check
    
    const hashtags = extractHashtags(newBio);
    for (const tagItem of hashtags) {
      const tagDocRef = doc(collection(db, 'hashtags'), tagItem);
      const tagDocSnap = await getDoc(tagDocRef);
      if (tagDocSnap.exists()) {
        await updateDoc(tagDocRef, {
          bioCount: increment(1),
          bioUsers: arrayUnion(user.uid),
        });
      } else {
        await setDoc(tagDocRef, {
          bioCount: 1,
          bioUsers: [user.uid],
        });
      }
    }
  };

  const handleHashtagPress = (hashtag: string) => {
    console.log('Hashtag được nhấn:', hashtag);
  };

  const handleCopyUID = async () => {
    if (__DEV__) {
      console.log('User UID:', user?.uid); // Debug log
    }
    if (user?.uid) {
      try {
        Clipboard.setString(user.uid);
        Alert.alert('Đã sao chép', 'UID đã được sao chép vào clipboard', [
          { text: 'OK', style: 'default' }
        ]);
      } catch (error) {
        console.error('Error copying UID:', error);
        Alert.alert('Lỗi', 'Không thể sao chép UID');
      }
    } else {
      Alert.alert('Lỗi', 'Không tìm thấy UID');
    }
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ fontSize: 16, color: '#666' }}>Loading user profile...</Text>
      </View>
    );
  }

  // Debug log only in development
  if (__DEV__) {
    console.log('Rendering TopProfile with user:', user.uid);
  }

  return (
    <View>
      <View
        style={[
          styles.coverPhotoContainer,
          { backgroundColor: currentThemeColors.cardBackground },
        ]}
      >
        <CustomImage
          type="cover"
          source={user?.coverImage}
          style={styles.coverPhoto}
        />
        <TouchableOpacity
          onPress={() => router.push('/profile/settings')}
          style={[styles.settingsButton, { backgroundColor: currentThemeColors.icon }]}
          activeOpacity={0.7}
        >
          <Feather name="settings" size={24} color={currentThemeColors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <View style={[styles.avatarWrapper, { borderColor: currentThemeColors.text }]}>
          <CustomImage source={user?.profileUrl} style={styles.avatar} />
          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Title style={[styles.statValue, { color: currentThemeColors.subtleText }]}>
                {postsCount}
              </Title>
              <Paragraph style={[styles.statLabel, { color: currentThemeColors.text }]}>
                Posts
              </Paragraph>
            </View>

            <View style={styles.stat}>
              <Title style={[styles.statValue, { color: currentThemeColors.subtleText }]}>
                {followersCount}
              </Title>
              <Paragraph style={[styles.statLabel, { color: currentThemeColors.text }]}>
                Followers
              </Paragraph>
            </View>

            <View style={styles.stat}>
              <Title style={[styles.statValue, { color: currentThemeColors.subtleText }]}>
                {followingCount}
              </Title>
              <Paragraph style={[styles.statLabel, { color: currentThemeColors.text }]}>
                Following
              </Paragraph>
            </View>
          </View>
        </View>
        <Title style={[styles.name, { color: currentThemeColors.text }]}>
          {user?.username || 'Unknown User'}
        </Title>
        
        {/* UID Display with Copy Button */}
        <View style={[styles.uidContainer]}>
          <Text style={[styles.uidLabel, { color: currentThemeColors.subtleText }]}>
            UID: 
          </Text>
          <Text style={[styles.uidText, { color: currentThemeColors.text }]} numberOfLines={1} selectable={true}>
            {user?.uid || 'No UID'}
          </Text>
          <TouchableOpacity
            onPress={handleCopyUID}
            style={[styles.copyButton]}
            activeOpacity={0.7}
          >
            <Feather name="copy" size={14} color={currentThemeColors.icon} />
          </TouchableOpacity>
        </View>

        <View style={styles.bioContainer}>
          {isEditingBio ? (
            <TextInput
              style={[
                styles.bioInput,
                {
                  color: currentThemeColors.text,
                  borderBottomColor: currentThemeColors.icon,
                },
              ]}
              value={bio}
              onChangeText={setBio}
              autoFocus
              placeholder="Add a bio..."
              placeholderTextColor={currentThemeColors.placeholderText}
            />
          ) : (
            <Text style={[styles.bio, { color: currentThemeColors.text }]}>
              {bio || 'No bio available'}
            </Text>
          )}
          <TouchableOpacity
            onPress={() => (isEditingBio ? handleSaveBio() : setIsEditingBio(true))}
            style={styles.editIcon}
            activeOpacity={0.7}
          >
            <AntDesign name={isEditingBio ? 'check' : 'edit'} size={16} color={currentThemeColors.icon} />
          </TouchableOpacity>
        </View>
      </View>


      <Divider style={[styles.divider, { backgroundColor: currentThemeColors.border }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  coverPhotoContainer: {
    height: 200,
    overflow: 'hidden',
    position: 'relative',
    marginTop: -20,
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  settingsButton: {
    position: 'absolute',
    top: 40,
    right: 15,
    padding: 8,
    borderRadius: 50,
  },
  header: {
    width: '100%',
    padding: 16,
    marginTop: -50,
  },
  avatarWrapper: {
    marginLeft: -10,
    flexDirection: 'row',
  },
  avatar: {
    height: 100,
    width: 100,
    borderRadius: 50,
  },
  name: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: 'bold',
  },
  uidContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  uidLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
  },
  uidText: {
    fontSize: 10,
    fontFamily: 'monospace',
    flex: 1,
  },
  copyButton: {
    padding: 2,
    marginLeft: 2,
  },
  bioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  bio: {
    fontSize: 14,
    textAlign: 'center',
  },
  bioInput: {
    fontSize: 16,
    borderBottomWidth: 1,
    width: '80%',
    textAlign: 'center',
  },
  editIcon: {
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 45,
    width: '100%',

  },
  stat: {
    alignItems: 'center',
    marginRight: 25,
    marginLeft: 10
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
  },
  divider: {
    marginVertical: 16,
    height: 1,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TopProfile;