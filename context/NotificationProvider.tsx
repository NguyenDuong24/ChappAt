import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import notificationService from '../notificationService';
import notificationNavigationService from '../services/notificationNavigationService';
import { useAuth } from './authContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebaseConfig';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import NotificationModal from '../components/notifications/NotificationModal';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import ExpoPushNotificationService from '../services/expoPushNotificationService';
import { updateCallStatus, CALL_STATUS } from '../services/firebaseCallService';
import callTimeoutService from '../services/callTimeoutService.js';

interface NotificationContextType {
  expoPushToken: string | null;
  isLoading: boolean;
  error: string | null;
  scheduleNotification: (notification: any) => Promise<string | null>;
  scheduleDelayedNotification: (notification: any, delay: number) => Promise<string | null>;
  cancelNotification: (id: string) => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
  clearBadge: () => Promise<void>;
  clearError: () => void;
  sendNotificationToUser: (userId: string, notification: any) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const notifications = useNotifications();
  const [initialized, setInitialized] = useState(false);
  const [modalNotification, setModalNotification] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const initializeServices = async () => {
      if (user && !initialized) {
        try {
          // Initialize notification service
          const success = await notificationService.initialize();
          if (success && user.uid) {
            notificationService.listenForNewMessages(user.uid);
          }

          // Initialize navigation service
          notificationNavigationService.initialize();

          // Listen for foreground notifications
          const foregroundSubscription = Notifications.addNotificationReceivedListener(
            (notification) => {
              console.log('🔔 Foreground notification received:', notification);
              const data = notification.request.content.data;

              // Play sound for all notifications except those from the current user
              // if (data?.senderId !== user.uid) {
              //   playNotificationSound();
              // }

              // Show modal for social notifications
              if (data?.type && ['like', 'comment', 'follow', 'mention'].includes(data.type)) {
                setModalNotification({
                  id: notification.request.identifier,
                  type: data.type,
                  title: notification.request.content.title || '',
                  body: notification.request.content.body || '',
                  data: data,
                  senderAvatar: data.senderAvatar,
                  senderName: data.senderName,
                });
                setShowModal(true);
              }
            }
          );

          setInitialized(true);

          // Store subscription for cleanup
          return () => {
            foregroundSubscription && Notifications.removeNotificationSubscription(foregroundSubscription);
          };
        } catch (error) {
          console.error('Error initializing notification services:', error);
        }
      }
    };

    const cleanup = initializeServices();
    return () => {
      if (cleanup && typeof cleanup.then === 'function') {
        cleanup.then((cleanupFn) => cleanupFn && cleanupFn());
      }
    };
  }, [user, initialized]);

  // Sync notificationSettings from Firestore to AsyncStorage for local filtering
  useEffect(() => {
    if (!user?.uid) return;

    const userRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(userRef, async (snap) => {
      try {
        if (!snap.exists()) return;
        const data = snap.data() as any;
        if (data?.notificationSettings && typeof data.notificationSettings === 'object') {
          await AsyncStorage.setItem('notificationSettings', JSON.stringify(data.notificationSettings));
        }
      } catch (e) {
        console.log('Failed syncing notification settings locally:', e);
      }
    }, (error) => {
      // Silently ignore permission errors during logout
      const errorStr = String(error?.message || error?.code || error);
      if (!errorStr.includes('permission-denied') && !errorStr.includes('Missing or insufficient permissions')) {
        console.error('NotificationProvider snapshot error:', error);
      }
    });

    return () => {
      try { unsub(); } catch { /* noop */ }
    };
  }, [user?.uid]);


  // Cleanup khi user logout
  useEffect(() => {
    if (!user && initialized) {
      notificationService.cleanup();
      notificationNavigationService.cleanup();
      setInitialized(false);
      // Optionally clear local settings to avoid leaking between accounts
      AsyncStorage.removeItem('notificationSettings').catch(() => { });
    }
  }, [user, initialized]);

  const sendNotificationToUser = async (userId: string, notification: any) => {
    try {
      // Fetch user document to get pushToken (sử dụng expoPushToken như chat)
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.warn('❌ User document not found for notification');
        return;
      }

      const userData = userDoc.data();
      const expoPushToken = userData?.expoPushToken;

      if (!expoPushToken) {
        console.warn('❌ No push token found for user:', userId);
        // Fallback to local notification
        await notificationService.scheduleLocalNotification(notification);
        return;
      }

      console.log('📤 Sending REAL push notification for call to user:', userId);

      // Sử dụng ExpoPushNotificationService giống như chat
      const success = await ExpoPushNotificationService.sendRealPushNotification(expoPushToken, {
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        priority: 'high',
        sound: 'default',
        badge: 1,
        channelId: 'calls' // Sử dụng calls channel với HIGH importance
      });

      if (success) {
        console.log('✅ REAL Push notification sent successfully for call to user:', userId);
      } else {
        console.log('🔄 Real push failed, trying fallback...');
        // Fallback to local notification
        await notificationService.scheduleLocalNotification(notification);
      }
    } catch (error) {
      console.error('❌ Error sending call notification:', error);
      // Fallback to local
      try {
        await notificationService.scheduleLocalNotification(notification);
      } catch (localError) {
        console.error('Local notification fallback failed:', localError);
      }
    }
  };

  const handleModalAction = (action: string) => {
    if (!modalNotification) return;

    console.log('🎯 Modal action:', action, modalNotification.data);

    switch (action) {
      case 'view':
        // Navigate based on notification type
        notificationNavigationService.triggerNavigation(modalNotification.data);
        break;
      case 'reply':
        // Handle reply action
        if (modalNotification.data?.chatId) {
          notificationNavigationService.triggerNavigation({
            type: 'message',
            chatId: modalNotification.data.chatId,
          });
        }
        break;
      case 'follow_back':
        // Handle follow back action
        console.log('Follow back user:', modalNotification.data?.senderId);
        break;
      case 'mark_read':
        // Mark as read
        console.log('Mark notification as read:', modalNotification.id);
        break;
      default:
        console.log('Unknown action:', action);
        break;
    }

    setShowModal(false);
  };

  const value: NotificationContextType = {
    expoPushToken: notifications.expoPushToken,
    isLoading: notifications.isLoading,
    error: notifications.error,
    scheduleNotification: notifications.scheduleNotification,
    scheduleDelayedNotification: notifications.scheduleDelayedNotification,
    cancelNotification: notifications.cancelNotification,
    cancelAllNotifications: notifications.cancelAllNotifications,
    clearBadge: notifications.clearBadge,
    clearError: notifications.clearError,
    sendNotificationToUser,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationModal
        visible={showModal}
        notification={modalNotification}
        onClose={() => setShowModal(false)}
        onAction={handleModalAction}
      />
    </NotificationContext.Provider>
  );
};
