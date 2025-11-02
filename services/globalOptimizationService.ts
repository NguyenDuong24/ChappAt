import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  startAfter,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import userCacheService from './userCacheService';
import messageBatchService from './messageBatchService';
import optimizedGroupService from './optimizedGroupService';
import connectionManager from './connectionManager';

interface CacheConfig {
  userCacheDuration: number;
  groupCacheDuration: number;
  locationCacheDuration: number;
  maxCacheSize: number;
}

interface OptimizationStats {
  totalRequestsSaved: number;
  cacheHitRate: number;
  activeConnections: number;
  lastOptimized: Date;
}

class GlobalOptimizationService {
  private config: CacheConfig = {
    userCacheDuration: 5 * 60 * 1000, // 5 phút
    groupCacheDuration: 10 * 60 * 1000, // 10 phút
    locationCacheDuration: 5 * 60 * 1000, // 5 phút
    maxCacheSize: 1000
  };

  private stats: OptimizationStats = {
    totalRequestsSaved: 0,
    cacheHitRate: 0,
    activeConnections: 0,
    lastOptimized: new Date()
  };

  private locationCache = new Map<string, any>();
  private postCache = new Map<string, any>();
  private activeLocationListeners = new Map<string, Unsubscribe>();

  // ===================== LOCATION OPTIMIZATION =====================

  // Optimized location query với geographic indexing
  async queryOptimizedNearbyUsers(
    userLocation: { latitude: number; longitude: number },
    userId: string,
    radiusMeters: number = 1000
  ): Promise<any[]> {
    const cacheKey = `location_${userId}_${radiusMeters}`;
    
    // Check cache first
    if (this.locationCache.has(cacheKey)) {
      const cached = this.locationCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.config.locationCacheDuration) {
        console.log('📍 Using cached location data');
        this.stats.totalRequestsSaved++;
        return cached.users;
      }
    }

    try {
      // Convert radius to degrees (rough approximation)
      const radiusDegrees = radiusMeters / 111320;
      const { latitude: lat, longitude: lng } = userLocation;

      // Query with bounding box to reduce documents scanned
      const usersQuery = query(
        collection(db, 'users'),
        where('location.latitude', '>=', lat - radiusDegrees),
        where('location.latitude', '<=', lat + radiusDegrees),
        // Note: Firestore doesn't support multiple range queries on different fields
        // We'll filter longitude in memory
        firestoreLimit(100) // Limit to reduce cost
      );

      const snapshot = await getDocs(usersQuery);
      const nearbyUsers: any[] = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (doc.id !== userId && data.location) {
          const userLng = data.location.longitude;
          
          // Additional longitude check in memory
          if (Math.abs(userLng - lng) <= radiusDegrees) {
            const distance = this.calculateDistance(
              lat, lng,
              data.location.latitude, userLng
            );

            if (distance <= radiusMeters) {
              nearbyUsers.push({
                userId: doc.id,
                distance: Math.round(distance),
                direction: this.calculateBearing(lat, lng, data.location.latitude, userLng),
                ...data
              });
            }
          }
        }
      });

      // Cache the results
      this.locationCache.set(cacheKey, {
        users: nearbyUsers,
        timestamp: Date.now()
      });

      // Cleanup cache if too large
      if (this.locationCache.size > 50) {
        this.cleanupLocationCache();
      }

      console.log(`📍 Found ${nearbyUsers.length} nearby users (scanned ${snapshot.docs.length} docs)`);
      return nearbyUsers;
    } catch (error) {
      console.error('Error in optimized location query:', error);
      return [];
    }
  }

  // ===================== POST/FEED OPTIMIZATION =====================

  // Optimized posts loading with caching and pagination
  async getOptimizedPosts(
    userId: string, 
    lastPostId?: string, 
    limit: number = 20
  ): Promise<any[]> {
    const cacheKey = `posts_${userId}_${lastPostId || 'initial'}`;
    
    // Check cache
    if (this.postCache.has(cacheKey)) {
      const cached = this.postCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 2 * 60 * 1000) { // 2 phút cache cho posts
        console.log('📝 Using cached posts');
        this.stats.totalRequestsSaved++;
        return cached.posts;
      }
    }

    try {
      let postsQuery;
      
      if (lastPostId) {
        // Get the last post document for pagination
        const lastPostDoc = await getDoc(doc(db, 'posts', lastPostId));
        postsQuery = query(
          collection(db, 'posts'),
          orderBy('createdAt', 'desc'),
          startAfter(lastPostDoc),
          firestoreLimit(limit)
        );
      } else {
        postsQuery = query(
          collection(db, 'posts'),
          orderBy('createdAt', 'desc'),
          firestoreLimit(limit)
        );
      }

      const snapshot = await getDocs(postsQuery);
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Preload user data for all post authors
      const authorIds = [...new Set(posts.map(post => post.authorId).filter(Boolean))];
      if (authorIds.length > 0) {
        await userCacheService.preloadUsers(authorIds);
      }

      // Cache the results
      this.postCache.set(cacheKey, {
        posts,
        timestamp: Date.now()
      });

      console.log(`📝 Loaded ${posts.length} posts, preloaded ${authorIds.length} users`);
      return posts;
    } catch (error) {
      console.error('Error loading optimized posts:', error);
      return [];
    }
  }

  // ===================== REAL-TIME OPTIMIZATION =====================

  // Smart listener management
  setupOptimizedListener(
    key: string,
    queryFn: () => any,
    callback: (data: any) => void,
    type: 'messages' | 'posts' | 'status' | 'location' = 'messages'
  ): Unsubscribe {
    // Remove existing listener if exists
    this.removeListener(key);

    const unsubscribe = onSnapshot(
      queryFn(),
      (snapshot) => {
        connectionManager.updateActivity(key);
        callback(snapshot);
      },
      (error) => {
        console.error(`Listener error (${key}):`, error);
      }
    );

    // Register with connection manager
    connectionManager.addConnection(key, unsubscribe, key, type);
    
    return unsubscribe;
  }

  // Remove specific listener
  removeListener(key: string) {
    connectionManager.removeConnection(key);
  }

  // ===================== BATCH OPERATIONS =====================

  // Batch update user statuses
  async batchUpdateUserStatuses(
    updates: Array<{ userId: string; status: string; lastSeen?: Date }>
  ): Promise<void> {
    try {
      // Group updates to reduce Firebase operations
      const batchPromises = updates.map(async ({ userId, status, lastSeen }) => {
        const userRef = doc(db, 'users', userId);
        const updateData: any = { status };
        if (lastSeen) updateData.lastSeen = lastSeen;
        
        return updateDoc(userRef, updateData);
      });

      await Promise.all(batchPromises);
      
      // Invalidate user cache for updated users
      updates.forEach(({ userId }) => {
        userCacheService.invalidateUser(userId);
      });

      console.log(`✅ Batch updated ${updates.length} user statuses`);
    } catch (error) {
      console.error('Error in batch status update:', error);
    }
  }

  // ===================== CACHE MANAGEMENT =====================

  private cleanupLocationCache() {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.locationCache.forEach((data, key) => {
      if (now - data.timestamp > this.config.locationCacheDuration) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.locationCache.delete(key));
    console.log(`🧹 Cleaned up ${expiredKeys.length} expired location cache entries`);
  }

  private cleanupPostCache() {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.postCache.forEach((data, key) => {
      if (now - data.timestamp > 2 * 60 * 1000) { // 2 phút
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.postCache.delete(key));
    console.log(`🧹 Cleaned up ${expiredKeys.length} expired post cache entries`);
  }

  // ===================== UTILITIES =====================

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): string {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
    let brng = Math.atan2(y, x) * 180 / Math.PI;
    brng = (brng + 360) % 360;
    const directions = ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'];
    return directions[Math.round(brng / 45) % 8];
  }

  // ===================== MONITORING & STATS =====================

  getOptimizationStats(): OptimizationStats & {
    cacheStats: any;
    connectionStats: any;
  } {
    const cacheStats = {
      userCache: userCacheService.getCacheStats(),
      groupCache: optimizedGroupService.getCacheStats(),
      locationCacheSize: this.locationCache.size,
      postCacheSize: this.postCache.size
    };

    const connectionStats = connectionManager.getStats();

    this.stats.activeConnections = connectionStats.total;
    this.stats.cacheHitRate = this.calculateCacheHitRate();

    return {
      ...this.stats,
      cacheStats,
      connectionStats
    };
  }

  private calculateCacheHitRate(): number {
    // Simplified cache hit rate calculation
    const totalCacheSize = 
      userCacheService.getCacheStats().size +
      optimizedGroupService.getCacheStats().groupCacheSize +
      this.locationCache.size +
      this.postCache.size;
    
    return totalCacheSize > 0 ? (this.stats.totalRequestsSaved / (this.stats.totalRequestsSaved + totalCacheSize)) * 100 : 0;
  }

  // ===================== CLEANUP =====================

  cleanup() {
    // Clear all caches
    this.locationCache.clear();
    this.postCache.clear();
    
    // Cleanup services
    userCacheService.clearCache();
    optimizedGroupService.cleanup();
    connectionManager.cleanup();
    
    // Flush pending batch operations
    messageBatchService.flush();

    console.log('🧹 Global optimization cleanup completed');
  }

  // Auto cleanup every 10 minutes
  startAutoCleanup() {
    setInterval(() => {
      this.cleanupLocationCache();
      this.cleanupPostCache();
      console.log('🔄 Auto cleanup completed');
    }, 10 * 60 * 1000);
  }
}

export default new GlobalOptimizationService();
