import notificationIntegrationService from '@/services/notificationIntegrationService';
import { Alert } from 'react-native';

// Helper functions để sử dụng notification service dễ dàng hơn

export const NotificationHelper = {
  // Gửi notification tin nhắn
  async sendMessageNotification(
    receiverId: string,
    senderName: string,
    messageText: string,
    chatId: string,
    isGroup: boolean = false
  ) {
    try {
      await notificationIntegrationService.sendNotificationToUser(receiverId, {
        title: isGroup ? `📱 Group Message` : `💬 ${senderName}`,
        body: isGroup ? `${senderName}: ${messageText}` : messageText,
        data: {
          type: isGroup ? 'group' : 'message',
          chatId,
          senderId: senderName,
        },
        type: isGroup ? 'group' : 'message'
      });
    } catch (error) {
      console.error('Error sending message notification:', error);
    }
  },

  // Gửi notification cuộc gọi
  async sendCallNotification(
    receiverId: string,
    callerName: string,
    callId: string,
    callType: 'video' | 'audio' = 'audio'
  ) {
    try {
      const emoji = callType === 'video' ? '📹' : '📞';
      await notificationIntegrationService.sendNotificationToUser(receiverId, {
        title: `${emoji} ${callerName}`,
        body: `Incoming ${callType} call`,
        data: {
          type: 'call',
          callId,
          callerId: callerName,
          callType,
        },
        type: 'call'
      });
    } catch (error) {
      console.error('Error sending call notification:', error);
    }
  },

  // Gửi notification friend request
  async sendFriendRequestNotification(
    receiverId: string,
    senderName: string,
    requestId: string
  ) {
    try {
      await notificationIntegrationService.sendNotificationToUser(receiverId, {
        title: '👋 Friend Request',
        body: `${senderName} sent you a friend request`,
        data: {
          type: 'friend_request',
          requestId,
          fromUserId: senderName,
        },
        type: 'friend_request'
      });
    } catch (error) {
      console.error('Error sending friend request notification:', error);
    }
  },

  // Gửi notification mention
  async sendMentionNotification(
    receiverId: string,
    mentionerName: string,
    messageText: string,
    chatId: string
  ) {
    try {
      await notificationIntegrationService.sendNotificationToUser(receiverId, {
        title: `🏷️ ${mentionerName} mentioned you`,
        body: messageText,
        data: {
          type: 'mention',
          chatId,
          mentionerId: mentionerName,
        },
        type: 'mention'
      });
    } catch (error) {
      console.error('Error sending mention notification:', error);
    }
  },

  // Gửi notification reaction
  async sendReactionNotification(
    receiverId: string,
    reactorName: string,
    reaction: string,
    messageText: string
  ) {
    try {
      await notificationIntegrationService.sendNotificationToUser(receiverId, {
        title: `${reaction} ${reactorName} reacted`,
        body: `to: "${messageText.substring(0, 30)}..."`,
        data: {
          type: 'reaction',
          reactorName,
          reaction,
        },
        type: 'reaction'
      });
    } catch (error) {
      console.error('Error sending reaction notification:', error);
    }
  },

  // Hiển thị local notification
  async showLocalNotification(
    title: string,
    body: string,
    data?: any,
    delayInSeconds?: number
  ) {
    try {
      return await notificationIntegrationService.scheduleLocalNotification({
        title,
        body,
        data,
        delayInSeconds
      });
    } catch (error) {
      console.error('Error showing local notification:', error);
      return null;
    }
  },

  // Test notification system
  async testNotificationSystem() {
    try {
      const result = await notificationIntegrationService.testNotificationSystem();
      
      let message = 'Notification System Test Results:\n';
      message += `FCM Token: ${result.fcmToken ? '✅' : '❌'}\n`;
      message += `Expo Push Token: ${result.expoPushToken ? '✅' : '❌'}\n`;
      message += `Local Notification: ${result.localNotification ? '✅' : '❌'}`;
      
      if (result.error) {
        message += `\nError: ${result.error}`;
      }
      
      Alert.alert('🧪 Notification Test', message);
      return result;
    } catch (error) {
      Alert.alert('❌ Test Failed', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  },

  // Lấy tokens
  async getTokens() {
    try {
      const [fcmToken, expoPushToken] = await Promise.all([
        notificationIntegrationService.getFCMToken(),
        notificationIntegrationService.getExpoPushToken()
      ]);
      
      return { fcmToken, expoPushToken };
    } catch (error) {
      console.error('Error getting tokens:', error);
      return { fcmToken: null, expoPushToken: null };
    }
  },

  // Clear tất cả notifications
  async clearAllNotifications() {
    try {
      await notificationIntegrationService.clearAllNotifications();
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }
};

// Export default for easy import
export default NotificationHelper;
