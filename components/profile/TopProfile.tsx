import React, { useContext, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  Text,
  Platform,
} from 'react-native';
import { Divider } from 'react-native-paper';
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
import VibeSection from './VibeSection';
import VibeAvatar from '../vibe/VibeAvatar';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';

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
  const { user, currentVibe, coins } = useAuth();
  const [bio, setBio] = useState('');
  const router = useRouter();
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  
  console.log('👤 TopProfile currentVibe:', currentVibe);

  useEffect(() => {
    if (user) {
      console.log('🔍 TopProfile DEBUG - User object:', {
        uid: user.uid,
        username: user.username,
        displayName: user.displayName,
        name: user.name,
        email: user.email,
        allKeys: Object.keys(user)
      });
    }
  }, [user]);

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [giftStats, setGiftStats] = useState<{ count: number; value: number }>({ count: 0, value: 0 });

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

  useEffect(() => {
    if (!user?.uid) return;
    try {
      setGiftStats({
        count: Number(user?.giftReceivedCount || 0),
        value: Number(user?.giftReceivedValue || 0),
      });
    } catch {}
  }, [user?.giftReceivedCount, user?.giftReceivedValue, user?.uid]);

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
    if (!user?.uid) return;
    
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

  const handleCopyUID = async () => {
    if (__DEV__) {
      console.log('User UID:', user?.uid);
    }
    if (user?.uid) {
      try {
        await Clipboard.setStringAsync(user.uid);
        Alert.alert('Đã sao chép', 'UID đã được sao chép vào clipboard');
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

  if (__DEV__) {
    console.log('Rendering TopProfile with user:', user.uid);
  }

  return (
    <View style={styles.container}>
      <View>
        <View style={styles.coverPhotoContainer}>
          <CustomImage
            type="cover"
            source={user?.coverImage}
            style={styles.coverPhoto}
          />
          <LinearGradient
            colors={["transparent", currentThemeColors.background + "cc"]}
            style={styles.coverOverlay}
          />
          <TouchableOpacity
            onPress={() => router.push('/profile/settings')}
            style={styles.settingsButton}
            activeOpacity={0.7}
          >
            <Feather name="settings" size={22} color={currentThemeColors.icon} />
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <View style={[styles.avatarWrapper, { borderColor: currentThemeColors.text }]}> 
            <VibeAvatar
              avatarUrl={user?.profileUrl}
              size={80}
              currentVibe={currentVibe}
              showAddButton={true}
              storyUser={{ id: user?.uid || '', username: user?.username || user?.displayName, profileUrl: user?.profileUrl }}
            />
          </View>
          <View style={styles.vibeOverlay}>
            <VibeSection />
          </View>
          <View style={styles.nameUidContainer}>
            <Text style={[styles.name, { color: currentThemeColors.text }]}> 
              {user?.username || user?.displayName || user?.name || user?.email?.split('@')[0] || 'Unknown User'}
            </Text>
            <View style={styles.uidContainer}>
              <Text style={[styles.uidLabel, { color: currentThemeColors.subtleText }]}>UID:</Text>
              <Text style={[styles.uidText, { color: currentThemeColors.text }]}> 
                {user?.uid?.slice(0, 6) + '...'}
              </Text>
              <TouchableOpacity onPress={handleCopyUID} style={styles.copyButton}>
                <Feather name="copy" size={14} color={currentThemeColors.icon} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={[styles.bioContainer, { backgroundColor: currentThemeColors.cardBackground }]}> 
          {isEditingBio ? (
            <TextInput
              style={[styles.bioInput, { color: currentThemeColors.text, borderColor: currentThemeColors.border }]
              }
              value={bio}
              onChangeText={setBio}
              autoFocus
              placeholder="Write your bio..."
              placeholderTextColor={currentThemeColors.placeholderText}
              multiline
              numberOfLines={3}
              maxLength={160}
            />
          ) : (
            <Text style={[styles.bio, { color: currentThemeColors.text }]}> 
              {bio || 'Tap to add a bio'}
            </Text>
          )}
          <TouchableOpacity
            onPress={() => (isEditingBio ? handleSaveBio() : setIsEditingBio(true))}
            style={styles.editButton}
            activeOpacity={0.7}
          >
            <AntDesign name={isEditingBio ? 'checkcircle' : 'edit'} size={20} color={currentThemeColors.icon} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <TouchableOpacity style={[styles.statCard, { backgroundColor: currentThemeColors.cardBackground }]} activeOpacity={0.7}>
            <Text style={[styles.statValue, { color: currentThemeColors.text }]}>{postsCount}</Text>
            <Text style={[styles.statLabel, { color: currentThemeColors.subtleText }]}>Posts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.statCard, { backgroundColor: currentThemeColors.cardBackground }]} activeOpacity={0.7}>
            <Text style={[styles.statValue, { color: currentThemeColors.text }]}>{followersCount}</Text>
            <Text style={[styles.statLabel, { color: currentThemeColors.subtleText }]}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.statCard, { backgroundColor: currentThemeColors.cardBackground }]} activeOpacity={0.7}>
            <Text style={[styles.statValue, { color: currentThemeColors.text }]}>{followingCount}</Text>
            <Text style={[styles.statLabel, { color: currentThemeColors.subtleText }]}>Following</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.pillsRow}>
          <View style={[styles.pill, { backgroundColor: currentThemeColors.cardBackground, borderColor: currentThemeColors.border }]}> 
            <Text style={styles.emoji}>🥖</Text>
            <Text style={[styles.pillText, { color: currentThemeColors.text }]}> 
              {Number(coins || 0)}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.pill, { backgroundColor: currentThemeColors.cardBackground, borderColor: currentThemeColors.border }]} 
            onPress={() => router.push('/gifts/Inbox')}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>🎁</Text>
            <Text style={[styles.pillText, { color: currentThemeColors.text }]}> 
              {giftStats.count}
            </Text>
          </TouchableOpacity>
          <View style={[styles.pill, { backgroundColor: currentThemeColors.cardBackground, borderColor: currentThemeColors.border }]}> 
            <Text style={styles.emoji}>💰</Text>
            <Text style={[styles.pillText, { color: currentThemeColors.text }]}> 
              {giftStats.value}
            </Text>
          </View>
        </View>

        <Divider style={[styles.divider, { backgroundColor: currentThemeColors.border }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  coverPhotoContainer: {
    height: 200,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  settingsButton: {
    position: 'absolute',
    top: 48,
    right: 16,
  },
  header: {
    paddingHorizontal: 16,
    marginTop: -48,
  },
  avatarNameContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 16,
    position: 'relative', // To allow overlay
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
    fontSize: 24,
    fontWeight: '700',
  },
  uidContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  uidLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginRight: 4,
  },
  uidText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyButton: {
    marginLeft: 8,
    padding: 4,
  },
  bioContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
  },
  bio: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  bioInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
  },
  editButton: {
    marginLeft: 12,
    padding: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  pillsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    shadowOpacity: 0.05,
  },
  emoji: {
    fontSize: 16,
    marginRight: 6,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
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