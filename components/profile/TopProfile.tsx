import React, { useContext, useState, useEffect, useCallback } from 'react';
import {
    StyleSheet, View, TextInput, TouchableOpacity, Text,
    Platform, ScrollView, Dimensions,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { db } from '@/firebaseConfig';
import { doc, updateDoc, collection, query, where, getCountFromServer } from 'firebase/firestore';
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
    
    // Fallback constants for colors not yet in palette or complex mappings
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
                const [
                    followersSnap,
                    followingSnap,
                    postsSnap,
                    giftsResult,
                    visitorsData,
                ] = await Promise.all([
                    getCountFromServer(query(collection(db, 'followers'), where('followingId', '==', user.uid))),
                    getCountFromServer(query(collection(db, 'followers'), where('followerId', '==', user.uid))),
                    getCountFromServer(query(collection(db, 'posts'), where('userID', '==', user.uid))),
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
                console.error('Error loading top profile stats:', error);
            }
        };

        loadProfileStats();

        return () => {
            isMounted = false;
        };
    }, [user?.uid]);

    const fmt = (value: number) => (value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(value));

    const handleSaveBio = async () => {
        if (!user?.uid) return;

        try {
            await updateDoc(doc(db, 'users', user.uid), {
                bio: bio.trim(),
            });
            setIsEditingBio(false);
        } catch (error) {
            console.error('Error saving bio:', error);
        }
    };

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
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.coverWrapper}>
                    <CustomImage
                        source={user?.coverUrl || user?.coverPhoto || undefined}
                        style={styles.coverImage}
                        type="cover"
                        onLongPress={() => { }}
                    />
                    {/* Gradient fade bottom */}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.45)', 'transparent', isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.45)']}
                        locations={[0, 0.45, 1]}
                        style={StyleSheet.absoluteFill}
                    />
                    {/* Header bar over cover */}
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
                    {/* Avatar */}
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

                        {/* Vibe Status Text */}
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

                    {/* Stats */}
                    <View style={styles.statsContainer}>
                        <View style={styles.statBox}>
                            <Text style={[styles.statNumber, { color: C.text }]}>{fmt(postsCount)}</Text>
                            <Text style={[styles.statLabel, { color: C.subtitle }]}>{t('profile.posts')}</Text>
                        </View>
                        <TouchableOpacity style={styles.statBox}>
                            <Text style={[styles.statNumber, { color: C.text }]}>{fmt(followersCount)}</Text>
                            <Text style={[styles.statLabel, { color: C.subtitle }]}>{t('profile.followers')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.statBox}>
                            <Text style={[styles.statNumber, { color: C.text }]}>{fmt(followingCount)}</Text>
                            <Text style={[styles.statLabel, { color: C.subtitle }]}>{t('profile.following')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* BIO + NAME */}
                <View style={styles.bioContainer}>
                    <View style={styles.nameRow}>
                        <Text style={[styles.displayName, { color: C.text }]}>{user?.displayName || user?.username}</Text>
                        {isPremium && (
                            <MaterialCommunityIcons name="check-decagram" size={18} color="#0095f6" />
                        )}
                    </View>

                    {user?.job && (
                        <Text style={[styles.jobTitle, { color: C.subtitle }]}>
                            {user.job}
                        </Text>
                    )}

                    {isEditingBio ? (
                        <View style={styles.editBioBox}>
                            <TextInput
                                style={[styles.bioInput, { color: C.text, borderColor: C.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                                value={bio}
                                onChangeText={setBio}
                                multiline
                                autoFocus
                                placeholder={t('profile.bio_placeholder')}
                                placeholderTextColor={C.subtitle}
                            />
                            <View style={styles.bioEditActions}>
                                <TouchableOpacity onPress={() => setIsEditingBio(false)} style={styles.cancelBtn}>
                                    <Text style={{ color: C.subtitle, fontWeight: '600', fontSize: 14 }}>{t('common.cancel')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleSaveBio} style={styles.saveBioBtn}>
                                    <Text style={styles.saveBioText}>{t('common.save')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.bioDisplayRow} onPress={() => setIsEditingBio(true)} activeOpacity={0.7}>
                            <Text style={[styles.bioText, { color: C.text }]}>
                                {bio || t('profile.bio_empty')}
                            </Text>
                            <Feather name="edit-2" size={13} color={C.subtitle} style={{ marginLeft: 6, marginTop: 4 }} />
                        </TouchableOpacity>
                    )}

                    {user?.university && (
                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons name="school-outline" size={16} color={C.subtitle} />
                            <Text style={[styles.infoRowText, { color: C.text }]}>
                                {t('profile.studying_at_label', { school: user.university })}
                            </Text>
                        </View>
                    )}

                    {user?.educationLevel && (
                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons name="certificate-outline" size={16} color={C.subtitle} />
                            <Text style={[styles.infoRowText, { color: C.text }]}>
                                {t('profile.education_level_label', { value: user.educationLevel })}
                            </Text>
                        </View>
                    )}

                    {Array.isArray(user?.interests) && user.interests.length > 0 && (
                        <View style={styles.interestsWrapper}>
                            {user.interests.slice(0, 5).map((interestId: string) => {
                                const label = getLabelForInterest(interestId);
                                if (!label) return null;
                                return (
                                    <View key={interestId} style={[styles.interestPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                        <Text style={[styles.interestPillText, { color: C.text }]}>#{label}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* ACTION BUTTONS */}
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                        onPress={onEditProfile}
                    >
                        <Text style={[styles.actionBtnText, { color: C.text }]}>{t('profile.edit_profile')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                        onPress={() => { }}
                    >
                        <Text style={[styles.actionBtnText, { color: C.text }]}>{t('profile.share_profile')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionIconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                        onPress={() => { }}
                    >
                        <Feather name="user-plus" size={18} color={C.text} />
                    </TouchableOpacity>
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
                                <Text style={[styles.visitorsTitle, { color: C.text }]}>{t('profile.visitors_title')}</Text>
                                <Text style={styles.visitorsSub}>
                                    <Text style={{ fontWeight: '700', color: '#7C3AED' }}>{t('profile.visitors_summary', { count: visitors.length })}</Text>
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
                    <Text style={[styles.highlightsTitle, { color: C.text }]}>{t('profile.highlights')}</Text>
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
                        label={t('profile.coins_wallet')}
                        onPress={() => router.push('/(screens)/wallet/CoinWalletScreen')}
                        colors={['#F59E0B', '#EAB308']}
                        badge={Number(coins || 0) > 0 ? Number(coins).toLocaleString() : null}
                    />
                    <HighlightItem
                        icon="gift-outline"
                        label={t('profile.gift_box')}
                        onPress={() => router.push('/gifts/Inbox')}
                        colors={['#F43F5E', '#EC4899']}
                        badge={giftStats.count > 0 ? giftStats.count : null}
                    />
                    <HighlightItem
                        icon="shopping-outline"
                        label={t('profile.store')}
                        onPress={() => router.push('/(screens)/store/StoreScreen')}
                        colors={['#6366F1', '#4338CA']}
                        badge="HOT"
                    />
                </ScrollView>

                {/* TAB ROW */}
                <View style={[styles.tabRow, { borderTopColor: C.border }]}>
                    <TouchableOpacity style={[styles.tabItem, { borderBottomColor: C.text, borderBottomWidth: 1.5 }]}>
                        <MaterialCommunityIcons name="grid" size={24} color={C.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tabItem}>
                        <MaterialCommunityIcons name="movie-play-outline" size={24} color={C.subtitle} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tabItem}>
                        <MaterialCommunityIcons name="account-outline" size={26} color={C.subtitle} />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    coverWrapper: { height: 230, width: '100%', position: 'relative' },
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
    headerUsername: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    overlayIcon: {},
    roundBlur: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    profileSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 12,
        paddingRight: 18,
        marginTop: -46,
    },
    avatarContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
    avatarFreeContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 120,
        minHeight: 120,
    },
    avatarRing: {
        width: 104, height: 104, borderRadius: 52, padding: 3,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
    },
    avatarInner: { width: 98, height: 98, borderRadius: 49, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    addAvatarBtnWithFrame: {
        bottom: 8, right: 8,
    },
    addAvatarInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    statsContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', marginLeft: 14, paddingTop: 46 },
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
        position: 'absolute',
        bottom: -4,
        left: 28,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1.5,
        maxWidth: 110,
        zIndex: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
        elevation: 4,
    },
    vibeStatusBubbleText: { fontSize: 11, fontWeight: '700' },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    infoRowText: { fontSize: 13 },
    interestsWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
    interestPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
    interestPillText: { fontSize: 12, fontWeight: '600' },
    actionRow: { flexDirection: 'row', paddingHorizontal: 18, marginTop: 18, gap: 8 },
    actionBtn: { flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    actionBtnText: { fontSize: 14, fontWeight: '700' },
    actionIconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
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
