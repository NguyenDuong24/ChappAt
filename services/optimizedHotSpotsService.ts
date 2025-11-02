import { 
  collection, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  getDocs,
  onSnapshot,
  Unsubscribe,
  DocumentSnapshot,
  addDoc,
  updateDoc,
  writeBatch,
  increment,
  deleteDoc
} from 'firebase/firestore';
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
      // Single optimized query - fetch more, filter client-side
      const hotSpotsQuery = query(
        collection(db, 'hotSpots'),
        where('isActive', '==', true),
        firestoreLimit(100) // Get more để filter client-side
      );

      const snapshot = await getDocs(hotSpotsQuery);
      let allHotSpots: CachedHotSpot[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        _cachedAt: Date.now()
      } as CachedHotSpot));

      // Client-side filtering (tránh phức tạp index)
      let filteredHotSpots = this.applyClientSideFilters(allHotSpots, filters);
      
      // Client-side sorting
      filteredHotSpots = this.applySorting(filteredHotSpots, filters.sortBy || 'newest');
      
      // Apply limit
      const result = filteredHotSpots.slice(0, limit);
      
      // Cache multiple variations
      this.setCacheMultiple(filters, result, allHotSpots);
      
      console.log(`🔥 Loaded ${result.length} hotspots (from ${snapshot.docs.length} docs)`);
      return result;
    } catch (error) {
      console.error('Error loading hotspots:', error);
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
            result.set(interaction.hotSpotId, interaction);
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

      // Return only requested hotSpots
      const result = new Map();
      interactions.forEach((interaction: any) => {
        if (hotSpotIds.includes(interaction.hotSpotId)) {
          result.set(interaction.hotSpotId, interaction);
        }
      });

      console.log(`🎯 Loaded ${result.size} interactions for ${hotSpotIds.length} hotspots`);
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
        type: 'join',
        isJoined: true,
        timestamp: new Date(),
        createdAt: new Date()
      };

      // Add to Firebase
      await addDoc(collection(db, 'hotSpotInteractions'), interactionData);
      
      // Update stats
      await this.updateHotSpotStats(hotSpotId, 'join');
      
      // Clear relevant caches
      this.userInteractionCache.delete(`interactions_${userId}`);
      
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

      await addDoc(collection(db, 'hotSpotInteractions'), interactionData);
      
      // Update stats
      await this.updateHotSpotStats(hotSpotId, 'interested');
      
      // Clear relevant caches
      this.userInteractionCache.delete(`interactions_${userId}`);
      
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
        type: 'checkin',
        hasCheckedIn: true,
        timestamp: new Date(),
        createdAt: new Date(),
        location: location || null
      };

      await addDoc(collection(db, 'hotSpotInteractions'), interactionData);
      
      // Update stats
      await this.updateHotSpotStats(hotSpotId, 'checkin');
      
      // Clear relevant caches
      this.userInteractionCache.delete(`interactions_${userId}`);
      
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

      await addDoc(collection(db, 'hotSpotInteractions'), interactionData);
      
      // Clear relevant caches
      this.userInteractionCache.delete(`interactions_${userId}`);
      
      console.log(`⭐ User ${userId} favorited hotspot ${hotSpotId}`);
    } catch (error) {
      console.error('Error adding favorite:', error);
      throw error;
    }
  }

  async removeFavorite(userId: string, hotSpotId: string): Promise<void> {
    try {
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
      
      // Update stats (decrement)
      await this.updateHotSpotStats(hotSpotId, 'removeInterested');
      
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
    const variations = [
      { ...baseFilters, sortBy: 'popular' },
      { ...baseFilters, sortBy: 'rating' },
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
      const hotSpotRef = doc(db, 'hotSpots', hotSpotId);
      
      if (action === 'join') {
        await updateDoc(hotSpotRef, {
          'stats.joined': increment(1),
          'participantCount': increment(1),
          updatedAt: new Date()
        });
      } else if (action === 'checkin') {
        await updateDoc(hotSpotRef, {
          'stats.checkins': increment(1),
          updatedAt: new Date()
        });
      } else if (action === 'interested') {
        await updateDoc(hotSpotRef, {
          'stats.interested': increment(1),
          updatedAt: new Date()
        });
      } else if (action === 'removeInterested') {
        await updateDoc(hotSpotRef, {
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


}

export default new OptimizedHotSpotsService();
