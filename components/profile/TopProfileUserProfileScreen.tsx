import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, Alert, Share,
  ActivityIndicator, Animated, Dimensions, Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Menu } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { BlurView } from 'expo-blur';
import { Colors } from '@/constants/Colors';
import CustomImage from '../common/CustomImage';
import { useThemedColors } from '@/hooks/useThemedColors';
import VibeAvatar from '../vibe/VibeAvatar';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '@/context/authContext';
import { followService } from '@/services/followService';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useTranslation } from 'react-i18next';
import { getLiquidMenuContentStyle, getLiquidMenuItemTitleStyle } from '@/components/liquid';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 200;

const compactValue = (value: any) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return value ? 'Có' : '';
  return '';
};

const pickFirst = (...values: any[]) => values.map(compactValue).find(Boolean) || '';

const getProfileCoverImage = (profile: any) => pickFirst(
  profile?.coverImage,
  profile?.coverUrl,
  profile?.coverPhoto,
  profile?.coverURL,
  profile?.backgroundImage,
);

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

  const colors = useThemedColors();
  const theme = colors.isDark ? 'dark' : 'light';
  const isDark = colors.isDark;
  const currentThemeColors = colors;

  // Helper: trả về fallback nếu key chưa có bản dịch
  const tf = useCallback((key: string, fallback: string) => {
    const translated = t(key);
    return translated !== key ? translated : fallback;
  }, [t]);

  // Helper có tham số
  const tfWithParams = useCallback((key: string, params: Record<string, any>, fallback: string) => {
    const translated = t(key, params);
    if (translated !== key) return translated;
    // Thay thế {{param}} trong fallback
    return fallback.replace(/\{\{(\w+)\}\}/g, (_, p) => params[p] ?? '');
  }, [t]);

  const uid = user?.id || user?.uid || '';
  const name = user?.displayName || user?.fullname || user?.fullName || user?.username || tf('chat.unknown_user', 'Người dùng');
  const bio = user?.bio || '';
  const locationRaw = user?.location;
  const location: string = typeof locationRaw === 'string'
    ? locationRaw
    : (locationRaw && typeof locationRaw === 'object' && 'latitude' in locationRaw)
      ? `${(locationRaw as any).latitude?.toFixed(2)}, ${(locationRaw as any).longitude?.toFixed(2)}`
      : '';
  const educationLevel = user?.educationLevel || '';
  const job = user?.job || '';
  const university = user?.university || '';
  const school = user?.school || '';
  const interests = Array.isArray(user?.interests) ? user.interests.filter(Boolean) : [];
  const interestsText = interests.slice(0, 4).join(', ');
  const genderLabel = user?.gender === 'male' ? tf('profile.male', 'Nam') : user?.gender === 'female' ? tf('profile.female', 'Nữ') : user?.gender ? tf('profile.other', 'Khác') : '';
  const profileImage = user?.profileUrl || user?.photoURL || user?.avatar;
  const coverImage = getProfileCoverImage(user);
  const currentVibe = user?.currentVibe || user?.vibe || null;
  const age = (() => {
    const ageValue = user?.age;
    if (typeof ageValue === 'number' && !isNaN(ageValue) && ageValue > 0) {
      return ageValue;
    }
    if (ageValue instanceof Date && !isNaN(ageValue.getTime())) {
      const today = new Date();
      let a = today.getFullYear() - ageValue.getFullYear();
      const monthDiff = today.getMonth() - ageValue.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < ageValue.getDate())) a--;
      return a > 0 && a < 120 ? a : null;
    }
    if (ageValue && typeof ageValue === 'object' && 'seconds' in ageValue) {
      const birthDate = new Date((ageValue as any).seconds * 1000);
      const today = new Date();
      let a = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) a--;
      return a > 0 && a < 120 ? a : null;
    }
    if (typeof ageValue === 'string') {
      const birthDate = new Date(ageValue);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let a = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) a--;
        return a > 0 && a < 120 ? a : null;
      }
    }
    const bday = pickFirst(user?.birthday, user?.birthDate, user?.dob);
    return bday ? calculateAge(bday) : null;
  })();
  const birthday = pickFirst(user?.birthday, user?.birthDate, user?.dob);
  const city = pickFirst(user?.city, user?.locationName, location);
  const lookingFor = pickFirst(user?.lookingFor, user?.datingGoal, user?.relationshipGoal);
  const relationship = pickFirst(user?.relationshipStatus, user?.relationship);
  const height = user?.height ? `${user.height} cm` : '';
  const languageText = Array.isArray(user?.languages) ? user.languages.filter(Boolean).join(', ') : pickFirst(user?.language);

  const aboutItems = [
    { icon: 'map-pin' as const, label: 'Khu vực', value: city, color: '#6366F1' },
    { icon: 'briefcase' as const, label: 'Công việc', value: job, color: '#0891B2' },
    { icon: 'book-open' as const, label: 'Học vấn', value: educationLevel || university || school, color: '#EC4899' },
    { icon: 'home' as const, label: 'Quê quán', value: pickFirst(user?.hometown, user?.address), color: '#10B981' },
  ].filter(item => item.value);

  const personalItems = [
    { icon: 'calendar' as const, label: 'Tuổi', value: age ? `${age} tuổi` : '', color: '#8B5CF6' },
    { icon: 'heart' as const, label: 'Mục tiêu', value: lookingFor, color: '#F43F5E' },
    { icon: 'users' as const, label: 'Tình trạng', value: relationship, color: '#F59E0B' },
    { icon: 'activity' as const, label: 'Chiều cao', value: height, color: '#06B6D4' },
    { icon: 'globe' as const, label: 'Ngôn ngữ', value: languageText, color: '#22C55E' },
    { icon: 'gift' as const, label: 'Sinh nhật', value: birthday, color: '#A855F7' },
  ].filter(item => item.value);

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
      onSnapshot(query(collection(db, 'posts'), where('userID', '==', uid), limit(1000)), (s) => setPostsCount(s.size)),
      onSnapshot(query(collection(db, 'profile_visits'), where('visitedId', '==', uid)), (s) => setVisitorsCount(s.size)),
    ];
    return () => subs.forEach(u => u());
  }, [uid]);

  const handleCopyId = useCallback(async () => {
    if (!uid) return;
    await Clipboard.setStringAsync(uid);
    Alert.alert(tf('common.success', 'Thành công'), tf('profile.uid_copied', 'Đã sao chép UID'));
  }, [tf, uid]);

  const handleShareProfile = useCallback(async () => {
    if (!uid) return;
    const link = Linking.createURL('/(screens)/user/UserProfileScreen', { queryParams: { userId: uid } });
    // Tạo message dự phòng khi chưa có bản dịch
    const fallbackMsg = `Xem hồ sơ của ${name} (${uid}): ${link}`;
    const message = tfWithParams('profile.share_message', { name, uid, link }, fallbackMsg);
    try {
      await Share.share(
        Platform.select({
          ios: { title: tf('profile.share_profile', 'Chia sẻ hồ sơ'), message, url: link },
          default: { title: tf('profile.share_profile', 'Chia sẻ hồ sơ'), message },
        }) as any
      );
    } catch (error) {
      console.warn('Share profile failed:', error);
    }
  }, [name, tf, tfWithParams, uid]);

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
    const title = isBlocked
      ? tf('profile.unblock_confirm_title', 'Xác nhận bỏ chặn')
      : tf('profile.block_confirm_title', 'Xác nhận chặn');
    const message = isBlocked
      ? tf('profile.unblock_confirm_message', 'Bạn có chắc muốn bỏ chặn người dùng này?')
      : tf('profile.block_confirm_message', 'Bạn có chắc muốn chặn người dùng này?');
    const actionText = isBlocked
      ? tf('profile.unblock_user', 'Bỏ chặn')
      : tf('profile.block_user', 'Chặn');
    
    Alert.alert(title, message, [
      { text: tf('common.cancel', 'Hủy'), style: 'cancel' },
      {
        text: actionText,
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
    ]);
  };

  const formatCount = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);

  const stats = [
    { label: tf('profile.posts', 'Bài viết'), value: formatCount(postsCount), icon: 'grid', colors: ['#6366F1', '#4F46E5'] },
    { label: tf('profile.followers', 'Người theo dõi'), value: formatCount(followersCount), icon: 'heart', colors: ['#EC4899', '#DB2777'] },
    { label: tf('profile.following', 'Đang theo dõi'), value: formatCount(followingCount), icon: 'user-check', colors: ['#06B6D4', '#0891B2'] },
    { label: tf('profile.views', 'Lượt xem'), value: formatCount(visitorsCount), icon: 'eye', colors: ['#10B981', '#059669'] },
  ];

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      {/* HERO COVER */}
      <View style={styles.coverWrapper}>
        <CustomImage type="cover" source={coverImage || undefined} style={styles.coverImage} onLongPress={() => { }} />
        <LinearGradient
          colors={['transparent', 'rgba(15,23,42,0.18)', isDark ? 'rgba(10,10,20,0.96)' : 'rgba(248,250,252,0.96)']}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* AVATAR + FOLLOW ROW */}
      <Animated.View style={[styles.avatarRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Animated.View style={[styles.avatarHalo, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={['#7C3AED', '#4F46E5', '#EC4899']}
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

        {currentUser?.uid && currentUser.uid !== uid && (
          <Animated.View style={[styles.followActions, { transform: [{ scale: followButtonScale }] }]}>
            <TouchableOpacity onPress={handleFollowToggle} disabled={followLoading} activeOpacity={0.85} style={styles.followBtnWrapper}>
              <LinearGradient
                colors={isFollowing
                  ? (isDark ? ['#111827', '#1F2937'] : ['#E2E8F0', '#CBD5E1'])
                  : ['#7C3AED', '#8B5CF6']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.followBtn}
              >
                {followLoading
                  ? <ActivityIndicator size="small" color={isFollowing ? currentThemeColors.text : '#fff'} />
                  : <>
                    <Feather name={isFollowing ? 'user-check' : 'user-plus'} size={16} color={isFollowing ? currentThemeColors.text : '#fff'} />
                    <Text style={[styles.followBtnText, { color: isFollowing ? currentThemeColors.text : '#fff' }]}>
                      {isFollowing ? tf('profile.following', 'Đang theo dõi') : tf('profile.follow', 'Theo dõi')}
                    </Text>
                  </>
                }
              </LinearGradient>
            </TouchableOpacity>

            <Menu
              visible={showMenu}
              onDismiss={() => setShowMenu(false)}
              anchor={
                <TouchableOpacity onPress={() => setShowMenu(true)} style={[styles.menuBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)' }]}>
                  <Feather name="more-horizontal" size={20} color={currentThemeColors.text} />
                </TouchableOpacity>
              }
              contentStyle={getLiquidMenuContentStyle(theme)}
            >
              <Menu.Item
                onPress={() => { setShowMenu(false); handleShareProfile(); }}
                title={tf('profile.share_profile', 'Chia sẻ hồ sơ')}
                titleStyle={getLiquidMenuItemTitleStyle(theme)}
                leadingIcon="share-variant-outline"
              />
              <Menu.Item
                onPress={() => { setShowMenu(false); handleBlockToggle(); }}
                title={isBlocked ? tf('profile.unblock_user', 'Bỏ chặn') : tf('profile.block_user', 'Chặn')}
                titleStyle={[getLiquidMenuItemTitleStyle(theme), { color: isBlocked ? '#10B981' : '#EF4444' }]}
                leadingIcon={isBlocked ? 'lock-open-check-outline' : 'block-helper'}
              />
              <Menu.Item
                onPress={() => { setShowMenu(false); Alert.alert(tf('profile.report', 'Báo cáo'), tf('profile.report_not_implemented', 'Tính năng báo cáo đang phát triển')); }}
                title={tf('profile.report', 'Báo cáo')}
                titleStyle={getLiquidMenuItemTitleStyle(theme)}
                leadingIcon="flag-outline"
              />
            </Menu>
          </Animated.View>
        )}
      </Animated.View>

      {/* IDENTITY */}
      <Animated.View style={[styles.identitySection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.nameRow}>
          <Text style={[styles.nameText, { color: currentThemeColors.text }]} numberOfLines={1}>{name}</Text>
          {user?.isPro && (
            <View style={styles.proBadge}>
              <MaterialCommunityIcons name="crown" size={11} color="#F59E0B" />
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          )}
        </View>

        {uid ? (
          <View style={styles.profileActionsRow}>
            <TouchableOpacity onPress={handleCopyId} activeOpacity={0.72} style={[styles.uidBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
              <View style={styles.uidTextWrap}>
                <Text style={[styles.uidLabel, { color: currentThemeColors.subtleText }]}>{tf('profile.uid', 'UID')}</Text>
                <Text style={[styles.uidText, { color: currentThemeColors.text }]} numberOfLines={1}>{uid}</Text>
              </View>
              <Feather name="copy" size={14} color={currentThemeColors.text} opacity={0.55} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShareProfile} activeOpacity={0.72} style={[styles.shareProfileButton, { backgroundColor: isDark ? 'rgba(99,102,241,0.16)' : 'rgba(99,102,241,0.10)' }]}>
              <Feather name="share-2" size={17} color="#6366F1" />
            </TouchableOpacity>
          </View>
        ) : null}

        {bio ? (
          <Text style={[styles.bioText, { color: currentThemeColors.text }]} numberOfLines={3}>{bio}</Text>
        ) : null}
        {(aboutItems.length > 0 || personalItems.length > 0 || interests.length > 0 || genderLabel) && (
          <View style={[styles.compactInfoPanel, { backgroundColor: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(15,23,42,0.035)' }]}>
            <View style={styles.compactInfoHeader}>
              <MaterialCommunityIcons name="card-account-details-outline" size={16} color="#8B5CF6" />
              <Text style={[styles.compactInfoTitle, { color: currentThemeColors.text }]}>Thông tin hồ sơ</Text>
            </View>
            <View style={styles.compactInfoWrap}>
              {genderLabel ? (
                <View style={[styles.compactInfoPill, { backgroundColor: isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.11)' }]}>
                  <MaterialCommunityIcons name="gender-male-female" size={14} color="#6366F1" />
                  <Text style={[styles.compactInfoText, { color: currentThemeColors.text }]} numberOfLines={1}>{genderLabel}</Text>
                </View>
              ) : null}
              {[...aboutItems, ...personalItems].map(item => (
                <View key={`${item.label}-${item.value}`} style={[styles.compactInfoPill, { backgroundColor: isDark ? `${item.color}20` : `${item.color}14` }]}>
                  <Feather name={item.icon} size={14} color={item.color} />
                  <Text style={[styles.compactInfoText, { color: currentThemeColors.text }]} numberOfLines={1}>{item.label}: {item.value}</Text>
                </View>
              ))}
              {interests.slice(0, 8).map((interest: string, interestIndex: number) => (
                <View key={`${interest}-${interestIndex}`} style={[styles.compactInfoPill, { backgroundColor: isDark ? 'rgba(236,72,153,0.18)' : 'rgba(236,72,153,0.11)' }]}>
                  <MaterialCommunityIcons name="heart-outline" size={14} color="#EC4899" />
                  <Text style={[styles.compactInfoText, { color: currentThemeColors.text }]} numberOfLines={1}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Animated.View>

      {/* STATS GRID */}
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
    paddingHorizontal: 16,
    marginTop: -60,
    marginBottom: 16,
  },
  avatarHalo: {},
  avatarGradientRing: {
    width: 122, height: 122, borderRadius: 61,
    padding: 2,
    shadowColor: '#7C3AED',
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

  identitySection: { paddingHorizontal: 16, marginBottom: 20 },
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
  profileActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  uidBadge: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 16,
  },
  uidTextWrap: { flex: 1, minWidth: 0, gap: 2 },
  uidLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0 },
  uidText: { fontSize: 11, fontWeight: '600', fontFamily: 'monospace', opacity: 0.72 },
  shareProfileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioText: { fontSize: 14, lineHeight: 21, opacity: 0.8 },
  compactInfoPanel: { marginTop: 12, padding: 12, borderRadius: 18 },
  compactInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 },
  compactInfoTitle: { fontSize: 14, fontWeight: '800' },
  compactInfoWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  compactInfoPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, maxWidth: '100%' },
  compactInfoText: { fontSize: 12, fontWeight: '700', maxWidth: SCREEN_WIDTH - 86 },
  identityMetaWrap: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  identityMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  identityMetaText: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },

  statsGrid: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.12)',
  },
  statIcon: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  statValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  infoSection: { paddingHorizontal: 16, gap: 8, marginBottom: 20 },
  infoChip: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 16 },
  infoTextBlock: { flex: 1, gap: 2 },
  infoLabel: { fontSize: 11, fontWeight: '700' },
  infoChipText: { fontSize: 14, fontWeight: '600', flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2, marginBottom: 2 },
  sectionSubtitle: { fontSize: 12, fontWeight: '600' },
  detailCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 14,
    borderRadius: 22,
  },
  detailHeader: { marginBottom: 12 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  detailItem: {
    width: (SCREEN_WIDTH - 62) / 2,
    minHeight: 94,
    borderRadius: 18,
    padding: 12,
    justifyContent: 'space-between',
  },
  detailIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  detailLabel: { fontSize: 11, fontWeight: '700', marginBottom: 3 },
  detailValue: { fontSize: 13, fontWeight: '800', lineHeight: 18 },
  interestsSection: { marginTop: 14 },
  interestsTitle: { fontSize: 14, fontWeight: '800', marginBottom: 8 },
  interestPillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, maxWidth: '100%' },
  interestPillText: { fontSize: 12, fontWeight: '700', maxWidth: SCREEN_WIDTH - 88 },
});

export default TopProfileUserProfileScreen;