/**
 * Notification Navigation Service
 * Handles navigation from notification taps
 * Refactored and simplified version
 */

import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';
import CoreNotificationService, { NotificationData } from './NotificationService';
import { auth } from '../../firebaseConfig';

class NotificationNavigationService {
  private isInitialized = false;
  private navigationListener: any = null;
  private hasHandledInitialTap = false;

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

    // Handle cold-start case: app opened by tapping a notification
    (async () => {
      try {
        const last = await Notifications.getLastNotificationResponseAsync();
        if (last && !this.hasHandledInitialTap) {
          this.hasHandledInitialTap = true;
          const data = last.notification.request.content.data as NotificationData;
          if (data && (data as any).type) {
            console.log('🧭 Handling cold-start notification tap');
            await this.handleNotificationTap(data);
          }
        }
      } catch (e) {
        console.warn('⚠️ Failed to handle cold-start notification tap:', e);
      }
    })();

    this.isInitialized = true;
    console.log('✅ Notification Navigation Service initialized');
  }

  /**
   * Handle notification response (when user taps notification)
   */
  private async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    console.log('🧭 Notification tapped:', response);
    this.hasHandledInitialTap = true;
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
      // Normalize type to support legacy/custom variants
      const rawType = String((data as any).type || '').toLowerCase();
      const normalizedType = rawType.startsWith('hotspot') ? 'hot_spot' : rawType;

      switch (normalizedType) {
        case 'post':
        case 'like':
        case 'comment':
          return this.navigateToPost(data);

        case 'follow':
        case 'accepted_invite':
          return this.navigateToProfile(data);

        case 'mention':
          return this.navigateToMention(data);

        case 'message':
          return this.navigateToChat(data);

        case 'group':
          return this.navigateToGroup(data);

        case 'call': {
          // Ensure we have a senderId or userId to navigate to
          const enriched = {
            ...data,
            senderId: (data as any).senderId || (data as any).from || (data as any).userId,
          } as NotificationData;
          return this.navigateToProfile(enriched);
        }

        case 'friend_request':
          if (data.userId || (data as any).senderId) {
            return this.navigateToProfile(data);
          } else {
            return this.navigateToInvitations();
          }

        case 'hot_spot':
          return this.navigateToHotSpot(data);

        case 'event_pass':
          return this.navigateToOwnProfile();

        case 'system':
          this.navigateToFallback();
          return true;

        default:
          console.log('⚠️ Unknown notification type:', rawType);
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
      router.push(`/(screens)/social/PostDetailScreen?postId=${data.postId}`);
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
      router.push(`/(screens)/user/UserProfileScreen?userId=${userId}`);
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
   * Navigate to hot spot
   */
  private navigateToHotSpot(data: NotificationData): boolean {
    try {
      if (data.hotSpotId) {
        console.log('🧭 Navigating to hot spot:', data.hotSpotId);
        router.push(`/(screens)/hotspots/HotSpotDetailScreen?hotSpotId=${data.hotSpotId}`);
        return true;
      } else {
        // Navigate to hot spots list
        console.log('🧭 Navigating to hot spots list');
        router.push('/(screens)/hotspots/HotSpotsScreen');
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to navigate to hot spot:', error);
      this.navigateToFallback();
      return false;
    }
  }

  /**
   * Navigate to invitations/friend requests
   */
  private navigateToInvitations(): boolean {
    try {
      console.log('🧭 Navigating to invitations');
      router.push('/InvitationsScreen');
      return true;
    } catch (error) {
      console.error('❌ Failed to navigate to invitations:', error);
      this.navigateToFallback();
      return false;
    }
  }

  /**
   * Navigate to own profile
   */
  private navigateToOwnProfile(): boolean {
    try {
      // Get current user ID from auth
      const userId = auth.currentUser?.uid;
      if (userId) {
        console.log('🧭 Navigating to own profile:', userId);
        router.push(`/(screens)/user/UserProfileScreen?userId=${userId}`);
        return true;
      } else {
        console.warn('⚠️ No authenticated user');
        this.navigateToFallback();
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to navigate to own profile:', error);
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
      router.push('/(screens)/social/NotificationsScreen');
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
