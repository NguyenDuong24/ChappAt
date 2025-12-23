import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';

export interface NotificationData {
  type: string;
  userId?: string;
  postId?: string;
  commentId?: string;
  chatId?: string;
  groupId?: string;
  senderId?: string;
  receiverId?: string;
  hashtag?: string;
  [key: string]: any;
}

class NotificationNavigationService {
  private isInitialized = false;
  private navigationListener: any = null;

  initialize() {
    if (this.isInitialized) return;

    console.log('🧭 Initializing notification navigation service...');

    // Listen for notification responses (when user taps on notification)
    this.navigationListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );

    this.isInitialized = true;
    console.log('✅ Notification navigation service initialized');
  }

  private async handleNotificationResponse(response: Notifications.NotificationResponse) {
    console.log('🧭 Notification tapped:', response);

    const data = response.notification.request.content.data as NotificationData;

    if (!data || !data.type) {
      console.log('❌ No navigation data in notification');
      return;
    }

    // Wait a bit for app to fully load if it was closed
    const currentState = AppState.currentState;
    if (currentState !== 'active') {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.navigateBasedOnNotificationType(data);
  }

  private navigateBasedOnNotificationType(data: NotificationData) {
    console.log('🧭 Navigating based on notification type:', data.type, data);

    try {
      switch (data.type) {
        case 'like':
        case 'comment':
          this.navigateToPost(data);
          break;

        case 'follow':
          this.navigateToProfile(data);
          break;

        case 'mention':
          this.navigateToMention(data);
          break;

        case 'message':
          this.navigateToChat(data);
          break;

        case 'group_message':
          this.navigateToGroup(data);
          break;

        case 'group_invite':
          this.navigateToGroupInvite(data);
          break;

        case 'hashtag':
          this.navigateToHashtag(data);
          break;

        case 'friend_request':
          this.navigateToFriendRequests();
          break;

        case 'call':
          this.navigateToCall(data);
          break;

        default:
          console.log('❓ Unknown notification type:', data.type);
          this.navigateToNotifications();
          break;
      }
    } catch (error) {
      console.error('❌ Error navigating from notification:', error);
      // Fallback to notifications screen
      this.navigateToNotifications();
    }
  }

  private navigateToPost(data: NotificationData) {
    if (data.postId) {
      console.log('🧭 Navigating to post:', data.postId);

      // Try available navigation paths
      const possiblePaths = [
        `/(screens)/social/PostDetailScreen?postId=${data.postId}`,
        `/explore/PostDetailScreen?postId=${data.postId}`,
        `/HashtagPostsScreen?postId=${data.postId}`,
      ];

      // Try each path
      let navigationSuccess = false;

      for (const path of possiblePaths) {
        try {
          console.log('🔄 Trying navigation path:', path);
          router.push(path as any);
          navigationSuccess = true;
          console.log('✅ Navigation successful with path:', path);
          break;
        } catch (error) {
          console.log('❌ Navigation failed for path:', path, error);
        }
      }

      // Final fallback
      if (!navigationSuccess) {
        console.log('🔄 All paths failed, using final fallback...');
        try {
          // Navigate to a screen that definitely exists and show alert
          router.push('/(screens)/social/NotificationsScreen' as any);
          setTimeout(() => {
            console.log(`📍 Should show post: ${data.postId}`);
            // Could show an alert here
          }, 1000);
        } catch (fallbackError) {
          console.log('❌ Even fallback navigation failed');
        }
      }
    } else {
      console.log('❌ No postId in notification data');
      this.navigateToNotifications();
    }
  }

  private navigateToProfile(data: NotificationData) {
    if (data.userId || data.senderId) {
      const userId = data.userId || data.senderId;
      console.log('🧭 Navigating to profile:', userId);

      // Try available navigation paths
      const possiblePaths = [
        `/(screens)/user/UserProfileScreen?userId=${userId}`,
      ];

      // Try each path
      let navigationSuccess = false;

      for (const path of possiblePaths) {
        try {
          console.log('🔄 Trying navigation path:', path);
          router.push(path as any);
          navigationSuccess = true;
          console.log('✅ Navigation successful with path:', path);
          break;
        } catch (error) {
          console.log('❌ Navigation failed for path:', path, error);
        }
      }

      // Final fallback
      if (!navigationSuccess) {
        console.log('🔄 All paths failed, using final fallback...');
        try {
          router.push('/(screens)/social/NotificationsScreen' as any);
          setTimeout(() => {
            console.log(`📍 Should show profile: ${userId}`);
          }, 1000);
        } catch (fallbackError) {
          console.log('❌ Even fallback navigation failed');
        }
      }
    } else {
      console.log('❌ No userId in notification data');
      this.navigateToNotifications();
    }
  }

  private navigateToMention(data: NotificationData) {
    if (data.postId) {
      console.log('🧭 Navigating to mentioned post:', data.postId);
      router.push(`/explore/${data.postId}`);
    } else if (data.commentId) {
      console.log('🧭 Navigating to mentioned comment:', data.commentId);
      // Navigate to the post containing the comment
      router.push(`/explore/${data.postId || 'unknown'}`);
    } else {
      console.log('❌ No postId or commentId in mention notification');
      this.navigateToNotifications();
    }
  }

  private navigateToChat(data: NotificationData) {
    if (data.chatId) {
      console.log('🧭 Navigating to chat:', data.chatId);

      // Try available chat paths (check what exists in your app)
      const possiblePaths = [
        `/chat/${data.chatId}`, // If you have dynamic chat routes
      ];

      // Try each path
      let navigationSuccess = false;

      for (const path of possiblePaths) {
        try {
          console.log('🔄 Trying navigation path:', path);
          router.push(path as any);
          navigationSuccess = true;
          console.log('✅ Navigation successful with path:', path);
          break;
        } catch (error) {
          console.log('❌ Navigation failed for path:', path, error);
        }
      }

      // Final fallback - navigate to a messages-related screen if available
      if (!navigationSuccess) {
        console.log('🔄 All paths failed, using final fallback...');
        try {
          // Try to navigate to any message-related screen that exists
          router.push('/(screens)/social/NotificationsScreen' as any);
          setTimeout(() => {
            console.log(`📍 Should open chat: ${data.chatId}`);
          }, 1000);
        } catch (fallbackError) {
          console.log('❌ Even fallback navigation failed');
        }
      }
    } else if (data.senderId) {
      console.log('🧭 Navigating to chat with sender:', data.senderId);
      try {
        // Navigate to user profile as fallback for chat
        router.push(`/(screens)/user/UserProfileScreen?userId=${data.senderId}` as any);
      } catch (error) {
        this.navigateToNotifications();
      }
    } else {
      console.log('❌ No chatId or senderId in message notification');
      this.navigateToNotifications();
    }
  }

  private navigateToGroup(data: NotificationData) {
    if (data.groupId) {
      console.log('🧭 Navigating to group:', data.groupId);
      router.push(`/groups/${data.groupId}`);
    } else {
      console.log('❌ No groupId in group notification');
      this.navigateToNotifications();
    }
  }

  private navigateToGroupInvite(data: NotificationData) {
    if (data.groupId) {
      console.log('🧭 Navigating to group invite:', data.groupId);
      // Navigate to groups tab first, then specific group
      router.push('/(tabs)/groups');
      setTimeout(() => {
        router.push(`/groups/${data.groupId}`);
      }, 500);
    } else {
      console.log('❌ No groupId in group invite notification');
      router.push('/(tabs)/groups');
    }
  }

  private navigateToHashtag(data: NotificationData) {
    if (data.hashtag) {
      console.log('🧭 Navigating to hashtag:', data.hashtag);
      router.push(`/HashtagPostsScreen?hashtag=${encodeURIComponent(data.hashtag)}`);
    } else {
      console.log('❌ No hashtag in hashtag notification');
      this.navigateToNotifications();
    }
  }

  private navigateToNotifications() {
    console.log('🧭 Navigating to notifications screen');
    try {
      router.push('/(screens)/social/NotificationsScreen' as any);
    } catch (error) {
      console.log('❌ Notifications navigation failed:', error);
      // Last fallback - go to home
      router.push('/(tabs)/home');
    }
  }

  private navigateToFriendRequests() {
    console.log('🧭 Navigating to friend requests');
    try {
      router.push('/AddFriend' as any);
    } catch (error) {
      console.log('❌ Friend requests navigation failed:', error);
      this.navigateToNotifications();
    }
  }


  private navigateToCall(data: NotificationData) {
    console.log('🧭 Navigating to call:', data);

    try {
      // Build query parameters from notification data
      const params = new URLSearchParams();

      if (data.callId) params.append('callId', data.callId);
      if (data.callerId) params.append('callerId', data.callerId);
      if (data.meetingId) params.append('meetingId', data.meetingId);
      if (data.callType) params.append('callType', data.callType);
      if (data.senderId) params.append('senderId', data.senderId);
      if (data.senderName) params.append('senderName', data.senderName);
      if (data.senderAvatar) params.append('senderAvatar', data.senderAvatar);

      const queryString = params.toString();
      const path = queryString ? `/(screens)/call/IncomingCallScreen?${queryString}` : '/(screens)/call/IncomingCallScreen';

      router.push(path as any);
      console.log('✅ Navigation to call successful:', path);
    } catch (error) {
      console.log('❌ Call navigation failed:', error);
      this.navigateToNotifications();
    }
  }

  // Public method to manually trigger navigation (useful for testing)
  public triggerNavigation(data: NotificationData) {
    this.navigateBasedOnNotificationType(data);
  }

  // Public method to navigate to specific screen with notification context
  public navigateWithNotificationContext(screenName: string, params?: any) {
    console.log('🧭 Navigating with notification context:', screenName, params);

    try {
      if (params) {
        const queryParams = new URLSearchParams(params).toString();
        router.push(`${screenName}?${queryParams}` as any);
      } else {
        router.push(screenName as any);
      }
    } catch (error) {
      console.error('❌ Error navigating with context:', error);
      this.navigateToNotifications();
    }
  }

  // Public method for testing notification navigation
  async handleNotificationTap(data: NotificationData): Promise<boolean> {
    console.log('🧪 Test navigation with data:', data);

    if (!data || !data.type) {
      console.log('❌ No navigation data provided');
      return false;
    }

    try {
      switch (data.type) {
        case 'post':
        case 'like':
        case 'comment':
          this.navigateToPost(data);
          break;
        case 'follow':
        case 'profile':
          this.navigateToProfile(data);
          break;
        case 'mention':
        case 'tag':
          this.navigateToMention(data);
          break;
        case 'message':
        case 'chat':
          this.navigateToChat(data);
          break;
        case 'group':
        case 'group_message':
          this.navigateToGroup(data);
          break;
        case 'group_invite':
          this.navigateToGroupInvite(data);
          break;
        case 'hashtag':
          this.navigateToHashtag(data);
          break;
        case 'friend_request':
          this.navigateToFriendRequests();
          break;

        case 'call':
          this.navigateToCall(data);
          break;

        default:
          console.log('⚠️ Unknown notification type:', data.type);
          this.navigateToNotifications();
          break;
      }

      return true;
    } catch (error) {
      console.error('❌ Navigation error:', error);
      return false;
    }
  }

  cleanup() {
    if (this.navigationListener) {
      Notifications.removeNotificationSubscription(this.navigationListener);
      this.navigationListener = null;
    }
    this.isInitialized = false;
    console.log('✅ Notification navigation service cleaned up');
  }

  isReady() {
    return this.isInitialized;
  }
}

// Export singleton instance
export default new NotificationNavigationService();
