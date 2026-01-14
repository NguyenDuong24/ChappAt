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
    Pressable,
} from 'react-native';
import { db } from '@/firebaseConfig';
import {
    doc,
    updateDoc,
    collection,
    query,
    where,
    getDoc,
    setDoc,
    increment,
    arrayUnion,
    arrayRemove,
    getCountFromServer,
} from 'firebase/firestore';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import CustomImage from '../common/CustomImage';
import { useAuth } from '@/context/authContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import VibeAvatar from '../vibe/VibeAvatar';
import AvatarFrame from '../common/AvatarFrame';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { giftService } from '@/services/giftService';
import { BlurView } from 'expo-blur';
import { getLabelForInterest } from '@/utils/interests';
import { useTranslation } from 'react-i18next';
import Animated, {
    FadeInDown,
    FadeInRight,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const extractHashtags = (text: string): string[] => {
    const regex = /#[a-zA-Z0-9_]+/g;
    return text.match(regex) || [];
};

interface TopProfileProps {
    onEditProfile?: () => void;
    handleLogout?: () => void;
}

const TopProfile = ({ onEditProfile, handleLogout }: TopProfileProps) => {
    const { t } = useTranslation();
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [originalBio, setOriginalBio] = useState('');
    const { user, currentVibe, coins, activeFrame } = useAuth();
    const [bio, setBio] = useState('');
    const router = useRouter();
    const themeContext = useContext(ThemeContext);
    const theme = themeContext?.theme || 'light';
    const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [postsCount, setPostsCount] = useState(0);
    const [giftStats, setGiftStats] = useState<{ count: number; value: number }>({ count: 0, value: 0 });

    // Animation values
    const avatarScale = useSharedValue(1);

    useEffect(() => {
        if (user?.bio) {
            setBio(user.bio);
        }
    }, [user]);

    useEffect(() => {
        if (!user || !user.uid) return;

        const fetchCounts = async () => {
            try {
                const qFollowers = query(
                    collection(db, 'follows'),
                    where('followingId', '==', user.uid)
                );
                const followersSnap = await getCountFromServer(qFollowers);
                setFollowersCount(followersSnap.data().count);

                const qFollowing = query(
                    collection(db, 'follows'),
                    where('followerId', '==', user.uid)
                );
                const followingSnap = await getCountFromServer(qFollowing);
                setFollowingCount(followingSnap.data().count);

                const qPosts = query(
                    collection(db, 'posts'),
                    where('userId', '==', user.uid)
                );
                const postsSnap = await getCountFromServer(qPosts);
                setPostsCount(postsSnap.data().count);
            } catch (error) {
                console.error('Error fetching profile counts:', error);
            }
        };

        fetchCounts();
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

    const handleStartEditingBio = () => {
        setOriginalBio(bio);
        setIsEditingBio(true);
    };

    const handleSaveBio = async () => {
        try {
            if (user && user.uid) {
                const userDoc = doc(db, 'users', user.uid);
                await updateDoc(userDoc, { bio });
                await updateBioHashtags(bio, originalBio);
                setIsEditingBio(false);
            }
        } catch (error) {
            console.error('Error updating bio:', error);
        }
    };

    const updateBioHashtags = async (newBio: string, oldBio: string) => {
        if (!user?.uid) return;

        const oldHashtags = [...new Set(extractHashtags(oldBio))];
        const newHashtags = [...new Set(extractHashtags(newBio))];

        const added = newHashtags.filter((tag) => !oldHashtags.includes(tag));
        const removed = oldHashtags.filter((tag) => !newHashtags.includes(tag));

        for (const tag of added) {
            const tagDocRef = doc(collection(db, 'hashtags'), tag);
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

        for (const tag of removed) {
            const tagDocRef = doc(collection(db, 'hashtags'), tag);
            const tagDocSnap = await getDoc(tagDocRef);
            if (tagDocSnap.exists()) {
                await updateDoc(tagDocRef, {
                    bioCount: increment(-1),
                    bioUsers: arrayRemove(user.uid),
                });
            }
        }
    };

    const handleCopyUID = async () => {
        if (user?.uid) {
            try {
                await Clipboard.setStringAsync(user.uid);
                Alert.alert('✅ ' + t('common.success'), t('profile.uid_copied'));
            } catch (error) {
                console.error('Error copying UID:', error);
            }
        }
    };

    const openWallet = () => {
        router.push({
            pathname: '/(screens)/wallet/CoinWalletScreen',
            params: { from: 'profile' }
        });
    };

    const avatarAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: withSpring(avatarScale.value) }],
    }));

    if (!user) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={{ fontSize: 16, color: '#666' }}>{t('common.loading')}...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
            {/* Cover Section */}
            <View style={styles.coverWrapper}>
                <CustomImage
                    type="cover"
                    source={user?.coverImage}
                    style={styles.coverImage}
                    onLongPress={() => { }}
                />
                <LinearGradient
                    colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)']}
                    style={styles.coverOverlay}
                    pointerEvents="none"
                />

                {/* Header Actions */}
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.actionCircle}
                        onPress={() => router.push('/profile/settings')}
                    >
                        <BlurView intensity={30} style={styles.blurCircle}>
                            <Feather name="settings" size={20} color="#fff" />
                        </BlurView>
                    </TouchableOpacity>
                </View>

                {/* Avatar Section */}
                <Animated.View style={[styles.avatarWrapper, avatarAnimatedStyle]}>
                    <View style={styles.avatarGlow}>
                        <Pressable
                            onPressIn={() => avatarScale.value = 0.95}
                            onPressOut={() => avatarScale.value = 1}
                        >
                            <VibeAvatar
                                avatarUrl={user?.profileUrl}
                                size={100}
                                currentVibe={currentVibe}
                                showAddButton={true}
                                frameType={activeFrame}
                                storyUser={{
                                    id: user?.uid || '',
                                    username: user?.username || user?.displayName,
                                    profileUrl: user?.profileUrl
                                }}
                            />
                        </Pressable>
                    </View>
                </Animated.View>
            </View>

            {/* Profile Details */}
            <View style={styles.detailsContainer}>
                <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.nameSection}>
                    <Text style={[styles.displayName, { color: currentThemeColors.text }]}>
                        {user?.username || user?.displayName || t('chat.unknown_user')}
                    </Text>
                    <TouchableOpacity onPress={handleCopyUID} style={styles.uidContainer}>
                        <Text style={styles.uidText}>ID: {user?.uid?.slice(0, 8)}</Text>
                        <Feather name="copy" size={12} color="#94A3B8" />
                    </TouchableOpacity>
                </Animated.View>

                {/* Bio Section */}
                <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.bioSection}>
                    {isEditingBio ? (
                        <View style={styles.bioEditWrapper}>
                            <TextInput
                                style={[styles.bioInput, {
                                    color: currentThemeColors.text,
                                    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                    borderColor: currentThemeColors.border
                                }]}
                                value={bio}
                                onChangeText={setBio}
                                autoFocus
                                multiline
                                maxLength={160}
                                placeholder={t('profile.bio_placeholder')}
                            />
                            <TouchableOpacity onPress={handleSaveBio} style={styles.bioSaveBtn}>
                                <LinearGradient colors={['#8B5CF6', '#6366F1']} style={styles.bioSaveGradient}>
                                    <Feather name="check" size={18} color="#fff" />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            onPress={handleStartEditingBio}
                            style={styles.bioDisplayWrapper}
                        >
                            <Text style={[styles.bioText, { color: currentThemeColors.subtleText }]}>
                                {bio || t('profile.bio_empty')}
                            </Text>
                            <Feather name="edit-2" size={14} color="#94A3B8" style={styles.bioEditIcon} />
                        </TouchableOpacity>
                    )}
                </Animated.View>

                {/* Stats Row */}
                <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={[styles.statValue, { color: currentThemeColors.text }]}>{postsCount}</Text>
                        <Text style={styles.statLabel}>{t('profile.posts')}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={[styles.statValue, { color: currentThemeColors.text }]}>{followersCount}</Text>
                        <Text style={styles.statLabel}>{t('profile.followers')}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={[styles.statValue, { color: currentThemeColors.text }]}>{followingCount}</Text>
                        <Text style={styles.statLabel}>{t('profile.following')}</Text>
                    </View>
                </Animated.View>

                {/* Interests */}
                {Array.isArray(user.interests) && user.interests.length > 0 && (
                    <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.interestsWrapper}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.interestsScroll}>
                            {user.interests.map((interest: string, index: number) => (
                                <View key={index} style={styles.interestChipWrapper}>
                                    <LinearGradient
                                        colors={['rgba(139, 92, 246, 0.1)', 'rgba(236, 72, 153, 0.1)']}
                                        style={styles.interestChip}
                                    >
                                        <Text style={[styles.interestText, { color: '#8B5CF6' }]}>
                                            {getLabelForInterest(interest)}
                                        </Text>
                                    </LinearGradient>
                                </View>
                            ))}
                        </ScrollView>
                    </Animated.View>
                )}

                {/* Reward Cards */}
                <View style={styles.rewardsGrid}>
                    <Animated.View entering={FadeInRight.delay(500).duration(600)}>
                        <TouchableOpacity
                            style={[styles.rewardCard, { backgroundColor: currentThemeColors.cardBackground }]}
                            onPress={openWallet}
                        >
                            <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.rewardIconBg}>
                                <Feather name="database" size={20} color="#fff" />
                            </LinearGradient>
                            <View style={styles.rewardInfo}>
                                <Text style={[styles.rewardValue, { color: currentThemeColors.text }]}>
                                    {Number(coins || 0).toLocaleString()}
                                </Text>
                                <Text style={styles.rewardLabel}>{t('wallet.title')}</Text>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View entering={FadeInRight.delay(600).duration(600)}>
                        <TouchableOpacity
                            style={[styles.rewardCard, { backgroundColor: currentThemeColors.cardBackground }]}
                            onPress={() => router.push('/gifts/Inbox')}
                        >
                            <LinearGradient colors={['#EC4899', '#DB2777']} style={styles.rewardIconBg}>
                                <Feather name="gift" size={20} color="#fff" />
                            </LinearGradient>
                            <View style={styles.rewardInfo}>
                                <Text style={[styles.rewardValue, { color: currentThemeColors.text }]}>
                                    {giftStats.count}
                                </Text>
                                <Text style={styles.rewardLabel}>{t('profile.gifts')}</Text>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View entering={FadeInRight.delay(700).duration(600)}>
                        <TouchableOpacity
                            style={[styles.rewardCard, { backgroundColor: currentThemeColors.cardBackground }]}
                            onPress={() => {
                                console.log('🛒 Navigating to Store...');
                                router.push('/(screens)/store/StoreScreen');
                            }}
                        >
                            <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.rewardIconBg}>
                                <Feather name="shopping-bag" size={20} color="#fff" />
                            </LinearGradient>
                            <View style={styles.rewardInfo}>
                                <Text style={[styles.rewardValue, { color: currentThemeColors.text }]}>
                                    {t('store.title')}
                                </Text>
                                <Text style={styles.rewardLabel}>{t('store.shop')}</Text>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        height: 300,
        alignItems: 'center',
        justifyContent: 'center',
    },
    coverWrapper: {
        height: 240,
        width: '100%',
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    coverOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 120,
    },
    headerActions: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        right: 20,
        flexDirection: 'row',
        gap: 12,
    },
    actionCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
    },
    blurCircle: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    avatarWrapper: {
        position: 'absolute',
        bottom: -50,
        left: 20,
        zIndex: 10,
        backgroundColor: 'transparent',
    },
    avatarGlow: {
        padding: 4,
        borderRadius: 60,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
        backgroundColor: 'transparent',
    },
    detailsContainer: {
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    nameSection: {
        marginBottom: 12,
    },
    displayName: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    uidContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    uidText: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '500',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    bioSection: {
        marginBottom: 24,
    },
    bioDisplayWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    bioText: {
        fontSize: 15,
        lineHeight: 22,
        flex: 1,
    },
    bioEditIcon: {
        marginTop: 4,
        opacity: 0.6,
    },
    bioEditWrapper: {
        flexDirection: 'row',
        gap: 10,
    },
    bioInput: {
        flex: 1,
        fontSize: 15,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    bioSaveBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
    },
    bioSaveGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(148, 163, 184, 0.05)',
        padding: 16,
        borderRadius: 20,
        marginBottom: 24,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(148, 163, 184, 0.2)',
    },
    interestsWrapper: {
        marginBottom: 24,
    },
    interestsScroll: {
        gap: 10,
    },
    interestChipWrapper: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    interestChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    interestText: {
        fontSize: 13,
        fontWeight: '700',
    },
    rewardsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 30,
    },
    rewardCard: {
        width: (width - 64) / 3,
        padding: 12,
        borderRadius: 20,
        alignItems: 'center',
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    rewardIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rewardInfo: {
        alignItems: 'center',
    },
    rewardValue: {
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 2,
    },
    rewardLabel: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '700',
        textTransform: 'uppercase',
    },
});

export default TopProfile;