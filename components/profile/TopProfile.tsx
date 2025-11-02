import React, { useContext, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  Clipboard,
  Text,
} from 'react-native';
import { Divider } from 'react-native-paper';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
// Removed MaterialCommunityIcons import
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
import { giftService } from '@/services/giftService';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import VibeSection from './VibeSection';
import VibeAvatar from '../vibe/VibeAvatar';

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
  
  // Debug currentVibe
  console.log('👤 TopProfile currentVibe:', currentVibe);

  
  // Debug log to check user object
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

  useEffect(() => {
    if (!user?.uid) return;
    // read counters if present
    try {
      // lazy load via user state already includes fields sometimes; fallback to Firestore read
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
    const cleanHashtag = hashtag.replace('#', '');
    router.push(`/HashtagScreen?hashtag=${cleanHashtag}`);
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
        <View style={styles.headerButtons}>
          
          <TouchableOpacity
            onPress={() => router.push('/profile/settings')}
            style={[styles.settingsButton, { backgroundColor: currentThemeColors.icon }]}
            activeOpacity={0.7}
          >
            <Feather name="settings" size={24} color={currentThemeColors.text} />
          </TouchableOpacity>

                  {/* Coin pill */}
        <View style={styles.walletRow}>
          <View
            style={[
              styles.coinPill,
              {
                backgroundColor: currentThemeColors.cardBackground,
                borderColor: currentThemeColors.border,
              },
            ]}
          >
            <Text style={{ fontSize: 16 }}>🥖</Text>
            <Text style={[styles.coinText, { color: currentThemeColors.text }]}> Bánh mì: {Number(coins || 0)}</Text>
          </View>
        </View>
        </View>
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
          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: currentThemeColors.subtleText }]}>
                {postsCount}
              </Text>
              <Text style={[styles.statLabel, { color: currentThemeColors.text }]}>
                Posts
              </Text>
            </View>

            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: currentThemeColors.subtleText }]}>
                {followersCount}
              </Text>
              <Text style={[styles.statLabel, { color: currentThemeColors.text }]}>
                Followers
              </Text>
            </View>

            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: currentThemeColors.subtleText }]}>
                {followingCount}
              </Text>
              <Text style={[styles.statLabel, { color: currentThemeColors.text }]}>
                Following
              </Text>
            </View>
          </View>
        </View>
        <Text style={[styles.name, { color: currentThemeColors.text }]}>
          {user?.username || user?.displayName || user?.name || user?.email?.split('@')[0] || 'Unknown User'}
        </Text>
        
        {/* UID Display with Copy Button */}
        <View style={[styles.uidContainer]}>
          <Text style={[styles.uidLabel, { color: currentThemeColors.subtleText }]}> UID: </Text>
          <Text style={[styles.uidText, { color: currentThemeColors.text }]} numberOfLines={1} selectable={true}>
            {user?.uid || 'No UID'}
          </Text>
          <TouchableOpacity onPress={handleCopyUID} style={[styles.copyButton]} activeOpacity={0.7}>
            <Feather name="copy" size={14} color={currentThemeColors.icon} />
          </TouchableOpacity>
        </View>

        {/* Gift stats row */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 6 }}>
          <TouchableOpacity onPress={() => router.push('/gifts/Inbox')} activeOpacity={0.8}>
            <View style={[styles.coinPill, { borderColor: currentThemeColors.border, backgroundColor: currentThemeColors.cardBackground }]}>
              <Text style={{ fontSize: 14 }}>🎁</Text>
              <Text style={[styles.coinText, { color: currentThemeColors.text }]}>
                {' '}
                {giftStats.count} quà
              </Text>
            </View>
          </TouchableOpacity>
          <View style={[styles.coinPill, { borderColor: currentThemeColors.border, backgroundColor: currentThemeColors.cardBackground }]}>
            <Text style={{ fontSize: 14 }}>🥖</Text>
            <Text style={[styles.coinText, { color: currentThemeColors.text }]}>
              {' '}
              {giftStats.value}
            </Text>
          </View>
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
        <VibeSection />
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
  vibeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
  },
  editVibeButton: {
    padding: 8,
    marginLeft: 8,
  },
  addVibeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addVibeText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    position: 'absolute',
    top: 0,
    right: 5,
    gap: 10,
  },
  vibeButton: {
    padding: 6,
    borderRadius: 20,
  },
  walletRow: {
    position: 'absolute',
    right: 0,
    top: 90,
    alignItems: 'center',
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  coinText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default TopProfile;