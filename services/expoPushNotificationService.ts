import * as Notifications from 'expo-notifications';

class ExpoPushNotificationService {
  // URL của Expo Push API
  private readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

  /**
   * Gửi push notification thực sự qua Expo Push API
   * Notification này sẽ hiển thị trên thanh thông báo ngay cả khi app background/tắt
   */
  async sendRealPushNotification(expoPushToken: string, notification: {
    title: string;
    body: string;
    data?: any;
    sound?: string;
    badge?: number;
    priority?: 'default' | 'normal' | 'high';
    channelId?: string;
  }) {
    try {
      // Validate token format
      if (!this.isValidExpoPushToken(expoPushToken)) {
        console.error('❌ Invalid Expo push token format:', expoPushToken);
        return false;
      }

      const message = {
        to: expoPushToken,
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        sound: notification.sound || 'default',
        badge: notification.badge || 1,
        priority: notification.priority || 'high',
        channelId: notification.channelId || 'default',
        // Quan trọng: Đảm bảo notification hiển thị khi app background
        _displayInForeground: true,
      };

      console.log('📤 Sending real push notification:', {
        to: expoPushToken.substring(0, 20) + '...',
        title: notification.title,
        body: notification.body
      });

      const response = await fetch(this.EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();

      if (response.ok && result.data && !result.data.error) {
        console.log('✅ Push notification sent successfully:', result.data.id);
        return true;
      } else {
        console.error('❌ Push notification failed:', result);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending push notification:', error);
      return false;
    }
  }

  /**
   * Gửi push notification hàng loạt (batch)
   */
  async sendBatchPushNotifications(notifications: Array<{
    expoPushToken: string;
    title: string;
    body: string;
    data?: any;
  }>) {
    try {
      const messages = notifications
        .filter(notif => this.isValidExpoPushToken(notif.expoPushToken))
        .map(notif => ({
          to: notif.expoPushToken,
          title: notif.title,
          body: notif.body,
          data: notif.data || {},
          sound: 'default',
          badge: 1,
          priority: 'high',
          _displayInForeground: true,
        }));

      if (messages.length === 0) {
        console.log('❌ No valid tokens for batch send');
        return [];
      }

      console.log(`📤 Sending ${messages.length} batch push notifications`);

      const response = await fetch(this.EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Batch push notifications sent:', result.data?.length || 0);
        return result.data || [];
      } else {
        console.error('❌ Batch push notifications failed:', result);
        return [];
      }
    } catch (error) {
      console.error('❌ Error sending batch push notifications:', error);
      return [];
    }
  }

  /**
   * Kiểm tra format của Expo push token
   */
  private isValidExpoPushToken(token: string): boolean {
    return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
  }

  /**
   * Gửi notification với fallback
   * - Thử real push notification trước
   * - Nếu fail thì fallback về local notification
   */
  async sendNotificationWithFallback(expoPushToken: string, notification: {
    title: string;
    body: string;
    data?: any;
  }) {
    try {
      // Thử gửi real push notification trước
      const pushSuccess = await this.sendRealPushNotification(expoPushToken, notification);
      
      if (pushSuccess) {
        console.log('✅ Real push notification sent successfully');
        return true;
      }

      // Fallback to local notification
      console.log('🔄 Falling back to local notification');
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: 'default',
        },
        trigger: null, // Show immediately
      });

      console.log('✅ Local notification sent as fallback');
      return true;
    } catch (error) {
      console.error('❌ Error sending notification with fallback:', error);
      return false;
    }
  }

  /**
   * Test push notification
   */
  async testPushNotification(expoPushToken: string) {
    return await this.sendRealPushNotification(expoPushToken, {
      title: '🧪 Test Notification', 
      body: 'This is a test push notification from ChappAt!',
      data: { test: true, timestamp: new Date().toISOString() },
      priority: 'high'
    });
  }
}

export default new ExpoPushNotificationService();
