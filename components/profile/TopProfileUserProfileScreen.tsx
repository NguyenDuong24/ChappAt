import React, { useContext, useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, Alert, Clipboard,
  ActivityIndicator, Animated, Dimensions, Platform,
} from 'react-native';
import { Menu } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors } from '@/constants/Colors';
import CustomImage from '../common/CustomImage';
import { ThemeContext } from '@/context/ThemeContext';
import VibeAvatar from '../vibe/VibeAvatar';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '@/context/authContext';
import { followService } from '@/services/followService';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 200;

const TopProfileUserProfileScreen = ({ user }: { user: any }) => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [visitorsCount, setVisitorsCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const followButtonScale = useRef(new Animated.Value(1)).current;

  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const isDark = theme === 'dark';
  const currentThemeColors = isDark ? Colors.dark : Colors.light;

  const uid = user?.id || user?.uid || '';
  const name = user?.displayName || user?.fullname || user?.fullName || user?.username || t('chat.unknown_user');
  const bio = user?.bio || '';
  const locationRaw = user?.location;
  const location: string = typeof locationRaw === 'string'
    ? locationRaw
    : (locationRaw && typeof locationRaw === 'object' && 'latitude' in locationRaw)
      ? `${(locationRaw as any).latitude?.toFixed(2)}, ${(locationRaw as any).longitude?.toFixed(2)}`
      : '';
  const educationLevel = user?.educationLevel || '';
  const university = user?.university || '';
  const school = user?.school || '';
  const profileImage = user?.profileUrl || user?.photoURL || user?.avatar;
  const currentVibe = user?.currentVibe || user?.vibe || null;
  const age = user?.age || user?.dob ? calculateAge(user?.dob) : null;

  function calculateAge(dob: string): number | null {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age > 0 && age < 120 ? age : null;
  }

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!currentUser?.uid || !uid) return;
    const checkStatus = async () => {
      const [isF, isB] = await Promise.all([
        followService.isFollowing(currentUser.uid, uid),
        followService.isBlocked(currentUser.uid, uid),
      ]);
      setIsFollowing(isF);
      setIsBlocked(isB);
    };
    checkStatus();
  }, [currentUser?.uid, uid]);

  useEffect(() => {
    if (!uid) return;
    const subs = [
      onSnapshot(query(collection(db, 'followers'), where('followingId', '==', uid)), (s) => setFollowersCount(s.size)),
      onSnapshot(query(collection(db, 'followers'), where('followerId', '==', uid)), (s) => setFollowingCount(s.size)),
      onSnapshot(query(collection(db, 'posts'), where('userID', '==', uid)), (s) => setPostsCount(s.size)),
      onSnapshot(query(collection(db, 'profile_visits'), where('visitedId', '==', uid)), (s) => setVisitorsCount(s.size)),
    ];
    return () => subs.forEach(u => u());
  }, [uid]);

  const handleCopyId = () => {
    Clipboard.setString(uid);
    Alert.alert('✅', t('profile.uid_copied'));
  };

  const handleFollowToggle = async () => {
    if (!currentUser?.uid || !uid || followLoading) return;
    setFollowLoading(true);
    Animated.sequence([
      Animated.spring(followButtonScale, { toValue: 0.88, useNativeDriver: true }),
      Animated.spring(followButtonScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    try {
      if (isFollowing) {
        await followService.unfollowUser(currentUser.uid, uid);
        setIsFollowing(false);
      } else {
        await followService.followUser(currentUser.uid, uid);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Follow error:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleBlockToggle = async () => {
    if (!currentUser?.uid || !uid) return;
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
            } catch (e) { console.error(e); }
            finally { setFollowLoading(false); }
          }
        }
      ]
    );
  };

  const formatCount = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);

  const stats = [
    { label: 'Bài viết', value: formatCount(postsCount), icon: 'grid', colors: ['#6366F1', '#4F46E5'] },
    { label: 'Followers', value: formatCount(followersCount), icon: 'heart', colors: ['#EC4899', '#DB2777'] },
    { label: 'Following', value: formatCount(followingCount), icon: 'user-check', colors: ['#06B6D4', '#0891B2'] },
    { label: 'Lượt xem', value: formatCount(visitorsCount), icon: 'eye', colors: ['#10B981', '#059669'] },
  ];

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      {/* ── HERO COVER ── */}
      <View style={styles.coverWrapper}>
        <CustomImage type="cover" source={user?.coverImage} style={styles.coverImage} onLongPress={() => { }} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', isDark ? 'rgba(10,10,20,0.98)' : 'rgba(250,250,255,0.98)']}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* ── AVATAR + FOLLOW ROW ── */}
      <Animated.View style={[styles.avatarRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Avatar */}
        <Animated.View style={[styles.avatarHalo, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={['#6366F1', '#EC4899', '#F59E0B']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.avatarGradientRing}
          >
            <View style={[styles.avatarInner, { backgroundColor: currentThemeColors.background }]}>
              <VibeAvatar
                avatarUrl={profileImage}
                size={106}
                currentVibe={currentVibe}
                showAddButton={false}
                frameType={user?.activeFrame}
                storyUser={{ id: uid, username: name, profileUrl: profileImage }}
              />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Follow + Menu */}
        {currentUser?.uid && currentUser.uid !== uid && (
          <Animated.View style={[styles.followActions, { transform: [{ scale: followButtonScale }] }]}>
            <TouchableOpacity onPress={handleFollowToggle} disabled={followLoading} activeOpacity={0.85} style={styles.followBtnWrapper}>
              <LinearGradient
                colors={isFollowing
                  ? (isDark ? ['#1E1E2E', '#2A2A3E'] : ['#F1F5F9', '#E2E8F0'])
                  : ['#6366F1', '#8B5CF6']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.followBtn}
              >
                {followLoading
                  ? <ActivityIndicator size="small" color={isFollowing ? currentThemeColors.text : '#fff'} />
                  : <>
                    <Feather name={isFollowing ? 'user-check' : 'user-plus'} size={16} color={isFollowing ? currentThemeColors.text : '#fff'} />
                    <Text style={[styles.followBtnText, { color: isFollowing ? currentThemeColors.text : '#fff' }]}>
                      {isFollowing ? t('profile.following') : t('profile.follow')}
                    </Text>
                  </>
                }
              </LinearGradient>
            </TouchableOpacity>

            <Menu
              visible={showMenu}
              onDismiss={() => setShowMenu(false)}
              anchor={
                <TouchableOpacity onPress={() => setShowMenu(true)} style={[styles.menuBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                  <Feather name="more-horizontal" size={20} color={currentThemeColors.text} />
                </TouchableOpacity>
              }
              contentStyle={{ backgroundColor: isDark ? '#1E1E2E' : '#fff', borderRadius: 16 }}
            >
              <Menu.Item
                onPress={() => { setShowMenu(false); handleBlockToggle(); }}
                title={isBlocked ? t('profile.unblock_user') : t('profile.block_user')}
                titleStyle={{ color: isBlocked ? '#10B981' : '#EF4444', fontSize: 14, fontWeight: '600' }}
                leadingIcon={isBlocked ? 'lock-open-check-outline' : 'block-helper'}
              />
              <Menu.Item
                onPress={() => { setShowMenu(false); Alert.alert(t('profile.report'), t('profile.report_not_implemented')); }}
                title={t('profile.report')}
                titleStyle={{ color: currentThemeColors.text, fontSize: 14, fontWeight: '600' }}
                leadingIcon="flag-outline"
              />
            </Menu>
          </Animated.View>
        )}
      </Animated.View>

      {/* ── IDENTITY ── */}
      <Animated.View style={[styles.identitySection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.nameRow}>
          <Text style={[styles.nameText, { color: currentThemeColors.text }]} numberOfLines={1}>{name}</Text>
          {age && (
            <View style={[styles.agePill, { backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)' }]}>
              <Text style={styles.agePillText}>{age}</Text>
            </View>
          )}
          {user?.gender && (
            <View style={[styles.genderPill, {
              backgroundColor: user.gender === 'female' ? 'rgba(244,114,182,0.15)' : 'rgba(96,165,250,0.15)'
            }]}>
              <MaterialCommunityIcons
                name={user.gender === 'male' ? 'gender-male' : user.gender === 'female' ? 'gender-female' : 'gender-male-female'}
                size={14}
                color={user.gender === 'female' ? '#F472B6' : '#60A5FA'}
              />
            </View>
          )}
          {user?.isPro && (
            <View style={styles.proBadge}>
              <MaterialCommunityIcons name="crown" size={11} color="#F59E0B" />
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          )}
        </View>

        <TouchableOpacity onPress={handleCopyId} activeOpacity={0.6} style={[styles.uidBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
          <Text style={[styles.uidText, { color: currentThemeColors.text }]}>#{uid.slice(0, 10)}</Text>
          <Feather name="copy" size={10} color={currentThemeColors.text} opacity={0.4} />
        </TouchableOpacity>

        {bio ? (
          <Text style={[styles.bioText, { color: currentThemeColors.text }]} numberOfLines={3}>{bio}</Text>
        ) : null}
      </Animated.View>

      {/* ── STATS GRID ── */}
      <Animated.View style={[styles.statsGrid, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {stats.map((s, i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)' }]}>
            <LinearGradient colors={s.colors as any} style={styles.statIcon}>
              <Feather name={s.icon as any} size={14} color="#fff" />
            </LinearGradient>
            <Text style={[styles.statValue, { color: currentThemeColors.text }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: currentThemeColors.subtleText }]}>{s.label}</Text>
          </View>
        ))}
      </Animated.View>

      {/* ── INFO SECTION ── */}
      {(location || educationLevel || university || school) && (
        <Animated.View style={[styles.infoSection, { opacity: fadeAnim }]}>
          {location && (
            <View style={[styles.infoChip, { backgroundColor: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)' }]}>
              <Feather name="map-pin" size={13} color="#6366F1" />
              <Text style={[styles.infoChipText, { color: currentThemeColors.text }]} numberOfLines={1}>{location}</Text>
            </View>
          )}
          {(university || school) && (
            <View style={[styles.infoChip, { backgroundColor: isDark ? 'rgba(236,72,153,0.1)' : 'rgba(236,72,153,0.07)' }]}>
              <Feather name="book-open" size={13} color="#EC4899" />
              <Text style={[styles.infoChipText, { color: currentThemeColors.text }]} numberOfLines={1}>{university || school}</Text>
            </View>
          )}
          {educationLevel && (
            <View style={[styles.infoChip, { backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.07)' }]}>
              <Feather name="award" size={13} color="#F59E0B" />
              <Text style={[styles.infoChipText, { color: currentThemeColors.text }]} numberOfLines={1}>{educationLevel}</Text>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  coverWrapper: { width: '100%', height: COVER_HEIGHT, position: 'relative' },
  coverImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: -60,
    marginBottom: 16,
  },
  avatarHalo: {},
  avatarGradientRing: {
    width: 122, height: 122, borderRadius: 61,
    padding: 2,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  avatarInner: {
    flex: 1, borderRadius: 60, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  followActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 48 },
  followBtnWrapper: { borderRadius: 50, overflow: 'hidden' },
  followBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 11, paddingHorizontal: 18,
    minWidth: 130, justifyContent: 'center',
  },
  followBtnText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.1 },
  menuBtn: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },

  identitySection: { paddingHorizontal: 20, marginBottom: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  nameText: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, flexShrink: 1 },
  agePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  agePillText: { fontSize: 13, fontWeight: '700', color: '#6366F1' },
  genderPill: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  proBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(245,158,11,0.15)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  proBadgeText: { fontSize: 11, fontWeight: '800', color: '#F59E0B' },
  uidBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, marginBottom: 10,
  },
  uidText: { fontSize: 11, fontWeight: '600', fontFamily: 'monospace', opacity: 0.6 },
  bioText: { fontSize: 14, lineHeight: 21, opacity: 0.8 },

  statsGrid: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 20,
    overflow: 'hidden',
  },
  statIcon: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  statValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  infoSection: { paddingHorizontal: 16, gap: 8, marginBottom: 20 },
  infoChip: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 16 },
  infoChipText: { fontSize: 14, fontWeight: '600', flex: 1 },
});

export default TopProfileUserProfileScreen;