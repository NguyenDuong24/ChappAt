import { followService } from '@/services/followService';

/**
 * Utility functions for blocking features
 */

/**
 * Check if there's any block relationship between two users
 * Returns true if either user has blocked the other
 */
export const hasBlockRelationship = async (
  userId1: string,
  userId2: string
): Promise<boolean> => {
  try {
    const blocked1 = await followService.isBlocked(userId1, userId2);
    const blocked2 = await followService.isBlocked(userId2, userId1);
    return blocked1 || blocked2;
  } catch (error) {
    console.error('Error checking block relationship:', error);
    return false;
  }
};

/**
 * Check if current user can chat with target user
 */
export const canChatWith = async (
  currentUserId: string,
  targetUserId: string
): Promise<{ canChat: boolean; reason?: string }> => {
  if (!currentUserId || !targetUserId) {
    return { canChat: false, reason: 'Invalid user IDs' };
  }

  if (currentUserId === targetUserId) {
    return { canChat: false, reason: 'Cannot chat with yourself' };
  }

  const isBlocked = await followService.isBlocked(currentUserId, targetUserId);
  if (isBlocked) {
    return { canChat: false, reason: 'Bạn đã chặn người dùng này' };
  }

  const isBlockedBy = await followService.isBlocked(targetUserId, currentUserId);
  if (isBlockedBy) {
    return { canChat: false, reason: 'Người dùng này đã chặn bạn' };
  }

  return { canChat: true };
};

/**
 * Filter out blocked users from a user list
 */
export const filterBlockedUsers = async <T extends { id?: string; uid?: string; userId?: string }>(
  users: T[],
  currentUserId: string
): Promise<T[]> => {
  if (!currentUserId || !users.length) return users;

  const filteredUsers = await Promise.all(
    users.map(async (user) => {
      const userId = user.id || user.uid || user.userId;
      if (!userId || userId === currentUserId) return user;

      const hasBlock = await hasBlockRelationship(currentUserId, userId);
      return hasBlock ? null : user;
    })
  );

  return filteredUsers.filter((user) => user !== null) as T[];
};

/**
 * Check if user should be visible in lists
 */
export const shouldShowUser = async (
  currentUserId: string,
  targetUserId: string
): Promise<boolean> => {
  if (!currentUserId || !targetUserId) return false;
  if (currentUserId === targetUserId) return true;

  const hasBlock = await hasBlockRelationship(currentUserId, targetUserId);
  return !hasBlock;
};
