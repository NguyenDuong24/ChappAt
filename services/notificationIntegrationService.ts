import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '@/firebaseConfig';
import { doc, updateDoc, getDoc, onSnapshot } from 'firebase/firestore';
import notificationService from './notificationService';
import firebaseMessaging from '@/firebaseMessaging';

interface User {
  uid: string;
  username?: string;
  displayName?: string;
  profileUrl?: string;
}

class NotificationIntegrationService {
  private isInitialized = false;
  private userSettingsListener: any = null;

  async initialize(user: User | null) {
    if (this.isInitialized || !user) return;

    try {
      console.log('🔔 Initializing Notification Integration Service...');

      // 1. Initialize notification service
      await notificationService.initialize();

      // 2. Initialize Firebase messaging
      await firebaseMessaging.initialize();

      // 3. Setup user settings sync
      await this.setupUserSettingsSync(user.uid);

      // 4. Setup notification handlers
      this.setupNotificationHandlers();

      // 5. Save user info for notifications
      await this.saveUserInfoForNotifications(user);

      this.isInitialized = true;
      console.log('✅ Notification Integration Service initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Notification Integration Service:', error);
    }
  }

  private async setupUserSettingsSync(userId: string) {
    // Listen to user's notification settings changes in Firestore
    const userRef = doc(db, 'users', userId);
    
    this.userSettingsListener = onSnapshot(userRef, async (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.data();
        if (userData.notificationSettings) {
          // Sync to local storage for filtering
          await AsyncStorage.setItem(
            'notificationSettings', 
            JSON.stringify(userData.notificationSettings)
          );
          console.log('🔄 Notification settings synced locally');
        }
      }
    });
  }

  private setupNotificationHandlers() {
    // Setup notification received handler
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('🔔 Notification received:', notification);
      this.handleNotificationReceived(notification);
    });

    // Setup notification response handler
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('👆 Notification tapped:', response);
      this.handleNotificationTapped(response);
    });
  }

  private handleNotificationReceived(notification: Notifications.Notification) {
    const { data } = notification.request.content;
    
    // Update badge count
    this.updateBadgeCount();
    
    // Handle specific notification types
    if (data && typeof data === 'object') {
      const notificationData = data as any;
      switch (notificationData.type) {
        case 'message':
          this.handleMessageNotification(notificationData);
          break;
        case 'call':
          this.handleCallNotification(notificationData);
          break;
        case 'friend_request':
          this.handleFriendRequestNotification(notificationData);
          break;
        case 'hot_spot':
          this.handleHotSpotNotification(notificationData);
          break;
        case 'event_pass':
          this.handleEventPassNotification(notificationData);
          break;
      }
    }
  }

  private handleNotificationTapped(response: Notifications.NotificationResponse) {
    const { notification } = response;
    const { data } = notification.request.content;

    if (data && typeof data === 'object') {
      this.navigateBasedOnNotificationType(data as any);
    }
  }

  private handleMessageNotification(data: any) {
    // Handle message notification logic
    console.log('💬 Message notification:', data);
  }

  private handleCallNotification(data: any) {
    // Handle call notification logic
    console.log('📞 Call notification:', data);
  }

  private handleFriendRequestNotification(data: any) {
    // Handle friend request notification logic
    console.log('👋 Friend request notification:', data);
  }

  private handleHotSpotNotification(data: any) {
    // Handle hot spot invitation notification logic
    console.log('🔥 Hot Spot notification:', data);
  }

  private handleEventPassNotification(data: any) {
    // Handle event pass notification logic
    console.log('🏆 Event Pass notification:', data);
  }

  private navigateBasedOnNotificationType(data: any) {
    // Navigation logic based on notification type
    // This should integrate with your router
    switch (data.type) {
      case 'message':
        if (data.chatId) {
          // Navigate to chat screen
          console.log('Navigate to chat:', data.chatId);
        }
        break;
      case 'call':
        if (data.callId) {
          // Navigate to call screen
          console.log('Navigate to call:', data.callId);
        }
        break;
      case 'friend_request':
        // Navigate to friend requests
        console.log('Navigate to friend requests');
        break;
      case 'hot_spot':
        if (data.hotSpotId) {
          // Navigate to hot spot detail
          console.log('Navigate to hot spot:', data.hotSpotId);
        } else if (data.invitationId) {
          // Navigate to invitations screen
          console.log('Navigate to invitations');
        }
        break;
      case 'event_pass':
        // Navigate to event pass screen
        console.log('Navigate to event pass screen');
        break;
    }
  }

  private async updateBadgeCount() {
    try {
      // Get unread count from your data source
      const unreadCount = await this.getUnreadCount();
      await Notifications.setBadgeCountAsync(unreadCount);
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }

  private async getUnreadCount(): Promise<number> {
    // Implement logic to get unread messages/notifications count
    // This should query your database
    return 0;
  }

  private async saveUserInfoForNotifications(user: User) {
    try {
      await AsyncStorage.setItem('userInfoForNotifications', JSON.stringify({
        uid: user.uid,
        username: user.username || user.displayName,
        profileUrl: user.profileUrl,
      }));
    } catch (error) {
      console.error('Error saving user info for notifications:', error);
    }
  }

  async sendNotificationToUser(
    targetUserId: string, 
    notification: {
      title: string;
      body: string;
      data?: any;
      type?: string;
    }
  ) {
    try {
      // Use Firebase messaging to send notification
      await firebaseMessaging.sendNotificationToUser(targetUserId, notification);
    } catch (error) {
      console.error('Error sending notification to user:', error);
      throw error;
    }
  }

  async scheduleLocalNotification(notification: {
    title: string;
    body: string;
    data?: any;
    delayInSeconds?: number;
  }) {
    try {
      if (notification.delayInSeconds) {
        return await notificationService.scheduleDelayedNotification(
          notification,
          notification.delayInSeconds
        );
      } else {
        return await notificationService.scheduleLocalNotification(notification);
      }
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      return null;
    }
  }

  async clearAllNotifications() {
    try {
      await notificationService.cancelAllNotifications();
      await notificationService.clearBadge();
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  async getExpoPushToken() {
    return notificationService.getExpoPushToken();
  }

  async getFCMToken() {
    return await firebaseMessaging.getFCMToken();
  }

  cleanup() {
    if (this.userSettingsListener) {
      this.userSettingsListener();
      this.userSettingsListener = null;
    }
    
    notificationService.cleanup();
    this.isInitialized = false;
  }

  // Test functions
  async testNotificationSystem() {
    try {
      console.log('🧪 Testing notification system...');
      
      // Test 1: FCM Token
      const fcmToken = await this.getFCMToken();
      console.log('✅ FCM Token:', fcmToken ? 'OK' : 'FAILED');
      
      // Test 2: Expo Push Token
      const expoPushToken = await this.getExpoPushToken();
      console.log('✅ Expo Push Token:', expoPushToken ? 'OK' : 'FAILED');
      
      // Test 3: Local notification
      await this.scheduleLocalNotification({
        title: '🧪 Test Notification',
        body: 'This is a test notification from your app!',
        data: { type: 'test' }
      });
      console.log('✅ Local notification scheduled');
      
      return {
        fcmToken: !!fcmToken,
        expoPushToken: !!expoPushToken,
        localNotification: true
      };
    } catch (error) {
      console.error('❌ Notification system test failed:', error);
      return {
        fcmToken: false,
        expoPushToken: false,
        localNotification: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default new NotificationIntegrationService();
