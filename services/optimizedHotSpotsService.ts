import {
  collection,
  doc,
  query,
  where,
  limit as firestoreLimit,
  getDocs,
  onSnapshot,
  Unsubscribe,
  updateDoc,
  writeBatch,
  increment,
  deleteDoc,
  getDoc,
  setDoc,
  runTransaction
} from 'firebase/firestore';
import ExpoPushNotificationService from './expoPushNotificationService';
import { db } from '@/firebaseConfig';

interface CachedHotSpot {
  id: string;
  title: string;
  type: string;
  category: string;
  isActive: boolean;
  isFeatured: boolean;
  stats: {
    joined: number;
    interested: number;
    rating: number;
  };
  createdAt: any;
  _cachedAt: number;
}

interface HotSpotFilters {
  type?: string;
  category?: string;
  featured?: boolean;
  searchQuery?: string;
  sortBy?: 'newest' | 'popular' | 'rating';
}

class OptimizedHotSpotsService {
  private cache = new Map<string, CachedHotSpot[]>();
  private userInteractionCache = new Map<string, any[]>();
  private activeListeners = new Map<string, Unsubscribe>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 phút
  private readonly MAX_CACHE_SIZE = 100;

  // Optimized getHotSpots với aggressive caching
  async getHotSpots(
    filters: HotSpotFilters = {},
    limit: number = 20,
    useCache: boolean = true
  ): Promise<CachedHotSpot[]> {
    const cacheKey = this.generateCacheKey(filters, limit);

    // Check cache first
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (this.isCacheValid(cached[0])) {
        console.log('🔥 Using cached hotspots:', cacheKey);
        return cached;
      }
      this.cache.delete(cacheKey);
    }

    try {
      console.log('🔥 Fetching hotspots with filters:', JSON.stringify(filters));

      // Try 'hotSpots' collection first
      let hotspotsRef = collection(db, 'hotSpots');
      let hotSpotsQuery = query(
        hotspotsRef,
        firestoreLimit(100)
      );

      let snapshot = await getDocs(hotSpotsQuery);

      // If empty, try 'hotspots' (lowercase)
      if (snapshot.empty) {
        console.log('⚠️ hotSpots collection empty, trying hotspots...');
        hotspotsRef = collection(db, 'hotspots');
        hotSpotsQuery = query(hotspotsRef, firestoreLimit(100));
        snapshot = await getDocs(hotSpotsQuery);
      }

      console.log(`🔥 Raw docs fetched: ${snapshot.docs.length}`);

      let allHotSpots: CachedHotSpot[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          isActive: data.isActive !== undefined ? data.isActive : true, // Fallback to true if missing
          _cachedAt: Date.now()
        } as CachedHotSpot;
      });

      // Client-side filtering (tránh phức tạp index)
      let filteredHotSpots = this.applyClientSideFilters(allHotSpots, filters);

      // Client-side sorting
      filteredHotSpots = this.applySorting(filteredHotSpots, filters.sortBy || 'newest');

      // Apply limit
      const result = filteredHotSpots.slice(0, limit);

      // Cache multiple variations
      this.setCacheMultiple(filters, result, allHotSpots);

      console.log(`🔥 Final filtered hotspots: ${result.length}`);
      return result;
    } catch (error) {
      console.error('❌ Error loading hotspots:', error);
      return [];
    }
  }

  // Batch get user interactions
  async getBatchUserInteractions(
    userId: string,
    hotSpotIds: string[]
  ): Promise<Map<string, any>> {
    const cacheKey = `interactions_${userId}`;

    // Check cache
    if (this.userInteractionCache.has(cacheKey)) {
      const cached = this.userInteractionCache.get(cacheKey)!;
      if (Date.now() - cached[0]?.timestamp < this.CACHE_DURATION) {
        console.log('🎯 Using cached interactions');
        const result = new Map();
        cached.forEach((interaction: any) => {
          if (hotSpotIds.includes(interaction.hotSpotId)) {
            const existing = result.get(interaction.hotSpotId) || this.createInteractionState();
            result.set(interaction.hotSpotId, this.mergeInteractionState(existing, interaction));
          }
        });
        return result;
      }
    }

    try {
      // Single query cho tất cả interactions của user
      const interactionsQuery = query(
        collection(db, 'hotSpotInteractions'),
        where('userId', '==', userId),
        firestoreLimit(200)
      );

      const snapshot = await getDocs(interactionsQuery);
      const interactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: Date.now()
      }));

      // Cache all user interactions
      this.userInteractionCache.set(cacheKey, interactions);

      // Return only requested hotSpots, merging multiple interaction types
      const result = new Map<string, any>();
      interactions.forEach((interaction: any) => {
        if (hotSpotIds.includes(interaction.hotSpotId)) {
          const existing = result.get(interaction.hotSpotId) || this.createInteractionState();
          result.set(interaction.hotSpotId, this.mergeInteractionState(existing, interaction));
        }
      });

      console.log(`🎯 Loaded merged interactions for ${result.size} hotspots`);
      return result;
    } catch (error) {
      console.error('Error loading user interactions:', error);
      return new Map();
    }
  }

  // Optimized real-time listener for specific hotspot
  setupHotSpotListener(
    hotSpotId: string,
    callback: (hotSpot: any) => void
  ): Unsubscribe {
    const listenerKey = `hotspot_${hotSpotId}`;

    // Remove existing listener
    if (this.activeListeners.has(listenerKey)) {
      this.activeListeners.get(listenerKey)!();
    }

    const hotSpotRef = doc(db, 'hotSpots', hotSpotId);
    const unsubscribe = onSnapshot(hotSpotRef, (doc) => {
      if (doc.exists()) {
        const hotSpotData = {
          id: doc.id,
          ...doc.data(),
          _cachedAt: Date.now()
        };

        // Update cache
        this.updateCacheItem(hotSpotData);
        callback(hotSpotData);
      }
    }, (error) => {
      console.error('HotSpot listener error:', error);
    });

    this.activeListeners.set(listenerKey, unsubscribe);
    return unsubscribe;
  }

  // User interaction methods
  async joinHotSpot(userId: string, hotSpotId: string): Promise<void> {
    try {
      const interactionData = {
        userId,
        hotSpotId,
        type: 'joined',
        isJoined: true,
        timestamp: new Date(),
        createdAt: new Date()
      };

      const created = await this.createInteractionOnce(userId, hotSpotId, 'joined', interactionData);
      if (created) {
        await this.updateHotSpotStats(hotSpotId, 'join');
      }

      // Clear relevant caches
      this.userInteractionCache.delete(`interactions_${userId}`);

      // Push to creator notifying user joined
      try {
        const spotSnap = await this.getHotSpotDoc(hotSpotId);
        const creatorId = spotSnap.exists() ? (spotSnap.data() as any)?.creatorId : undefined;
        if (created && creatorId && creatorId !== userId) {
          await ExpoPushNotificationService.sendPushToUser(creatorId, {
            title: '🎉 Có người tham gia',
            body: 'Một người dùng vừa tham gia HotSpot của bạn',
            data: { type: 'hotspot_join', hotSpotId, userId },
          });
        }
      } catch (e) {
        console.warn('⚠️ Push joinHotSpot failed:', e);
      }

      console.log(`✅ User ${userId} joined hotspot ${hotSpotId}`);
    } catch (error) {
      console.error('Error joining hotspot:', error);
      throw error;
    }
  }

  async markInterested(userId: string, hotSpotId: string): Promise<void> {
    try {
      const interactionData = {
        userId,
        hotSpotId,
        type: 'interested',
        isInterested: true,
        timestamp: new Date(),
        createdAt: new Date()
      };

      const created = await this.createInteractionOnce(userId, hotSpotId, 'interested', interactionData);
      if (created) {
        await this.updateHotSpotStats(hotSpotId, 'interested');
      }

      // Clear relevant caches
      this.userInteractionCache.delete(`interactions_${userId}`);

      // Push to creator notifying user interested
      try {
        const spotSnap = await this.getHotSpotDoc(hotSpotId);
        const creatorId = spotSnap.exists() ? (spotSnap.data() as any)?.creatorId : undefined;
        if (created && creatorId && creatorId !== userId) {
          await ExpoPushNotificationService.sendPushToUser(creatorId, {
            title: '💜 Có người quan tâm',
            body: 'Một người dùng vừa quan tâm HotSpot của bạn',
            data: { type: 'hotspot_interested', hotSpotId, userId },
          });
        }
      } catch (e) {
        console.warn('⚠️ Push markInterested failed:', e);
      }

      console.log(`💖 User ${userId} marked interested in hotspot ${hotSpotId}`);
    } catch (error) {
      console.error('Error marking interested:', error);
      throw error;
    }
  }

  async checkIn(userId: string, hotSpotId: string, location?: { latitude: number; longitude: number }): Promise<void> {
    try {
      const interactionData = {
        userId,
        hotSpotId,
        type: 'checked_in',
        hasCheckedIn: true,
        timestamp: new Date(),
        createdAt: new Date(),
        checkInLocation: location || null
      };

      const created = await this.createInteractionOnce(userId, hotSpotId, 'checked_in', interactionData);
      if (created) {
        await this.updateHotSpotStats(hotSpotId, 'checkin');
      }

      // Clear relevant caches
      this.userInteractionCache.delete(`interactions_${userId}`);

      // Push to creator notifying user check-in
      try {
        const spotSnap = await this.getHotSpotDoc(hotSpotId);
        const creatorId = spotSnap.exists() ? (spotSnap.data() as any)?.creatorId : undefined;
        if (created && creatorId && creatorId !== userId) {
          await ExpoPushNotificationService.sendPushToUser(creatorId, {
            title: '📍 Có người check-in',
            body: 'Một người dùng vừa check-in HotSpot của bạn',
            data: { type: 'hotspot_checkin', hotSpotId, userId },
          });
        }
      } catch (e) {
        console.warn('⚠️ Push checkIn failed:', e);
      }

      console.log(`📍 User ${userId} checked in to hotspot ${hotSpotId}`);
    } catch (error) {
      console.error('Error checking in:', error);
      throw error;
    }
  }

  async addFavorite(userId: string, hotSpotId: string): Promise<void> {
    try {
      const interactionData = {
        userId,
        hotSpotId,
        type: 'favorite',
        isFavorited: true,
        timestamp: new Date(),
        createdAt: new Date()
      };

      const created = await this.createInteractionOnce(userId, hotSpotId, 'favorite', interactionData);

      // Clear relevant caches
      this.userInteractionCache.delete(`interactions_${userId}`);

      // Optional push to creator for favorite
      try {
        const spotSnap = await this.getHotSpotDoc(hotSpotId);
        const creatorId = spotSnap.exists() ? (spotSnap.data() as any)?.creatorId : undefined;
        if (created && creatorId && creatorId !== userId) {
          await ExpoPushNotificationService.sendPushToUser(creatorId, {
            title: '⭐ Được thêm vào yêu thích',
            body: 'Một người đã thêm HotSpot của bạn vào danh sách yêu thích',
            data: { type: 'hotspot_favorite', hotSpotId, userId },
          });
        }
      } catch (e) {
        console.warn('⚠️ Push addFavorite failed:', e);
      }

      console.log(`⭐ User ${userId} favorited hotspot ${hotSpotId}`);
    } catch (error) {
      console.error('Error adding favorite:', error);
      throw error;
    }
  }

  async removeFavorite(userId: string, hotSpotId: string): Promise<void> {
    try {
      const primaryRef = doc(db, 'hotSpotInteractions', this.getInteractionDocId(userId, hotSpotId, 'favorite'));
      const primarySnap = await getDoc(primaryRef);
      if (primarySnap.exists()) {
        await deleteDoc(primaryRef);
      }

      // Find and remove the favorite interaction
      const interactionsQuery = query(
        collection(db, 'hotSpotInteractions'),
        where('userId', '==', userId),
        where('hotSpotId', '==', hotSpotId),
        where('type', '==', 'favorite')
      );

      const snapshot = await getDocs(interactionsQuery);

      // Delete all favorite interactions for this user-hotspot pair
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      // Clear relevant caches
      this.userInteractionCache.delete(`interactions_${userId}`);

      console.log(`💔 User ${userId} unfavorited hotspot ${hotSpotId}`);
    } catch (error) {
      console.error('Error removing favorite:', error);
      throw error;
    }
  }

  async removeInterested(userId: string, hotSpotId: string): Promise<void> {
    try {
      const primaryRef = doc(db, 'hotSpotInteractions', this.getInteractionDocId(userId, hotSpotId, 'interested'));
      const primarySnap = await getDoc(primaryRef);
      let shouldDecrement = primarySnap.exists();
      if (primarySnap.exists()) {
        await deleteDoc(primaryRef);
      }

      // Find and remove the interested interaction
      const interactionsQuery = query(
        collection(db, 'hotSpotInteractions'),
        where('userId', '==', userId),
        where('hotSpotId', '==', hotSpotId),
        where('type', '==', 'interested')
      );

      const snapshot = await getDocs(interactionsQuery);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      if (!shouldDecrement && snapshot.docs.length > 0) {
        shouldDecrement = true;
      }

      // Update stats (decrement)
      if (shouldDecrement) {
        await this.updateHotSpotStats(hotSpotId, 'removeInterested');
      }

      // Clear relevant caches
      this.userInteractionCache.delete(`interactions_${userId}`);

      console.log(`💔 User ${userId} removed interest from hotspot ${hotSpotId}`);
    } catch (error) {
      console.error('Error removing interested:', error);
      throw error;
    }
  }

  // Private helper methods
  private generateCacheKey(filters: HotSpotFilters, limit: number): string {
    return `hotspots_${JSON.stringify(filters)}_${limit}`;
  }

  private applyClientSideFilters(hotSpots: CachedHotSpot[], filters: HotSpotFilters): CachedHotSpot[] {
    let filtered = hotSpots;

    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(h => h.type === filters.type);
    }

    if (filters.category) {
      filtered = filtered.filter(h => h.category === filters.category);
    }

    if (filters.featured) {
      filtered = filtered.filter(h => h.isFeatured);
    }

    if (filters.searchQuery) {
      const searchTerm = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(h =>
        h.title.toLowerCase().includes(searchTerm)
      );
    }

    return filtered;
  }

  private applySorting(hotSpots: CachedHotSpot[], sortBy: string): CachedHotSpot[] {
    switch (sortBy) {
      case 'popular':
        return hotSpots.sort((a, b) => b.stats.joined - a.stats.joined);
      case 'rating':
        return hotSpots.sort((a, b) => b.stats.rating - a.stats.rating);
      case 'newest':
      default:
        return hotSpots.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });
    }
  }

  private setCacheMultiple(
    baseFilters: HotSpotFilters,
    result: CachedHotSpot[],
    allHotSpots: CachedHotSpot[]
  ) {
    // Cache the specific query
    const baseKey = this.generateCacheKey(baseFilters, result.length);
    this.setCache(baseKey, result);

    // Cache variations for optimization
    const variations: HotSpotFilters[] = [
      { ...baseFilters, sortBy: 'popular' as const },
      { ...baseFilters, sortBy: 'rating' as const },
      { ...baseFilters, featured: true },
    ];

    variations.forEach(variation => {
      const filtered = this.applyClientSideFilters(allHotSpots, variation);
      const sorted = this.applySorting(filtered, variation.sortBy || 'newest');
      const limited = sorted.slice(0, 20);

      const varKey = this.generateCacheKey(variation, 20);
      this.setCache(varKey, limited);
    });
  }

  private setCache(key: string, data: CachedHotSpot[]) {
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.cleanupCache();
    }
    this.cache.set(key, data);
  }

  private isCacheValid(item: CachedHotSpot): boolean {
    return Date.now() - item._cachedAt < this.CACHE_DURATION;
  }

  private updateCacheItem(updatedItem: any) {
    // Update item trong tất cả cached arrays
    this.cache.forEach((cachedArray, key) => {
      const index = cachedArray.findIndex(item => item.id === updatedItem.id);
      if (index >= 0) {
        cachedArray[index] = { ...updatedItem };
      }
    });
  }

  private cleanupCache() {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.cache.forEach((data, key) => {
      if (data.length > 0 && now - data[0]._cachedAt > this.CACHE_DURATION) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.cache.delete(key));

    // If still too large, remove oldest
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1][0]?._cachedAt - b[1][0]?._cachedAt);

      const toRemove = entries.slice(0, Math.floor(this.MAX_CACHE_SIZE * 0.3));
      toRemove.forEach(([key]) => this.cache.delete(key));
    }

    console.log('🧹 HotSpots cache cleaned up, size:', this.cache.size);
  }

  // Cleanup methods
  removeListener(hotSpotId: string) {
    const listenerKey = `hotspot_${hotSpotId}`;
    if (this.activeListeners.has(listenerKey)) {
      this.activeListeners.get(listenerKey)!();
      this.activeListeners.delete(listenerKey);
    }
  }

  clearCache() {
    this.cache.clear();
    this.userInteractionCache.clear();
    console.log('🧹 HotSpots cache cleared');
  }

  cleanup() {
    this.activeListeners.forEach(unsubscribe => unsubscribe());
    this.activeListeners.clear();
    this.clearCache();
    console.log('🧹 OptimizedHotSpotsService cleanup completed');
  }

  // Stats for monitoring
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      interactionCacheSize: this.userInteractionCache.size,
      activeListeners: this.activeListeners.size,
      maxCacheSize: this.MAX_CACHE_SIZE,
      cacheDuration: this.CACHE_DURATION
    };
  }

  // Helper method to update hotspot statistics
  private async updateHotSpotStats(hotSpotId: string, action: 'join' | 'checkin' | 'interested' | 'removeInterested'): Promise<void> {
    try {
      if (action === 'join') {
        await this.updateHotSpotWithFallback(hotSpotId, {
          'stats.joined': increment(1),
          'participantCount': increment(1),
          updatedAt: new Date()
        });
      } else if (action === 'checkin') {
        await this.updateHotSpotWithFallback(hotSpotId, {
          'stats.checkedIn': increment(1),
          // Backward-compatible key for older dashboards
          'stats.checkins': increment(1),
          updatedAt: new Date()
        });
      } else if (action === 'interested') {
        await this.updateHotSpotWithFallback(hotSpotId, {
          'stats.interested': increment(1),
          updatedAt: new Date()
        });
      } else if (action === 'removeInterested') {
        await this.updateHotSpotWithFallback(hotSpotId, {
          'stats.interested': increment(-1),
          updatedAt: new Date()
        });
      }

      // Clear cache for this hotspot
      this.cache.forEach((value, key) => {
        if (key.includes(hotSpotId)) {
          this.cache.delete(key);
        }
      });
    } catch (error) {
      console.warn('Failed to update hotspot stats:', error);
      // Don't throw - stats update is not critical
    }
  }

  private normalizeInteractionType(type: string | undefined): string {
    if (type === 'join') return 'joined';
    if (type === 'checkin') return 'checked_in';
    return type || '';
  }

  private createInteractionState() {
    return {
      isJoined: false,
      isInterested: false,
      isFavorited: false,
      hasCheckedIn: false
    };
  }

  private mergeInteractionState(existing: any, interaction: any) {
    const normalizedType = this.normalizeInteractionType(interaction?.type);
    return {
      ...existing,
      isJoined: Boolean(existing.isJoined || interaction?.isJoined || normalizedType === 'joined'),
      isInterested: Boolean(existing.isInterested || interaction?.isInterested || normalizedType === 'interested'),
      isFavorited: Boolean(existing.isFavorited || interaction?.isFavorited || normalizedType === 'favorite'),
      hasCheckedIn: Boolean(
        existing.hasCheckedIn ||
        interaction?.hasCheckedIn ||
        interaction?.checkedIn ||
        interaction?.checkInAt ||
        normalizedType === 'checked_in'
      )
    };
  }

  private getInteractionDocId(userId: string, hotSpotId: string, type: 'joined' | 'interested' | 'checked_in' | 'favorite'): string {
    return `${userId}_${hotSpotId}_${type}`;
  }

  private async createInteractionOnce(
    userId: string,
    hotSpotId: string,
    type: 'joined' | 'interested' | 'checked_in' | 'favorite',
    interactionData: Record<string, any>
  ): Promise<boolean> {
    const interactionRef = doc(db, 'hotSpotInteractions', this.getInteractionDocId(userId, hotSpotId, type));
    return runTransaction(db, async (transaction) => {
      const existing = await transaction.get(interactionRef);
      if (existing.exists()) {
        return false;
      }

      transaction.set(interactionRef, {
        ...interactionData,
        type,
        updatedAt: new Date()
      });
      return true;
    });
  }

  private async getHotSpotDoc(hotSpotId: string) {
    const primaryRef = doc(db, 'hotSpots', hotSpotId);
    const primarySnap = await getDoc(primaryRef);
    if (primarySnap.exists()) {
      return primarySnap;
    }
    return getDoc(doc(db, 'hotspots', hotSpotId));
  }

  private async updateHotSpotWithFallback(hotSpotId: string, payload: Record<string, any>): Promise<void> {
    const primaryRef = doc(db, 'hotSpots', hotSpotId);
    const primarySnap = await getDoc(primaryRef);
    if (primarySnap.exists()) {
      await updateDoc(primaryRef, payload);
      return;
    }

    const fallbackRef = doc(db, 'hotspots', hotSpotId);
    const fallbackSnap = await getDoc(fallbackRef);
    if (fallbackSnap.exists()) {
      await updateDoc(fallbackRef, payload);
      return;
    }

    await setDoc(primaryRef, payload, { merge: true });
  }


}

export default new OptimizedHotSpotsService();
