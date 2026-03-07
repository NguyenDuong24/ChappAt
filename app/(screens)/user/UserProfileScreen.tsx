import React, { useEffect, useState, useContext, useCallback } from 'react';
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
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

// Define a Post shape compatible with PostCard props
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
    // Allow unknown extra fields from Firestore
    [key: string]: any;
}

const UserProfileScreen = () => {
    const router = useRouter();
    const { userId } = useLocalSearchParams();
    const { user: authUser } = useAuth();

    const [profileUser, setProfileUser] = useState<any>(null);
    const [posts, setPosts] = useState<PostForCard[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const colors = useThemedColors();

    // Check block status
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

    const fetchPosts = useCallback(async () => {
        if (!userId) return;
        try {
            // Determine relationship for privacy
            const isOwner = authUser?.uid === userId;
            // We need current isFollowing status. 
            // Since setState is async, we might want to check it here again or rely on state if it's loaded.
            // For safety, let's assume if we are not owner, we check following status if not already known?
            // Actually, let's just fetch it here to be sure if we want strict logic, 
            // or rely on the effect chain. 
            // Let's rely on the fact that we can filter *after* fetching.

            // Re-check following status if not owner to be sure (optional but safer)
            let currentIsFollowing = isFollowing;
            if (!isOwner && authUser?.uid) {
                currentIsFollowing = await followService.isFollowing(authUser.uid, userId as string);
                setIsFollowing(currentIsFollowing);
            }

            const postsCollection = collection(db, 'posts');
            // Fetch more to account for filtering
            const userPostsQuery = query(postsCollection, where('userID', '==', userId), limit(50));
            const postsSnapshot = await getDocs(userPostsQuery);

            const postsList: PostForCard[] = [];

            postsSnapshot.docs.forEach((docSnap) => {
                const data = docSnap.data() as any;
                const privacy = data?.privacy ?? 'public';

                // Privacy Filter Logic
                let isVisible = false;
                if (isOwner) {
                    isVisible = true;
                } else if (privacy === 'public') {
                    isVisible = true;
                } else if (privacy === 'friends' && currentIsFollowing) {
                    isVisible = true;
                }
                // 'private' is only visible to owner (handled above)

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

        // Record profile visit
        if (authUser?.uid && userId && authUser.uid !== userId) {
            profileVisitService.recordVisit(authUser.uid, userId as string);
        }
    }, [fetchUserData, fetchPosts, authUser?.uid, userId]);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchUserData(), fetchPosts()]);
        setRefreshing(false);
    };

    const handleLike = async (postId: string, likerUserId: string, isLiked: boolean) => {
        try {
            const postRef = doc(db, 'posts', postId);
            if (isLiked) {
                await updateDoc(postRef, {
                    likes: arrayRemove(likerUserId),
                });
            } else {
                await updateDoc(postRef, {
                    likes: arrayUnion(likerUserId),
                });
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
                username: authUser?.displayName || (authUser as any)?.username || 'Unknown User',
                userAvatar: (authUser as any)?.profileUrl || (authUser as any)?.avatar || '',
                userId: authUser?.uid || '',
                timestamp: new Date(),
                likes: [],
            };
            await updateDoc(postRef, {
                comments: arrayUnion(newComment),
            });
            fetchPosts();
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    };

    const handleShare = async (postId: string) => {
        // Implement your share logic if needed
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
        />
    );

    // Show loading while checking block status
    if (blockLoading || loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Cover Skeleton */}
                <View style={{ width: '100%', height: 180, backgroundColor: colors.border, opacity: 0.3 }} />

                {/* Avatar & Info Skeleton */}
                <View style={{ paddingHorizontal: 20, marginTop: -50 }}>
                    <View style={{ width: 108, height: 108, borderRadius: 54, backgroundColor: colors.border, opacity: 0.3, marginBottom: 16 }} />

                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                        <View style={{ width: 140, height: 24, borderRadius: 12, backgroundColor: colors.border, opacity: 0.3, marginBottom: 8 }} />
                        <View style={{ width: 80, height: 16, borderRadius: 8, backgroundColor: colors.border, opacity: 0.2, marginBottom: 16 }} />
                        <View style={{ width: 180, height: 14, borderRadius: 7, backgroundColor: colors.border, opacity: 0.2, marginBottom: 16 }} />
                    </View>

                    {/* Stats Skeleton */}
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-around',
                        paddingVertical: 18,
                        borderRadius: 18,
                        backgroundColor: colors.border,
                        opacity: 0.15,
                        marginBottom: 20
                    }}>
                        {[1, 2, 3].map((i) => (
                            <View key={i} style={{ alignItems: 'center' }}>
                                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.border, opacity: 0.3, marginBottom: 6 }} />
                                <View style={{ width: 40, height: 16, borderRadius: 8, backgroundColor: colors.border, opacity: 0.2 }} />
                            </View>
                        ))}
                    </View>

                    {/* Posts Skeleton */}
                    {[1, 2].map((i) => (
                        <View key={i} style={{
                            backgroundColor: colors.surface || colors.background,
                            borderRadius: 16,
                            padding: 16,
                            marginBottom: 16,
                            borderWidth: 1,
                            borderColor: colors.border,
                            opacity: 0.5
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

    // Show blocked message if blocked relationship exists - but still show profile info
    if (hasBlockRelation) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <FlatList
                    data={[]}
                    renderItem={() => null}
                    keyExtractor={(item, index) => index.toString()}
                    ListHeaderComponent={
                        <>
                            {/* Show profile header */}
                            {profileUser && (
                                <View style={{ marginTop: -20, marginBottom: 12 }}>
                                    <TopProfileUserProfileScreen user={profileUser} />
                                </View>
                            )}

                            {/* Blocked message instead of posts */}
                            <View style={[styles.blockedPostsContainer, {
                                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                borderColor: 'rgba(239, 68, 68, 0.2)'
                            }]}>
                                <View style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: 32,
                                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 16
                                }}>
                                    <MaterialCommunityIcons
                                        name="block-helper"
                                        size={32}
                                        color="#EF4444"
                                    />
                                </View>
                                <Text style={[styles.blockedPostsTitle, { color: colors.text }]}>
                                    {isBlocked ? 'Bạn đã chặn người dùng này' : 'Không có bài viết'}
                                </Text>
                                <Text style={[styles.blockedPostsText, { color: colors.subtleText }]}>
                                    {isBlocked
                                        ? 'Bạn sẽ không thấy bài viết của họ. Bỏ chặn để xem lại nội dung.'
                                        : 'Bạn không thể xem bài viết của người dùng này.'
                                    }
                                </Text>
                            </View>
                        </>
                    }
                    contentContainerStyle={[styles.flatListContainer]}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    showsVerticalScrollIndicator={false}
                />
                {/* Hide ButtonToChat when blocked */}
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
    container: {
        flex: 1,
    },
    flatListContainer: {
        paddingTop: 20,
        paddingBottom: 20,
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    blockedContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    blockedCard: {
        padding: 32,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        maxWidth: 400,
        width: '100%',
    },
    blockedTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    blockedText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    blockedPostsContainer: {
        padding: 32,
        borderRadius: 20,
        borderWidth: 1.5,
        alignItems: 'center',
        marginTop: 24,
        marginHorizontal: 16,
    },
    blockedPostsTitle: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    blockedPostsText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        opacity: 0.8,
    },
});

export default UserProfileScreen;
