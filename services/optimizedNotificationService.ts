import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  onSnapshot, 
  getDocs,
  doc,
  updateDoc,
  writeBatch,
  Unsubscribe,
  startAfter,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import connectionManager from './connectionManager';
import userCacheService from './userCacheService';

export interface OptimizedNotification {
  id: string;
  type: 'message' | 'call' | 'friend_request' | 'hot_spot' | 'event_pass' | 'system' | 'like' | 'comment' | 'follow' | 'mention';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  data?: any;
  senderAvatar?: string;
  senderName?: string;
  senderId?: string;
  receiverId?: string;
  priority?: 'low' | 'normal' | 'high';
}

interface NotificationCache {
  notifications: OptimizedNotification[];
  lastDoc?: DocumentSnapshot;
  hasMore: boolean;
  lastUpdated?: number;
}

class OptimizedNotificationService {
  private notificationCache = new Map<string, NotificationCache>();
  private listeners = new Map<string, Unsubscribe>();
  private readonly CACHE_DURATION = 3 * 60 * 1000; // 3 minutes
  private readonly PAGE_SIZE = 20;

  // Cache management
  private setCache(userId: string, data: NotificationCache): void {
    this.notificationCache.set(userId, {
      ...data,
      lastUpdated: Date.now()
    });
  }

  private getCache(userId: string): NotificationCache | null {
    const cached = this.notificationCache.get(userId);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - (cached.lastUpdated || 0) > this.CACHE_DURATION) {
      this.notificationCache.delete(userId);
      return null;
    }
    
    return cached;
  }

  // Optimized notification loading with pagination and caching
  async loadNotifications(
    userId: string, 
    refresh: boolean = false, 
    category?: string,
    filter?: 'all' | 'unread'
  ): Promise<{
    notifications: OptimizedNotification[];
    hasMore: boolean;
  }> {
    const cacheKey = `${userId}_${category || 'all'}_${filter || 'all'}`;
    
    // Check cache first
    if (!refresh) {
      const cached = this.getCache(cacheKey);
      if (cached) {
        console.log('🚀 Using cached notifications');
        return {
          notifications: cached.notifications,
          hasMore: cached.hasMore
        };
      }
    }

    try {
      const notificationsRef = collection(db, 'notifications');
      
      // Build query with simplified conditions to avoid complex indexes
      let q = query(
        notificationsRef,
        where('receiverId', '==', userId),
        firestoreLimit(this.PAGE_SIZE * 2) // Get more to filter client-side
      );

      const snapshot = await getDocs(q);
      let notifications: OptimizedNotification[] = [];
      const userIds = new Set<string>();

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const notification: OptimizedNotification = {
          id: doc.id,
          type: data.type || 'system',
          title: data.title || 'Thông báo mới',
          message: data.message || data.body || '',
          timestamp: data.timestamp?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          isRead: data.isRead || false,
          data: data.data || {},
          senderAvatar: data.senderAvatar,
          senderName: data.senderName,
          senderId: data.senderId,
          receiverId: data.receiverId,
          priority: data.priority || 'normal'
        };
        
        notifications.push(notification);
        
        // Collect sender IDs for batch user loading
        if (notification.senderId && !userIds.has(notification.senderId)) {
          userIds.add(notification.senderId);
        }
      });

      // Preload sender information in batch
      if (userIds.size > 0) {
        await userCacheService.preloadUsers(Array.from(userIds));
        const usersMap = await userCacheService.getUsers(Array.from(userIds));
        
        // Enrich notifications with sender info
        notifications = notifications.map(notification => {
          if (notification.senderId) {
            const senderInfo = usersMap.get(notification.senderId);
            if (senderInfo) {
              return {
                ...notification,
                senderName: senderInfo.displayName || senderInfo.fullName || notification.senderName,
                senderAvatar: senderInfo.profileUrl || notification.senderAvatar
              };
            }
          }
          return notification;
        });
      }

      // Apply client-side filtering
      let filteredNotifications = notifications;

      // Category filter
      if (category && category !== 'all') {
        filteredNotifications = filteredNotifications.filter(n => n.type === category);
      }

      // Read status filter
      if (filter === 'unread') {
        filteredNotifications = filteredNotifications.filter(n => !n.isRead);
      }

      // Sort by timestamp (newest first)
      filteredNotifications.sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      });

      // Limit results
      const finalNotifications = filteredNotifications.slice(0, this.PAGE_SIZE);
      const hasMore = filteredNotifications.length > this.PAGE_SIZE;

      // Cache the results
      this.setCache(cacheKey, {
        notifications: finalNotifications,
        hasMore,
        lastDoc: snapshot.docs[snapshot.docs.length - 1]
      });

      console.log(`✅ Loaded ${finalNotifications.length} notifications for user ${userId}`);
      return {
        notifications: finalNotifications,
        hasMore
      };
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
      return { notifications: [], hasMore: false };
    }
  }

  // Load more notifications (pagination)
  async loadMoreNotifications(
    userId: string,
    category?: string,
    filter?: 'all' | 'unread'
  ): Promise<OptimizedNotification[]> {
    const cacheKey = `${userId}_${category || 'all'}_${filter || 'all'}`;
    const cached = this.getCache(cacheKey);
    
    if (!cached || !cached.lastDoc || !cached.hasMore) {
      return [];
    }

    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('receiverId', '==', userId),
        startAfter(cached.lastDoc),
        firestoreLimit(this.PAGE_SIZE)
      );

      const snapshot = await getDocs(q);
      const newNotifications: OptimizedNotification[] = [];
      const userIds = new Set<string>();

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const notification: OptimizedNotification = {
          id: doc.id,
          type: data.type || 'system',
          title: data.title || 'Thông báo mới',
          message: data.message || data.body || '',
          timestamp: data.timestamp?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          isRead: data.isRead || false,
          data: data.data || {},
          senderAvatar: data.senderAvatar,
          senderName: data.senderName,
          senderId: data.senderId,
          receiverId: data.receiverId,
          priority: data.priority || 'normal'
        };
        
        newNotifications.push(notification);
        
        if (notification.senderId && !userIds.has(notification.senderId)) {
          userIds.add(notification.senderId);
        }
      });

      // Preload sender information
      if (userIds.size > 0) {
        await userCacheService.preloadUsers(Array.from(userIds));
        const usersMap = await userCacheService.getUsers(Array.from(userIds));
        
        newNotifications.forEach(notification => {
          if (notification.senderId) {
            const senderInfo = usersMap.get(notification.senderId);
            if (senderInfo) {
              notification.senderName = senderInfo.displayName || senderInfo.fullName || notification.senderName;
              notification.senderAvatar = senderInfo.profileUrl || notification.senderAvatar;
            }
          }
        });
      }

      // Update cache
      const updatedNotifications = [...cached.notifications, ...newNotifications];
      this.setCache(cacheKey, {
        notifications: updatedNotifications,
        hasMore: snapshot.docs.length === this.PAGE_SIZE,
        lastDoc: snapshot.docs[snapshot.docs.length - 1]
      });

      console.log(`✅ Loaded ${newNotifications.length} more notifications`);
      return newNotifications;
    } catch (error) {
      console.error('❌ Error loading more notifications:', error);
      return [];
    }
  }

  // Optimized real-time listener with selective updates
  setupRealtimeListener(
    userId: string,
    callback: (notification: OptimizedNotification) => void,
    category?: string
  ): Unsubscribe {
    const listenerKey = `notifications_${userId}_${category || 'all'}`;
    
    // Cleanup existing listener
    if (this.listeners.has(listenerKey)) {
      this.listeners.get(listenerKey)!();
    }

    try {
      const notificationsRef = collection(db, 'notifications');
      
      // Simple query to avoid index issues
      let q = query(
        notificationsRef,
        where('receiverId', '==', userId),
        firestoreLimit(10) // Only listen to latest notifications
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const notification: OptimizedNotification = {
              id: change.doc.id,
              type: data.type || 'system',
              title: data.title || 'Thông báo mới',
              message: data.message || data.body || '',
              timestamp: data.timestamp?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
              isRead: data.isRead || false,
              data: data.data || {},
              senderAvatar: data.senderAvatar,
              senderName: data.senderName,
              senderId: data.senderId,
              receiverId: data.receiverId,
              priority: data.priority || 'normal'
            };

            // Filter by category if specified
            if (!category || category === 'all' || notification.type === category) {
              callback(notification);
            }
          }
        });
      }, (error) => {
        console.error('❌ Notification listener error:', error);
        // Fallback to simple listener without ordering
        this.setupFallbackListener(userId, callback, category);
      });

      // Register with connection manager
      connectionManager.registerListener(listenerKey, unsubscribe, 'notifications', 'messages');
      this.listeners.set(listenerKey, unsubscribe);

      console.log('👂 Notification listener setup for:', userId);
      return unsubscribe;
    } catch (error) {
      console.error('❌ Error setting up notification listener:', error);
      return () => {};
    }
  }

  // Fallback listener for when composite indexes aren't ready
  private setupFallbackListener(
    userId: string,
    callback: (notification: OptimizedNotification) => void,
    category?: string
  ): Unsubscribe {
    console.log('📝 Using fallback notification listener');
    
    const listenerKey = `notifications_fallback_${userId}`;
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('receiverId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications: OptimizedNotification[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        notifications.push({
          id: doc.id,
          type: data.type || 'system',
          title: data.title || 'Thông báo mới',
          message: data.message || data.body || '',
          timestamp: data.timestamp?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          isRead: data.isRead || false,
          data: data.data || {},
          senderAvatar: data.senderAvatar,
          senderName: data.senderName,
          senderId: data.senderId,
          receiverId: data.receiverId,
          priority: data.priority || 'normal'
        });
      });

      // Sort client-side and take only latest
      const sortedNotifications = notifications
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

      // Send each new notification
      sortedNotifications.forEach(notification => {
        if (!category || category === 'all' || notification.type === category) {
          callback(notification);
        }
      });
    });

    connectionManager.registerListener(listenerKey, unsubscribe, 'notifications', 'messages');
    this.listeners.set(listenerKey, unsubscribe);
    
    return unsubscribe;
  }

  // Batch mark notifications as read
  async batchMarkAsRead(notificationIds: string[]): Promise<void> {
    if (notificationIds.length === 0) return;

    try {
      const batch = writeBatch(db);
      const updatePromises = notificationIds.map(async (id) => {
        const notificationRef = doc(db, 'notifications', id);
        batch.update(notificationRef, {
          isRead: true,
          readAt: new Date()
        });
      });

      await Promise.all(updatePromises);
      await batch.commit();

      // Update cache
      this.notificationCache.forEach((cache, key) => {
        cache.notifications = cache.notifications.map(notification => {
          if (notificationIds.includes(notification.id)) {
            return { ...notification, isRead: true };
          }
          return notification;
        });
      });

      console.log(`✅ Batch marked ${notificationIds.length} notifications as read`);
    } catch (error) {
      console.error('❌ Error batch marking notifications as read:', error);
      throw error;
    }
  }

  // Mark single notification as read
  async markAsRead(notificationId: string): Promise<void> {
    return this.batchMarkAsRead([notificationId]);
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('receiverId', '==', userId),
        where('isRead', '==', false)
      );

      const snapshot = await getDocs(q);
      const notificationIds = snapshot.docs.map(doc => doc.id);

      if (notificationIds.length > 0) {
        await this.batchMarkAsRead(notificationIds);
        console.log(`✅ Marked all ${notificationIds.length} notifications as read for user ${userId}`);
      }
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Get unread count for a user
  async getUnreadCount(userId: string, category?: string): Promise<number> {
    const cacheKey = `${userId}_${category || 'all'}_unread_count`;
    const cached = this.getCache(cacheKey);
    
    if (cached && cached.notifications) {
      const unreadCount = cached.notifications.filter(n => !n.isRead).length;
      return unreadCount;
    }

    try {
      const result = await this.loadNotifications(userId, false, category, 'unread');
      return result.notifications.length;
    } catch (error) {
      console.error('❌ Error getting unread count:', error);
      return 0;
    }
  }

  // Cleanup notifications listener for a user
  cleanupUserListeners(userId: string): void {
    const keysToRemove: string[] = [];
    
    this.listeners.forEach((unsubscribe, key) => {
      if (key.includes(userId)) {
        unsubscribe();
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach(key => this.listeners.delete(key));
    
    // Also cleanup cache
    const cacheKeysToRemove: string[] = [];
    this.notificationCache.forEach((_, key) => {
      if (key.includes(userId)) {
        cacheKeysToRemove.push(key);
      }
    });
    
    cacheKeysToRemove.forEach(key => this.notificationCache.delete(key));
    
    console.log(`🧹 Cleaned up ${keysToRemove.length} listeners and ${cacheKeysToRemove.length} cache entries for user ${userId}`);
  }

  // Cleanup all
  cleanup(): void {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
    this.notificationCache.clear();
    console.log('🧹 Optimized notification service cleaned up');
  }

  // Get service stats
  getStats(): {
    cachedUsers: number;
    activeListeners: number;
    memoryUsage: string;
    cacheHitRate: string;
  } {
    const memoryUsage = `${Math.round(
      (JSON.stringify([...this.notificationCache.values()]).length / 1024)
    )}KB`;
    
    return {
      cachedUsers: this.notificationCache.size,
      activeListeners: this.listeners.size,
      memoryUsage,
      cacheHitRate: 'N/A' // Could implement hit rate tracking
    };
  }
}

export default new OptimizedNotificationService();
