import { NotificationData, LocalNotification } from '../services/notificationService';

export class NotificationHelpers {
  // Tạo notification cho tin nhắn mới
  static createMessageNotification(
    senderName: string,
    messageText: string,
    chatId: string,
    senderId: string
  ): LocalNotification {
    return {
      title: `💬 ${senderName}`,
      body: messageText.length > 50 ? `${messageText.substring(0, 50)}...` : messageText,
      data: {
        type: 'message',
        chatId,
        userId: senderId,
      },
      categoryId: 'message',
      sound: true,
    };
  }

  // Tạo notification cho cuộc gọi
  static createCallNotification(
    callerName: string,
    callType: 'video' | 'audio',
    callId: string,
    callerId: string
  ): LocalNotification {
    const emoji = callType === 'video' ? '📹' : '📞';
    return {
      title: `${emoji} ${callerName}`,
      body: `${callType === 'video' ? 'Video' : 'Voice'} call incoming`,
      data: {
        type: 'call',
        callId,
        userId: callerId,
        callType,
      },
      categoryId: 'call',
      sound: true,
    };
  }

  // Tạo notification cho tin nhắn nhóm
  static createGroupMessageNotification(
    groupName: string,
    senderName: string,
    messageText: string,
    groupId: string,
    senderId: string
  ): LocalNotification {
    return {
      title: `👥 ${groupName}`,
      body: `${senderName}: ${messageText.length > 40 ? `${messageText.substring(0, 40)}...` : messageText}`,
      data: {
        type: 'group',
        groupId,
        userId: senderId,
      },
      categoryId: 'message',
      sound: true,
    };
  }

  // Tạo notification cho lời mời kết bạn
  static createFriendRequestNotification(
    requesterName: string,
    requesterId: string
  ): LocalNotification {
    return {
      title: '👋 Friend Request',
      body: `${requesterName} sent you a friend request`,
      data: {
        type: 'friend_request',
        userId: requesterId,
      },
      categoryId: 'friend_request',
      sound: true,
    };
  }

  // Tạo notification cho hệ thống
  static createSystemNotification(
    title: string,
    message: string,
    data?: any
  ): LocalNotification {
    return {
      title: `⚙️ ${title}`,
      body: message,
      data: {
        type: 'system',
        ...data,
      },
      sound: false,
    };
  }

  // Tạo notification cho nhắc nhở
  static createReminderNotification(
    title: string,
    message: string,
    data?: any
  ): LocalNotification {
    return {
      title: `⏰ ${title}`,
      body: message,
      data: {
        type: 'reminder',
        ...data,
      },
      sound: true,
    };
  }

  // Tạo notification cho cập nhật trạng thái online
  static createOnlineStatusNotification(
    userName: string,
    isOnline: boolean,
    userId: string
  ): LocalNotification {
    const status = isOnline ? 'online' : 'offline';
    const emoji = isOnline ? '🟢' : '⚫';
    
    return {
      title: `${emoji} ${userName}`,
      body: `is now ${status}`,
      data: {
        type: 'status',
        userId,
        status,
      },
      sound: false,
    };
  }

  // Tạo notification cho reaction tin nhắn
  static createReactionNotification(
    reactorName: string,
    reaction: string,
    chatId: string,
    reactorId: string
  ): LocalNotification {
    return {
      title: `${reaction} ${reactorName}`,
      body: 'reacted to your message',
      data: {
        type: 'reaction',
        chatId,
        userId: reactorId,
        reaction,
      },
      sound: false,
    };
  }

  // Tạo notification cho mention trong nhóm
  static createMentionNotification(
    groupName: string,
    mentionerName: string,
    messageText: string,
    groupId: string,
    mentionerId: string
  ): LocalNotification {
    return {
      title: `📢 ${groupName}`,
      body: `${mentionerName} mentioned you: ${messageText.length > 30 ? `${messageText.substring(0, 30)}...` : messageText}`,
      data: {
        type: 'mention',
        groupId,
        userId: mentionerId,
      },
      categoryId: 'message',
      sound: true,
    };
  }

  // Tạo notification cho file/media được gửi
  static createMediaNotification(
    senderName: string,
    mediaType: 'photo' | 'video' | 'document' | 'audio',
    chatId: string,
    senderId: string
  ): LocalNotification {
    const getMediaEmoji = (type: string) => {
      switch (type) {
        case 'photo': return '📸';
        case 'video': return '🎥';
        case 'document': return '📄';
        case 'audio': return '🎵';
        default: return '📎';
      }
    };

    return {
      title: `${getMediaEmoji(mediaType)} ${senderName}`,
      body: `sent a ${mediaType}`,
      data: {
        type: 'media',
        chatId,
        userId: senderId,
        mediaType,
      },
      categoryId: 'message',
      sound: true,
    };
  }

  // Format notification data cho Firebase
  static formatForFirebase(notification: LocalNotification) {
    return {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        notification: {
          sound: notification.sound !== false ? 'default' : undefined,
          channelId: this.getChannelId(notification.data?.type),
        },
      },
      apns: {
        payload: {
          aps: {
            sound: notification.sound !== false ? 'default' : undefined,
            badge: notification.badge,
            category: notification.categoryId,
          },
        },
      },
    };
  }

  private static getChannelId(type?: string): string {
    switch (type) {
      case 'message':
      case 'group':
      case 'mention':
        return 'messages';
      case 'call':
        return 'calls';
      case 'friend_request':
        return 'social';
      case 'system':
        return 'system';
      default:
        return 'default';
    }
  }

  // Tạo silent notification (chỉ update data, không hiển thị)
  static createSilentNotification(data: NotificationData): LocalNotification {
    return {
      title: '',
      body: '',
      data,
      sound: false,
    };
  }

  // Kiểm tra xem có nên hiển thị notification không
  static shouldShowNotification(
    notificationType: string,
    userSettings: any,
    appState: 'active' | 'background' | 'inactive'
  ): boolean {
    // Không hiển thị nếu app đang active và là tin nhắn thường
    if (appState === 'active' && notificationType === 'message') {
      return false;
    }

    // Kiểm tra user settings
    if (userSettings) {
      switch (notificationType) {
        case 'message':
          return userSettings.messageNotifications !== false;
        case 'call':
          return userSettings.callNotifications !== false;
        case 'group':
          return userSettings.groupNotifications !== false;
        case 'friend_request':
          return userSettings.socialNotifications !== false;
        default:
          return true;
      }
    }

    return true;
  }
}

export default NotificationHelpers;
