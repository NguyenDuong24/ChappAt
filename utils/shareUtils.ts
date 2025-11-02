import { Share, Platform, ActionSheetIOS } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

export interface ShareablePost {
  id: string;
  content?: string;
  images?: string[];
  userID?: string;
  timestamp?: any;
  privacy?: 'public' | 'friends' | 'private';
}

export const buildPostDeepLink = (postId: string) => {
  return `myapp://post/${postId}`;
};

export const incrementShareCount = async (postId: string) => {
  try {
    const ref = doc(db, 'posts', postId);
    await updateDoc(ref, { shares: increment(1), updatedAt: new Date() });
    return true;
  } catch (e) {
    console.error('Failed to increment share count:', e);
    return false;
  }
};

export const copyPostLink = async (postId: string) => {
  const link = buildPostDeepLink(postId);
  await Clipboard.setStringAsync(link);
  return link;
};

// Native share sheet (kept for external sharing if needed)
export const sharePost = async (post: ShareablePost) => {
  try {
    const link = buildPostDeepLink(post.id);
    const snippet = (post.content || '').trim();
    const message = snippet
      ? `${snippet}\n\nXem chi tiết: ${link}`
      : `Xem bài viết: ${link}`;

    const result = await Share.share(
      Platform.select({
        ios: { url: link, message: snippet },
        default: { message },
      }) as any
    );

    if ((result as any).action === (Share as any).sharedAction) {
      await incrementShareCount(post.id);
      return true;
    }
    return false;
  } catch (e) {
    console.error('Error sharing post:', e);
    return false;
  }
};

// Helper to remove undefined fields recursively (avoids Firestore undefined errors)
const pruneUndefined = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((v: any) => (v && typeof v === 'object' ? pruneUndefined(v) : v)) as any;
  }
  if (value && typeof value === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(value as any)) {
      if (v === undefined) continue;
      out[k] = v && typeof v === 'object' && !(v instanceof Date) ? pruneUndefined(v) : v;
    }
    return out;
  }
  return value;
};

// Repost to current user's timeline (like Facebook share)
export const repostToTimeline = async (
  currentUserId: string,
  original: ShareablePost,
  options?: { message?: string; privacy?: 'public' | 'friends' | 'private' }
): Promise<string | null> => {
  try {
    const payload = {
      userID: currentUserId,
      content: options?.message ?? '',
      images: [],
      // address intentionally omitted unless defined elsewhere
      likes: [],
      comments: [],
      shares: 0,
      timestamp: new Date(),
      privacy: options?.privacy ?? 'public',
      type: 'share' as const,
      sharedPost: {
        id: original.id,
        userID: original.userID ?? '',
        content: original.content ?? '',
        images: Array.isArray(original.images) ? original.images : [],
        timestamp: original.timestamp ?? new Date(),
        privacy: original.privacy ?? 'public',
      },
    } as const;

    const cleaned = pruneUndefined(payload);

    const ref = await addDoc(collection(db, 'posts'), cleaned as any);
    // Increment original's shares
    await incrementShareCount(original.id);
    return ref.id;
  } catch (e) {
    console.error('Failed to repost to timeline:', e);
    return null;
  }
};
