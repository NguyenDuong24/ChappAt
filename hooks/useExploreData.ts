import { useState, useEffect, useCallback } from 'react';
import { InteractionManager } from 'react-native';
import { useAuth } from '@/context/authContext';
import { optimizedNotificationService } from '@/services/optimizedServices';
import { HashtagService } from '@/services/hashtagService';
import FirebaseErrorHandler from '@/services/firebaseErrorHandler';

interface TrendingHashtag {
  tag: string;
  count: number;
  name?: string;
  hashtag?: string;
  total?: number;
  usage?: number;
}

interface UseExploreDataReturn {
  notificationCount: number;
  trendingHashtags: TrendingHashtag[];
  loading: boolean;
  error: string | null;
  refreshNotifications: () => Promise<void>;
  refreshHashtags: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useExploreData = (): UseExploreDataReturn => {
  const { user } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0);
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);



  // Load notification count with retry
  const refreshNotifications = useCallback(async () => {
    if (!user?.uid) {
      setNotificationCount(0);
      return;
    }

    try {
      setError(null);
      const count = await FirebaseErrorHandler.retryOperation(
        () => optimizedNotificationService.getUnreadCount(user.uid),
        { maxRetries: 2, initialDelay: 500 }
      );
      setNotificationCount(count);
    } catch (error: any) {
      console.error('Error loading notification count:', error);
      const errorMessage = FirebaseErrorHandler.getUserFriendlyMessage(error);
      setError(errorMessage);
      setNotificationCount(0);
    }
  }, [user?.uid]);

  // Load trending hashtags with retry
  const refreshHashtags = useCallback(async () => {
    try {
      setError(null);
      const hashtags = await FirebaseErrorHandler.retryOperation(
        () => HashtagService.getTrendingHashtagsToday(8),
        { maxRetries: 3, initialDelay: 1000 }
      );

      // Normalize hashtag data format
      const normalizedHashtags = hashtags.map((item: any) => {
        if (typeof item === 'string') {
          return { tag: item.startsWith('#') ? item : `#${item}`, count: 0 };
        }

        const tag = item?.tag || item?.name || item?.hashtag || '';
        const count = item?.count || item?.total || item?.usage || 0;

        return {
          tag: tag.startsWith('#') ? tag : `#${tag}`,
          count: count
        };
      });

      setTrendingHashtags(normalizedHashtags);
    } catch (error: any) {
      console.error('Error loading trending hashtags:', error);
      const errorMessage = FirebaseErrorHandler.getUserFriendlyMessage(error);
      setError(errorMessage);

      // Fallback data if service fails
      setTrendingHashtags([
        { tag: '#Dating', count: 2150 },
        { tag: '#Love', count: 1890 },
        { tag: '#Romance', count: 1234 },
        { tag: '#Weekend', count: 987 },
        { tag: '#Coffee', count: 756 },
        { tag: '#Music', count: 654 },
        { tag: '#Travel', count: 543 },
        { tag: '#Food', count: 432 }
      ]);
    }
  }, []);

  // Refresh all data
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Execute both operations concurrently but handle errors independently
      const results = await Promise.allSettled([
        refreshNotifications(),
        refreshHashtags()
      ]);

      // Check for any errors
      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason?.message || 'Unknown error');

      if (errors.length > 0) {
        setError(`Some data failed to load: ${errors.join(', ')}`);
      }
    } catch (error: any) {
      console.error('Error refreshing data:', error);
      setError(error?.message || 'Failed to refresh data');
    } finally {
      setTimeout(() => setLoading(false), 300); // Small delay for smooth UX
    }
  }, [refreshNotifications, refreshHashtags]);

  // Initial load with debounce
  useEffect(() => {
    let timeoutId: any;

    const loadInitialData = async () => {
      // Clear any existing timeout
      if (timeoutId) clearTimeout(timeoutId);

      // Wait for navigation/tab switch animations to complete
      InteractionManager.runAfterInteractions(() => {
        // Debounce to prevent rapid re-loading when user changes
        timeoutId = setTimeout(async () => {
          await refresh();
        }, 100);
      });
    };

    if (user?.uid) {
      loadInitialData();
    } else {
      // Reset state when user logs out
      setNotificationCount(0);
      setTrendingHashtags([]);
      setError(null);
      setLoading(false);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user?.uid, refresh]);

  // Auto-refresh notifications periodically with error handling
  useEffect(() => {
    if (!user?.uid) return;

    const interval = setInterval(async () => {
      try {
        await refreshNotifications();
      } catch (error) {
        // Silent fail for background refresh - don't spam console
        console.debug('Background notification refresh failed:', error);
      }
    }, 60000); // Refresh every 60 seconds (reduced frequency to avoid rate limits)

    return () => clearInterval(interval);
  }, [user?.uid, refreshNotifications]);

  // Listen to notification changes in real-time with better error handling
  useEffect(() => {
    if (!user?.uid) return;

    let unsubscribe: (() => void) | undefined;
    let retryTimeout: any;

    const setupRealtimeNotifications = async () => {
      try {
        // Setup real-time listener for new notifications
        unsubscribe = optimizedNotificationService.setupRealtimeListener(
          user.uid,
          (notification: any) => {
            // Debounce notification count refresh to avoid spam
            if (retryTimeout) clearTimeout(retryTimeout);
            retryTimeout = setTimeout(() => {
              refreshNotifications();
            }, 500);
          }
        );
      } catch (error) {
        console.error('Error setting up real-time notifications:', error);

        // Retry after delay if initial setup fails
        retryTimeout = setTimeout(() => {
          setupRealtimeNotifications();
        }, 5000);
      }
    };

    setupRealtimeNotifications();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [user?.uid, refreshNotifications]);

  return {
    notificationCount,
    trendingHashtags,
    loading,
    error,
    refreshNotifications,
    refreshHashtags,
    refresh
  };
};

// Format count helper
export const formatCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

export default useExploreData;
