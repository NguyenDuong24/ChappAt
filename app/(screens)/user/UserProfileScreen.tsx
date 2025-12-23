import React, { useEffect, useState, useContext, useCallback } from 'react';
import { StyleSheet, View, FlatList, RefreshControl, Text, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collection, getDocs, query, where, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import TopProfileUserProfileScreen from '@/components/profile/TopProfileUserProfileScreen';
import PostCardStandard from '@/components/profile/PostCardStandard';
import { convertTimestampToDate } from '@/utils/common';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { db } from '@/firebaseConfig';
import { useAuth } from '@/context/authContext';
import ButtonToChat from '../../ButtonToChat';
import { useBlockStatus } from '@/hooks/useBlockStatus';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

// Define a Post shape compatible with PostCardStandard props
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

    const themeContext = useContext(ThemeContext);
    const theme = themeContext?.theme || 'light';
    const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

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

    const fetchPosts = useCallback(async () => {
        if (!userId) return;
        try {
            const postsCollection = collection(db, 'posts');
            const userPostsQuery = query(postsCollection, where('userID', '==', userId));
            const postsSnapshot = await getDocs(userPostsQuery);
            const postsList: PostForCard[] = postsSnapshot.docs.map((docSnap) => {
                const data = docSnap.data() as any;
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
                    privacy: data?.privacy ?? 'public',
                    // keep other fields if any
                    ...data,
                };
                return post;
            });

            const sortedPosts = postsList.sort((a, b) => toMillis(b) - toMillis(a));
            setPosts(sortedPosts);
        } catch (error) {
            console.error('Error fetching posts:', error);
        }
    }, [userId]);

    useEffect(() => {
        fetchUserData();
        fetchPosts();
    }, [fetchUserData, fetchPosts]);

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

    const renderPost = ({ item }: { item: PostForCard }) => (
        <PostCardStandard
            post={item}
            currentUserId={authUser?.uid || ''}
            currentUserAvatar={(authUser as any)?.profileUrl || (authUser as any)?.avatar}
            onLike={handleLike}
            onComment={handleComment}
            onShare={handleShare}
            onDelete={() => { fetchPosts(); }}
            onUserPress={(uid: string) => router.push(`/(screens)/user/UserProfileScreen?userId=${uid}` as any)}
            isOwner={false}
        />
    );

    // Show loading while checking block status
    if (blockLoading || loading) {
        return (
            <View style={[styles.container, styles.loadingContainer, { backgroundColor: currentThemeColors.background }]}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={{ color: currentThemeColors.text, marginTop: 12 }}>
                    Đang tải...
                </Text>
            </View>
        );
    }

    // Show blocked message if blocked relationship exists - but still show profile info
    if (hasBlockRelation) {
        return (
            <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
                <FlatList
                    data={[]}
                    renderItem={() => null}
                    keyExtractor={(item, index) => index.toString()}
                    ListHeaderComponent={
                        <>
                            {/* Show profile header */}
                            {profileUser && (
                                <View style={{ marginHorizontal: -16, marginVertical: -20 }}>
                                    <TopProfileUserProfileScreen user={profileUser} />
                                </View>
                            )}

                            {/* Blocked message instead of posts */}
                            <View style={[styles.blockedPostsContainer, {
                                backgroundColor: theme === 'dark' ? '#1E293B' : '#F8FAFC',
                                borderColor: theme === 'dark' ? '#374151' : '#E5E7EB'
                            }]}>
                                <MaterialCommunityIcons
                                    name="block-helper"
                                    size={32}
                                    color="#EF4444"
                                    style={{ marginBottom: 12 }}
                                />
                                <Text style={[styles.blockedPostsTitle, { color: currentThemeColors.text }]}>
                                    {isBlocked ? 'Bạn đã chặn người dùng này' : 'Không có bài viết'}
                                </Text>
                                <Text style={[styles.blockedPostsText, { color: theme === 'dark' ? '#94A3B8' : '#6B7280' }]}>
                                    {isBlocked
                                        ? 'Bạn sẽ không thấy bài viết của họ. Bỏ chặn để xem lại nội dung.'
                                        : 'Bạn không thể xem bài viết của người dùng này.'
                                    }
                                </Text>
                            </View>
                        </>
                    }
                    contentContainerStyle={[styles.flatListContainer, { paddingHorizontal: 16 }]}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    showsVerticalScrollIndicator={false}
                />
                {/* Hide ButtonToChat when blocked */}
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
            <FlatList
                data={posts}
                renderItem={renderPost}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={
                    profileUser && (
                        <View style={{ marginHorizontal: -16, marginVertical: -20 }}>
                            <TopProfileUserProfileScreen user={profileUser} />
                        </View>
                    )
                }
                contentContainerStyle={[styles.flatListContainer, { paddingHorizontal: 16 }]}
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
        padding: 24,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        marginTop: 20,
        marginHorizontal: 16,
    },
    blockedPostsTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 6,
        textAlign: 'center',
    },
    blockedPostsText: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
});

export default UserProfileScreen;
