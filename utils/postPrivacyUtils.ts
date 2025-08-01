import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

export type PrivacyLevel = 'public' | 'friends' | 'private';

export interface PrivacyOption {
  key: PrivacyLevel;
  label: string;
  description: string;
  icon: string;
}

export const PRIVACY_OPTIONS: PrivacyOption[] = [
  {
    key: 'public',
    label: 'Mọi người',
    description: 'Ai cũng có thể xem bài viết này',
    icon: 'public'
  },
  {
    key: 'friends',
    label: 'Bạn bè',
    description: 'Chỉ bạn bè của bạn có thể xem',
    icon: 'people'
  },
  {
    key: 'private',
    label: 'Chỉ tôi',
    description: 'Chỉ bạn có thể xem bài viết này',
    icon: 'lock'
  }
];

// Cập nhật privacy của post
export const updatePostPrivacy = async (postId: string, privacy: PrivacyLevel): Promise<boolean> => {
  try {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      privacy: privacy,
      updatedAt: new Date()
    });
    console.log('Post privacy updated:', postId, privacy);
    return true;
  } catch (error) {
    console.error('Error updating post privacy:', error);
    return false;
  }
};

// Lấy privacy label từ key
export const getPrivacyLabel = (privacy?: PrivacyLevel): string => {
  const option = PRIVACY_OPTIONS.find(opt => opt.key === privacy);
  return option?.label || 'Mọi người';
};

// Lấy privacy icon từ key
export const getPrivacyIcon = (privacy?: PrivacyLevel): string => {
  const option = PRIVACY_OPTIONS.find(opt => opt.key === privacy);
  return option?.icon || 'public';
};

// Kiểm tra quyền xem post
export const canViewPost = (
  post: { userID: string; privacy?: PrivacyLevel },
  currentUserId: string,
  isFriend: boolean = false
): boolean => {
  // Chủ post luôn xem được
  if (post.userID === currentUserId) {
    return true;
  }

  // Kiểm tra theo privacy level
  switch (post.privacy || 'public') {
    case 'public':
      return true;
    case 'friends':
      return isFriend;
    case 'private':
      return false;
    default:
      return true;
  }
};
