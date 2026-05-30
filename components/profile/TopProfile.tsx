import React, { useContext, useState, useEffect, useCallback } from 'react';
import {
    StyleSheet, View, TextInput, TouchableOpacity, Text,
    Platform, ScrollView, Dimensions,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { db } from '@/firebaseConfig';
import { doc, updateDoc, collection, query, where, getCountFromServer, limit } from 'firebase/firestore';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import CustomImage from '../common/CustomImage';
import { useAuth } from '@/context/authContext';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import VibeAvatar from '../vibe/VibeAvatar';
import { LinearGradient } from 'expo-linear-gradient';
import { giftService } from '@/services/giftService';
import { BlurView } from 'expo-blur';
import { getLabelForInterest } from '@/utils/interests';
import { useTranslation } from 'react-i18next';
import HashtagText from '../common/HashtagText';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useIsPremium } from '@/hooks/useIsPremium';
import { profileVisitService, ProfileVisit } from '@/services/profileVisitService';

const { width } = Dimensions.get('window');

const compactValue = (value: any) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
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

const calculateAge = (bdayStr: string) => {
    if (!bdayStr) return null;
    const parts = bdayStr.split('/');
    if (parts.length !== 3) return null;
    try {
        const bday = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        const today = new Date();
        let age = today.getFullYear() - bday.getFullYear();
        const m = today.getMonth() - bday.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < bday.getDate())) {
            age--;
        }
        return age > 0 && age < 120 ? age : null;
    } catch {
        return null;
    }
};

const TopProfile = ({
    onEditProfile,
    onOpenSettings,
}: {
    onEditProfile?: () => void;
    onOpenSettings?: () => void;
}) => {
    const { t } = useTranslation();
    const [isEditingBio, setIsEditingBio] = useState(false);
    const { user, currentVibe, coins, activeFrame, icon } = useAuth();
    const { isPremium } = useIsPremium();
    const [bio, setBio] = useState('');
    const router = useRouter();
    const { theme, isDark, palette } = useTheme();

    // Fallback helper
    const tf = useCallback((key: string, fallback: string) => {
        const translated = t(key);
        return translated !== key ? translated : fallback;
    }, [t]);

    // Helper with params (replaces {{param}} in fallback)
    const tfWithParams = useCallback((key: string, params: Record<string, any>, fallback: string) => {
        const translated = t(key, params);
        if (translated !== key) return translated;
        return fallback.replace(/\{\{(\w+)\}\}/g, (_, p) => params[p] ?? '');
    }, [t]);

    const C = {
        background: 'transparent',
        text: palette.textColor,
        subtitle: palette.subtitleColor,
        border: palette.menuBorder,
        card: palette.menuBackground,
    };

    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [postsCount, setPostsCount] = useState(0);
    const [giftStats, setGiftStats] = useState({ count: 0 });
    const [visitors, setVisitors] = useState<ProfileVisit[]>([]);
    const coverImage = getProfileCoverImage(user);

    const handleOpenSettings = useCallback(() => {
        if (onOpenSettings) {
            onOpenSettings();
            return;
        }
        router.push('/profile/settings');
    }, [onOpenSettings, router]);

    useEffect(() => {
        setBio(user?.bio || '');
    }, [user?.bio]);

    useEffect(() => {
        let isMounted = true;
        const loadProfileStats = async () => {
            if (!user?.uid) {
                if (isMounted) {
                    setFollowersCount(0);
                    setFollowingCount(0);
                    setPostsCount(0);
                    setGiftStats({ count: 0 });
                    setVisitors([]);
                }
                return;
            }
            try {
                const [followersSnap, followingSnap, postsSnap, giftsResult, visitorsData] = await Promise.all([
                    getCountFromServer(query(collection(db, 'followers'), where('followingId', '==', user.uid))),
                    getCountFromServer(query(collection(db, 'followers'), where('followerId', '==', user.uid))),
                    getCountFromServer(query(collection(db, 'posts'), where('userID', '==', user.uid), limit(1000))),
                    giftService.listReceivedGifts(user.uid, { pageSize: 30 }),
                    profileVisitService.getVisitors(user.uid, 12),
                ]);
                if (!isMounted) return;
                setFollowersCount(followersSnap.data().count);
                setFollowingCount(followingSnap.data().count);
                setPostsCount(postsSnap.data().count);
                setGiftStats({ count: giftsResult.items.length });
                setVisitors(visitorsData);
            } catch (error) {
                const errMsg = String(error?.message || error?.code || '');
                if (!errMsg.includes('permission-denied') && !errMsg.includes('Missing or insufficient permissions')) {
                    console.error('Error loading top profile stats:', error);
                }
            }
        };
        loadProfileStats();
        return () => { isMounted = false; };
    }, [user?.uid]);

    const fmt = (value: number) => (value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(value));

    const handleSaveBio = async () => {
        if (!user?.uid) return;
        try {
            await updateDoc(doc(db, 'users', user.uid), { bio: bio.trim() });
            setIsEditingBio(false);
        } catch (error) {
            console.error('Error saving bio:', error);
        }
    };

    const personalDetails = [
        { icon: 'cake-variant-outline' as const, label: 'Tuổi', value: (() => {
            const ageValue = user?.age;
            let ageNum: number | null = null;
            if (typeof ageValue === 'number' && !isNaN(ageValue) && ageValue > 0) {
                ageNum = ageValue;
            } else if (ageValue instanceof Date && !isNaN(ageValue.getTime())) {
                const today = new Date();
                let age = today.getFullYear() - ageValue.getFullYear();
                const monthDiff = today.getMonth() - ageValue.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < ageValue.getDate())) age--;
                ageNum = age > 0 && age < 120 ? age : null;
            } else if (ageValue && typeof ageValue === 'object' && 'seconds' in ageValue) {
                try {
                    const birthDate = new Date((ageValue as any).seconds * 1000);
                    const today = new Date();
                    let age = today.getFullYear() - birthDate.getFullYear();
                    const monthDiff = today.getMonth() - birthDate.getMonth();
                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
                    ageNum = age > 0 && age < 120 ? age : null;
                } catch { ageNum = null; }
            } else if (typeof ageValue === 'string') {
                try {
                    const birthDate = new Date(ageValue);
                    if (!isNaN(birthDate.getTime())) {
                        const today = new Date();
                        let age = today.getFullYear() - birthDate.getFullYear();
                        const monthDiff = today.getMonth() - birthDate.getMonth();
                        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
                        ageNum = age > 0 && age < 120 ? age : null;
                    }
                } catch { ageNum = null; }
            }
            if (ageNum === null) {
                const bday = pickFirst(user?.birthday, user?.birthDate, user?.dob);
                if (bday) ageNum = calculateAge(bday);
            }
            return ageNum ? `${ageNum} tuổi` : '';
        })(), color: '#8B5CF6' },
        { icon: 'briefcase-outline' as const, label: 'Nghề nghiệp', value: user?.job || '', color: '#0891B2' },
        { icon: 'home-heart' as const, label: 'Quê quán', value: pickFirst(user?.hometown, user?.address), color: '#10B981' },
        { icon: 'map-marker-outline' as const, label: 'Khu vực', value: pickFirst(user?.city, user?.locationName), color: '#6366F1' },
        { icon: 'heart-outline' as const, label: 'Mục tiêu', value: pickFirst(user?.lookingFor, user?.datingGoal, user?.relationshipGoal), color: '#F43F5E' },
        { icon: 'account-heart-outline' as const, label: 'Tình trạng', value: pickFirst(user?.relationshipStatus, user?.relationship), color: '#F59E0B' },
        { icon: 'human-male-height' as const, label: 'Chiều cao', value: user?.height ? `${user.height} cm` : '', color: '#06B6D4' },
        { icon: 'translate' as const, label: 'Ngôn ngữ', value: Array.isArray(user?.languages) ? user.languages.filter(Boolean).join(', ') : pickFirst(user?.language), color: '#22C55E' },
        { icon: 'calendar-heart' as const, label: 'Sinh nhật', value: pickFirst(user?.birthday, user?.birthDate, user?.dob), color: '#A855F7' },
    ].filter(item => item.value);

    const HighlightItem = ({
        icon: iconName,
        label,
        onPress,
        colors,
        badge,
    }: {
        icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
        label: string;
        onPress: () => void;
        colors: readonly [string, string, ...string[]];
        badge?: string | number | null;
    }) => (
        <TouchableOpacity style={styles.highlightBtn} onPress={onPress}>
            <View style={styles.highlightOutline}>
                <LinearGradient colors={colors} style={styles.highlightCircle}>
                    <View style={[styles.highlightInner, { backgroundColor: isDark ? '#000' : '#fff' }]}>
                        <MaterialCommunityIcons name={iconName} size={26} color={isDark ? '#fff' : '#111'} />
                        {!!badge && (
                            <View style={styles.highlightBadge}>
                                <Text style={styles.highlightBadgeText}>{badge}</Text>
                            </View>
                        )}
                    </View>
                </LinearGradient>
            </View>
            <Text style={[styles.highlightLabel, { color: C.text }]} numberOfLines={1}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <Animated.View entering={FadeIn.duration(400)} style={[styles.container, { backgroundColor: 'transparent' }]}>
            <View>
                {/* COVER IMAGE */}
                <View style={styles.coverWrapper}>
                    <CustomImage
                        source={coverImage || undefined}
                        images={coverImage ? [coverImage] : []}
                        style={styles.coverImage}
                        type="cover"
                        onLongPress={() => {}}
                        initialIndex={0}
                    />
                    <LinearGradient
                        colors={[
                            'rgba(0,0,0,0.45)',
                            'transparent',
                            isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.45)',
                        ]}
                        locations={[0, 0.45, 1]}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                    />
                    <View style={styles.overlayHeader}>
                        <View style={styles.headerLeft} />
                        <TouchableOpacity style={styles.overlayIcon} onPress={handleOpenSettings}>
                            <BlurView intensity={35} tint="dark" style={styles.roundBlur}>
                                <Feather name="menu" size={20} color="#fff" />
                            </BlurView>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* PROFILE SUMMARY */}
                <View style={styles.profileSummary}>
                    <View style={styles.avatarContainer}>
                        {activeFrame ? (
                            <View style={styles.avatarFreeContainer}>
                                <VibeAvatar
                                    avatarUrl={icon || user?.profileUrl || user?.photoURL || user?.avatar}
                                    size={90}
                                    currentVibe={currentVibe}
                                    showAddButton={false}
                                    frameType={activeFrame}
                                    vibeBadgePosition="bottom-left"
                                    storyUser={{ id: user?.uid || '', username: user?.username || '', profileUrl: icon || user?.profileUrl || user?.photoURL || user?.avatar }}
                                />
                            </View>
                        ) : (
                            <LinearGradient
                                colors={isPremium ? ['#F59E0B', '#EC4899', '#8B5CF6'] : ['#E1306C', '#C13584', '#833AB4']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={styles.avatarRing}
                            >
                                <View style={[styles.avatarInner, { backgroundColor: isDark ? '#000' : '#fff' }]}>
                                    <VibeAvatar
                                        avatarUrl={icon || user?.profileUrl || user?.photoURL || user?.avatar}
                                        size={90}
                                        currentVibe={currentVibe}
                                        showAddButton={false}
                                        frameType={undefined}
                                        vibeBadgePosition="bottom-left"
                                        storyUser={{ id: user?.uid || '', username: user?.username || '', profileUrl: icon || user?.profileUrl || user?.photoURL || user?.avatar }}
                                    />
                                </View>
                            </LinearGradient>
                        )}
                        {currentVibe?.customMessage && (
                            <TouchableOpacity
                                style={[styles.vibeStatusBubble, { backgroundColor: isDark ? 'rgba(40,40,40,0.95)' : 'rgba(255,255,255,0.95)', borderColor: isDark ? '#333' : '#eee' }]}
                                onPress={() => router.push('/(screens)/user/VibeScreen')}
                            >
                                <Text style={[styles.vibeStatusBubbleText, { color: C.text }]} numberOfLines={1}>
                                    {currentVibe.customMessage}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* BIO + NAME */}
                <View style={styles.bioContainer}>
                    <View style={styles.nameRow}>
                        <Text style={[styles.displayName, { color: C.text }]}>{user?.displayName || user?.username}</Text>
                        {isPremium && <MaterialCommunityIcons name="check-decagram" size={18} color="#0095f6" />}
                    </View>
                    {user?.job && <Text style={[styles.jobTitle, { color: C.subtitle }]}>{user.job}</Text>}

                    {isEditingBio ? (
                        <View style={styles.editBioBox}>
                            <TextInput
                                style={[styles.bioInput, { color: C.text, borderColor: C.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                                value={bio}
                                onChangeText={setBio}
                                multiline
                                autoFocus
                                placeholder={tf('profile.bio_placeholder', 'Mô tả về bản thân...')}
                                placeholderTextColor={C.subtitle}
                            />
                            <View style={styles.bioEditActions}>
                                <TouchableOpacity onPress={() => setIsEditingBio(false)} style={styles.cancelBtn}>
                                    <Text style={{ color: C.subtitle, fontWeight: '600', fontSize: 14 }}>{tf('common.cancel', 'Hủy')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleSaveBio} style={styles.saveBioBtn}>
                                    <Text style={styles.saveBioText}>{tf('common.save', 'Lưu')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.bioDisplayRow} onPress={() => setIsEditingBio(true)} activeOpacity={0.7}>
                            <Text style={[styles.bioText, { color: C.text }]}>
                                {bio || tf('profile.bio_empty', 'Thêm tiểu sử')}
                            </Text>
                            <Feather name="edit-2" size={13} color={C.subtitle} style={{ marginLeft: 6, marginTop: 4 }} />
                        </TouchableOpacity>
                    )}

                    {(personalDetails.length > 0 || (Array.isArray(user?.interests) && user.interests.length > 0)) && (
                        <View style={[styles.infoPanel, { backgroundColor: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(15,23,42,0.035)' }]}>
                            <View style={styles.infoPanelHeader}>
                                <MaterialCommunityIcons name="card-account-details-outline" size={16} color="#8B5CF6" />
                                <Text style={[styles.infoPanelTitle, { color: C.text }]}>Thông tin hồ sơ</Text>
                            </View>
                            <View style={styles.infoPillsWrap}>
                                {personalDetails.map(item => (
                                    <View key={item.label} style={[styles.infoPill, { backgroundColor: isDark ? `${item.color}20` : `${item.color}14` }]}>
                                        <MaterialCommunityIcons name={item.icon} size={14} color={item.color} />
                                        <Text style={[styles.infoPillText, { color: C.text }]} numberOfLines={1}>{item.label}: {item.value}</Text>
                                    </View>
                                ))}
                                {Array.isArray(user?.interests) && user.interests.slice(0, 8).map((interestId: string) => {
                                    const label = getLabelForInterest(interestId);
                                    if (!label) return null;
                                    return (
                                        <View key={`interest-${interestId}`} style={[styles.infoPill, { backgroundColor: isDark ? 'rgba(236,72,153,0.18)' : 'rgba(236,72,153,0.11)' }]}>
                                            <MaterialCommunityIcons name="heart-outline" size={14} color="#EC4899" />
                                            <Text style={[styles.infoPillText, { color: C.text }]} numberOfLines={1}>{label}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    <View style={[styles.statsContainer, styles.statsBelowBio]}>
                        <View style={styles.statBox}>
                            <Text style={[styles.statNumber, { color: C.text }]}>{fmt(postsCount)}</Text>
                            <Text style={[styles.statLabel, { color: C.subtitle }]}>{tf('profile.posts', 'Bài viết')}</Text>
                        </View>
                        <TouchableOpacity style={styles.statBox}>
                            <Text style={[styles.statNumber, { color: C.text }]}>{fmt(followersCount)}</Text>
                            <Text style={[styles.statLabel, { color: C.subtitle }]}>{tf('profile.followers', 'Người theo dõi')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.statBox}>
                            <Text style={[styles.statNumber, { color: C.text }]}>{fmt(followingCount)}</Text>
                            <Text style={[styles.statLabel, { color: C.subtitle }]}>{tf('profile.following', 'Đang theo dõi')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* VISITORS CARD */}
                {visitors.length > 0 && (
                    <TouchableOpacity
                        style={[styles.visitorsCard, { backgroundColor: isDark ? 'rgba(124, 58, 237, 0.1)' : '#F5F3FF', borderColor: isDark ? 'rgba(124, 58, 237, 0.2)' : '#EDE9FE' }]}
                        onPress={() => router.push('/(screens)/profile/ProfileVisitorsScreen')}
                        activeOpacity={0.85}
                    >
                        <View style={styles.visitorsLeft}>
                            <View style={styles.visitorAvatarStack}>
                                {visitors.slice(0, 3).map((v, i) => (
                                    <Image
                                        key={i}
                                        source={{ uri: v.visitorData?.profileUrl }}
                                        style={[styles.visitorMiniAvatar, { marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i, borderColor: isDark ? '#1a1a2e' : '#F5F3FF' }]}
                                    />
                                ))}
                            </View>
                            <View>
                                <Text style={[styles.visitorsTitle, { color: C.text }]}>{tf('profile.visitors_title', 'Khách ghé thăm')}</Text>
                                <Text style={styles.visitorsSub}>
                                    <Text style={{ fontWeight: '700', color: '#7C3AED' }}>
                                        {tfWithParams('profile.visitors_summary', { count: visitors.length }, '{{count}} lượt ghé thăm')}
                                    </Text>
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.visitorsArrow, { backgroundColor: isDark ? 'rgba(124, 58, 237, 0.2)' : '#EDE9FE' }]}>
                            <Feather name="chevron-right" size={16} color="#7C3AED" />
                        </View>
                    </TouchableOpacity>
                )}

                {/* HIGHLIGHTS */}
                <View style={styles.highlightsHeader}>
                    <Text style={[styles.highlightsTitle, { color: C.text }]}>{tf('profile.highlights', 'Nổi bật')}</Text>
                </View>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.highlightsContent}
                    style={styles.highlightsContainer}
                >
                    <HighlightItem
                        icon="lightning-bolt"
                        label="Vibe"
                        onPress={() => router.push('/(screens)/user/VibeScreen')}
                        colors={currentVibe ? ['#EC4899', '#F59E0B'] : (isDark ? ['#2a2a2a', '#333'] : ['#f0f0f0', '#e0e0e0'])}
                        badge={currentVibe ? '*' : null}
                    />
                    <HighlightItem
                        icon="wallet-outline"
                        label={tf('profile.coins_wallet', 'Ví xu')}
                        onPress={() => router.push('/(screens)/wallet/CoinWalletScreen')}
                        colors={['#F59E0B', '#EAB308']}
                        badge={Number(coins || 0) > 0 ? Number(coins).toLocaleString() : null}
                    />
                    <HighlightItem
                        icon="gift-outline"
                        label={tf('profile.gift_box', 'Hộp quà')}
                        onPress={() => router.push('/gifts/Inbox')}
                        colors={['#F43F5E', '#EC4899']}
                        badge={giftStats.count > 0 ? giftStats.count : null}
                    />
                    <HighlightItem
                        icon="shopping-outline"
                        label={tf('profile.store', 'Cửa hàng')}
                        onPress={() => router.push('/(screens)/store/StoreScreen')}
                        colors={['#6366F1', '#4338CA']}
                        badge="HOT"
                    />
                </ScrollView>

                <View style={{ height: 24 }} />
            </View>
        </Animated.View>
    );
};

// styles giữ nguyên
const styles = StyleSheet.create({
    container: { flex: 1 },
    coverWrapper: { height: 200, width: '100%', position: 'relative' },
    coverImage: { width: '100%', height: '100%' },
    overlayHeader: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 65 : 45,
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    overlayIcon: {},
    roundBlur: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    profileSummary: { flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 18, marginTop: -46 },
    avatarContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
    avatarFreeContainer: { alignItems: 'center', justifyContent: 'center', minWidth: 120, minHeight: 120 },
    avatarRing: {
        width: 104, height: 104, borderRadius: 52, padding: 3,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
    },
    avatarInner: { width: 98, height: 98, borderRadius: 49, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    addAvatarBtnWithFrame: { bottom: 8, right: 8 },
    addAvatarInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    statsContainer: { flexDirection: 'row', justifyContent: 'space-around' },
    statsBelowBio: { marginTop: 12, paddingVertical: 12, borderRadius: 18 },
    statBox: { alignItems: 'center' },
    statNumber: { fontSize: 18, fontWeight: '800' },
    statLabel: { fontSize: 12, fontWeight: '400', marginTop: 2 },
    bioContainer: { paddingHorizontal: 18, marginTop: 14 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
    displayName: { fontSize: 17, fontWeight: '800' },
    jobTitle: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
    bioDisplayRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
    bioText: { fontSize: 14, lineHeight: 20, flex: 1 },
    editBioBox: { marginTop: 4, marginBottom: 10 },
    bioInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 72, textAlignVertical: 'top' },
    bioEditActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
    cancelBtn: { paddingVertical: 6, paddingHorizontal: 12 },
    saveBioBtn: { paddingVertical: 6, paddingHorizontal: 16, backgroundColor: '#0095f6', borderRadius: 8 },
    saveBioText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    vibeStatusBubble: {
        position: 'absolute', bottom: -4, left: 28, paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 12, borderWidth: 1.5, maxWidth: 110, zIndex: 100,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 4,
    },
    vibeStatusBubbleText: { fontSize: 11, fontWeight: '700' },
    infoPanel: { marginTop: 10, padding: 12, borderRadius: 18 },
    infoPanelHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 },
    infoPanelTitle: { fontSize: 14, fontWeight: '800' },
    infoPillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    infoPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, maxWidth: '100%' },
    infoPillText: { fontSize: 12, fontWeight: '700', maxWidth: width - 78 },
    visitorsCard: {
        marginHorizontal: 18, marginTop: 18, borderRadius: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1,
    },
    visitorsLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    visitorAvatarStack: { flexDirection: 'row', alignItems: 'center' },
    visitorMiniAvatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
    visitorsTitle: { fontSize: 14, fontWeight: '700' },
    visitorsSub: { fontSize: 12, marginTop: 2 },
    visitorsArrow: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    highlightsHeader: { marginTop: 24, paddingHorizontal: 18 },
    highlightsTitle: { fontSize: 14, fontWeight: '800' },
    highlightsContainer: { marginTop: 12, paddingLeft: 16 },
    highlightsContent: { paddingRight: 16, gap: 16 },
    highlightBtn: { alignItems: 'center', width: 72 },
    highlightOutline: {
        width: 66, height: 66, borderRadius: 33, padding: 2.5,
        borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
        alignItems: 'center', justifyContent: 'center',
    },
    highlightCircle: { width: 60, height: 60, borderRadius: 30, padding: 2 },
    highlightInner: { flex: 1, borderRadius: 28, alignItems: 'center', justifyContent: 'center', position: 'relative' },
    highlightLabel: { fontSize: 11, marginTop: 6, fontWeight: '500' },
    highlightBadge: {
        position: 'absolute', top: -5, right: -6,
        backgroundColor: '#FF3B30', paddingHorizontal: 6, paddingVertical: 2,
        borderRadius: 10, borderWidth: 2, borderColor: '#fff',
        minWidth: 18, alignItems: 'center',
    },
    highlightBadgeText: { color: '#fff', fontSize: 8.5, fontWeight: '900' },
    tabRow: { flexDirection: 'row', marginTop: 24, borderTopWidth: 0.5 },
    tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 50 },
});

export default TopProfile;