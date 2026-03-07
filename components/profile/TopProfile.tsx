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
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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
import { profileVisitService, ProfileVisit } from '@/services/profileVisitService';
import { Image } from 'expo-image';
import { useIsPremium } from '@/hooks/useIsPremium';

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
    const { isPremium } = useIsPremium();
    const [bio, setBio] = useState('');
    const router = useRouter();
    const themeContext = useContext(ThemeContext);
    const theme = themeContext?.theme || 'light';
    const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [postsCount, setPostsCount] = useState(0);
    const [giftStats, setGiftStats] = useState<{ count: number; value: number }>({ count: 0, value: 0 });
    const [visitors, setVisitors] = useState<ProfileVisit[]>([]);
    const [totalVisitors, setTotalVisitors] = useState(0);

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
                    where('userID', '==', user.uid)
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

    useEffect(() => {
        if (!user?.uid) return;
        const fetchVisitors = async () => {
            try {
                const data = await profileVisitService.getVisitors(user.uid, 4);
                setVisitors(data);
                // We'll use the data length as a proxy for now, but in a real app 
                // we might want a separate count query if needed.
                setTotalVisitors(data.length);
            } catch (error) {
                console.error('Error fetching visitors for preview:', error);
            }
        };
        fetchVisitors();
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
            <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
                <View style={[styles.coverWrapper, { backgroundColor: theme === 'dark' ? '#1E1E1E' : '#E2E8F0' }]}>
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={StyleSheet.absoluteFill} />
                </View>
                <View style={styles.skeletonContentCard}>
                    <View style={styles.headerRow}>
                        <View style={[styles.skeletonAvatar, { backgroundColor: theme === 'dark' ? '#2A2A2A' : '#CBD5E1', borderColor: currentThemeColors.background }]} />
                        <View style={styles.nameSection}>
                            <View style={[styles.skeletonLine, { width: 140, height: 28, marginBottom: 8, backgroundColor: theme === 'dark' ? '#2A2A2A' : '#CBD5E1' }]} />
                            <View style={[styles.skeletonLine, { width: 100, height: 16, backgroundColor: theme === 'dark' ? '#2A2A2A' : '#CBD5E1' }]} />
                        </View>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <Animated.View
            entering={FadeInDown.duration(800)}
            style={[styles.container, { backgroundColor: currentThemeColors.background }]}
        >
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                {/* Cover Section */}
                <View style={styles.coverWrapper}>
                    <CustomImage
                        type="cover"
                        source={user?.coverImage}
                        style={styles.coverImage}
                        onLongPress={() => { }}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.6)']}
                        style={styles.coverOverlay}
                        pointerEvents="none"
                    />

                    {/* Header Actions */}
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.actionCircle}
                            onPress={() => router.push('/profile/settings')}
                            activeOpacity={0.8}
                        >
                            <BlurView intensity={40} tint="dark" style={styles.blurCircle}>
                                <Feather name="settings" size={20} color="#fff" />
                            </BlurView>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Profile Content - Full Width No Card */}
                <View style={[styles.contentContainer, { backgroundColor: currentThemeColors.background }]}>
                    {/* Header Section: Avatar on left, Name on right */}
                    <View style={styles.headerRow}>
                        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.avatarContainer}>
                            <VibeAvatar
                                avatarUrl={user?.profileUrl}
                                size={100}
                                currentVibe={currentVibe}
                                showAddButton={true}
                                addButtonIcon="camera"
                                onAddPress={() => router.push('/signup/IconSelectionScreen?redirectTo=profile&isEditing=true')}
                                frameType={activeFrame}
                                storyUser={{
                                    id: user?.uid || '',
                                    username: user?.username || user?.displayName,
                                    profileUrl: user?.profileUrl
                                }}
                            />
                        </Animated.View>

                        <Animated.View entering={FadeInRight.delay(200).duration(600)} style={styles.nameSection}>
                            <View style={styles.nameContainer}>
                                <Text style={[styles.displayName, { color: currentThemeColors.text }]}>
                                    {user?.username || user?.displayName || t('chat.unknown_user')}
                                </Text>
                                {isPremium && (
                                    <View style={styles.vipBadge}>
                                        <MaterialCommunityIcons name="crown" size={12} color="#F59E0B" />
                                        <Text style={styles.vipBadgeText}>VIP</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.statsRowMinimal}>
                                <TouchableOpacity style={styles.statItemMinimal}>
                                    <Text style={[styles.statValueMinimal, { color: currentThemeColors.text }]}>
                                        {followersCount >= 1000 ? (followersCount / 1000).toFixed(1).replace('.', ',') + 'K' : followersCount}
                                    </Text>
                                    <Text style={[styles.statLabelMinimal, { color: currentThemeColors.subtleText }]}>
                                        {t('profile.followers') || 'Followers'}
                                    </Text>
                                </TouchableOpacity>

                                <View style={styles.statDividerMinimal} />

                                <TouchableOpacity style={styles.statItemMinimal}>
                                    <Text style={[styles.statValueMinimal, { color: currentThemeColors.text }]}>
                                        {postsCount >= 1000 ? (postsCount / 1000).toFixed(1).replace('.', ',') + 'K' : postsCount}
                                    </Text>
                                    <Text style={[styles.statLabelMinimal, { color: currentThemeColors.subtleText }]}>
                                        {t('profile.posts') || 'Posts'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity onPress={handleCopyUID} style={styles.uidBadge} activeOpacity={0.7}>
                                <Text style={styles.uidBadgeText}>ID: {user?.uid?.slice(0, 8)}</Text>
                                <Feather name="copy" size={10} color="#94A3B8" />
                            </TouchableOpacity>
                        </Animated.View>
                    </View>

                    {/* Bio Section */}
                    <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.bioSectionMinimal}>
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
                                <TouchableOpacity onPress={handleSaveBio} style={styles.bioSaveBtn} activeOpacity={0.8}>
                                    <LinearGradient colors={['#8B5CF6', '#6366F1']} style={styles.bioSaveGradient}>
                                        <Feather name="check" size={18} color="#fff" />
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                onPress={handleStartEditingBio}
                                style={styles.bioDisplayWrapper}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.bioText, { color: currentThemeColors.subtleText }]}>
                                    {bio || t('profile.bio_empty')}
                                </Text>
                                <Feather name="edit-2" size={12} color="#94A3B8" style={styles.bioEditIconInline} />
                            </TouchableOpacity>
                        )}
                    </Animated.View>

                    {/* Visitors Preview Widget */}
                    {visitors.length > 0 && (
                        <Animated.View entering={FadeInDown.delay(350).duration(800)}>
                            <TouchableOpacity
                                style={[
                                    styles.visitorsWidget,
                                    {
                                        backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.4)' : 'rgba(255, 255, 255, 0.9)',
                                        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(99, 102, 241, 0.05)',
                                    }
                                ]}
                                onPress={() => router.push('/(screens)/profile/ProfileVisitorsScreen')}
                                activeOpacity={0.8}
                            >
                                <View style={styles.visitorsLeftSection}>
                                    <View style={styles.avatarStack}>
                                        {visitors.slice(0, 3).map((visitor, index) => (
                                            <View
                                                key={visitor.id}
                                                style={[
                                                    styles.visitorAvatarWrapperSmall,
                                                    {
                                                        zIndex: 10 - index,
                                                        marginLeft: index === 0 ? 0 : -16,
                                                        borderColor: currentThemeColors.background,
                                                        borderWidth: 2,
                                                    }
                                                ]}
                                            >
                                                <Image
                                                    source={{ uri: visitor.visitorData?.profileUrl || 'https://via.placeholder.com/150' }}
                                                    style={styles.visitorAvatarSmall}
                                                    cachePolicy="memory-disk"
                                                />
                                            </View>
                                        ))}
                                        {visitors.length > 3 && (
                                            <View style={[
                                                styles.visitorAvatarWrapperSmall,
                                                styles.moreVisitorsPill,
                                                {
                                                    marginLeft: -16,
                                                    zIndex: 0,
                                                    borderColor: currentThemeColors.background,
                                                    borderWidth: 2,
                                                }
                                            ]}>
                                                <Text style={styles.moreVisitorsTextSmall}>+{totalVisitors - 3 > 0 ? totalVisitors - 3 : visitors.length - 3}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.visitorsInfoTextStack}>
                                        <Text style={[styles.visitorsInsightText, { color: currentThemeColors.text }]}>
                                            <Text style={{ fontWeight: '800', color: currentThemeColors.tint }}>{totalVisitors || visitors.length}</Text> {t('profile.profile_insight')}
                                        </Text>
                                        <Text style={styles.visitorsSubText}>{t('profile.see_whos_interested')}</Text>
                                    </View>
                                </View>
                                <View style={[styles.arrowCircle, { backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(99, 102, 241, 0.08)' }]}>
                                    <Feather name="arrow-right" size={14} color={currentThemeColors.tint} />
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {/* Quick Actions */}
                    <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.actionButtonsRow}>
                        <TouchableOpacity
                            style={styles.addVibeButton}
                            onPress={() => {
                                setIsEditingBio(false);
                                router.push('/(screens)/user/VibeScreen');
                            }}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={['#3B82F6', '#2563EB']}
                                style={styles.actionGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Feather name="zap" size={18} color="#fff" />
                                <Text style={styles.actionButtonText}>{t('profile.add_vibe')}</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.editProfileButton, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
                            onPress={onEditProfile}
                            activeOpacity={0.7}
                        >
                            <Feather name="edit-3" size={16} color={currentThemeColors.text} />
                            <Text style={[styles.editProfileText, { color: currentThemeColors.text }]}>{t('profile.edit_profile')}</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Personal Info Section */}
                    <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.personalInfoSection}>
                        <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>{t('profile.info')}</Text>

                        {user.city && (
                            <View style={styles.infoItem}>
                                <View style={[styles.infoIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                                    <Feather name="map-pin" size={14} color="#3B82F6" />
                                </View>
                                <Text style={[styles.infoText, { color: currentThemeColors.text }]}>
                                    {t('profile.lives_in', { city: user.city })}
                                </Text>
                            </View>
                        )}

                        {user.job && (
                            <View style={styles.infoItem}>
                                <View style={[styles.infoIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                                    <Feather name="briefcase" size={14} color="#10B981" />
                                </View>
                                <Text style={[styles.infoText, { color: currentThemeColors.text }]}>
                                    {t('profile.works_at', { job: user.job })}
                                </Text>
                            </View>
                        )}

                        {(user.university || user.educationLevel) && (
                            <View style={styles.infoItem}>
                                <View style={[styles.infoIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                                    <Feather name="book-open" size={14} color="#F59E0B" />
                                </View>
                                <Text style={[styles.infoText, { color: currentThemeColors.text }]}>
                                    {t('profile.studies_at', { school: user.university || user.educationLevel })}
                                </Text>
                            </View>
                        )}

                        {user.birthday && (
                            <View style={styles.infoItem}>
                                <View style={[styles.infoIconBox, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}>
                                    <Feather name="calendar" size={14} color="#EC4899" />
                                </View>
                                <Text style={[styles.infoText, { color: currentThemeColors.text }]}>
                                    {t('profile.born_on', { date: user.birthday })}
                                </Text>
                            </View>
                        )}
                    </Animated.View>

                    {/* Interests */}
                    {Array.isArray(user.interests) && user.interests.length > 0 && (
                        <Animated.View entering={FadeInDown.delay(600).duration(600)} style={styles.interestsWrapper}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.interestsScroll}>
                                {user.interests.map((interest: string, index: number) => (
                                    <View key={index} style={styles.interestChipWrapper}>
                                        <LinearGradient
                                            colors={theme === 'dark' ? ['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.05)'] : ['rgba(139, 92, 246, 0.1)', 'rgba(139, 92, 246, 0.05)']}
                                            style={[styles.interestChip, { borderColor: 'rgba(139, 92, 246, 0.2)', borderWidth: 1 }]}
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

                    {/* Reward Cards - Styled as Widgets */}
                    <View style={styles.rewardsGrid}>
                        <Animated.View entering={FadeInDown.delay(700).duration(600)} style={{ flex: 1 }}>
                            <TouchableOpacity
                                style={[styles.rewardCard, { backgroundColor: theme === 'dark' ? '#1F2937' : '#F8FAFC', paddingVertical: 18 }]}
                                onPress={openWallet}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.rewardIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                                    <Feather name="database" size={20} color="#F59E0B" />
                                </View>
                                <View style={styles.rewardInfo}>
                                    <Text style={[styles.rewardValue, { color: currentThemeColors.text }]}>
                                        {Number(coins || 0).toLocaleString()}
                                    </Text>
                                    <Text style={styles.rewardLabel}>Wallet</Text>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(800).duration(600)} style={{ flex: 1 }}>
                            <TouchableOpacity
                                style={[styles.rewardCard, { backgroundColor: theme === 'dark' ? '#1F2937' : '#F8FAFC', paddingVertical: 18 }]}
                                onPress={() => router.push('/gifts/Inbox')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.rewardIconCircle, { backgroundColor: 'rgba(233, 30, 99, 0.1)' }]}>
                                    <Feather name="gift" size={20} color="#E91E63" />
                                </View>
                                <View style={styles.rewardInfo}>
                                    <Text style={[styles.rewardValue, { color: currentThemeColors.text }]}>
                                        {giftStats.count}
                                    </Text>
                                    <Text style={styles.rewardLabel}>Gifts</Text>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(900).duration(600)} style={{ flex: 1 }}>
                            <TouchableOpacity
                                style={[styles.rewardCard, { backgroundColor: theme === 'dark' ? '#1F2937' : '#F8FAFC', paddingVertical: 18 }]}
                                onPress={() => {
                                    router.push('/(screens)/store/StoreScreen');
                                }}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.rewardIconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                                    <Feather name="shopping-bag" size={20} color="#8B5CF6" />
                                </View>
                                <View style={styles.rewardInfo}>
                                    <Text style={[styles.rewardValue, { color: currentThemeColors.text }]}>
                                        Store
                                    </Text>
                                    <Text style={styles.rewardLabel}>Shop</Text>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                </View>
            </ScrollView>
        </Animated.View >
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    skeletonContentCard: {
        marginTop: -30,
        backgroundColor: 'transparent',
        paddingHorizontal: 20,
    },
    skeletonAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginTop: -40,
    },
    skeletonLine: {
        borderRadius: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        zIndex: 100,
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
    contentContainer: {
        marginTop: 10,
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    avatarContainer: {
        marginTop: -50,
        marginRight: 16,
    },
    nameSection: {
        flex: 1,
        paddingTop: 8,
    },
    displayName: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    vipBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF9C4',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        gap: 4,
    },
    vipBadgeText: {
        color: '#F59E0B',
        fontSize: 11,
        fontWeight: 'bold',
    },
    statsRowMinimal: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    statItemMinimal: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    statValueMinimal: {
        fontSize: 14,
        fontWeight: '700',
        marginRight: 4,
    },
    statLabelMinimal: {
        fontSize: 14,
        fontWeight: '400',
    },
    statDividerMinimal: {
        width: 1,
        height: 12,
        backgroundColor: '#CBD5E1',
        marginHorizontal: 10,
    },
    uidBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(148, 163, 184, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    uidBadgeText: {
        fontSize: 11,
        color: '#94A3B8',
        fontFamily: 'monospace',
        marginRight: 4,
    },
    // Removed headerVerticalStack (using headerRow instead)
    bioSectionMinimal: {
        marginBottom: 20,
    },
    bioDisplayWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    bioEditIconInline: {
        marginLeft: 8,
        marginTop: 4,
        opacity: 0.5,
    },
    actionButtonsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    addVibeButton: {
        flex: 0.9,
        borderRadius: 14,
        overflow: 'hidden',
    },
    actionGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 8,
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 13,
    },
    editProfileButton: {
        flex: 1.1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.1)',
    },
    editProfileText: {
        fontWeight: '600',
        fontSize: 13,
    },
    personalInfoSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    infoText: {
        fontSize: 15,
        flex: 1,
        fontWeight: '400',
    },
    // Removed redundant bioSection styles
    // bioDisplayWrapper already defined above
    bioText: {
        fontSize: 15,
        lineHeight: 22,
    },
    bioEditIcon: {
        marginTop: 4,
        opacity: 0.6,
    },
    bioEditWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bioInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    bioSaveBtn: {
        marginLeft: 10,
    },
    bioSaveGradient: {
        width: 40,
        height: 40,
        borderRadius: 20,
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
        flex: 1,
        paddingVertical: 15,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rewardIconSimple: {
        marginBottom: 8,
    },
    rewardIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    infoIconBox: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rewardInfo: {
        alignItems: 'center',
    },
    rewardValue: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    rewardLabel: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500',
    },
    visitorsWidget: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderRadius: 24,
        marginBottom: 24,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 4,
    },
    visitorsLeftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatarStack: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    visitorAvatarWrapperSmall: {
        width: 34,
        height: 34,
        borderRadius: 17,
        overflow: 'hidden',
        backgroundColor: '#F1F5F9',
    },
    visitorAvatarSmall: {
        width: '100%',
        height: '100%',
    },
    moreVisitorsPill: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#6366F1',
    },
    moreVisitorsTextSmall: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
    },
    visitorsInfoTextStack: {
        gap: 2,
    },
    visitorsInsightText: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    visitorsSubText: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500',
    },
    arrowCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default TopProfile;