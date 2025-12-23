import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'chat_messages_';
const CACHE_META_PREFIX = 'chat_meta_';
const MAX_CACHED_MESSAGES = 100; // Giới hạn số messages cache mỗi room
const CACHE_EXPIRY_HOURS = 24 * 7; // Cache hết hạn sau 7 ngày

interface CachedMessage {
  id: string;
  text?: string;
  imageUrl?: string;
  uid: string;
  createdAt: any;
  status?: string;
  [key: string]: any;
}

interface CacheMeta {
  lastUpdated: number;
  oldestTimestamp: number | null;
  newestTimestamp: number | null;
  totalCached: number;
}

class MessageCacheService {
  /**
   * Lưu messages vào cache
   */
  async cacheMessages(roomId: string, messages: CachedMessage[]): Promise<void> {
    if (!roomId || !messages || messages.length === 0) return;

    try {
      const cacheKey = `${CACHE_PREFIX}${roomId}`;
      const metaKey = `${CACHE_META_PREFIX}${roomId}`;

      // Lấy cache hiện tại
      const existingCache = await this.getCachedMessages(roomId);
      
      // Merge messages mới với cache cũ
      const messageMap = new Map<string, CachedMessage>();
      
      // Thêm cache cũ
      existingCache.forEach(msg => {
        if (msg.id) messageMap.set(msg.id, msg);
      });
      
      // Thêm/cập nhật messages mới
      messages.forEach(msg => {
        if (msg.id) {
          // Convert Firestore Timestamp to serializable format
          const serializedMsg = this.serializeMessage(msg);
          messageMap.set(msg.id, serializedMsg);
        }
      });

      // Convert map to array và sort theo thời gian
      let allMessages = Array.from(messageMap.values());
      allMessages.sort((a, b) => {
        const ta = this.getTimestamp(a.createdAt);
        const tb = this.getTimestamp(b.createdAt);
        return ta - tb;
      });

      // Giới hạn số messages cache (giữ messages mới nhất)
      if (allMessages.length > MAX_CACHED_MESSAGES) {
        allMessages = allMessages.slice(-MAX_CACHED_MESSAGES);
      }

      // Lưu messages
      await AsyncStorage.setItem(cacheKey, JSON.stringify(allMessages));

      // Lưu metadata
      const meta: CacheMeta = {
        lastUpdated: Date.now(),
        oldestTimestamp: allMessages.length > 0 ? this.getTimestamp(allMessages[0].createdAt) : null,
        newestTimestamp: allMessages.length > 0 ? this.getTimestamp(allMessages[allMessages.length - 1].createdAt) : null,
        totalCached: allMessages.length,
      };
      await AsyncStorage.setItem(metaKey, JSON.stringify(meta));

      console.log(`📦 [MessageCache] Cached ${allMessages.length} messages for room ${roomId}`);
    } catch (error) {
      console.warn('[MessageCache] Failed to cache messages:', error);
    }
  }

  /**
   * Lấy messages từ cache - OPTIMIZED for speed
   */
  async getCachedMessages(roomId: string): Promise<CachedMessage[]> {
    if (!roomId) return [];

    try {
      const cacheKey = `${CACHE_PREFIX}${roomId}`;
      const metaKey = `${CACHE_META_PREFIX}${roomId}`;

      // Use multiGet for faster parallel reads
      const results = await AsyncStorage.multiGet([cacheKey, metaKey]);
      const cachedStr = results[0][1];
      const metaStr = results[1][1];

      // Check expiry
      if (metaStr) {
        const meta: CacheMeta = JSON.parse(metaStr);
        const expiryTime = CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
        if (Date.now() - meta.lastUpdated > expiryTime) {
          console.log(`🗑️ [MessageCache] Cache expired for room ${roomId}`);
          // Clear async, don't wait
          this.clearCache(roomId).catch(() => {});
          return [];
        }
      }

      if (cachedStr) {
        const messages = JSON.parse(cachedStr) as CachedMessage[];
        console.log(`⚡ [MessageCache] Loaded ${messages.length} messages from cache`);
        return messages;
      }
    } catch (error) {
      console.warn('[MessageCache] Failed to get cached messages:', error);
    }

    return [];
  }

  /**
   * Lấy metadata của cache
   */
  async getCacheMeta(roomId: string): Promise<CacheMeta | null> {
    if (!roomId) return null;

    try {
      const metaKey = `${CACHE_META_PREFIX}${roomId}`;
      const metaStr = await AsyncStorage.getItem(metaKey);
      if (metaStr) {
        return JSON.parse(metaStr) as CacheMeta;
      }
    } catch (error) {
      console.warn('[MessageCache] Failed to get cache meta:', error);
    }

    return null;
  }

  /**
   * Cập nhật status của một message trong cache
   */
  async updateMessageStatus(roomId: string, messageId: string, status: string): Promise<void> {
    if (!roomId || !messageId) return;

    try {
      const messages = await this.getCachedMessages(roomId);
      const index = messages.findIndex(m => m.id === messageId);
      
      if (index !== -1) {
        messages[index].status = status;
        const cacheKey = `${CACHE_PREFIX}${roomId}`;
        await AsyncStorage.setItem(cacheKey, JSON.stringify(messages));
      }
    } catch (error) {
      console.warn('[MessageCache] Failed to update message status:', error);
    }
  }

  /**
   * Thêm một message mới vào cache
   */
  async addMessage(roomId: string, message: CachedMessage): Promise<void> {
    if (!roomId || !message) return;

    try {
      const messages = await this.getCachedMessages(roomId);
      const serializedMsg = this.serializeMessage(message);
      
      // Kiểm tra xem message đã tồn tại chưa
      const existingIndex = messages.findIndex(m => m.id === message.id);
      if (existingIndex !== -1) {
        messages[existingIndex] = serializedMsg;
      } else {
        messages.push(serializedMsg);
      }

      // Giới hạn số messages
      if (messages.length > MAX_CACHED_MESSAGES) {
        messages.shift(); // Xóa message cũ nhất
      }

      const cacheKey = `${CACHE_PREFIX}${roomId}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(messages));

      // Cập nhật metadata
      const metaKey = `${CACHE_META_PREFIX}${roomId}`;
      const meta: CacheMeta = {
        lastUpdated: Date.now(),
        oldestTimestamp: messages.length > 0 ? this.getTimestamp(messages[0].createdAt) : null,
        newestTimestamp: messages.length > 0 ? this.getTimestamp(messages[messages.length - 1].createdAt) : null,
        totalCached: messages.length,
      };
      await AsyncStorage.setItem(metaKey, JSON.stringify(meta));
    } catch (error) {
      console.warn('[MessageCache] Failed to add message:', error);
    }
  }

  /**
   * Xóa cache của một room
   */
  async clearCache(roomId: string): Promise<void> {
    if (!roomId) return;

    try {
      const cacheKey = `${CACHE_PREFIX}${roomId}`;
      const metaKey = `${CACHE_META_PREFIX}${roomId}`;
      await AsyncStorage.multiRemove([cacheKey, metaKey]);
      console.log(`🗑️ [MessageCache] Cleared cache for room ${roomId}`);
    } catch (error) {
      console.warn('[MessageCache] Failed to clear cache:', error);
    }
  }

  /**
   * Xóa tất cả cache messages
   */
  async clearAllCache(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(
        key => key.startsWith(CACHE_PREFIX) || key.startsWith(CACHE_META_PREFIX)
      );
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`🗑️ [MessageCache] Cleared all message caches (${cacheKeys.length} keys)`);
      }
    } catch (error) {
      console.warn('[MessageCache] Failed to clear all cache:', error);
    }
  }

  /**
   * Serialize message để lưu vào AsyncStorage
   */
  private serializeMessage(msg: CachedMessage): CachedMessage {
    const serialized = { ...msg };
    
    // Convert Firestore Timestamp to milliseconds
    if (msg.createdAt) {
      if (msg.createdAt.seconds) {
        serialized.createdAt = msg.createdAt.seconds * 1000;
      } else if (msg.createdAt instanceof Date) {
        serialized.createdAt = msg.createdAt.getTime();
      } else if (typeof msg.createdAt === 'number') {
        serialized.createdAt = msg.createdAt;
      }
    }

    if (msg.readAt?.seconds) {
      serialized.readAt = msg.readAt.seconds * 1000;
    }

    if (msg.deliveredAt?.seconds) {
      serialized.deliveredAt = msg.deliveredAt.seconds * 1000;
    }

    return serialized;
  }

  /**
   * Lấy timestamp từ createdAt (có thể là Firestore Timestamp, Date, hoặc number)
   */
  private getTimestamp(createdAt: any): number {
    if (!createdAt) return 0;
    if (createdAt.seconds) return createdAt.seconds * 1000;
    if (createdAt instanceof Date) return createdAt.getTime();
    if (typeof createdAt === 'number') return createdAt;
    return 0;
  }
}

export const messageCacheService = new MessageCacheService();
export default messageCacheService;
