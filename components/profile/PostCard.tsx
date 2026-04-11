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
import { LinearGradient } from 'expo-linear-gradient';
import { Menu, Provider, Button } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import EvilIcons from '@expo/vector-icons/EvilIcons';
import { Ionicons, Feather } from '@expo/vector-icons';
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
import { useTranslation } from 'react-i18next';

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
const containerMargin = 12;
const innerWidth = screenWidth - (containerMargin * 2) - (containerPadding * 2);
const imageGap = 6;

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
            <View style={[styles.imageContainer, styles.multiImageContainer]} renderToHardwareTextureAndroid={true}>
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
        <View style={[styles.imageContainer, styles.multiImageContainer]} renderToHardwareTextureAndroid={true}>
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
}, (prev, next) => (prev.images || []).join(',') === (next.images || []).join(','));

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
                    transition={100}
                    cachePolicy="memory-disk"
                />
            ) : (
                <View style={[styles.commentAvatar, { backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="person" size={16} color={colors.primary} />
                </View>
            )}
            <View style={[styles.commentContent, { backgroundColor: colors.surface || 'rgba(0,0,0,0.03)' }]}>
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
}) => {
    const likeScale = useRef(new Animated.Value(1)).current;

    const handleLikePress = () => {
        Animated.sequence([
            Animated.spring(likeScale, { toValue: 1.3, useNativeDriver: true, friction: 3 }),
            Animated.spring(likeScale, { toValue: 1, useNativeDriver: true, friction: 3 }),
        ]).start();
        onLike();
    };

    return (
        <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLikePress} activeOpacity={0.7}>
                <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                    <Ionicons
                        name={isLiked ? 'heart' : 'heart-outline'}
                        size={22}
                        color={isLiked ? '#EC4899' : colors.icon}
                    />
                </Animated.View>
                <Text style={[styles.actionCount, { color: isLiked ? '#EC4899' : colors.text }]}>
                    {likesCount > 0 ? likesCount : ''}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={onCommentToggle} activeOpacity={0.7}>
                <Ionicons name="chatbubble-outline" size={21} color={showComments ? colors.primary : colors.icon} />
                <Text style={[styles.actionCount, { color: showComments ? colors.primary : colors.text }]}>
                    {commentsCount > 0 ? commentsCount : ''}
                </Text>
            </TouchableOpacity>

        </View>
    );
});

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
    const { t } = useTranslation();
    const { user: authUser, activeFrame: authActiveFrame, currentVibe: authCurrentVibe } = useAuth();
    const colors = useThemedColors();
    const { getUserInfo, userCache } = useUserContext();
    const followingIdsCtx = useFollowingIds() as any;
    const followingIds = followingIdsCtx?.followingIds || [];
    const actions = useExploreActions() as any;
    const toggleFollow = actions?.toggleFollow;

    const router = useRouter();
    const currentUserId = authUser?.uid;

    // ÃƒÂ¢Ã…Â¡Ã‚Â¡ÃƒÂ¯Ã‚Â¸Ã‚Â Stable userInfo - only re-compute when specific user ID changes, not entire userCache map
    const cachedUserInfo = userCache.get(post.userID) || null;
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
        return cachedUserInfo;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [postUserInfo, cachedUserInfo, post.userID, authUser?.uid, authUser?.username, authUser?.profileUrl, authActiveFrame, authCurrentVibe]);
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

    const handleCommentSubmit = useCallback(async () => {
        if (!commentText.trim() || !currentUserId) return;
        const trimmedText = commentText.trim();
        const newComment: Comment = {
            id: Date.now().toString(),
            userId: currentUserId,
            username: authUser?.username || t('common.you'),
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
    }, [commentText, currentUserId, authUser?.username, authUser?.profileUrl, post.id, post.userID, t]);

    useEffect(() => {
        if (!userInfo && post.userID && !postUserInfo) {
            getUserInfo(post.userID);
        }
    }, [post.userID, userInfo, getUserInfo, postUserInfo]);

    const handleDeletePost = useCallback(() => {
        Alert.alert(t('social.delete_post_title'), t('social.delete_post_message'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('common.delete'), onPress: async () => {
                    try {
                        await deleteDoc(doc(db, 'posts', post.id));
                        if (post.hashtags) await removeHashtagStats(post.hashtags, post.id, post.userID);
                        onDeletePost();
                    } catch (error) { }
                }
            }
        ]);
    }, [post.id, post.hashtags, post.userID, onDeletePost, t]);
    const handleHashtagPress = useCallback((hashtag: string) => {
        router.push(`/(screens)/social/HashtagScreen?hashtag=${hashtag.replace('#', '')}` as any);
    }, [router]);

    const handleUserPress = useCallback(() => {
        router.push(`/(screens)/user/UserProfileScreen?userId=${post.userID}`);
    }, [router, post.userID]);

    const handlePrivacySelectorToggle = useCallback(() => setShowPrivacySelector(true), []);
    const handlePrivacySelectorClose = useCallback(() => setShowPrivacySelector(false), []);
    const handleCommentToggle = useCallback(() => setShowComments(prev => !prev), []);


    return (
        <View
            style={[styles.container, { backgroundColor: colors.cardBackground || colors.background }]}
        >
            <PostHeader
                userInfo={userInfo}
                timestamp={post.timestamp}
                userId={post.userID}
                isOwner={owner}
                postPrivacy={post.privacy || 'public'}
                onUserPress={handleUserPress}
                onDeletePost={handleDeletePost}
                onPrivacyChange={handlePrivacySelectorToggle}
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
                <HashtagDisplay
                    hashtags={post.hashtags}
                    maxDisplay={5}
                    size="small"
                    onHashtagPress={handleHashtagPress}
                    style={styles.hashtagsContainer}
                />
            )}

            {post.images && post.images.length > 0 && <PostImages images={post.images as string[]} />}

            {post.address && (
                <View style={styles.addressContainer}>
                    <View style={[styles.locationIconCircle, { backgroundColor: colors.primary + '15' }]}>
                        <EvilIcons name="location" size={16} color={colors.primary} />
                    </View>
                    <Text style={[styles.addressText, { color: colors.subtleText }]}>{post.address}</Text>
                </View>
            )}



            <PostActions
                isLiked={post.likes.includes(currentUserId || '')}
                likesCount={post.likes.length}
                commentsCount={localComments.length}
                onLike={handleLikeWithNotification}
                onCommentToggle={handleCommentToggle}
                showComments={showComments}
                colors={colors}
            />

            {showComments && (
                <View style={[styles.commentsSection]}>
                    <View style={[styles.commentInputContainer, {
                        backgroundColor: colors.surface || 'rgba(0,0,0,0.03)',
                        borderColor: colors.border
                    }]}>
                        <Image
                            source={{ uri: authUser?.profileUrl || 'https://via.placeholder.com/150' }}
                            style={styles.commentAvatar}
                            contentFit="cover"
                            transition={100}
                            cachePolicy="memory-disk"
                        />
                        <TextInput
                            style={[styles.commentInput, { color: colors.text }]}
                            placeholder={t('social.write_comment')}
                            placeholderTextColor={colors.subtleText}
                            value={commentText}
                            onChangeText={setCommentText}
                            multiline
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, !commentText.trim() && { opacity: 0.5 }]}
                            onPress={handleCommentSubmit}
                            disabled={!commentText.trim()}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#667eea', '#764ba2']}
                                style={styles.sendGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name="send" size={16} color="white" />
                            </LinearGradient>
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
    container: {
        padding: containerPadding,
        marginBottom: 12,
        borderRadius: 18,
        marginHorizontal: containerMargin,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    contentText: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 12,
        letterSpacing: 0.2
    },
    hashtagStyle: {
        color: '#6366F1',
        fontWeight: '600'
    },
    hashtagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 12
    },
    imageContainer: {
        marginBottom: 12,
    },
    multiImageContainer: {
        flexDirection: 'row',
        height: 260
    },
    singleImage: {
        width: '100%',
        height: 320,
        borderRadius: 12
    },
    twoImages: {
        flex: 1,
        height: '100%',
        marginHorizontal: 3
    },
    threeImageLarge: {
        flex: 2,
        height: '100%',
        marginRight: 6
    },
    threeImageSmallContainer: {
        flex: 1,
        justifyContent: 'space-between'
    },
    threeImageSmall: {
        width: '100%',
        height: '48.5%'
    },
    fourImagesGrid: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6
    },
    fourImageWrapper: {
        width: (innerWidth - 6) / 2,
        height: (innerWidth - 6) / 2
    },
    fourImage: {
        width: '100%',
        height: '100%',
        borderRadius: 8
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8
    },
    overlayText: {
        color: 'white',
        fontSize: 24,
        fontWeight: '700'
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: 'rgba(0,0,0,0.02)',
        borderRadius: 12
    },
    locationIconCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8
    },
    addressText: {
        fontSize: 13,
        fontWeight: '500',
        flex: 1
    },
    dividerLine: {
        height: 1,
        marginVertical: 12,
        backgroundColor: '#f1f5f9', // Solid light color instead of opacity
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12, // Increased for impact
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 24,
        paddingVertical: 4
    },
    actionCount: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '600'
    },
    commentsSection: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)'
    },
    commentInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 24,
        marginBottom: 12,
        borderWidth: 1
    },
    commentAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 10
    },
    commentInput: {
        flex: 1,
        fontSize: 14,
        paddingVertical: 6,
        maxHeight: 100,
        lineHeight: 20
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        overflow: 'hidden',
        marginLeft: 8
    },
    sendGradient: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center'
    },
    comment: {
        flexDirection: 'row',
        marginBottom: 12
    },
    commentContent: {
        flex: 1,
        padding: 12,
        borderRadius: 16
    },
    commentUser: {
        fontWeight: '700',
        fontSize: 13,
        marginBottom: 4
    },
    commentText: {
        fontSize: 14,
        lineHeight: 20
    },
    commentMeta: {
        marginTop: 6
    },
    commentTime: {
        fontSize: 11,
        opacity: 0.7
    },
    commentsList: {
        marginTop: 4
    },
});

export default memo(PostCard, (prev, next) => {
    // ÃƒÂ¢Ã…Â¡Ã‚Â¡ÃƒÂ¯Ã‚Â¸Ã‚Â Stricter comparison - use likesCount from server if available, otherwise array length
    // Avoids re-render when the same data comes back from Firestore with new array references
    const prevLikes = prev.post.likesCount ?? prev.post.likes.length;
    const nextLikes = next.post.likesCount ?? next.post.likes.length;
    const prevComments = prev.post.commentsCount ?? (prev.post.comments || []).length;
    const nextComments = next.post.commentsCount ?? (next.post.comments || []).length;

    return (
        prev.post.id === next.post.id &&
        prevLikes === nextLikes &&
        prevComments === nextComments &&
        prev.post.privacy === next.post.privacy &&
        prev.isFollowing === next.isFollowing &&
        prev.owner === next.owner &&
        prev.post.content === next.post.content &&
        (prev.post.images || []).length === (next.post.images || []).length
    );
});
