import React, { useContext, useState, useEffect } from 'react';
import { 
  StyleSheet, View, Text, TouchableOpacity, Alert, Clipboard, 
  ActivityIndicator, Animated 
} from 'react-native';
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

const TopProfileUserProfileScreen = ({ user }: { user: any }) => {
  const { user: currentUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const followButtonScale = useState(new Animated.Value(1))[0];
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  const uid = user?.uid || user?.id || 'No UID';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!currentUser?.uid || !uid || uid === 'No UID' || currentUser.uid === uid) return;
    (async () => {
      const following = await followService.isFollowing(currentUser.uid, uid);
      setIsFollowing(following);
      const blocked = await followService.isBlocked(currentUser.uid, uid);
      setIsBlocked(blocked);
    })();
  }, [currentUser?.uid, uid]);

  useEffect(() => {
    if (!uid || uid === 'No UID') return;
    const unsub1 = onSnapshot(query(collection(db, 'follows'), where('followingId', '==', uid)), (s) => setFollowersCount(s.size));
    const unsub2 = onSnapshot(query(collection(db, 'follows'), where('followerId', '==', uid)), (s) => setFollowingCount(s.size));
    const unsub3 = onSnapshot(query(collection(db, 'posts'), where('userID', '==', uid)), (s) => setPostsCount(s.size));
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [uid]);

  const handleCopyUID = () => {
    if (uid && uid !== 'No UID') {
      Clipboard.setString(uid);
      Alert.alert('✓ Đã sao chép', 'UID đã được lưu vào clipboard');
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser?.uid || !uid || uid === 'No UID') return;

    Animated.sequence([
      Animated.timing(followButtonScale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(followButtonScale, { 
        toValue: 1, 
        friction: 3, 
        tension: 50, 
        useNativeDriver: true 
      }),
    ]).start();

    setFollowLoading(true);
    try {
      const success = isFollowing
        ? await followService.unfollowUser(currentUser.uid, uid)
        : await followService.followUser(currentUser.uid, uid);
      if (success) setIsFollowing(!isFollowing);
    } catch (e) {
      console.error('Error toggling follow:', e);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleBlockToggle = async () => {
    if (!currentUser?.uid || !uid || uid === 'No UID') return;

    if (!isBlocked) {
      // Show confirmation before blocking
      Alert.alert(
        '⚠️ Chặn người dùng',
        `Bạn có chắc muốn chặn ${displayName}?\n\nKhi chặn:\n• Bạn sẽ không thấy bài viết của họ\n• Họ không thể nhắn tin cho bạn\n• Cả hai sẽ tự động unfollow`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Chặn',
            style: 'destructive',
            onPress: async () => {
              try {
                const success = await followService.blockUser(currentUser.uid, uid);
                if (success) {
                  setIsBlocked(true);
                  setIsFollowing(false);
                  Alert.alert('✅ Đã chặn', `Bạn đã chặn ${displayName}`);
                }
              } catch (e) {
                console.error('Error blocking user:', e);
                Alert.alert('❌ Lỗi', 'Không thể chặn người dùng này');
              }
            },
          },
        ]
      );
    } else {
      // Unblock directly
      try {
        const success = await followService.unblockUser(currentUser.uid, uid);
        if (success) {
          setIsBlocked(false);
          Alert.alert('✅ Đã bỏ chặn', `Bạn đã bỏ chặn ${displayName}`);
        }
      } catch (e) {
        console.error('Error unblocking user:', e);
        Alert.alert('❌ Lỗi', 'Không thể bỏ chặn người dùng này');
      }
    }
  };

  if (!user) return null;

  const displayName = user.username || user.displayName || user.name || 'Unknown User';
  const profileImage = user.profileUrl || user.photoURL || user.avatar;
  const currentVibe = user?.currentVibe || user?.vibe || user?.vibeStatus || null;

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      {/* Cover Section with Blur Gradient */}
      <View style={styles.coverWrapper}>
        <CustomImage type="cover" source={user?.coverImage} style={styles.coverImage} onLongPress={() => {}} />
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
              size={100}
              currentVibe={currentVibe}
              showAddButton={false}
              storyUser={{ id: uid, username: displayName, profileUrl: profileImage }}
            />
          </View>
        </View>

        {/* Follow & Block Button - Right Side */}
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
                      {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Block Button - Styled like Follow Button */}
            <TouchableOpacity
              onPress={handleBlockToggle}
              activeOpacity={0.85}
              style={styles.followButtonWrapper}
              disabled={followLoading}
            >
              <LinearGradient
                colors={isBlocked 
                  ? ['#a1a1aa', '#6b7280'] // xám khi đã chặn
                  : ['#d1d5db', '#6b7280']} // xám nhạt khi chưa chặn
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.followButton, {
                  shadowColor: isBlocked ? '#6b7280' : '#d1d5db',
                }]}
              >
                {followLoading ? (
                  <ActivityIndicator size="small" color={'#fff'} />
                ) : (
                  <>
                    <View style={[styles.followIconCircle, {
                      backgroundColor: isBlocked 
                        ? 'rgba(156,163,175,0.15)' // xám nhạt
                        : 'rgba(209,213,219,0.25)' // xám nhạt
                    }]}> 
                      <Feather
                        name={isBlocked ? 'user-x' : 'lock'}
                        size={16}
                        color={isBlocked ? '#374151' : '#374151'} // xám đậm cho icon
                      />
                    </View>
                    <Text style={[styles.followText, { 
                      color: '#374151' // xám đậm cho text
                    }]}> 
                      {isBlocked ? 'Đã chặn' : 'Chặn'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
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
        {/* Blocked State Banner */}
        {isBlocked && (
          <View style={[styles.blockedBanner, { 
            backgroundColor: theme === 'dark' ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)',
            borderColor: '#EF4444'
          }]}
          >
            <Feather name="slash" size={18} color="#EF4444" />
            <Text style={[styles.blockedText, { color: '#EF4444' }]}>
              Bạn đã chặn người dùng này
            </Text>
          </View>
        )}

        {/* Name & UID */}
        <View style={styles.nameSection}>
          <Text style={[styles.userName, { color: currentThemeColors.text }]}>
            {displayName}
          </Text>
          
          <TouchableOpacity 
            style={[styles.uidBadge, { 
              backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            }]} 
            onPress={handleCopyUID}
            activeOpacity={0.7}
          >
            <Feather name="hash" size={10} color={currentThemeColors.subtleText} style={{ opacity: 0.5 }} />
            <Text style={[styles.uidText, { color: currentThemeColors.subtleText }]}>
              {uid.slice(0, 8)}
            </Text>
            <Feather name="copy" size={10} color={currentThemeColors.subtleText} style={{ opacity: 0.5 }} />
          </TouchableOpacity>
        </View>

        {/* Bio */}
        {user.bio && (
          <Text style={[styles.bioText, { color: currentThemeColors.text }]} numberOfLines={3}>
            {user.bio}
          </Text>
        )}

        {/* Stats - Premium Grid */}
        <View style={[styles.statsContainer, { 
          backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(102,126,234,0.04)',
          borderColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(102,126,234,0.1)',
        }]}>
          {([
            { label: 'Bài viết', count: postsCount, icon: 'grid', gradient: ['#667eea', '#764ba2'] as const },
            { label: 'Người theo dõi', count: followersCount, icon: 'users', gradient: ['#f093fb', '#f5576c'] as const },
            { label: 'Theo dõi', count: followingCount, icon: 'user-check', gradient: ['#4facfe', '#00f2fe'] as const },
          ] as const).map((stat, idx) => (
            <View key={idx} style={styles.statItem}>
              <LinearGradient
                colors={stat.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statIconGradient}
              >
                <Feather name={stat.icon as any} size={16} color="white" />
              </LinearGradient>
              <Text style={[styles.statCount, { color: currentThemeColors.text }]}>
                {stat.count}
              </Text>
              <Text style={[styles.statLabel, { color: currentThemeColors.subtleText }]}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Professional Info */}
        {((user.job || user.occupation) || user.educationLevel || user.university || user.school) && (
          <View style={styles.professionalSection}>
            {/* Job/Occupation - Simple Item */}
            {(user.job || user.occupation) && (
              <View style={[styles.professionalItem, { 
                backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
              }]}>
                <Feather name="briefcase" size={14} color="#667eea" style={{ marginRight: 10 }} />
                <Text style={[styles.professionalText, { color: currentThemeColors.text }]} numberOfLines={2}>
                  {user.job || user.occupation}
                </Text>
              </View>
            )}

            {/* Education - Concise List */}
            {(user.educationLevel || user.university || user.school) && (
              <View style={styles.professionalList}>
                {user.educationLevel && (
                  <View style={[styles.professionalItem, { 
                    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  }]}>
                    <View style={styles.educationDot} />
                    <Text style={[styles.professionalText, { color: currentThemeColors.text }]}
                      numberOfLines={2}>
                      {user.educationLevel}
                    </Text>
                  </View>
                )}
                {user.university && (
                  <View style={[styles.professionalItem, { 
                    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  }]}>
                    <Feather name="book-open" size={13} color="#667eea" style={{ marginRight: 10 }} />
                    <Text style={[styles.professionalText, { color: currentThemeColors.text }]} numberOfLines={2}>
                      {user.university}
                    </Text>
                  </View>
                )}
                {user.school && (
                  <View style={[styles.professionalItem, { 
                    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  }]}>
                    <Feather name="bookmark" size={13} color="#667eea" style={{ marginRight: 10 }} />
                    <Text style={[styles.professionalText, { color: currentThemeColors.text }]} numberOfLines={2}>
                      {user.school}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </Animated.View>

      {/* Bottom Divider */}
      <View style={[styles.divider, { backgroundColor: currentThemeColors.border }]} />
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
    paddingHorizontal: 20,
    marginTop: -50,
    marginBottom: 12,
  },
  avatarWrapper: {
    flex: 1,
  },
  avatarRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    padding: 4,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  followButtonContainer: {
    marginLeft: 12,
  },
  followButtonWrapper: {
    borderRadius: 30,
    marginTop: 8,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  followIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  contentSection: {
    paddingHorizontal: 20,
  },
  nameSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  uidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  uidText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'monospace',
    opacity: 0.6,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 18,
    borderRadius: 18,
    marginBottom: 20,
    borderWidth: 1,
  },
  statItem: {
    alignItems: 'center',
    gap: 6,
  },
  statIconGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statCount: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.6,
  },
  professionalSection: {
    gap: 16,
    marginBottom: 20,
  },
  professionalList: {
    gap: 8,
  },
  professionalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  professionalText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  educationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#667eea',
    marginRight: 10,
  },
  divider: {
    height: 1,
    marginTop: 8,
  },
  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  blockedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  blockButton: {
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});

export default TopProfileUserProfileScreen;