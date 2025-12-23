import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

interface UserData {
  uid: string;
  displayName?: string;
  username?: string;
  profileUrl?: string;
  [key: string]: any;
}

class UserCacheService {
  private cache = new Map<string, UserData>();
  private loadingPromises = new Map<string, Promise<UserData | null>>();
  private readonly CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000;

  // Get single user with caching
  async getUser(userId: string): Promise<UserData | null> {
    // Return from cache if available and not expired
    if (this.cache.has(userId)) {
      const cached = this.cache.get(userId)!;
      if (this.isCacheValid(cached)) {
        return cached;
      }
      this.cache.delete(userId);
    }

    // Return existing promise if already loading
    if (this.loadingPromises.has(userId)) {
      return this.loadingPromises.get(userId)!;
    }

    // Create new loading promise
    const loadingPromise = this.fetchUser(userId);
    this.loadingPromises.set(userId, loadingPromise);

    try {
      const userData = await loadingPromise;
      if (userData) {
        this.setCache(userId, userData);
      }
      return userData;
    } finally {
      this.loadingPromises.delete(userId);
    }
  }

  // Get multiple users with caching and batch loading
  async getUsers(userIds: string[]): Promise<Map<string, UserData>> {
    const result = new Map<string, UserData>();
    const uncachedIds: string[] = [];

    // Check cache first
    userIds.forEach(userId => {
      if (this.cache.has(userId)) {
        const cached = this.cache.get(userId)!;
        if (this.isCacheValid(cached)) {
          result.set(userId, cached);
        } else {
          this.cache.delete(userId);
          uncachedIds.push(userId);
        }
      } else {
        uncachedIds.push(userId);
      }
    });

    // Batch fetch uncached users
    if (uncachedIds.length > 0) {
      const fetchedUsers = await this.batchFetchUsers(uncachedIds);

      fetchedUsers.forEach((userData, userId) => {
        this.setCache(userId, userData);
        result.set(userId, userData);
      });
    }

    return result;
  }

  // Preload users for better performance
  async preloadUsers(userIds: string[]): Promise<void> {
    const uncachedIds = userIds.filter(id => !this.cache.has(id));

    if (uncachedIds.length > 0) {
      await this.batchFetchUsers(uncachedIds);
    }
  }

  private async fetchUser(userId: string): Promise<UserData | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));

      if (userDoc.exists()) {
        return {
          uid: userDoc.id,
          ...userDoc.data(),
          _cachedAt: Date.now()
        } as UserData;
      }

      return null;
    } catch (error) {
      console.error('Error fetching user:', userId, error);
      return null;
    }
  }

  private async batchFetchUsers(userIds: string[]): Promise<Map<string, UserData>> {
    const result = new Map<string, UserData>();

    if (userIds.length === 0) return result;

    try {
      // Firestore 'in' query limit is 10, so we need to batch
      const batches = this.chunkArray(userIds, 10);

      const promises = batches.map(async (batch) => {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('__name__', 'in', batch.map(id => doc(db, 'users', id))));

        const snapshot = await getDocs(q);

        snapshot.docs.forEach(docSnapshot => {
          const userData = {
            uid: docSnapshot.id,
            ...docSnapshot.data(),
            _cachedAt: Date.now()
          } as UserData;

          result.set(docSnapshot.id, userData);
        });
      });

      await Promise.all(promises);

      console.log('✅ Batch fetched', result.size, 'users');
    } catch (error) {
      console.error('❌ Error batch fetching users:', error);
    }

    return result;
  }

  private setCache(userId: string, userData: UserData) {
    // Clean up cache if it's getting too large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.cleanupCache();
    }

    userData._cachedAt = Date.now();
    this.cache.set(userId, userData);
  }

  private isCacheValid(userData: UserData): boolean {
    const cachedAt = userData._cachedAt || 0;
    return Date.now() - cachedAt < this.CACHE_EXPIRY;
  }

  private cleanupCache() {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.cache.forEach((userData, userId) => {
      if (now - (userData._cachedAt || 0) > this.CACHE_EXPIRY) {
        expiredKeys.push(userId);
      }
    });

    expiredKeys.forEach(key => this.cache.delete(key));

    // If still too large, remove oldest entries
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => (a[1]._cachedAt || 0) - (b[1]._cachedAt || 0));

      const toRemove = entries.slice(0, Math.floor(this.MAX_CACHE_SIZE * 0.3));
      toRemove.forEach(([key]) => this.cache.delete(key));
    }

    console.log('🧹 Cache cleaned up, size:', this.cache.size);
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // Manual cache invalidation
  invalidateUser(userId: string) {
    this.cache.delete(userId);
  }

  // Clear all cache
  clearCache() {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.cache.size,
      loadingPromises: this.loadingPromises.size,
      maxSize: this.MAX_CACHE_SIZE,
      expiryMs: this.CACHE_EXPIRY
    };
  }
}

export default new UserCacheService();
