import { useState, useEffect } from 'react';
import { followService } from '@/services/followService';

/**
 * Hook to check if current user has blocked or been blocked by another user
 */
export const useBlockStatus = (currentUserId?: string, targetUserId?: string) => {
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedBy, setIsBlockedBy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
      setLoading(false);
      return;
    }

    const checkBlockStatus = async () => {
      try {
        setLoading(true);
        
        // Check if current user blocked target user
        const blocked = await followService.isBlocked(currentUserId, targetUserId);
        setIsBlocked(blocked);
        
        // Check if current user is blocked by target user
        const blockedBy = await followService.isBlocked(targetUserId, currentUserId);
        setIsBlockedBy(blockedBy);
      } catch (error) {
        console.error('Error checking block status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkBlockStatus();
  }, [currentUserId, targetUserId]);

  return {
    isBlocked,      // Current user has blocked target user
    isBlockedBy,    // Current user is blocked by target user
    hasBlockRelation: isBlocked || isBlockedBy,
    loading,
  };
};

/**
 * Hook to filter content based on block status
 */
export const useFilterBlockedContent = <T extends { userID?: string; userId?: string }>(
  items: T[],
  currentUserId?: string
) => {
  const [filteredItems, setFilteredItems] = useState<T[]>(items);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) {
      setFilteredItems(items);
      setLoading(false);
      return;
    }

    const filterItems = async () => {
      try {
        setLoading(true);
        
        const filtered = await Promise.all(
          items.map(async (item) => {
            const userId = item.userID || item.userId;
            if (!userId || userId === currentUserId) return item;

            // Check if user is blocked
            const blocked = await followService.isBlocked(currentUserId, userId);
            const blockedBy = await followService.isBlocked(userId, currentUserId);

            return blocked || blockedBy ? null : item;
          })
        );

        setFilteredItems(filtered.filter((item) => item !== null) as T[]);
      } catch (error) {
        console.error('Error filtering blocked content:', error);
        setFilteredItems(items);
      } finally {
        setLoading(false);
      }
    };

    filterItems();
  }, [items, currentUserId]);

  return { filteredItems, loading };
};
