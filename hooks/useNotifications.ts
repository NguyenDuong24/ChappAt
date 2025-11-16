import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import notificationService from '../notificationService';

interface NotificationData {
  type: 'message' | 'call' | 'group' | 'friend_request' | 'system' | 'status' | 'reaction' | 'mention' | 'media' | 'reminder';
  chatId?: string;
  userId?: string;
  groupId?: string;
  callId?: string;
  callType?: 'video' | 'audio';
  status?: string;
  reaction?: string;
  mediaType?: string;
  [key: string]: any;
}

interface LocalNotification {
  title: string;
  body: string;
  data?: NotificationData;
  sound?: boolean;
  badge?: number;
  categoryId?: string;
}

export interface NotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  isLoading: boolean;
  error: string | null;
}

export const useNotifications = () => {
  const [state, setState] = useState<NotificationState>({
    expoPushToken: null,
    notification: null,
    isLoading: true,
    error: null,
  });

  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        
        await notificationService.initialize();
        const token = notificationService.getExpoPushToken();
        
        setState(prev => ({ 
          ...prev, 
          expoPushToken: token,
          isLoading: false 
        }));
      } catch (error) {
        console.error('Error initializing notifications:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'Failed to initialize notifications',
          isLoading: false 
        }));
      }
    };

    initializeNotifications();

    // Đăng ký nhận notification khi app foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        setState(prev => ({ ...prev, notification }));
      }
    );

    // Lắng nghe khi user nhấn vào notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        // Xử lý navigation hoặc action khác ở đây
        handleNotificationTap(response);
      }
    );

    // Lắng nghe thay đổi app state
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App được mở lại, clear badge
        notificationService.clearBadge();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      notificationService.cleanup();
    };
  }, []);

  const handleNotificationTap = (response: Notifications.NotificationResponse) => {
    const { data } = response.notification.request.content;
    
    if (data && typeof data === 'object') {
      const notificationData = data as NotificationData;
      
      // Xử lý navigation dựa trên type của notification
      switch (notificationData.type) {
        case 'message':
          if (notificationData.chatId) {
            // Navigate to specific chat
          }
          break;
        case 'call':
          if (notificationData.callId) {
            // Navigate to call screen
          }
          break;
        case 'group':
          if (notificationData.groupId) {
            // Navigate to group
          }
          break;
        case 'friend_request':
          if (notificationData.userId) {
            // Navigate to friend requests
          }
          break;
        default:
          // Navigate to main screen
      }
    }
  };

  const scheduleNotification = async (notification: LocalNotification) => {
    try {
      const notificationId = await notificationService.scheduleLocalNotification(notification);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to schedule notification' 
      }));
      return null;
    }
  };

  const scheduleDelayedNotification = async (
    notification: LocalNotification,
    delayInSeconds: number
  ) => {
    try {
      const notificationId = await notificationService.scheduleLocalNotification({
        ...notification,
        trigger: { seconds: delayInSeconds }
      });
      return notificationId;
    } catch (error) {
      console.error('Error scheduling delayed notification:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to schedule delayed notification' 
      }));
      return null;
    }
  };

  const cancelNotification = async (notificationId: string) => {
    try {
      await notificationService.cancelNotification(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to cancel notification' 
      }));
    }
  };

  const cancelAllNotifications = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to cancel all notifications' 
      }));
    }
  };

  const clearBadge = async () => {
    try {
      await notificationService.clearBadge();
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  };

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  const clearNotification = () => {
    setState(prev => ({ ...prev, notification: null }));
  };

  return {
    ...state,
    scheduleNotification,
    scheduleDelayedNotification,
    cancelNotification,
    cancelAllNotifications,
    clearBadge,
    clearError,
    clearNotification,
  };
};

/**
 * Hook để sử dụng Expo Push Notifications với Realtime Listeners
 * 
 * @param userId - ID của user hiện tại (null nếu chưa login)
 * @returns Object chứa trạng thái initialization
 * 
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { user } = useAuth();
 *   const { isInitialized, expoPushToken, error } = useExpoPushNotifications(user?.uid);
 *   
 *   if (error) {
 *     console.error('Notification error:', error);
 *   }
 *   
 *   return <View>...</View>;
 * }
 * ```
 */
export function useExpoPushNotifications(userId: string | null | undefined) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeNotifications = async () => {
      if (!userId) {
        setIsInitialized(false);
        setExpoPushToken(null);
        return;
      }

      try {
        console.log('🚀 Initializing Expo Push Notifications for user:', userId);
        
        const ExpoPushNotificationService = (await import('@/services/expoPushNotificationService')).default;
        await ExpoPushNotificationService.initializeWithRealtimeListeners(userId);
        
        if (mounted) {
          const token = ExpoPushNotificationService.getExpoPushToken();
          setExpoPushToken(token);
          setIsInitialized(true);
          setError(null);
          console.log('✅ Expo Push Notifications initialized successfully');
        }
      } catch (err) {
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setError(errorMessage);
          setIsInitialized(false);
          console.error('❌ Failed to initialize Expo Push Notifications:', errorMessage);
        }
      }
    };

    initializeNotifications();

    return () => {
      mounted = false;
      if (userId) {
        console.log('🧹 Cleaning up Expo Push Notifications');
        import('@/services/expoPushNotificationService').then(module => {
          module.default.cleanup();
        });
      }
    };
  }, [userId]);

  return {
    isInitialized,
    expoPushToken,
    error,
  };
}
