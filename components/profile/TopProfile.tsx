import React, { useContext, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  Text,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Chip } from 'react-native-paper';
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
import VibeAvatar from '../vibe/VibeAvatar';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { giftService } from '@/services/giftService';
import { useStateCommon } from '@/context/stateCommon';
import { BlurView } from 'expo-blur';
import { getLabelForInterest } from '@/utils/interests';

const { width } = Dimensions.get('window');

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
  const { stateCommon, setStateCommon } = useStateCommon();

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
    const fetchGiftStats = async () => {
      try {
        const { items: gifts } = await giftService.listReceivedGifts(user.uid, { pageSize: 1000 });
        const count = gifts.length;
        const value = gifts.reduce((sum: number, gift) => sum + (gift.gift?.price || 0), 0);
        setGiftStats({ count, value });
      } catch (error) {
        console.error('Error fetching gift stats:', error);
        setGiftStats({
          count: Number(user?.giftReceivedCount || 0),
          value: Number(user?.giftReceivedValue || 0),
        });
      }
    };
    fetchGiftStats();
  }, [user?.uid]);

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
    if (user?.uid) {
      try {
        await Clipboard.setStringAsync(user.uid);
        Alert.alert('✅ Copied!', 'UID copied to clipboard');
      } catch (error) {
        console.error('Error copying UID:', error);
      }
    }
  };

  const openWallet = () => {
    // Vì TopProfile nằm trong tab Profile, ta mặc định from='profile'
    router.push({
      pathname: '/CoinWalletScreen',
      params: { from: 'profile' }
    });
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ fontSize: 16, color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: currentThemeColors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header with Cover */}
      <View style={styles.headerSection}>
        <View style={styles.coverContainer}>
          <CustomImage
            type="cover"
            source={user?.coverImage}
            style={styles.coverImage}
            onLongPress={() => { }}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.coverGradient}
          />

          {/* Floating Actions */}
          <View style={styles.floatingActions}>
            <TouchableOpacity
              onPress={() => router.push('/admin/dashboard')}
              style={[styles.floatingButton, { backgroundColor: 'rgba(255,255,255,0.2)', marginRight: 8 }]}
            >
              <Feather name="shield" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/profile/settings')}
              style={[styles.floatingButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            >
              <Feather name="settings" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Avatar Positioned on Cover */}
          <View style={styles.avatarContainer}>
            <View style={[styles.avatarBorder, { borderColor: currentThemeColors.background }]}>
              <VibeAvatar
                avatarUrl={user?.profileUrl}
                size={110}
                currentVibe={currentVibe}
                showAddButton={true}
                storyUser={{
                  id: user?.uid || '',
                  username: user?.username || user?.displayName,
                  profileUrl: user?.profileUrl
                }}
              />
            </View>
          </View>
        </View>

      </View>

      {/* Profile Info */}
      <View style={styles.profileInfo}>
        <View style={styles.nameRow}>
          <Text style={[styles.username, { color: currentThemeColors.text }]} numberOfLines={1}>
            {user?.username || user?.displayName || 'User'}
          </Text>
        </View>

        <TouchableOpacity onPress={handleCopyUID} style={styles.uidBadge} activeOpacity={0.7}>
          <Text style={styles.uidText}>ID: {user?.uid?.slice(0, 8)}</Text>
          <Feather name="copy" size={10} color="#999" />
        </TouchableOpacity>

        {/* Bio inline */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isEditingBio ? (
            <TextInput
              style={[styles.bioInputSmall, {
                color: currentThemeColors.text,
                backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                borderColor: currentThemeColors.border
              }]}
              value={bio}
              onChangeText={setBio}
              autoFocus
              placeholder="Tell us about yourself..."
              placeholderTextColor={currentThemeColors.placeholderText}
              multiline
              maxLength={160}
            />
          ) : (
            <Text style={[styles.bioTextSmall, { color: currentThemeColors.subtleText }]} numberOfLines={3}>
              {bio || '✨ Tap edit to add a bio'}
            </Text>
          )}
          <TouchableOpacity
            onPress={() => (isEditingBio ? handleSaveBio() : setIsEditingBio(true))}
            style={[styles.editBioButtonSmall, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
            activeOpacity={0.7}
          >
            <Feather
              name={isEditingBio ? 'check' : 'edit-3'}
              size={12}
              color={currentThemeColors.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: currentThemeColors.text }]}>{postsCount}</Text>
          <Text style={[styles.statLabel, { color: currentThemeColors.subtleText }]}>Posts</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: currentThemeColors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: currentThemeColors.text }]}>{followersCount}</Text>
          <Text style={[styles.statLabel, { color: currentThemeColors.subtleText }]}>Followers</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: currentThemeColors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: currentThemeColors.text }]}>{followingCount}</Text>
          <Text style={[styles.statLabel, { color: currentThemeColors.subtleText }]}>Following</Text>
        </View>
      </View>

      {/* Interests */}
      {Array.isArray(user.interests) && user.interests.length > 0 && (
        <View style={styles.interestsSection}>
          <View style={styles.interestsHeader}>
            <View style={[styles.interestsIconContainer, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <Feather name="heart" size={18} color={currentThemeColors.text} />
            </View>
            <Text style={[styles.interestsTitle, { color: currentThemeColors.text }]}>
              My Interests
            </Text>
            <View style={[styles.interestsBadge, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <Text style={[styles.interestsBadgeText, { color: currentThemeColors.text }]}>
                {user.interests.length}
              </Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.interestsScroll}
          >
            {(user.interests as string[]).map((interest: string, index: number) => (
              <TouchableOpacity
                key={`${interest}-${index}`}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={theme === 'dark'
                    ? ['rgba(139, 92, 246, 0.2)', 'rgba(59, 130, 246, 0.2)']
                    : ['rgba(139, 92, 246, 0.1)', 'rgba(59, 130, 246, 0.1)']
                  }
                  style={styles.interestChip}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={[styles.interestText, { color: currentThemeColors.text }]}>
                    {getLabelForInterest(interest)}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Rewards Section */}
      <View style={styles.rewardsSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rewardsScroll}
        >
          <TouchableOpacity
            style={[styles.rewardCardCoin, { backgroundColor: currentThemeColors.cardBackground }]}
            onPress={openWallet}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FFD700', '#FFA500', '#FF8C00']}
              style={styles.rewardIconCoin}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Shine effect overlay */}
              <LinearGradient
                colors={['rgba(255,255,255,0.8)', 'transparent', 'rgba(255,255,255,0.5)']}
                style={styles.shineOverlay}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Text style={styles.rewardEmojiLarge}>💰</Text>
            </LinearGradient>
            <View style={styles.rewardInfoCoin}>
              <View style={styles.coinValueRow}>
                <Text style={styles.coinIcon}>🪙</Text>
                <Text style={[styles.rewardValueLarge, { color: currentThemeColors.text }]}>
                  {Number(coins || 0).toLocaleString()}
                </Text>
              </View>
              <View style={styles.coinLabelRow}>
                <Text style={[styles.rewardLabelCoin, { color: currentThemeColors.subtleText }]}>
                  My Coins
                </Text>
                <Feather name="chevron-right" size={14} color={currentThemeColors.subtleText} />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rewardCardGift, { backgroundColor: currentThemeColors.cardBackground }]}
            onPress={() => router.push('/gifts/Inbox')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF69B4', '#FF1493', '#C71585']}
              style={styles.rewardIconGift}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.8)', 'transparent', 'rgba(255,255,255,0.5)']}
                style={styles.shineOverlay}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Text style={styles.rewardEmojiLarge}>🎁</Text>
            </LinearGradient>
            <View style={styles.rewardInfoGift}>
              <View style={styles.coinValueRow}>
                <Text style={[styles.rewardValueLarge, { color: currentThemeColors.text }]}>
                  {giftStats.count}
                </Text>
              </View>
              <View style={styles.coinLabelRow}>
                <Text style={[styles.rewardLabelGift, { color: currentThemeColors.subtleText }]}>
                  Gifts
                </Text>
                <Feather name="chevron-right" size={14} color={currentThemeColors.subtleText} />
              </View>
            </View>
          </TouchableOpacity>

          <View style={[styles.rewardCardValue, { backgroundColor: currentThemeColors.cardBackground }]}>
            <LinearGradient
              colors={['#9370DB', '#8A2BE2', '#4B0082']}
              style={styles.rewardIconValue}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.8)', 'transparent', 'rgba(255,255,255,0.5)']}
                style={styles.shineOverlay}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Text style={styles.rewardEmojiLarge}>💎</Text>
            </LinearGradient>
            <View style={styles.rewardInfoValue}>
              <View style={styles.coinValueRow}>
                <Text style={[styles.rewardValueLarge, { color: currentThemeColors.text }]}>
                  {giftStats.value.toLocaleString()}
                </Text>
              </View>
              <View style={styles.coinLabelRow}>
                <Text style={[styles.rewardLabelValue, { color: currentThemeColors.subtleText }]}>
                  Value
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  headerSection: {
    position: 'relative',
  },
  coverContainer: {
    height: 200,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  floatingActions: {
    position: 'absolute',
    top: 50,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  floatingButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    backdropFilter: 'blur(10px)',
  },
  avatarContainer: {
    position: 'absolute',
    bottom: -55,
    left: 20,
  },
  avatarBorder: {
    borderWidth: 5,
    borderRadius: 60,
    padding: 2,
  },
  vibeContainer: {
    position: 'absolute',
    top: 150,
    right: 20,
  },
  profileInfo: {
    marginTop: 65,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  username: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.3,
    flex: 1,
  },
  editBioButtonSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(150,150,150,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  uidText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#999',
    fontWeight: '600',
  },
  bioTextSmall: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  bioInputSmall: {
    fontSize: 13,
    lineHeight: 18,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
    minHeight: 60,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 20,
    marginHorizontal: 20,
    borderRadius: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    opacity: 0.2,
  },
  interestsSection: {
    marginBottom: 20,
  },
  interestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  interestsIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  interestsTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  interestsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  interestsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  interestsScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  interestChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  interestText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rewardsSection: {
    marginBottom: 20,
  },
  rewardsScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  rewardCard: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    width: 110,
  },
  rewardIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  rewardEmoji: {
    fontSize: 26,
  },
  rewardInfo: {
    alignItems: 'center',
  },
  rewardValue: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  rewardLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  // New styles for Coin Card
  rewardCardCoin: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 0,
    borderRadius: 24,
    width: 160,
    height: 180,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  rewardIconCoin: {
    width: '100%',
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  shineOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
    transform: [{ rotate: '45deg' }, { scale: 1.5 }],
  },
  rewardEmojiLarge: {
    fontSize: 48,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  rewardInfoCoin: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingBottom: 6,
  },
  coinValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  coinIcon: {
    fontSize: 16,
  },
  rewardValueLarge: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  coinLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0.8,
  },
  rewardLabelCoin: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Gift Card Styles
  rewardCardGift: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 0,
    borderRadius: 24,
    width: 160,
    height: 180,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 105, 180, 0.3)',
    shadowColor: "#FF69B4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  rewardIconGift: {
    width: '100%',
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  rewardInfoGift: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingBottom: 6,
  },
  rewardLabelGift: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Value Card Styles
  rewardCardValue: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 0,
    borderRadius: 24,
    width: 160,
    height: 180,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(147, 112, 219, 0.3)',
    shadowColor: "#9370DB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  rewardIconValue: {
    width: '100%',
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  rewardInfoValue: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingBottom: 6,
  },
  rewardLabelValue: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

export default TopProfile;