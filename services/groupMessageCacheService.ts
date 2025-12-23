import AsyncStorage from '@react-native-async-storage/async-storage';

interface GroupMessage {
  id: string;
  text?: string;
  imageUrl?: string;
  uid: string;
  createdAt: any;
  status?: string;
  senderName?: string;
  profileUrl?: string;
  [key: string]: any;
}

interface GroupCacheMeta {
  lastUpdated: number;
  totalCached: number;
  groupId: string;
}

class GroupMessageCacheService {
  private readonly CACHE_PREFIX = 'group_messages_';
  private readonly META_PREFIX = 'group_meta_';
  private readonly MAX_CACHE_SIZE = 100; // Maximum messages to cache per group
  private readonly CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes

  private getCacheKey(groupId: string): string {
    return `${this.CACHE_PREFIX}${groupId}`;
  }

  private getMetaKey(groupId: string): string {
    return `${this.META_PREFIX}${groupId}`;
  }

  // Get cached messages for a group - OPTIMIZED for speed
  async getCachedMessages(groupId: string): Promise<GroupMessage[]> {
    try {
      const cacheKey = this.getCacheKey(groupId);
      const metaKey = this.getMetaKey(groupId);
      
      // Use multiGet for faster parallel reads
      const results = await AsyncStorage.multiGet([cacheKey, metaKey]);
      const cachedStr = results[0][1];
      const metaStr = results[1][1];
      
      // Check expiry
      if (metaStr) {
        const meta: GroupCacheMeta = JSON.parse(metaStr);
        if (Date.now() - meta.lastUpdated > this.CACHE_EXPIRY) {
          console.log(`🗑️ [GroupMessageCache] Cache expired for group: ${groupId}`);
          this.clearGroupCache(groupId).catch(() => {});
          return [];
        }
      }
      
      if (!cachedStr) {
        console.log(`📦 [GroupMessageCache] No cache found for group: ${groupId}`);
        return [];
      }

      const messages: GroupMessage[] = JSON.parse(cachedStr);
      console.log(`⚡ [GroupMessageCache] Retrieved ${messages.length} cached messages for group: ${groupId}`);
      
      // Sort by timestamp to ensure correct order
      return messages.sort((a, b) => {
        const timeA = a.createdAt?.seconds || a.createdAt?.toMillis?.() / 1000 || 0;
        const timeB = b.createdAt?.seconds || b.createdAt?.toMillis?.() / 1000 || 0;
        return timeA - timeB;
      });
    } catch (error) {
      console.error('Error getting cached group messages:', error);
      return [];
    }
  }

  // Cache messages for a group
  async cacheMessages(groupId: string, messages: GroupMessage[]): Promise<void> {
    try {
      if (!messages.length) return;

      const cacheKey = this.getCacheKey(groupId);
      const metaKey = this.getMetaKey(groupId);
      
      // Get existing cached messages
      const existingMessages = await this.getCachedMessages(groupId);
      
      // Merge new messages with existing ones, avoiding duplicates
      const messageMap = new Map<string, GroupMessage>();
      
      // Add existing messages
      existingMessages.forEach(msg => messageMap.set(msg.id, msg));
      
      // Add/update new messages
      messages.forEach(msg => messageMap.set(msg.id, msg));
      
      // Convert back to array and sort by timestamp
      const allMessages = Array.from(messageMap.values()).sort((a, b) => {
        const timeA = a.createdAt?.seconds || a.createdAt?.toMillis?.() / 1000 || 0;
        const timeB = b.createdAt?.seconds || b.createdAt?.toMillis?.() / 1000 || 0;
        return timeA - timeB;
      });
      
      // Keep only the most recent messages (limit cache size)
      const messagesToCache = allMessages.slice(-this.MAX_CACHE_SIZE);
      
      // Save messages
      await AsyncStorage.setItem(cacheKey, JSON.stringify(messagesToCache));
      
      // Update metadata
      const meta: GroupCacheMeta = {
        lastUpdated: Date.now(),
        totalCached: messagesToCache.length,
        groupId,
      };
      
      await AsyncStorage.setItem(metaKey, JSON.stringify(meta));
      
      console.log(`📦 [GroupMessageCache] Cached ${messagesToCache.length} messages for group: ${groupId}`);
    } catch (error) {
      console.error('Error caching group messages:', error);
    }
  }

  // Get cache metadata
  async getCacheMeta(groupId: string): Promise<GroupCacheMeta | null> {
    try {
      const metaKey = this.getMetaKey(groupId);
      const metaData = await AsyncStorage.getItem(metaKey);
      
      if (!metaData) return null;
      
      return JSON.parse(metaData) as GroupCacheMeta;
    } catch (error) {
      console.error('Error getting group cache metadata:', error);
      return null;
    }
  }

  // Clear cache for a specific group
  async clearGroupCache(groupId: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(groupId);
      const metaKey = this.getMetaKey(groupId);
      
      await AsyncStorage.multiRemove([cacheKey, metaKey]);
      console.log(`🗑️ [GroupMessageCache] Cleared cache for group: ${groupId}`);
    } catch (error) {
      console.error('Error clearing group cache:', error);
    }
  }

  // Clear all group message caches
  async clearAllCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith(this.CACHE_PREFIX) || key.startsWith(this.META_PREFIX)
      );
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`🗑️ [GroupMessageCache] Cleared ${cacheKeys.length} cache entries`);
      }
    } catch (error) {
      console.error('Error clearing all group cache:', error);
    }
  }

  // Check if cache is fresh (not expired)
  async isCacheFresh(groupId: string): Promise<boolean> {
    const meta = await this.getCacheMeta(groupId);
    if (!meta) return false;
    
    const age = Date.now() - meta.lastUpdated;
    return age < this.CACHE_EXPIRY;
  }
}

export const groupMessageCacheService = new GroupMessageCacheService();
