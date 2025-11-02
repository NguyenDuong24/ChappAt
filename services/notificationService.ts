import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cấu hình notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
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

export interface LocalNotification {
  title: string;
  body: string;
  data?: NotificationData;
  sound?: boolean;
  badge?: number;
  categoryId?: string;
}

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  async initialize() {
    await this.registerForPushNotifications();
    this.setupNotificationListeners();
    await this.setupNotificationCategories();
    // Tạo Android notification channels nếu cần
    await this.setupAndroidChannels();
  }

  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Must use physical device for push notifications');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      if (!projectId) {
        throw new Error('Project ID not found');
      }

      const pushTokenString = (await Notifications.getExpoPushTokenAsync({
        projectId,
      })).data;

      this.expoPushToken = pushTokenString;
      await AsyncStorage.setItem('expoPushToken', pushTokenString);
      
      console.log('Expo Push Token:', pushTokenString);
      return pushTokenString;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  private setupNotificationListeners() {
    // Listener cho notification được nhận khi app đang mở
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        this.handleNotificationReceived(notification);
      }
    );

    // Listener cho khi user tap vào notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
        this.handleNotificationResponse(response);
      }
    );
  }

  private async setupNotificationCategories() {
    await Notifications.setNotificationCategoryAsync('message', [
      {
        identifier: 'reply',
        buttonTitle: 'Reply',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'mark_read',
        buttonTitle: 'Mark as Read',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('call', [
      {
        identifier: 'accept',
        buttonTitle: 'Accept',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'decline',
        buttonTitle: 'Decline',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('friend_request', [
      {
        identifier: 'accept_friend',
        buttonTitle: 'Accept',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'decline_friend',
        buttonTitle: 'Decline',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);
  }

  private async setupAndroidChannels() {
    if (Platform.OS !== 'android') return;
    try {
      // Channel mặc định
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4f8bff',
      });

      // Messages channel (sound: join)
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'join', // matches app.json plugin assets
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4f8bff',
      });

      // Calls channel (sound: calling)
      await Notifications.setNotificationChannelAsync('calls', {
        name: 'Calls',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'calling',
        vibrationPattern: [0, 500, 500, 500],
        lightColor: '#ff6b6b',
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      // Social channel
      await Notifications.setNotificationChannelAsync('social', {
        name: 'Social',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#51cf66',
      });

      // System channel
      await Notifications.setNotificationChannelAsync('system', {
        name: 'System',
        importance: Notifications.AndroidImportance.MIN,
        sound: 'default',
      });
    } catch (e) {
      console.warn('Failed to create Android channels', e);
    }
  }

  private handleNotificationReceived(notification: Notifications.Notification) {
    const { data } = notification.request.content;
    
    // Xử lý theo loại notification
    if (data && typeof data === 'object') {
      const notificationData = data as NotificationData;
      switch (notificationData.type) {
        case 'message':
          this.handleMessageNotification(notificationData);
          break;
        case 'call':
          this.handleCallNotification(notificationData);
          break;
        case 'group':
          this.handleGroupNotification(notificationData);
          break;
        case 'friend_request':
          this.handleFriendRequestNotification(notificationData);
          break;
        default:
          console.log('Unknown notification type:', notificationData.type);
      }
    }
  }

  private handleNotificationResponse(response: Notifications.NotificationResponse) {
    const { actionIdentifier, notification } = response;
    const { data } = notification.request.content;

    switch (actionIdentifier) {
      case 'reply':
        // Navigate to chat screen
        break;
      case 'mark_read':
        this.markMessageAsRead((data as any)?.chatId);
        break;
      case 'accept':
        this.handleCallAction('accept', (data as any)?.callId);
        break;
      case 'decline':
        this.handleCallAction('decline', (data as any)?.callId);
        break;
      case 'accept_friend':
        this.handleFriendRequest('accept', (data as any)?.userId);
        break;
      case 'decline_friend':
        this.handleFriendRequest('decline', (data as any)?.userId);
        break;
      default:
        // Default action - open app
        if (data && typeof data === 'object') {
          this.navigateToScreen(data as NotificationData);
        }
    }
  }

  private handleMessageNotification(data: NotificationData) {
    // Có thể thêm logic xử lý tin nhắn (cập nhật badge, âm thanh đặc biệt, etc.)
    this.updateBadgeCount();
  }

  private handleCallNotification(data: NotificationData) {
    // Xử lý notification cuộc gọi (có thể trigger fullscreen call UI)
    console.log('Incoming call:', data);
  }

  private handleGroupNotification(data: NotificationData) {
    // Xử lý notification nhóm
    console.log('Group notification:', data);
  }

  private handleFriendRequestNotification(data: NotificationData) {
    // Xử lý notification lời mời kết bạn
    console.log('Friend request:', data);
  }

  private async markMessageAsRead(chatId?: string) {
    if (!chatId) return;
    // Implement logic to mark message as read
    console.log('Marking message as read:', chatId);
  }

  private async handleCallAction(action: 'accept' | 'decline', callId?: string) {
    if (!callId) return;
    // Implement call handling logic
    console.log(`${action} call:`, callId);
  }

  private async handleFriendRequest(action: 'accept' | 'decline', userId?: string) {
    if (!userId) return;
    // Implement friend request handling logic
    console.log(`${action} friend request:`, userId);
  }

  private navigateToScreen(data: NotificationData) {
    // Implement navigation logic based on notification data
    console.log('Navigate to screen:', data);
  }

  private async updateBadgeCount() {
    try {
      // Get unread message count from your data source
      const unreadCount = await this.getUnreadMessageCount();
      await Notifications.setBadgeCountAsync(unreadCount);
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }

  private async getUnreadMessageCount(): Promise<number> {
    // Implement logic to get unread message count
    // This could be from your database or local storage
    return 0;
  }

  private async shouldSendLocalNotification(notification: LocalNotification): Promise<boolean> {
    try {
      const raw = await AsyncStorage.getItem('notificationSettings');
      if (!raw) return true; // chưa cấu hình => cho phép
      const settings = JSON.parse(raw) as Record<string, boolean>;

      // Map category/type -> toggle id trong NotificationSettingsScreen
      const type = notification.data?.type;
      const category = notification.categoryId;

      // Ưu tiên theo type
      if (type === 'message' && settings['messageNotifications'] === false) return false;
      if (type === 'group' && settings['groupNotifications'] === false) return false;
      if (type === 'mention' && settings['mentionNotifications'] === false) return false;
      if (type === 'reaction' && settings['reactionNotifications'] === false) return false;
      if (type === 'media' && settings['messageNotifications'] === false) return false;
      if (type === 'call' && settings['callNotifications'] === false) return false;
      if (type === 'friend_request' && settings['friendRequestNotifications'] === false) return false;
      if (type === 'system' && settings['systemNotifications'] === false) return false;

      // Fall back theo categoryId nếu không có type
      if (!type && category) {
        if (category === 'message' && settings['messageNotifications'] === false) return false;
        if (category === 'call' && settings['callNotifications'] === false) return false;
        if (category === 'friend_request' && settings['friendRequestNotifications'] === false) return false;
      }

      return true;
    } catch (e) {
      return true;
    }
  }

  private resolveAndroidChannel(notification: LocalNotification): string | undefined {
    if (Platform.OS !== 'android') return undefined;
    const type = notification.data?.type;
    switch (type) {
      case 'message':
      case 'group':
      case 'mention':
      case 'reaction':
      case 'media':
        return 'messages';
      case 'call':
        return 'calls';
      case 'friend_request':
        return 'social';
      case 'system':
      case 'status':
      case 'reminder':
        return 'system';
      default:
        return 'default';
    }
  }

  async scheduleLocalNotification(notification: LocalNotification) {
    try {
      // Respect user settings
      const allowed = await this.shouldSendLocalNotification(notification);
      if (!allowed) {
        console.log('Local notification suppressed by user settings');
        return null;
      }

      const androidChannelId = this.resolveAndroidChannel(notification);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: notification.sound !== false,
          badge: notification.badge,
          categoryIdentifier: notification.categoryId,
        },
        // On Android, channelId must be provided via trigger
        trigger: Platform.OS === 'android'
          ? ({ seconds: 1, channelId: androidChannelId } as Notifications.TimeIntervalTriggerInput)
          : null,
      });
      
      return notificationId as string;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  async scheduleDelayedNotification(
    notification: LocalNotification,
    delayInSeconds: number
  ) {
    try {
      const allowed = await this.shouldSendLocalNotification(notification);
      if (!allowed) return null;

      const androidChannelId = this.resolveAndroidChannel(notification);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: notification.sound !== false,
          badge: notification.badge,
          categoryIdentifier: notification.categoryId,
        },
        trigger: {
          seconds: delayInSeconds,
          // @ts-ignore: channelId is valid for Android triggers
          channelId: androidChannelId,
        } as Notifications.TimeIntervalTriggerInput,
      });
      
      return notificationId as string;
    } catch (error) {
      console.error('Error scheduling delayed notification:', error);
      return null;
    }
  }

  async cancelNotification(notificationId: string) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  async clearBadge() {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  }

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

export default new NotificationService();
