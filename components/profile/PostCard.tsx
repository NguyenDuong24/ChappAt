import React, { useState, useEffect, useContext, useRef, memo, useCallback, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Alert,
    Dimensions,
    TextInput,
    Animated,
    Platform
} from 'react-native';
import { Image } from 'expo-image';
import { Menu, Provider, Button } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import EvilIcons from '@expo/vector-icons/EvilIcons';
import { Ionicons } from '@expo/vector-icons';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { formatTime } from '@/utils/common';
import { useThemedColors } from '@/hooks/useThemedColors';
import { useUserContext } from '@/context/UserContext';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import socialNotificationService from '@/services/socialNotificationService';
import CustomImage from '../common/CustomImage';
const CustomImageAny = CustomImage as any;

import HashtagText from '../common/HashtagText';
import HashtagDisplay from '../common/HashtagDisplay';
import PrivacySelector from '../common/PrivacySelector';
import PostHeader from '../common/PostHeader';
import { removeHashtagStats } from '@/utils/hashtagUtils';
import { updatePostPrivacy, PrivacyLevel } from '@/utils/postPrivacyUtils';
import contentModerationService from '@/services/contentModerationService';
import optimizedSocialService from '@/services/optimizedSocialService';
import { followService } from '@/services/followService';
import { useFollowingIds, useExploreActions } from '@/context/ExploreContext';

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

interface Post {
    id: string;
    content: string;
    hashtags?: string[];
    images?: string[];
    address?: string;
    likes: string[];
    comments?: Comment[];
    timestamp: any;
    userID: string;
    privacy?: 'public' | 'friends' | 'private';
    likesCount?: number;
    commentsCount?: number;
}

interface UserInfo {
    username: string;
    profileUrl?: string;
    activeFrame?: string;
}

interface PostCardProps {
    post: Post;
    user?: { uid: string; username?: string; profileUrl?: string };
    onLike: (postId: string, userId: string, isLiked: boolean) => void;
    onDeletePost: () => void;
    onPrivacyChange?: (postId: string, newPrivacy: PrivacyLevel) => void;
    owner: boolean;
    postUserInfo?: UserInfo;
    isFollowing?: boolean;
    onToggleFollow?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');
const containerPadding = 12;
const containerMargin = 10;
const innerWidth = screenWidth - (containerMargin * 2) - (containerPadding * 2);
const imageGap = 4;

const PostImages = memo(({ images }: { images: string[] }) => {
    if (!images || images.length === 0) return null;

    if (images.length === 1) {
        return (
            <View style={styles.imageContainer}>
                <CustomImageAny
                    source={images[0]}
                    images={images}
                    initialIndex={0}
                    style={styles.singleImage}
                    onLongPress={() => { }}
                />
            </View>
        );
    }

    if (images.length === 2) {
        return (
            <View style={[styles.imageContainer, styles.multiImageContainer]}>
                {images.map((img, idx) => (
                    <CustomImageAny
                        key={idx}
                        source={img}
                        images={images}
                        initialIndex={idx}
                        style={styles.twoImages}
                        onLongPress={() => { }}
                    />
                ))}
            </View>
        );
    }

    if (images.length === 3) {
        return (
            <View style={[styles.imageContainer, styles.multiImageContainer]}>
                <CustomImageAny
                    source={images[0]}
                    images={images}
                    initialIndex={0}
                    style={styles.threeImageLarge}
                    onLongPress={() => { }}
                />
                <View style={styles.threeImageSmallContainer}>
                    {images.slice(1).map((img, idx) => (
                        <CustomImageAny
                            key={idx}
                            source={img}
                            images={images}
                            initialIndex={idx + 1}
                            style={styles.threeImageSmall}
                            onLongPress={() => { }}
                        />
                    ))}
                </View>
            </View>
        );
    }

    const displayImages = images.slice(0, 4);
    return (
        <View style={[styles.imageContainer, styles.multiImageContainer]}>
            <View style={styles.fourImagesGrid}>
                {displayImages.map((img, idx) => (
                    <View key={idx} style={styles.fourImageWrapper}>
                        <CustomImageAny
                            source={img}
                            images={images}
                            initialIndex={idx}
                            style={styles.fourImage}
                            onLongPress={() => { }}
                        />
                        {idx === 3 && images.length > 4 && (
                            <View style={styles.overlay}>
                                <Text style={styles.overlayText}>+{images.length - 4}</Text>
                            </View>
                        )}
                    </View>
                ))}
            </View>
        </View>
    );
});

const CommentItem = memo(({ comment, level = 0, colors }: { comment: Comment; level?: number; colors: any }) => {
    const [avatarError, setAvatarError] = useState(false);
    const avatarUri = !avatarError ? (comment.avatar || comment.userId) : undefined;

    return (
        <View style={[styles.comment, { marginLeft: level * 16 }]}>
            {avatarUri && typeof avatarUri === 'string' && avatarUri.startsWith('http') ? (
                <Image
                    source={{ uri: avatarUri }}
                    style={styles.commentAvatar}
                    onError={() => setAvatarError(true)}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                />
            ) : (
                <View style={[styles.commentAvatar, { backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="person" size={14} color={colors.primary} />
                </View>
            )}
            <View style={[styles.commentContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.commentUser, { color: colors.text }]}>
                    {comment.username}
                </Text>
                <Text style={[styles.commentText, { color: colors.text }]}>
                    {comment.text}
                </Text>
                <View style={styles.commentMeta}>
                    <Text style={[styles.commentTime, { color: colors.subtleText }]}>
                        {formatTime(comment.timestamp)}
                    </Text>
                </View>
            </View>
        </View>
    );
});

const PostActions = memo(({
    isLiked,
    likesCount,
    commentsCount,
    onLike,
    onCommentToggle,
    showComments,
    colors
}: {
    isLiked: boolean;
    likesCount: number;
    commentsCount: number;
    onLike: () => void;
    onCommentToggle: () => void;
    showComments: boolean;
    colors: any;
}) => (
    <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={onLike}>
            <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={24}
                color={isLiked ? colors.primary : colors.icon}
            />
            <Text style={[styles.actionCount, { color: colors.text }]}>
                {likesCount}
            </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onCommentToggle}>
            <Ionicons name="chatbubble-outline" size={24} color={showComments ? colors.primary : colors.icon} />
            <Text style={[styles.actionCount, { color: colors.text }]}>
                {commentsCount}
            </Text>
        </TouchableOpacity>
    </View>
));

const PostCard: React.FC<PostCardProps> = ({
    post,
    onLike,
    onDeletePost,
    onPrivacyChange,
    owner,
    postUserInfo,
    isFollowing: propIsFollowing,
    onToggleFollow
}) => {
    const { user: authUser, activeFrame: authActiveFrame, currentVibe: authCurrentVibe } = useAuth();
    const colors = useThemedColors();
    const { getUserInfo, userCache } = useUserContext();
    const { followingIds } = (useFollowingIds() as any) || { followingIds: [] };
    const actions = useExploreActions() as any;
    const toggleFollow = actions?.toggleFollow;

    const router = useRouter();
    const currentUserId = authUser?.uid;

    const [showCommentInput, setShowCommentInput] = useState(false);
    const userInfo = useMemo(() => {
        if (postUserInfo) return postUserInfo;
        if (post.userID === authUser?.uid) {
            return {
                uid: authUser.uid,
                username: authUser.username,
                profileUrl: authUser.profileUrl,
                activeFrame: authActiveFrame,
                currentVibe: authCurrentVibe,
            };
        }
        return userCache.get(post.userID) || null;
    }, [postUserInfo, userCache, post.userID, authUser, authActiveFrame, authCurrentVibe]);
    const [showPrivacySelector, setShowPrivacySelector] = useState(false);
    const [internalIsFollowing, setInternalIsFollowing] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [showComments, setShowComments] = useState(false);
    const ignoreNextCommentsSync = useRef(false);

    const isFollowing = useMemo(() =>
        propIsFollowing !== undefined ? propIsFollowing : (followingIds.includes(post.userID) || internalIsFollowing),
        [propIsFollowing, followingIds, post.userID, internalIsFollowing]
    );

    const normalizeComments = useCallback((comments: Comment[] = []): Comment[] => {
        return (comments || []).map((c, idx) => {
            let baseTs = c.timestamp;
            if (c?.timestamp?.seconds) baseTs = c.timestamp.seconds * 1000;
            else if (c?.timestamp?._seconds) baseTs = c.timestamp._seconds * 1000;
            else if (c?.timestamp?.toDate) baseTs = c.timestamp.toDate().getTime();

            return {
                ...c,
                id: c.id || `${c.userId}_${idx}`,
                timestamp: baseTs,
            };
        });
    }, []);

    const [localComments, setLocalComments] = useState<Comment[]>([]);

    useEffect(() => {
        if (ignoreNextCommentsSync.current) {
            ignoreNextCommentsSync.current = false;
            return;
        }
        const sorted = normalizeComments(post.comments || []).sort((a: any, b: any) => b.timestamp - a.timestamp);
        setLocalComments(sorted);
    }, [post.comments, normalizeComments]);

    const handleFollow = useCallback(async () => {
        if (!currentUserId || !post.userID || isFollowing) return;
        try {
            if (onToggleFollow) {
                onToggleFollow();
            } else if (toggleFollow) {
                await (toggleFollow as any)(currentUserId, post.userID, isFollowing);
                setInternalIsFollowing(!isFollowing);
            }
        } catch (error) { }
    }, [currentUserId, post.userID, isFollowing, toggleFollow, onToggleFollow]);

    const handleLikeWithNotification = useCallback(async () => {
        if (!currentUserId) return;
        const isLiked = post.likes.includes(currentUserId);
        onLike(post.id, currentUserId, isLiked);

        if (post.userID !== currentUserId) {
            if (!isLiked) {
                await socialNotificationService.createLikeNotification(post.id, post.userID, currentUserId);
            } else {
                await socialNotificationService.removeLikeNotification(post.id, post.userID, currentUserId);
            }
        }
    }, [currentUserId, post.id, post.userID, post.likes, onLike]);

    const handleCommentSubmit = async () => {
        if (!commentText.trim() || !currentUserId) return;
        const trimmedText = commentText.trim();
        const newComment: Comment = {
            id: Date.now().toString(),
            userId: currentUserId,
            username: authUser?.username || 'You',
            avatar: authUser?.profileUrl,
            text: trimmedText,
            timestamp: Date.now(),
        };

        ignoreNextCommentsSync.current = true;
        setLocalComments(prev => [newComment, ...prev]);
        setCommentText('');

        try {
            await optimizedSocialService.addComment(post.id, newComment);
            if (post.userID !== currentUserId) {
                await socialNotificationService.createCommentNotification(post.id, post.userID, currentUserId, undefined, trimmedText);
            }
        } catch (e) { }
    };

    useEffect(() => {
        if (!userInfo && post.userID && !postUserInfo) {
            getUserInfo(post.userID);
        }
    }, [post.userID, userInfo, getUserInfo, postUserInfo]);

    const handleDeletePost = () => {
        Alert.alert('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa bài viết này?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Đồng ý', onPress: async () => {
                    try {
                        await deleteDoc(doc(db, 'posts', post.id));
                        if (post.hashtags) await removeHashtagStats(post.hashtags, post.id, post.userID);
                        onDeletePost();
                    } catch (error) { }
                }
            }
        ]);
    };

    const handleHashtagPress = useCallback((hashtag: string) => {
        router.push(`/(screens)/social/HashtagScreen?hashtag=${hashtag.replace('#', '')}` as any);
    }, [router]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <PostHeader
                userInfo={userInfo}
                timestamp={post.timestamp}
                userId={post.userID}
                isOwner={owner}
                postPrivacy={post.privacy || 'public'}
                onUserPress={() => router.push(`/(screens)/user/UserProfileScreen?userId=${post.userID}`)}
                onDeletePost={handleDeletePost}
                onPrivacyChange={() => setShowPrivacySelector(true)}
                isFollowing={isFollowing}
                onFollowPress={handleFollow}
            />

            {post.content && (
                <HashtagText
                    text={post.content}
                    onHashtagPress={handleHashtagPress}
                    textStyle={[styles.contentText, { color: colors.text }]}
                    hashtagStyle={styles.hashtagStyle}
                />
            )}

            {post.hashtags && post.hashtags.length > 0 && (
                <View style={styles.hashtagsContainer}>
                    <HashtagDisplay hashtags={post.hashtags} maxDisplay={5} size="small" onHashtagPress={handleHashtagPress} />
                </View>
            )}

            {post.images && post.images.length > 0 && <PostImages images={post.images as string[]} />}

            {post.address && (
                <View style={styles.addressContainer}>
                    <EvilIcons name="location" size={20} color={colors.icon} />
                    <Text style={[styles.addressText, { color: colors.icon }]}>{post.address}</Text>
                </View>
            )}

            <PostActions
                isLiked={post.likes.includes(currentUserId || '')}
                likesCount={post.likes.length}
                commentsCount={localComments.length}
                onLike={handleLikeWithNotification}
                onCommentToggle={() => setShowComments(!showComments)}
                showComments={showComments}
                colors={colors}
            />

            {showComments && (
                <View style={[styles.commentsSection, { borderTopColor: colors.border }]}>
                    <View style={[styles.commentInputContainer, { backgroundColor: colors.surface }]}>
                        <Image
                            source={{ uri: authUser?.profileUrl || 'https://via.placeholder.com/150' }}
                            style={styles.commentAvatar}
                            contentFit="cover"
                            transition={200}
                            cachePolicy="memory-disk"
                        />
                        <TextInput
                            style={[styles.commentInput, { color: colors.text }]}
                            placeholder="Viết bình luận..."
                            placeholderTextColor={colors.subtleText}
                            value={commentText}
                            onChangeText={setCommentText}
                            multiline
                        />
                        <TouchableOpacity style={[styles.sendButton, !commentText.trim() && { opacity: 0.5 }]} onPress={handleCommentSubmit} disabled={!commentText.trim()}>
                            <Ionicons name="send" size={16} color="white" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.commentsList}>
                        {localComments.slice(0, 5).map((c, i) => <CommentItem key={c.id || i} comment={c} colors={colors} />)}
                    </View>
                </View>
            )}

            {showPrivacySelector && (
                <PrivacySelector
                    visible={showPrivacySelector}
                    currentPrivacy={post.privacy || 'public'}
                    onSelect={async (p) => {
                        if (await updatePostPrivacy(post.id, p)) onPrivacyChange?.(post.id, p);
                        setShowPrivacySelector(false);
                    }}
                    onClose={() => setShowPrivacySelector(false)}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { padding: containerPadding, marginBottom: 10, borderRadius: 12, marginHorizontal: containerMargin, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    contentText: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
    hashtagStyle: { color: '#6366F1', fontWeight: '600' },
    hashtagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
    imageContainer: { marginBottom: 8, borderRadius: 12, overflow: 'hidden' },
    multiImageContainer: { flexDirection: 'row', height: 240 },
    singleImage: { width: '100%', height: 300, borderRadius: 12 },
    twoImages: { flex: 1, height: '100%', marginHorizontal: 2 },
    threeImageLarge: { flex: 2, height: '100%', marginRight: 4 },
    threeImageSmallContainer: { flex: 1, justifyContent: 'space-between' },
    threeImageSmall: { width: '100%', height: '48%' },
    fourImagesGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
    fourImageWrapper: { width: '49%', height: '49%', margin: '0.5%' },
    fourImage: { width: '100%', height: '100%' },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    overlayText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    addressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    addressText: { fontSize: 13, marginLeft: 4 },
    actionsContainer: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#eee', paddingTop: 8 },
    actionButton: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
    actionCount: { marginLeft: 6, fontSize: 14, fontWeight: '500' },
    commentsSection: { marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
    commentInputContainer: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 20, marginBottom: 8 },
    commentAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
    commentInput: { flex: 1, fontSize: 14, paddingVertical: 4, maxHeight: 80 },
    sendButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
    comment: { flexDirection: 'row', marginBottom: 8 },
    commentContent: { flex: 1, padding: 8, borderRadius: 12 },
    commentUser: { fontWeight: '600', fontSize: 13, marginBottom: 2 },
    commentText: { fontSize: 14 },
    commentMeta: { marginTop: 4 },
    commentTime: { fontSize: 11 },
    commentsList: { marginTop: 8 },
});

export default memo(PostCard, (prev, next) => (
    prev.post.id === next.post.id &&
    prev.post.likes.length === next.post.likes.length &&
    prev.post.comments?.length === next.post.comments?.length &&
    prev.isFollowing === next.isFollowing &&
    prev.post.privacy === next.post.privacy
));