import React, { useContext, useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, Alert, Clipboard,
  ActivityIndicator, Animated
} from 'react-native';
import { Menu } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import CustomImage from '../common/CustomImage';
import { ThemeContext } from '@/context/ThemeContext';
import VibeAvatar from '../vibe/VibeAvatar';
import Feather from '@expo/vector-icons/Feather';
import { useAuth } from '@/context/authContext';
import { followService } from '@/services/followService';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

const TopProfileUserProfileScreen = ({ user }: { user: any }) => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const followButtonScale = useState(new Animated.Value(1))[0];
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  // Robust name extraction
  const uid = user?.id || user?.uid || '';
  const name = user?.displayName || user?.fullname || user?.fullName || user?.username || t('chat.unknown_user');
  const bio = user?.bio || '';
  const location = user?.location || '';
  const educationLevel = user?.educationLevel || '';
  const university = user?.university || '';
  const school = user?.school || '';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  useEffect(() => {
    if (!currentUser?.uid || !uid) return;
    const checkStatus = async () => {
      const isF = await followService.isFollowing(currentUser.uid, uid);
      setIsFollowing(isF);
      const isB = await followService.isBlocked(currentUser.uid, uid);
      setIsBlocked(isB);
    };
    checkStatus();
  }, [currentUser?.uid, uid]);

  useEffect(() => {
    if (!uid) return;
    const qFollowers = query(collection(db, 'followers'), where('followingId', '==', uid));
    const unsubscribeFollowers = onSnapshot(qFollowers, (snapshot) => {
      setFollowersCount(snapshot.size);
    });
    const qFollowing = query(collection(db, 'followers'), where('followerId', '==', uid));
    const unsubscribeFollowing = onSnapshot(qFollowing, (snapshot) => {
      setFollowingCount(snapshot.size);
    });
    const qPosts = query(collection(db, 'posts'), where('userID', '==', uid));
    const unsubscribePosts = onSnapshot(qPosts, (snapshot) => {
      setPostsCount(snapshot.size);
    });
    return () => {
      unsubscribeFollowers();
      unsubscribeFollowing();
      unsubscribePosts();
    };
  }, [uid]);

  const handleCopyId = () => {
    Clipboard.setString(uid);
    Alert.alert('Sao chép', 'Đã sao chép ID người dùng vào bộ nhớ tạm.');
  };

  const handleFollowToggle = async () => {
    if (!currentUser?.uid || !uid || followLoading) return;
    setFollowLoading(true);
    Animated.sequence([
      Animated.spring(followButtonScale, { toValue: 0.9, useNativeDriver: true }),
      Animated.spring(followButtonScale, { toValue: 1, useNativeDriver: true })
    ]).start();

    try {
      if (isFollowing) {
        await followService.unfollow(currentUser.uid, uid);
        setIsFollowing(false);
      } else {
        await followService.follow(currentUser.uid, uid);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Follow error:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleBlockToggle = async () => {
    if (!currentUser?.uid || !uid || followLoading) return;

    Alert.alert(
      isBlocked ? t('profile.unblock_confirm_title') : t('profile.block_confirm_title'),
      isBlocked ? t('profile.unblock_confirm_message') : t('profile.block_confirm_message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: isBlocked ? t('profile.unblock_user') : t('profile.block_user'),
          style: 'destructive',
          onPress: async () => {
            setFollowLoading(true);
            try {
              if (isBlocked) {
                await followService.unblockUser(currentUser.uid, uid);
                setIsBlocked(false);
              } else {
                await followService.blockUser(currentUser.uid, uid);
                setIsBlocked(true);
                setIsFollowing(false);
              }
            } catch (error) {
              console.error('Block error:', error);
            } finally {
              setFollowLoading(false);
            }
          }
        }
      ]
    );
  };

  const profileImage = user?.profileUrl || user?.photoURL || user?.avatar;
  const currentVibe = user?.currentVibe || user?.vibe || user?.vibeStatus || null;

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      {/* Cover Section with Blur Gradient */}
      <View style={styles.coverWrapper}>
        <CustomImage type="cover" source={user?.coverImage} style={styles.coverImage} onLongPress={() => { }} />
        <LinearGradient
          colors={[
            'transparent',
            'rgba(0,0,0,0.2)',
            theme === 'dark' ? 'rgba(18,18,18,1)' : 'rgba(255,255,255,1)'
          ]}
          locations={[0, 0.6, 1]}
          style={styles.coverGradient}
        />
      </View>

      {/* Avatar Section */}
      <Animated.View
        style={[
          styles.avatarSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.avatarWrapper}>
          <View style={[styles.avatarRing, {
            backgroundColor: currentThemeColors.background,
            shadowColor: theme === 'dark' ? '#667eea' : '#000',
          }]}>
            <VibeAvatar
              avatarUrl={profileImage}
              size={110}
              currentVibe={currentVibe}
              showAddButton={false}
              frameType={user?.activeFrame}
              storyUser={{ id: uid, username: name, profileUrl: profileImage }}
            />
          </View>

        </View>

        {/* Follow & Menu Button - Right Side */}
        {currentUser?.uid && currentUser.uid !== uid && (
          <Animated.View style={[styles.followButtonContainer, { transform: [{ scale: followButtonScale }] }]}>
            {/* Follow Button */}
            <TouchableOpacity
              onPress={handleFollowToggle}
              activeOpacity={0.85}
              disabled={followLoading}
              style={styles.followButtonWrapper}
            >
              <LinearGradient
                colors={isFollowing
                  ? (theme === 'dark' ? ['#2d2d2d', '#1f1f1f'] : ['#f8f8f8', '#ececec'])
                  : ['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.followButton, {
                  shadowColor: isFollowing ? (theme === 'dark' ? '#000' : '#ccc') : '#667eea',
                }]}
              >
                {followLoading ? (
                  <ActivityIndicator size="small" color={isFollowing ? currentThemeColors.text : '#fff'} />
                ) : (
                  <>
                    <View style={[styles.followIconCircle, {
                      backgroundColor: isFollowing
                        ? (theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')
                        : 'rgba(255,255,255,0.25)'
                    }]}>
                      <Feather
                        name={isFollowing ? 'user-check' : 'user-plus'}
                        size={16}
                        color={isFollowing ? currentThemeColors.text : 'white'}
                      />
                    </View>
                    <Text style={[styles.followText, {
                      color: isFollowing ? currentThemeColors.text : 'white'
                    }]}>
                      {isFollowing ? t('profile.following') : t('profile.follow')}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Options Menu */}
            <Menu
              visible={showMenu}
              onDismiss={() => setShowMenu(false)}
              anchor={
                <TouchableOpacity
                  onPress={() => setShowMenu(true)}
                  activeOpacity={0.7}
                  style={styles.menuButton}
                >
                  <Feather name="more-horizontal" size={22} color={currentThemeColors.text} />
                </TouchableOpacity>
              }
              contentStyle={{ backgroundColor: currentThemeColors.background }}
            >
              <Menu.Item
                onPress={() => {
                  setShowMenu(false);
                  handleBlockToggle();
                }}
                title={isBlocked ? t('profile.unblock_user') : t('profile.block_user')}
                titleStyle={{ color: isBlocked ? '#10B981' : '#EF4444', fontSize: 14 }}
                leadingIcon={isBlocked ? "lock-open-check-outline" : "block-helper"}
              />
              <Menu.Item
                onPress={() => {
                  setShowMenu(false);
                  Alert.alert(t('profile.report'), t('profile.report_not_implemented'));
                }}
                title={t('profile.report')}
                titleStyle={{ color: currentThemeColors.text, fontSize: 14 }}
                leadingIcon="flag-outline"
              />
            </Menu>
          </Animated.View>
        )}
      </Animated.View>

      {/* Content Section */}
      <Animated.View
        style={[
          styles.contentSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {/* Name Section */}
        <View style={styles.nameSection}>
          <View style={styles.nameAndGenderContainer}>
            <Text style={[styles.userName, { color: currentThemeColors.text }]}>{name}</Text>
            {user?.gender && (
              <View style={[styles.genderIconContainer, {
                backgroundColor: user.gender === 'female' ? '#F472B620' : (user.gender === 'male' ? '#60A5FA20' : '#8B5CF620')
              }]}>
                <MaterialCommunityIcons
                  name={user.gender === 'male' ? 'gender-male' : user.gender === 'female' ? 'gender-female' : 'gender-male-female'}
                  size={16}
                  color={user.gender === 'female' ? '#F472B6' : (user.gender === 'male' ? '#60A5FA' : '#8B5CF6')}
                />
              </View>
            )}
          </View>
          <TouchableOpacity
            style={[styles.uidBadge, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
            onPress={handleCopyId}
            activeOpacity={0.7}
          >
            <Text style={[styles.uidText, { color: currentThemeColors.text }]}># {uid.slice(0, 8)}</Text>
            <Feather name="copy" size={10} color={currentThemeColors.text} opacity={0.4} />
          </TouchableOpacity>
        </View>

        {bio ? (
          <Text style={[styles.bioText, { color: currentThemeColors.text }]}>{bio}</Text>
        ) : (
          <View style={{ height: 8 }} />
        )}

        {/* Stats card */}
        <View style={[styles.statsContainer, {
          backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
          borderColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
        }]}>
          <View style={styles.statItem}>
            <LinearGradient colors={['#667eea', '#764ba2']} style={styles.statIconGradient}>
              <Feather name="grid" size={14} color="white" />
            </LinearGradient>
            <Text style={[styles.statCount, { color: currentThemeColors.text }]}>{postsCount}</Text>
            <Text style={[styles.statLabel, { color: currentThemeColors.text }]}>Bài viết</Text>
          </View>

          <View style={styles.statItem}>
            <LinearGradient colors={['#F472B6', '#EC4899']} style={styles.statIconGradient}>
              <Feather name="users" size={14} color="white" />
            </LinearGradient>
            <Text style={[styles.statCount, { color: currentThemeColors.text }]}>{followersCount}</Text>
            <Text style={[styles.statLabel, { color: currentThemeColors.text }]}>Người theo dõi</Text>
          </View>

          <View style={styles.statItem}>
            <LinearGradient colors={['#60A5FA', '#3B82F6']} style={styles.statIconGradient}>
              <Feather name="user-check" size={14} color="white" />
            </LinearGradient>
            <Text style={[styles.statCount, { color: currentThemeColors.text }]}>{followingCount}</Text>
            <Text style={[styles.statLabel, { color: currentThemeColors.text }]}>Theo dõi</Text>
          </View>
        </View>

        {/* Professional Info Area */}
        {(location || educationLevel || university || school) && (
          <View style={styles.professionalSection}>
            {location && (
              <View style={[styles.professionalItem, {
                backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
              }]}>
                <Feather name="map-pin" size={14} color="#667eea" style={{ marginRight: 10 }} />
                <Text style={[styles.professionalText, { color: currentThemeColors.text }]}>{location}</Text>
              </View>
            )}

            {(educationLevel || university || school) && (
              <View style={styles.professionalList}>
                {educationLevel && (
                  <View style={[styles.professionalItem, {
                    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  }]}>
                    <View style={styles.educationDot} />
                    <Text style={[styles.professionalText, { color: currentThemeColors.text }]}
                      numberOfLines={2}>
                      {educationLevel}
                    </Text>
                  </View>
                )}
                {university && (
                  <View style={[styles.professionalItem, {
                    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  }]}>
                    <Feather name="book-open" size={13} color="#667eea" style={{ marginRight: 10 }} />
                    <Text style={[styles.professionalText, { color: currentThemeColors.text }]} numberOfLines={2}>
                      {university}
                    </Text>
                  </View>
                )}
                {school && (
                  <View style={[styles.professionalItem, {
                    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  }]}>
                    <Feather name="bookmark" size={13} color="#667eea" style={{ marginRight: 10 }} />
                    <Text style={[styles.professionalText, { color: currentThemeColors.text }]} numberOfLines={2}>
                      {school}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </Animated.View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  coverWrapper: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: -60,
    marginBottom: 16,
  },
  avatarWrapper: {
    flex: 1,
  },
  avatarRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    padding: 4,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  followButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 40,
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followButtonWrapper: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 130,
    justifyContent: 'center',
    height: 44,
  },
  followIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  contentSection: {
    paddingHorizontal: 16,
  },
  nameSection: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  uidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  uidText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'monospace',
    opacity: 0.6,
  },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statCount: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
    marginTop: 2,
  },
  professionalSection: {
    gap: 12,
    marginBottom: 24,
  },
  professionalList: {
    gap: 10,
  },
  professionalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  professionalText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  educationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#667eea',
    marginRight: 10,
  },
  nameAndGenderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  genderIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TopProfileUserProfileScreen;