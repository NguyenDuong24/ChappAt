/**
 * Core Notification Service
 * Unified service for handling all notification operations
 * Replaces multiple fragmented notification services
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, auth } from '../../firebaseConfig';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('📱 Handling notification:', notification.request.content.title);
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

// Notification data interface
export interface NotificationData {
  type: 'post' | 'comment' | 'like' | 'follow' | 'message' | 'group' | 'mention' | 'call' | 'friend_request' | 'hot_spot' | 'event_pass' | 'system';
  userId?: string;
  postId?: string;
  commentId?: string;
  chatId?: string;
  groupId?: string;
  senderId?: string;
  hotSpotId?: string;
  hashtag?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

// Local notification interface
export interface LocalNotification {
  title: string;
  body: string;
  data?: NotificationData;
  categoryId?: string;
  sound?: boolean;
  badge?: number;
}

class CoreNotificationService {
  private isInitialized = false;
  private pushToken: string | null = null;
  private listeners: { [key: string]: any } = {};

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔄 Initializing Core Notification Service...');

      // Register for push notifications
      await this.registerForPushNotifications();
      
      // Setup notification categories (iOS)
      if (Platform.OS === 'ios') {
        await this.setupNotificationCategories();
      }

      this.isInitialized = true;
      console.log('✅ Core Notification Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize notification service:', error);
      throw error;
    }
  }

  /**
   * Register for push notifications
   */
  private async registerForPushNotifications(): Promise<void> {
    try {
      if (!Device.isDevice) {
        console.warn('⚠️ Push notifications only work on physical devices');
        return;
      }

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('⚠️ Push notification permission not granted');
        return;
      }

      // Get push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      if (!projectId) {
        throw new Error('Project ID not found in Expo config');
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      this.pushToken = tokenData.data;

      console.log('✅ Push token obtained:', this.pushToken);

      // Save token to user profile
      await this.savePushTokenToUser(this.pushToken);

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }
    } catch (error) {
      console.error('❌ Failed to register for push notifications:', error);
      throw error;
    }
  }

  /**
   * Setup notification categories for iOS
   */
  private async setupNotificationCategories(): Promise<void> {
    await Notifications.setNotificationCategoryAsync('social', [
      {
        identifier: 'view',
        buttonTitle: 'Xem',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'dismiss',
        buttonTitle: 'Đóng',
        options: { isDestructive: true },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('message', [
      {
        identifier: 'reply',
        buttonTitle: 'Trả lời',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'mark_read',
        buttonTitle: 'Đánh dấu đã đọc',
        options: { isDestructive: false },
      },
    ]);
  }

  /**
   * Setup Android notification channels
   */
  private async setupAndroidChannels(): Promise<void> {
    // Default channel
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });

    // High priority channel for messages
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
    });

    // Social interactions channel
    await Notifications.setNotificationChannelAsync('social', {
      name: 'Social',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  /**
   * Save push token to user's Firestore document
   */
  private async savePushTokenToUser(token: string): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.warn('⚠️ No authenticated user to save push token');
        return;
      }

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        pushToken: token,
        lastTokenUpdate: new Date(),
      });

      console.log('✅ Push token saved to user profile');
    } catch (error) {
      console.error('❌ Failed to save push token:', error);
    }
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(notification: LocalNotification, delay: number = 0): Promise<string | null> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          categoryIdentifier: notification.categoryId,
          sound: notification.sound !== false,
          badge: notification.badge,
        },
        trigger: delay > 0 ? { seconds: delay } as any : null,
      });

      console.log('✅ Local notification scheduled:', identifier);
      return identifier;
    } catch (error) {
      console.error('❌ Failed to schedule notification:', error);
      return null;
    }
  }

  /**
   * Cancel a specific notification
   */
  async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      console.log('✅ Notification cancelled:', identifier);
    } catch (error) {
      console.error('❌ Failed to cancel notification:', error);
    }
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('✅ All notifications cancelled');
    } catch (error) {
      console.error('❌ Failed to cancel all notifications:', error);
    }
  }

  /**
   * Clear notification badge
   */
  async clearBadge(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
      console.log('✅ Badge cleared');
    } catch (error) {
      console.error('❌ Failed to clear badge:', error);
    }
  }

  /**
   * Get current push token
   */
  getCurrentPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Add notification response listener
   */
  addNotificationResponseListener(listener: (response: Notifications.NotificationResponse) => void): void {
    const subscription = Notifications.addNotificationResponseReceivedListener(listener);
    const id = Date.now().toString();
    this.listeners[id] = subscription;
  }

  /**
   * Add notification received listener
   */
  addNotificationReceivedListener(listener: (notification: Notifications.Notification) => void): void {
    const subscription = Notifications.addNotificationReceivedListener(listener);
    const id = Date.now().toString();
    this.listeners[id] = subscription;
  }

  /**
   * Cleanup service
   */
  cleanup(): void {
    // Remove all listeners
    Object.values(this.listeners).forEach(subscription => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    });
    this.listeners = {};
    this.isInitialized = false;
    console.log('✅ Core Notification Service cleaned up');
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export default new CoreNotificationService();
