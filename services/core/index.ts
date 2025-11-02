/**
 * Notification Services Index
 * Central export point for all notification-related services
 * Provides clean imports for the rest of the application
 */

// Core services
export { default as CoreNotificationService } from './NotificationService';
export { default as SocialNotificationService } from './SocialNotificationService';
export { default as NotificationNavigationService } from './NotificationNavigationService';

// Provider
export { NotificationProvider, useNotificationContext } from './NotificationProvider';

// Types
export type { NotificationData, LocalNotification } from './NotificationService';
export type { SocialNotificationData } from './SocialNotificationService';

// Re-export commonly used interfaces
export interface NotificationContextAPI {
  // Core state
  pushToken: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Local notifications
  scheduleNotification: (notification: any) => Promise<string | null>;
  cancelNotification: (id: string) => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
  clearBadge: () => Promise<void>;
  
  // Social notifications
  sendLikeNotification: (targetUserId: string, postId: string) => Promise<void>;
  sendCommentNotification: (targetUserId: string, postId: string, comment: string) => Promise<void>;
  sendFollowNotification: (targetUserId: string) => Promise<void>;
  sendMentionNotification: (targetUserId: string, postId: string, content: string) => Promise<void>;
  
  // Utility
  clearError: () => void;
  refresh: () => Promise<void>;
}

/**
 * Quick start guide:
 * 
 * 1. Wrap your app with NotificationProvider:
 *    <NotificationProvider>
 *      <App />
 *    </NotificationProvider>
 * 
 * 2. Use the context in components:
 *    const { sendLikeNotification, pushToken } = useNotificationContext();
 * 
 * 3. Send notifications:
 *    await sendLikeNotification(targetUserId, postId);
 * 
 * 4. Handle navigation automatically - services are initialized by provider
 */
