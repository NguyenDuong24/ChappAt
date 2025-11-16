/**
 * Social Notification Service
 * Handles social interactions notifications (likes, comments, follows, etc.)
 * Refactored and cleaned up version
 */

import { db } from '../../firebaseConfig';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import CoreNotificationService, { NotificationData } from './NotificationService';

export interface SocialNotificationData extends NotificationData {
  sourceUserId: string;
  sourceUsername?: string;
  sourceProfileUrl?: string;
  targetUserId: string;
  actionType: 'like' | 'comment' | 'follow' | 'mention' | 'share';
  timestamp: Date;
}

class SocialNotificationService {
  private isInitialized = false;

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    
    // Ensure core service is initialized
    if (!CoreNotificationService.isReady()) {
      await CoreNotificationService.initialize();
    }

    this.isInitialized = true;
  }

  /**
   * Send notification for post like
   */
  async sendLikeNotification(sourceUserId: string, targetUserId: string, postId: string): Promise<void> {
    try {
      if (sourceUserId === targetUserId) return; // Don't notify self

      const sourceUser = await this.getUserInfo(sourceUserId);
      if (!sourceUser) return;

      const notificationData: SocialNotificationData = {
        type: 'like',
        sourceUserId,
        sourceUsername: sourceUser.username || sourceUser.displayName,
        sourceProfileUrl: sourceUser.profileUrl || sourceUser.photoURL,
        targetUserId,
        postId,
        actionType: 'like',
        title: `${sourceUser.username || 'Ai đó'} đã thích bài viết của bạn`,
        body: 'Nhấn để xem bài viết',
        timestamp: new Date(),
      };

      await this.saveNotificationToFirestore(notificationData);
      await this.sendPushNotification(targetUserId, notificationData);

    } catch (error) {
      console.error('❌ Failed to send like notification:', error);
    }
  }

  /**
   * Send notification for new comment
   */
  async sendCommentNotification(sourceUserId: string, targetUserId: string, postId: string, commentText: string): Promise<void> {
    try {
      if (sourceUserId === targetUserId) return;

      const sourceUser = await this.getUserInfo(sourceUserId);
      if (!sourceUser) return;

      const truncatedComment = commentText.length > 50 
        ? commentText.substring(0, 50) + '...' 
        : commentText;

      const notificationData: SocialNotificationData = {
        type: 'comment',
        sourceUserId,
        sourceUsername: sourceUser.username || sourceUser.displayName,
        sourceProfileUrl: sourceUser.profileUrl || sourceUser.photoURL,
        targetUserId,
        postId,
        actionType: 'comment',
        title: `${sourceUser.username || 'Ai đó'} đã bình luận bài viết của bạn`,
        body: truncatedComment,
        timestamp: new Date(),
      };

      await this.saveNotificationToFirestore(notificationData);
      await this.sendPushNotification(targetUserId, notificationData);

    } catch (error) {
      console.error('❌ Failed to send comment notification:', error);
    }
  }

  /**
   * Send notification for new follower
   */
  async sendFollowNotification(sourceUserId: string, targetUserId: string): Promise<void> {
    try {
      if (sourceUserId === targetUserId) return;

      const sourceUser = await this.getUserInfo(sourceUserId);
      if (!sourceUser) return;

      const notificationData: SocialNotificationData = {
        type: 'follow',
        sourceUserId,
        sourceUsername: sourceUser.username || sourceUser.displayName,
        sourceProfileUrl: sourceUser.profileUrl || sourceUser.photoURL,
        targetUserId,
        userId: sourceUserId, // For navigation
        actionType: 'follow',
        title: `${sourceUser.username || 'Ai đó'} đã theo dõi bạn`,
        body: 'Nhấn để xem trang cá nhân',
        timestamp: new Date(),
      };

      await this.saveNotificationToFirestore(notificationData);
      await this.sendPushNotification(targetUserId, notificationData);

    } catch (error) {
      console.error('❌ Failed to send follow notification:', error);
    }
  }

  /**
   * Send notification for mention
   */
  async sendMentionNotification(sourceUserId: string, targetUserId: string, postId: string, content: string): Promise<void> {
    try {
      if (sourceUserId === targetUserId) return;

      const sourceUser = await this.getUserInfo(sourceUserId);
      if (!sourceUser) return;

      const truncatedContent = content.length > 50 
        ? content.substring(0, 50) + '...' 
        : content;

      const notificationData: SocialNotificationData = {
        type: 'mention',
        sourceUserId,
        sourceUsername: sourceUser.username || sourceUser.displayName,
        sourceProfileUrl: sourceUser.profileUrl || sourceUser.photoURL,
        targetUserId,
        postId,
        actionType: 'mention',
        title: `${sourceUser.username || 'Ai đó'} đã nhắc đến bạn`,
        body: truncatedContent,
        timestamp: new Date(),
      };

      await this.saveNotificationToFirestore(notificationData);
      await this.sendPushNotification(targetUserId, notificationData);

    } catch (error) {
      console.error('❌ Failed to send mention notification:', error);
    }
  }

  /**
   * Get user information from Firestore
   */
  private async getUserInfo(userId: string): Promise<any> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return { uid: userDoc.id, ...userDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to get user info:', error);
      return null;
    }
  }

  /**
   * Save notification to Firestore
   */
  private async saveNotificationToFirestore(notificationData: SocialNotificationData): Promise<void> {
    try {
      const notificationsRef = collection(db, 'notifications');
      await addDoc(notificationsRef, {
        ...notificationData,
        timestamp: serverTimestamp(),
        read: false,
        createdAt: serverTimestamp(),
      });

    } catch (error) {
      console.error('❌ Failed to save notification to Firestore:', error);
    }
  }

  /**
   * Send push notification to user
   */
  private async sendPushNotification(targetUserId: string, notificationData: SocialNotificationData): Promise<void> {
    try {
      // Get target user's push token
      const userDoc = await getDoc(doc(db, 'users', targetUserId));
      if (!userDoc.exists()) return;

      const userData = userDoc.data();
      const pushToken = userData.pushToken;

      if (!pushToken) {
        console.warn('⚠️ User has no push token');
        return;
      }


      // For local testing, schedule a local notification
      await CoreNotificationService.scheduleLocalNotification({
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData,
        categoryId: 'social',
        sound: true,
      });

    } catch (error) {
      console.error('❌ Failed to send push notification:', error);
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId: string, limit: number = 20): Promise<SocialNotificationData[]> {
    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('targetUserId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const notifications: SocialNotificationData[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        notifications.push({
          ...data,
          id: doc.id,
          timestamp: data.timestamp?.toDate() || new Date(),
        } as unknown as SocialNotificationData);
      });

      // Sort by timestamp (newest first)
      notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return notifications.slice(0, limit);
    } catch (error) {
      console.error('❌ Failed to get user notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await getDoc(notificationRef); // Just to update timestamp, actual read logic would go here
      
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized && CoreNotificationService.isReady();
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.isInitialized = false;
  }
}

// Export singleton instance
export default new SocialNotificationService();
