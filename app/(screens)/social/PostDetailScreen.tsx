import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ScrollView,
  Image,
  Pressable,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  collection, doc, updateDoc, arrayUnion, arrayRemove,
  onSnapshot, orderBy, query, limit, getDocs, startAfter,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useAuth } from '@/context/authContext';
import { useThemedColors } from '@/hooks/useThemedColors';
import PostCard from '@/components/profile/PostCard';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { formatTime } from '@/utils/common';
import socialNotificationService from '@/services/socialNotificationService';
import optimizedSocialService from '@/services/optimizedSocialService';
import { POST_COST_LIMITS } from '@/config/costControls';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

// Kích hoạt LayoutAnimation cho Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const AVATAR_BG = ['#6366F1','#EC4899','#F97316','#10B981','#3B82F6','#8B5CF6','#F59E0B','#06B6D4'];

function avatarBg(name: string): string {
  return AVATAR_BG[(name?.charCodeAt(0) ?? 0) % AVATAR_BG.length];
}

function getInitials(name: string): string {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || '?';
}

// ─── Avatar Hiện Đại ─────────────────────────────────────────────────────────
const ModernAvatar = ({ uri, name, size = 40 }) => {
  const [imgErr, setImgErr] = useState(false);
  const bg = avatarBg(name || '');

  if (uri && !imgErr) {
    return (
      <Image
        source={{ uri }}
        style={[styles.avatarImage, { width: size, height: size, borderRadius: size / 2 }]}
        onError={() => setImgErr(true)}
      />
    );
  }

  return (
    <LinearGradient
      colors={[bg, bg + 'dd']}
      style={[styles.avatarGradient, { width: size, height: size, borderRadius: size / 2 }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Text style={[styles.avatarInitials, { fontSize: size * 0.35 }]}>
        {getInitials(name || '?')}
      </Text>
    </LinearGradient>
  );
};

// ─── Comment Item (Canh chuẩn Pixel-Perfect) ─────────────────────────────────
type CommentItemProps = {
  comment: any;
  isLast: boolean;
  colors: ReturnType<typeof useThemedColors>;
  isDark: boolean;
  onProfile: (userId: string) => void;
};

const CommentItem = React.memo(({ comment, isLast, colors, isDark, onProfile }: CommentItemProps) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.commentRow,
        pressed && { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' },
      ]}
      onPress={() => onProfile(comment.userId)}
    >
      <View style={styles.commentAvatarWrapper}>
        <ModernAvatar uri={comment.avatar} name={comment.username} size={36} />
      </View>
      <View style={[styles.commentContent, !isLast && styles.commentBorder]}>
        <View style={styles.commentHeader}>
          <Text style={[styles.commentAuthor, { color: colors.text }]} numberOfLines={1}>
            {comment.username || 'Unknown'}
          </Text>
          <Text style={[styles.commentTime, { color: colors.subtleText }]}>
            · {formatTime(comment.timestamp)}
          </Text>
        </View>
        <Text style={[styles.commentText, { color: isDark ? '#E2E8F0' : '#334155' }]}>
          {comment.text}
        </Text>
      </View>
    </Pressable>
  );
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
const PostDetailScreen = () => {
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const postId = Array.isArray(params.postId) ? params.postId[0] : params.postId;
  const { user } = useAuth();
  const router = useRouter();
  const colors = useThemedColors();
  const insets = useSafeAreaInsets();
  const { isDark } = colors;

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [lastCommentDoc, setLastCommentDoc] = useState(null);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showComments, setShowComments] = useState(true);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!postId) return;
    const unsub = onSnapshot(doc(db, 'posts', postId), snap => {
      if (snap.exists()) setPost({ id: snap.id, ...snap.data() });
      else { Alert.alert(t('common.error'), t('post.notFound')); router.back(); }
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [postId]);

  useEffect(() => {
    if (!postId) return;
    const q = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('timestamp', 'desc'),
      limit(POST_COST_LIMITS.commentPageSize),
    );
    const unsub = onSnapshot(q, snap => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLastCommentDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMoreComments(snap.docs.length === POST_COST_LIMITS.commentPageSize);
    });
    return unsub;
  }, [postId]);

  const toggleComments = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowComments(prev => !prev);
  }, []);

  const loadMoreComments = useCallback(async () => {
    if (!postId || !lastCommentDoc || loadingMoreComments || !hasMoreComments) return;
    setLoadingMoreComments(true);
    try {
      const moreQuery = query(
        collection(db, 'posts', postId, 'comments'),
        orderBy('timestamp', 'desc'),
        startAfter(lastCommentDoc),
        limit(POST_COST_LIMITS.commentPageSize),
      );
      const snap = await getDocs(moreQuery);
      const moreComments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setComments(prev => [...prev, ...moreComments]);
      setLastCommentDoc(snap.docs[snap.docs.length - 1] || lastCommentDoc);
      setHasMoreComments(snap.docs.length === POST_COST_LIMITS.commentPageSize);
    } finally {
      setLoadingMoreComments(false);
    }
  }, [postId, lastCommentDoc, loadingMoreComments, hasMoreComments]);

  const handleDeletePost = useCallback(() => {
    if (!post) return;
    Alert.alert(t('common.confirm'), t('post_detail.delete_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await optimizedSocialService.deletePost((post as any).id);
            router.back();
          } catch (error) {
            console.error('Error deleting post:', error);
            Alert.alert(t('common.error'), t('post_detail.delete_error'));
          }
        },
      },
    ]);
  }, [post, router, t]);

  const handleLike = useCallback(async (tId, uid, liked) => {
    if (!user) return;
    const ref = doc(db, 'posts', tId);
    if (liked) {
      await updateDoc(ref, { likes: arrayRemove(uid) });
      await socialNotificationService.removeLikeNotification(tId, post.userID, uid);
    } else {
      await updateDoc(ref, { likes: arrayUnion(uid) });
      if (post.userID !== uid)
        await socialNotificationService.createLikeNotification(tId, post.userID, uid);
    }
  }, [user, post]);

  const handleSubmit = useCallback(async () => {
    if (!commentText.trim() || !user || submitting || !post) return;
    setSubmitting(true);
    const text = commentText.trim().slice(0, POST_COST_LIMITS.maxCommentLength);
    try {
      await optimizedSocialService.addComment(post.id, {
        id: Date.now().toString(),
        userId: user.uid,
        username: user.username || 'Unknown',
        avatar: user.profileUrl || '',
        text,
        timestamp: Date.now(),
      });
      if (post.userID !== user.uid) {
        await socialNotificationService.createCommentNotification(post.id, post.userID, user.uid, undefined, text);
      }
      setCommentText('');
      // Tự động mở comments nếu đang đóng
      if (!showComments) toggleComments();
    } catch {
      Alert.alert(t('common.error'), t('post.commentFailed'));
    } finally {
      setSubmitting(false);
    }
  }, [commentText, user, submitting, post, showComments]);

  const visibleComments = comments.length > 0 ? comments : (Array.isArray(post?.comments) ? post.comments : []);
  const commentsCount = post?.commentsCount ?? Math.max(visibleComments.length, Array.isArray(post?.comments) ? post.comments.length : 0);
  const canSend = commentText.trim().length > 0 && !submitting;

  const pageBg = isDark ? '#0B0D12' : '#F8FAFC';
  const cardBg = isDark ? '#11141C' : '#FFFFFF';
  const navBg = isDark ? 'rgba(11,13,18,0.85)' : 'rgba(255,255,255,0.9)';
  const divider = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)';

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: pageBg }]}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (!post) return null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: pageBg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ─── Header ─── */}
        <View style={[styles.navContainer, { backgroundColor: navBg, borderBottomColor: divider, paddingTop: insets.top + 8 }]}>  
          <TouchableOpacity onPress={() => router.back()} style={styles.navButton} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.navTitleContainer}>
            <Text style={[styles.navTitle, { color: colors.text }]}>{t('post_detail.title', 'Post')}</Text>
          </View>
          <View style={styles.navButton} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* ─── Post Card ─── */}
          <View style={[styles.postCardWrapper, { backgroundColor: cardBg }]}>
            <PostCard post={post} onLike={handleLike} onDeletePost={handleDeletePost} owner={post?.userID === user?.uid} isDetailScreen onExternalCommentToggle={toggleComments} />
          </View>

          {/* ─── Comments Section ─── */}
          <View style={[styles.commentsSection, { backgroundColor: cardBg }]}>
            {/* Danh sách bình luận */}

            {showComments && (
              <View style={styles.commentsListWrapper}>
                {visibleComments.length > 0 ? (
                  <>
                    {visibleComments.map((c, i) => (
                      <CommentItem
                        key={c.id || i}
                        comment={c}
                        isLast={i === visibleComments.length - 1}
                        colors={colors}
                        isDark={isDark}
                        onProfile={(uid) => router.push(`/(screens)/user/UserProfileScreen?userId=${uid}`)}
                      />
                    ))}
                    {hasMoreComments && (
                      <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMoreComments} disabled={loadingMoreComments}>
                        {loadingMoreComments ? (
                          <ActivityIndicator size="small" color="#6366F1" />
                        ) : (
                          <Text style={[styles.loadMoreText, { color: colors.primary }]}>{t('common.load_more', 'Load more comments')}</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No comments yet</Text>
                    <Text style={[styles.emptySub, { color: colors.subtleText }]}>Be the first to share your thoughts!</Text>
                  </View>
                )}
              </View>
            )}

          </View>
        </ScrollView>

        {/* ─── Input Bar ─── */}
        <View style={[styles.inputContainer, { backgroundColor: navBg, borderTopColor: divider, paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <View style={styles.inputRow}>
            <View style={styles.inputAvatarWrapper}>
              <ModernAvatar uri={user?.profileUrl} name={user?.username} size={36} />
            </View>
            <View style={[styles.textInputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
              <TextInput
                ref={inputRef}
                style={[styles.textInput, { color: colors.text }]}
                placeholder="Write a comment..."
                placeholderTextColor={colors.subtleText}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={POST_COST_LIMITS.maxCommentLength}
              />
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={handleSubmit}
                disabled={!canSend}
                activeOpacity={0.7}
              >
                {submitting ? (
                  <ActivityIndicator color="#6366F1" size="small" />
                ) : (
                  <Ionicons 
                    name="arrow-up-circle" 
                    size={30} 
                    color={canSend ? '#6366F1' : (isDark ? '#475569' : '#CBD5E1')} 
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
};

// ─── StyleSheet ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  navContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  navButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  // Scroll
  scrollContent: {
    paddingBottom: 24,
  },
  postCardWrapper: {
    marginBottom: 8,
  },

  // Comments Section
  commentsSection: {
    minHeight: 100,
  },
  commentsToggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  toggleIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentsListWrapper: {
    overflow: 'hidden',
  },
  loadMoreBtn: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Comment Item
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Căn chỉnh bắt đầu từ mép trên
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  commentAvatarWrapper: {
    marginTop: 2, // Đẩy avatar xuống một chút để tâm của nó khớp với cap-height của text
  },
  commentContent: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 12, // Tạo không gian dưới chữ trước khi vẽ viền gạch
  },
  commentBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.15)',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'baseline', // Căn các đoạn text trên cùng 1 dòng kẻ ngang
    marginBottom: 4,
  },
  commentAuthor: {
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 18,
    flexShrink: 1, // Tránh tên quá dài làm mất layout
  },
  commentTime: {
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 6,
    fontWeight: '500',
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptySub: {
    fontSize: 14,
  },

  // Input Container
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end', // Để Avatar và Khung nhập liệu luôn bám sát đáy khi khung cao lên
    gap: 12,
  },
  inputAvatarWrapper: {
    marginBottom: 2, // Căn đáy cho thẳng hàng với text input
  },
  textInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end', // Nút gửi cũng bám sát đáy
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    maxHeight: 120, // Giới hạn chiều cao khi gõ nhiều
    lineHeight: 20,
    paddingTop: Platform.OS === 'ios' ? 4 : 8,
    paddingBottom: Platform.OS === 'ios' ? 4 : 8,
  },
  sendBtn: {
    marginLeft: 8,
    marginBottom: Platform.OS === 'ios' ? 0 : 4,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Avatar
  avatarImage: { resizeMode: 'cover' },
  avatarGradient: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  avatarInitials: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default PostDetailScreen;


