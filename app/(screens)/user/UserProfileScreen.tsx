import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, RefreshControl, Text, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collection, getDocs, query, where, doc, getDoc, updateDoc, arrayUnion, arrayRemove, limit } from 'firebase/firestore';
import TopProfileUserProfileScreen from '@/components/profile/TopProfileUserProfileScreen';
import PostCard from '@/components/profile/PostCard';
import { convertTimestampToDate } from '@/utils/common';
import { useThemedColors } from '@/hooks/useThemedColors';
import { db } from '@/firebaseConfig';
import { useAuth } from '@/context/authContext';
import ButtonToChat from '../../ButtonToChat';
import { useBlockStatus } from '@/hooks/useBlockStatus';
import { profileVisitService } from '@/services/profileVisitService';
import { followService } from '@/services/followService';
import encounterService, { EncounterSummary } from '@/services/encounterService';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { UserProfileNearbySection } from '@/components/nearby/UserProfileNearbySection';

interface Comment {
    id?: string;
    text: string;
    username: string;
    avatar?: string;
    timestamp: any;
    likes?: string[];
    replies?: any[];
    userId: string;
}

interface PostForCard {
    id: string;
    content: string;
    hashtags?: string[];
    images?: string[];
    address?: string;
    likes: string[];
    comments?: Comment[];
    shares: number;
    timestamp: any;
    userID: string;
    privacy?: 'public' | 'friends' | 'private';
    [key: string]: any;
}

const UserProfileScreen = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const { userId } = useLocalSearchParams();
    const { user: authUser } = useAuth();

    const [profileUser, setProfileUser] = useState<any>(null);
    const [posts, setPosts] = useState<PostForCard[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [encounterSummary, setEncounterSummary] = useState<EncounterSummary | null>(null);

    const colors = useThemedColors();

    // Fallback helper
    const tf = useCallback((key: string, fallback: string) => {
        const translated = t(key);
        return translated !== key ? translated : fallback;
    }, [t]);

    const {
        isBlocked,
        isBlockedBy,
        hasBlockRelation,
        loading: blockLoading
    } = useBlockStatus(authUser?.uid, userId as string);

    const toMillis = (p: Partial<PostForCard>): number => {
        const iso = convertTimestampToDate(p.timestamp ?? (p as any)?.createdAt);
        return iso ? new Date(iso).getTime() : 0;
    };

    const [isFollowing, setIsFollowing] = useState(false);

    const fetchUserData = useCallback(async () => {
        if (!userId) {
            console.error('❌ No userId provided to UserProfileScreen');
            setLoading(false);
            return;
        }
        try {
            const userDoc = await getDoc(doc(db, 'users', userId as string));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                setProfileUser({ id: userDoc.id, ...userData });
            } else {
                console.error('❌ User document not found for userId:', userId);
            }
        } catch (error) {
            console.error('❌ Error fetching user data:', error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const checkFollowingStatus = useCallback(async () => {
        if (!authUser?.uid || !userId || authUser.uid === userId) return;
        try {
            const isFollow = await followService.isFollowing(authUser.uid, userId as string);
            setIsFollowing(isFollow);
        } catch (error) {
            console.error('Error checking follow status:', error);
        }
    }, [authUser?.uid, userId]);

    const fetchEncounterSummary = useCallback(async () => {
        if (!authUser?.uid || !userId || authUser.uid === userId) {
            setEncounterSummary(null);
            return;
        }
        const settings = await encounterService.getNearMatchSettings(authUser.uid);
        if (!settings.showProfileBadge) {
            setEncounterSummary(null);
            return;
        }
        const summary = await encounterService.getEncounterWithUser(authUser.uid, userId as string);
        setEncounterSummary(summary);
    }, [authUser?.uid, userId]);

    const fetchPosts = useCallback(async () => {
        if (!userId) return;
        try {
            const isOwner = authUser?.uid === userId;
            let currentIsFollowing = isFollowing;
            if (!isOwner && authUser?.uid) {
                currentIsFollowing = await followService.isFollowing(authUser.uid, userId as string);
                setIsFollowing(currentIsFollowing);
            }
            const postsCollection = collection(db, 'posts');
            const userPostsQuery = query(postsCollection, where('userID', '==', userId), limit(50));
            const postsSnapshot = await getDocs(userPostsQuery);
            const postsList: PostForCard[] = [];

            postsSnapshot.docs.forEach((docSnap) => {
                const data = docSnap.data() as any;
                const privacy = data?.privacy ?? 'public';
                let isVisible = false;
                if (isOwner) {
                    isVisible = true;
                } else if (privacy === 'public') {
                    isVisible = true;
                } else if (privacy === 'friends' && currentIsFollowing) {
                    isVisible = true;
                }
                if (isVisible) {
                    const post: PostForCard = {
                        id: docSnap.id,
                        content: typeof data?.content === 'string' ? data.content : '',
                        hashtags: Array.isArray(data?.hashtags) ? data.hashtags : [],
                        images: Array.isArray(data?.images) ? data.images : [],
                        address: typeof data?.address === 'string' ? data.address : undefined,
                        likes: Array.isArray(data?.likes) ? data.likes : [],
                        comments: Array.isArray(data?.comments) ? data.comments : [],
                        shares: typeof data?.shares === 'number' ? data.shares : 0,
                        timestamp: data?.timestamp ?? data?.createdAt ?? null,
                        userID: data?.userID ?? data?.userId ?? '',
                        privacy: privacy,
                        ...data,
                    };
                    postsList.push(post);
                }
            });

            const sortedPosts = postsList.sort((a, b) => toMillis(b) - toMillis(a));
            setPosts(sortedPosts);
        } catch (error) {
            console.error('Error fetching posts:', error);
        }
    }, [userId, authUser?.uid, isFollowing]);

    useEffect(() => {
        fetchUserData();
        fetchPosts();
        fetchEncounterSummary();
        if (authUser?.uid && userId && authUser.uid !== userId) {
            profileVisitService.recordVisit(authUser.uid, userId as string);
        }
    }, [fetchUserData, fetchPosts, fetchEncounterSummary, authUser?.uid, userId]);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchUserData(), fetchPosts(), fetchEncounterSummary()]);
        setRefreshing(false);
    };

    const formatEncounterText = (summary: EncounterSummary) => {
        const distance = typeof summary.distance === 'number' ? ` khoảng ${Math.max(1, Math.round(summary.distance))}m` : '';
        const timestamp = summary.timestamp?.toDate?.();
        if (!timestamp) return `Hai bạn từng ở gần nhau${distance}.`;
        const diffDays = Math.floor((Date.now() - timestamp.getTime()) / (24 * 60 * 60 * 1000));
        if (diffDays <= 0) return `Hai bạn từng ở gần nhau hôm nay${distance}.`;
        if (diffDays === 1) return `Hai bạn từng ở gần nhau hôm qua${distance}.`;
        return `Hai bạn từng ở gần nhau ${diffDays} ngày trước${distance}.`;
    };

    const renderEncounterBadge = () => {
        if (!encounterSummary) return null;
        return (
            <View style={[styles.encounterBadge, { backgroundColor: 'rgba(14,165,233,0.1)', borderColor: 'rgba(14,165,233,0.28)' }]}>
                <MaterialCommunityIcons name="map-marker-star-outline" size={22} color="#0EA5E9" />
                <View style={{ flex: 1 }}>
                    <Text style={[styles.encounterBadgeTitle, { color: colors.text }]}>Từng Chạm Sóng</Text>
                    <Text style={[styles.encounterBadgeText, { color: colors.subtleText }]}>{formatEncounterText(encounterSummary)}</Text>
                </View>
            </View>
        );
    };

    const handleLike = async (postId: string, likerUserId: string, isLiked: boolean) => {
        try {
            const postRef = doc(db, 'posts', postId);
            if (isLiked) {
                await updateDoc(postRef, { likes: arrayRemove(likerUserId) });
            } else {
                await updateDoc(postRef, { likes: arrayUnion(likerUserId) });
            }
            fetchPosts();
        } catch (error) {
            console.error('Error updating like status:', error);
        }
    };

    const handleComment = async (postId: string, comment: string) => {
        try {
            const postRef = doc(db, 'posts', postId);
            const newComment = {
                id: `${Date.now()}`,
                text: comment,
                username: authUser?.displayName || (authUser as any)?.username || tf('chat.unknown_user', 'Người dùng'),
                userAvatar: (authUser as any)?.profileUrl || (authUser as any)?.avatar || '',
                userId: authUser?.uid || '',
                timestamp: new Date(),
                likes: [],
            };
            await updateDoc(postRef, { comments: arrayUnion(newComment) });
            fetchPosts();
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    };

    const handleShare = async (postId: string) => {
        console.log('Share post:', postId);
    };

    const handlePrivacyChange = useCallback((postId: string, newPrivacy: 'public' | 'friends' | 'private') => {
        setPosts(currentPosts => currentPosts.map(p =>
            p.id === postId ? { ...p, privacy: newPrivacy } : p
        ));
    }, []);

    const renderPost = ({ item }: { item: PostForCard }) => (
        <PostCard
            post={item}
            onLike={handleLike}
            onDeletePost={() => { fetchPosts(); }}
            owner={authUser?.uid === item.userID}
            onPrivacyChange={handlePrivacyChange}
            hideFollowButton={true}
        />
    );

    // Show loading while checking block status
    if (blockLoading || loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={{ width: '100%', height: 180, backgroundColor: colors.border, opacity: 0.3 }} />
                <View style={{ paddingHorizontal: 16, marginTop: -50 }}>
                    <View style={{ width: 108, height: 108, borderRadius: 54, backgroundColor: colors.border, opacity: 0.3, marginBottom: 16 }} />
                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                        <View style={{ width: 140, height: 24, borderRadius: 12, backgroundColor: colors.border, opacity: 0.3, marginBottom: 8 }} />
                        <View style={{ width: 80, height: 16, borderRadius: 8, backgroundColor: colors.border, opacity: 0.2, marginBottom: 16 }} />
                        <View style={{ width: 180, height: 14, borderRadius: 7, backgroundColor: colors.border, opacity: 0.2, marginBottom: 16 }} />
                    </View>
                    <View style={{
                        flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 18,
                        borderRadius: 18, backgroundColor: colors.border, opacity: 0.15, marginBottom: 20
                    }}>
                        {[1, 2, 3].map((i) => (
                            <View key={i} style={{ alignItems: 'center' }}>
                                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.border, opacity: 0.3, marginBottom: 6 }} />
                                <View style={{ width: 40, height: 16, borderRadius: 8, backgroundColor: colors.border, opacity: 0.2 }} />
                            </View>
                        ))}
                    </View>
                    {[1, 2].map((i) => (
                        <View key={i} style={{
                            backgroundColor: colors.surface || colors.background, borderRadius: 16, padding: 16,
                            marginBottom: 16, borderWidth: 1, borderColor: colors.border, opacity: 0.5
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.border, marginRight: 12 }} />
                                <View style={{ flex: 1 }}>
                                    <View style={{ width: 100, height: 14, borderRadius: 7, backgroundColor: colors.border, marginBottom: 6 }} />
                                    <View style={{ width: 60, height: 12, borderRadius: 6, backgroundColor: colors.border }} />
                                </View>
                            </View>
                            <View style={{ width: '80%', height: 12, borderRadius: 6, backgroundColor: colors.border, marginBottom: 8 }} />
                            <View style={{ width: '60%', height: 12, borderRadius: 6, backgroundColor: colors.border }} />
                        </View>
                    ))}
                </View>
            </View>
        );
    }

    // Blocked state
    if (hasBlockRelation) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <FlatList
                    data={[]}
                    renderItem={() => null}
                    keyExtractor={(item, index) => index.toString()}
                    ListHeaderComponent={
                        <>
                            {profileUser && (
                                <View style={{ marginTop: -20, marginBottom: 12 }}>
                                    <TopProfileUserProfileScreen user={profileUser} />
                                    {renderEncounterBadge()}
                                    <UserProfileNearbySection
                                        currentUserId={authUser?.uid ?? ''}
                                        profileUserId={userId as string}
                                    />
                                </View>
                            )}
                            <View style={[styles.blockedPostsContainer, {
                                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                borderColor: 'rgba(239, 68, 68, 0.2)'
                            }]}>
                                <View style={{
                                    width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                    alignItems: 'center', justifyContent: 'center', marginBottom: 16
                                }}>
                                    <MaterialCommunityIcons name="block-helper" size={32} color="#EF4444" />
                                </View>
                                <Text style={[styles.blockedPostsTitle, { color: colors.text }]}>
                                    {isBlocked
                                        ? tf('user_profile.blocked_title', 'Bạn đã chặn người dùng này')
                                        : tf('user_profile.no_posts_title', 'Không có bài viết')}
                                </Text>
                                <Text style={[styles.blockedPostsText, { color: colors.subtleText }]}>
                                    {isBlocked
                                        ? tf('user_profile.blocked_subtitle', 'Bỏ chặn để xem nội dung')
                                        : tf('user_profile.no_posts_subtitle', 'Người dùng này chưa đăng bài viết')}
                                </Text>
                            </View>
                        </>
                    }
                    contentContainerStyle={[styles.flatListContainer]}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <FlatList
                data={posts}
                renderItem={renderPost}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={
                    profileUser && (
                        <View style={{ marginTop: -20, marginBottom: 12 }}>
                            <TopProfileUserProfileScreen user={profileUser} />
                            {renderEncounterBadge()}
                            <UserProfileNearbySection
                                currentUserId={authUser?.uid ?? ''}
                                profileUserId={userId as string}
                            />
                        </View>
                    )
                }
                contentContainerStyle={[styles.flatListContainer]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            />
            {userId ? <ButtonToChat id={userId as string} /> : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    flatListContainer: { paddingTop: 20, paddingBottom: 20 },
    loadingContainer: { justifyContent: 'center', alignItems: 'center' },
    encounterBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 12,
        padding: 14, borderRadius: 16, borderWidth: 1,
    },
    encounterBadgeTitle: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
    encounterBadgeText: { fontSize: 12, lineHeight: 17 },
    blockedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    blockedCard: { padding: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', maxWidth: 400, width: '100%' },
    blockedTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
    blockedText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
    blockedPostsContainer: {
        padding: 32, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', marginTop: 24, marginHorizontal: 16,
    },
    blockedPostsTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8, textAlign: 'center', letterSpacing: -0.3 },
    blockedPostsText: { fontSize: 14, textAlign: 'center', lineHeight: 20, opacity: 0.8 },
});

export default UserProfileScreen;