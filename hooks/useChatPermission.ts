import { useState, useEffect } from 'react';
import { canChatWith, filterBlockedUsers, shouldShowUser } from '@/utils/blockUtils';

/**
 * Hook to check if chat is allowed between users
 */
export const useChatPermission = (currentUserId?: string, targetUserId?: string) => {
  const [canChat, setCanChat] = useState(true);
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId || !targetUserId) {
      setCanChat(false);
      setLoading(false);
      return;
    }

    const checkPermission = async () => {
      try {
        setLoading(true);
        const result = await canChatWith(currentUserId, targetUserId);
        setCanChat(result.canChat);
        setReason(result.reason || '');
      } catch (error) {
        console.error('Error checking chat permission:', error);
        setCanChat(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [currentUserId, targetUserId]);

  return { canChat, reason, loading };
};

/**
 * Hook to filter blocked users from a list
 */
export const useFilteredUserList = <T extends { id?: string; uid?: string; userId?: string }>(
  users: T[],
  currentUserId?: string
) => {
  const [filteredUsers, setFilteredUsers] = useState<T[]>(users);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId || users.length === 0) {
      setFilteredUsers(users);
      setLoading(false);
      return;
    }

    const filterUsers = async () => {
      try {
        setLoading(true);
        const filtered = await filterBlockedUsers(users, currentUserId);
        setFilteredUsers(filtered);
      } catch (error) {
        console.error('Error filtering users:', error);
        setFilteredUsers(users);
      } finally {
        setLoading(false);
      }
    };

    filterUsers();
  }, [users, currentUserId]);

  return { filteredUsers, loading };
};

/**
 * Hook to check if a user should be visible
 */
export const useUserVisibility = (currentUserId?: string, targetUserId?: string) => {
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId || !targetUserId) {
      setIsVisible(false);
      setLoading(false);
      return;
    }

    const checkVisibility = async () => {
      try {
        setLoading(true);
        const visible = await shouldShowUser(currentUserId, targetUserId);
        setIsVisible(visible);
      } catch (error) {
        console.error('Error checking user visibility:', error);
        setIsVisible(false);
      } finally {
        setLoading(false);
      }
    };

    checkVisibility();
  }, [currentUserId, targetUserId]);

  return { isVisible, loading };
};
