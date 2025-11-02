/**
 * Notification Navigation Service
 * Handles navigation from notification taps
 * Refactored and simplified version
 */

import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';
import CoreNotificationService, { NotificationData } from './NotificationService';

class NotificationNavigationService {
  private isInitialized = false;
  private navigationListener: any = null;

  /**
   * Initialize the navigation service
   */
  initialize(): void {
    if (this.isInitialized) return;

    console.log('🧭 Initializing Notification Navigation Service...');

    // Listen for notification responses (when user taps on notification)
    this.navigationListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );

    this.isInitialized = true;
    console.log('✅ Notification Navigation Service initialized');
  }

  /**
   * Handle notification response (when user taps notification)
   */
  private async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    console.log('🧭 Notification tapped:', response);
    
    const data = response.notification.request.content.data as NotificationData;
    
    if (!data || !data.type) {
      console.log('❌ No navigation data in notification');
      this.navigateToFallback();
      return;
    }

    // Wait a bit for app to fully load if it was closed
    const currentState = AppState.currentState;
    if (currentState !== 'active') {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await this.handleNotificationTap(data);
  }

  /**
   * Handle notification tap with navigation data
   */
  async handleNotificationTap(data: NotificationData): Promise<boolean> {
    console.log('🧭 Handling notification tap:', data);

    if (!data || !data.type) {
      console.log('❌ Invalid notification data');
      this.navigateToFallback();
      return false;
    }

    try {
      switch (data.type) {
        case 'post':
        case 'like':
        case 'comment':
          return this.navigateToPost(data);

        case 'follow':
          return this.navigateToProfile(data);

        case 'mention':
          return this.navigateToMention(data);

        case 'message':
          return this.navigateToChat(data);

        case 'group':
          return this.navigateToGroup(data);

        case 'call':
          // Handle call notifications - could navigate to call history or profile
          return this.navigateToProfile(data);

        case 'friend_request':
          // Navigate to friend requests or profile
          return this.navigateToProfile(data);

        case 'hot_spot':
        case 'event_pass':
          // Navigate to hot spots or specific content
          this.navigateToFallback();
          return true;

        case 'system':
          // System notifications go to notifications screen
          this.navigateToFallback();
          return true;

        default:
          console.log('⚠️ Unknown notification type:', data.type);
          this.navigateToFallback();
          return false;
      }
    } catch (error) {
      console.error('❌ Navigation error:', error);
      this.navigateToFallback();
      return false;
    }
  }

  /**
   * Navigate to post detail
   */
  private navigateToPost(data: NotificationData): boolean {
    try {
      if (!data.postId) {
        console.warn('⚠️ No postId in notification data');
        this.navigateToFallback();
        return false;
      }

      console.log('🧭 Navigating to post:', data.postId);
      router.push(`/PostDetailScreen?postId=${data.postId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to navigate to post:', error);
      this.navigateToFallback();
      return false;
    }
  }

  /**
   * Navigate to user profile
   */
  private navigateToProfile(data: NotificationData): boolean {
    try {
      const userId = data.userId || data.senderId;
      if (!userId) {
        console.warn('⚠️ No userId in notification data');
        this.navigateToFallback();
        return false;
      }

      console.log('🧭 Navigating to profile:', userId);
      router.push(`/UserProfileScreen?userId=${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to navigate to profile:', error);
      this.navigateToFallback();
      return false;
    }
  }

  /**
   * Navigate to mention (usually a post)
   */
  private navigateToMention(data: NotificationData): boolean {
    // Mentions usually link to posts
    return this.navigateToPost(data);
  }

  /**
   * Navigate to chat
   */
  private navigateToChat(data: NotificationData): boolean {
    try {
      if (!data.chatId) {
        console.warn('⚠️ No chatId in notification data');
        this.navigateToFallback();
        return false;
      }

      console.log('🧭 Navigating to chat:', data.chatId);
      router.push(`/chat/${data.chatId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to navigate to chat:', error);
      this.navigateToFallback();
      return false;
    }
  }

  /**
   * Navigate to group
   */
  private navigateToGroup(data: NotificationData): boolean {
    try {
      if (!data.groupId) {
        console.warn('⚠️ No groupId in notification data');
        this.navigateToFallback();
        return false;
      }

      console.log('🧭 Navigating to group:', data.groupId);
      router.push(`/groups/${data.groupId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to navigate to group:', error);
      this.navigateToFallback();
      return false;
    }
  }

  /**
   * Navigate to fallback screen (notifications list)
   */
  private navigateToFallback(): void {
    try {
      console.log('🧭 Navigating to fallback (notifications)');
      router.push('/NotificationsScreen');
    } catch (error) {
      console.error('❌ Failed to navigate to fallback:', error);
      // Last resort - navigate to home
      router.push('/(tabs)/home');
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Cleanup service
   */
  cleanup(): void {
    if (this.navigationListener) {
      Notifications.removeNotificationSubscription(this.navigationListener);
      this.navigationListener = null;
    }
    this.isInitialized = false;
    console.log('✅ Notification Navigation Service cleaned up');
  }
}

// Export singleton instance
export default new NotificationNavigationService();
