import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  getDocs, 
  doc,
  getDoc,
  updateDoc,
  increment,
  writeBatch,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import userCacheService from './userCacheService';

export interface OptimizedHashtag {
  id: string;
  tag: string;
  count: number;
  createdAt: string;
  lastUsed: string;
  trending?: boolean;
}

export interface OptimizedPost {
  id: string;
  userID: string;
  content: string;
  hashtags: string[];
  likes: string[];
  comments: number;
  timestamp: any;
  type?: string;
  images?: string[];
  privacy?: string;
  userInfo?: any;
}

class OptimizedHashtagService {
  private hashtagCache = new Map<string, OptimizedHashtag[]>();
  private postCache = new Map<string, OptimizedPost[]>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  // Cache management
  private setCache(key: string, data: any): void {
    const cacheEntry = {
      data,
      _cachedAt: Date.now()
    };
    
    if (key.startsWith('hashtag_')) {
      this.hashtagCache.set(key, cacheEntry as any);
    } else if (key.startsWith('posts_')) {
      this.postCache.set(key, cacheEntry as any);
    }
  }

  private getCache(key: string): any | null {
    let cached: any = null;
    
    if (key.startsWith('hashtag_')) {
      cached = this.hashtagCache.get(key);
    } else if (key.startsWith('posts_')) {
      cached = this.postCache.get(key);
    }
    
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached._cachedAt > this.CACHE_DURATION) {
      if (key.startsWith('hashtag_')) {
        this.hashtagCache.delete(key);
      } else if (key.startsWith('posts_')) {
        this.postCache.delete(key);
      }
      return null;
    }
    
    return cached.data;
  }

  // Get trending hashtags with caching
  async getTrendingHashtags(limitCount: number = 20): Promise<OptimizedHashtag[]> {
    const cacheKey = `hashtag_trending_${limitCount}`;
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      console.log('🚀 Using cached trending hashtags');
      return cached;
    }

    try {
      const hashtagsRef = collection(db, 'hashtags');
      
      // Simple query to avoid complex indexes
      const q = query(
        hashtagsRef,
        orderBy('count', 'desc'),
        firestoreLimit(limitCount * 2) // Get more to sort client-side
      );
      
      const querySnapshot = await getDocs(q);
      const hashtags: OptimizedHashtag[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        tag: doc.data().tag || '',
        count: doc.data().count || 0,
        createdAt: doc.data().createdAt || new Date().toISOString(),
        lastUsed: doc.data().lastUsed || new Date().toISOString(),
        trending: doc.data().count > 10 // Simple trending logic
      }));

      // Sort by count and limit
      const trendingHashtags = hashtags
        .sort((a, b) => b.count - a.count)
        .slice(0, limitCount);

      // Cache results
      this.setCache(cacheKey, trendingHashtags);

      console.log(`✅ Loaded ${trendingHashtags.length} trending hashtags`);
      return trendingHashtags;
    } catch (error) {
      console.error('❌ Error getting trending hashtags:', error);
      return [];
    }
  }

  // Search hashtags with caching
  async searchHashtags(searchTerm: string, limitCount: number = 10): Promise<OptimizedHashtag[]> {
    if (!searchTerm.trim()) return [];
    
    const cacheKey = `hashtag_search_${searchTerm.toLowerCase()}_${limitCount}`;
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      console.log('🚀 Using cached hashtag search');
      return cached;
    }

    try {
      const hashtagsRef = collection(db, 'hashtags');
      const searchTermLower = searchTerm.toLowerCase();
      
      // Use prefix search
      const q = query(
        hashtagsRef,
        where('tag', '>=', searchTermLower),
        where('tag', '<=', searchTermLower + '\uf8ff'),
        firestoreLimit(limitCount * 2)
      );
      
      const querySnapshot = await getDocs(q);
      const hashtags: OptimizedHashtag[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        tag: doc.data().tag || '',
        count: doc.data().count || 0,
        createdAt: doc.data().createdAt || new Date().toISOString(),
        lastUsed: doc.data().lastUsed || new Date().toISOString(),
        trending: doc.data().count > 10
      }));
      
      // Sort by count and limit
      const searchResults = hashtags
        .sort((a, b) => b.count - a.count)
        .slice(0, limitCount);

      // Cache results
      this.setCache(cacheKey, searchResults);

      console.log(`✅ Found ${searchResults.length} hashtags for search: ${searchTerm}`);
      return searchResults;
    } catch (error) {
      console.error('❌ Error searching hashtags:', error);
      return [];
    }
  }

  // Get posts by hashtag with optimization
  async getPostsByHashtag(hashtag: string, limitCount: number = 20): Promise<OptimizedPost[]> {
    const cacheKey = `posts_hashtag_${hashtag}_${limitCount}`;
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      console.log('🚀 Using cached posts for hashtag');
      return cached;
    }

    try {
      console.log('🔍 Searching posts for hashtag:', hashtag);
      
      const postsRef = collection(db, 'posts');
      
      // Try multiple hashtag formats for better matching
      const searchFormats = [
        hashtag,
        hashtag.toLowerCase(),
        hashtag.startsWith('#') ? hashtag : `#${hashtag}`,
        hashtag.startsWith('#') ? hashtag.toLowerCase() : `#${hashtag.toLowerCase()}`
      ];
      
      let allPosts: OptimizedPost[] = [];
      const userIds = new Set<string>();
      
      // Search with multiple formats to catch all variations
      for (const format of searchFormats) {
        const q = query(
          postsRef,
          where('hashtags', 'array-contains', format),
          firestoreLimit(limitCount)
        );
        
        const querySnapshot = await getDocs(q);
        
        querySnapshot.docs.forEach(doc => {
          const postData = doc.data();
          const post: OptimizedPost = {
            id: doc.id,
            userID: postData.userID || '',
            content: postData.content || '',
            hashtags: Array.isArray(postData.hashtags) ? postData.hashtags : [],
            likes: Array.isArray(postData.likes) ? postData.likes : [],
            comments: postData.comments || 0,
            timestamp: postData.timestamp,
            type: postData.type || 'post',
            images: Array.isArray(postData.images) ? postData.images : [],
            privacy: postData.privacy || 'public'
          };
          
          // Avoid duplicates
          if (!allPosts.find(p => p.id === post.id)) {
            allPosts.push(post);
            if (post.userID) {
              userIds.add(post.userID);
            }
          }
        });
      }
      
      // Sort by timestamp (newest first)
      allPosts.sort((a, b) => {
        const aTime = a.timestamp?.seconds || 0;
        const bTime = b.timestamp?.seconds || 0;
        return bTime - aTime;
      });
      
      // Limit results
      const limitedPosts = allPosts.slice(0, limitCount);
      
      // Preload user information for posts
      if (userIds.size > 0) {
        await userCacheService.preloadUsers(Array.from(userIds));
        const usersMap = await userCacheService.getUsers(Array.from(userIds));
        
        // Enrich posts with user info
        limitedPosts.forEach(post => {
          if (post.userID) {
            const userInfo = usersMap.get(post.userID);
            if (userInfo) {
              post.userInfo = {
                displayName: userInfo.displayName || userInfo.fullName || 'Anonymous',
                profileUrl: userInfo.profileUrl || null,
                username: userInfo.username || userInfo.email || ''
              };
            }
          }
        });
      }

      // Cache results
      this.setCache(cacheKey, limitedPosts);

      console.log(`✅ Found ${limitedPosts.length} posts for hashtag: ${hashtag}`);
      return limitedPosts;
    } catch (error) {
      console.error('❌ Error getting posts by hashtag:', error);
      return [];
    }
  }

  // Batch update hashtag counts
  async batchUpdateHashtagCounts(hashtagUpdates: Array<{
    hashtag: string;
    increment: number;
  }>): Promise<void> {
    if (hashtagUpdates.length === 0) return;

    try {
      const batch = writeBatch(db);
      const hashtagsRef = collection(db, 'hashtags');

      for (const { hashtag, increment: incrementValue } of hashtagUpdates) {
        // Find existing hashtag or create new one
        const hashtagQuery = query(
          hashtagsRef,
          where('tag', '==', hashtag.toLowerCase()),
          firestoreLimit(1)
        );
        
        const existingHashtags = await getDocs(hashtagQuery);
        
        if (existingHashtags.empty) {
          // Create new hashtag
          const newHashtagRef = doc(hashtagsRef);
          batch.set(newHashtagRef, {
            tag: hashtag.toLowerCase(),
            count: Math.max(1, incrementValue),
            createdAt: serverTimestamp(),
            lastUsed: serverTimestamp()
          });
        } else {
          // Update existing hashtag
          const existingDoc = existingHashtags.docs[0];
          batch.update(existingDoc.ref, {
            count: increment(incrementValue),
            lastUsed: serverTimestamp()
          });
        }
      }

      await batch.commit();
      
      // Clear related cache entries
      const cacheKeysToRemove: string[] = [];
      this.hashtagCache.forEach((_, key) => {
        if (key.includes('trending') || key.includes('search')) {
          cacheKeysToRemove.push(key);
        }
      });
      cacheKeysToRemove.forEach(key => this.hashtagCache.delete(key));

      console.log(`✅ Batch updated ${hashtagUpdates.length} hashtag counts`);
    } catch (error) {
      console.error('❌ Error batch updating hashtag counts:', error);
      throw error;
    }
  }

  // Increment single hashtag usage
  async incrementHashtagUsage(hashtag: string): Promise<void> {
    return this.batchUpdateHashtagCounts([{ hashtag, increment: 1 }]);
  }

  // Process hashtags from post content
  extractHashtags(content: string): string[] {
    const hashtagRegex = /#[\w\u00c0-\u024f\u1e00-\u1eff]+/gi;
    const matches = content.match(hashtagRegex);
    
    if (!matches) return [];
    
    // Clean and deduplicate hashtags
    const cleanHashtags = matches
      .map(tag => tag.toLowerCase().trim())
      .filter((tag, index, array) => array.indexOf(tag) === index)
      .slice(0, 10); // Limit to 10 hashtags per post
    
    return cleanHashtags;
  }

  // Process hashtags from new post
  async processPostHashtags(content: string): Promise<string[]> {
    const hashtags = this.extractHashtags(content);
    
    if (hashtags.length > 0) {
      // Update hashtag counts in background
      const updates = hashtags.map(hashtag => ({ hashtag, increment: 1 }));
      this.batchUpdateHashtagCounts(updates).catch(error => {
        console.error('❌ Error processing post hashtags:', error);
      });
    }
    
    return hashtags;
  }

  // Get hashtag suggestions based on partial input
  async getHashtagSuggestions(partialInput: string, limit: number = 5): Promise<string[]> {
    if (partialInput.length < 2) return [];
    
    try {
      const suggestions = await this.searchHashtags(partialInput, limit);
      return suggestions.map(h => h.tag);
    } catch (error) {
      console.error('❌ Error getting hashtag suggestions:', error);
      return [];
    }
  }

  // Get popular hashtags for category
  async getPopularHashtagsByCategory(category: string, limit: number = 10): Promise<string[]> {
    // This would require category tagging in hashtags collection
    // For now, return trending hashtags
    try {
      const trending = await this.getTrendingHashtags(limit);
      return trending.map(h => h.tag);
    } catch (error) {
      console.error('❌ Error getting popular hashtags by category:', error);
      return [];
    }
  }

  // Cleanup old hashtags with low usage
  async cleanupUnusedHashtags(minCount: number = 1, olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
      
      const hashtagsRef = collection(db, 'hashtags');
      const q = query(
        hashtagsRef,
        where('count', '<=', minCount),
        firestoreLimit(100) // Process in batches
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('🧹 No unused hashtags to cleanup');
        return 0;
      }

      // Filter by date in memory
      const toDelete = snapshot.docs.filter(doc => {
        const data = doc.data();
        const lastUsed = data.lastUsed?.toDate() || new Date();
        return lastUsed < cutoffDate;
      });

      if (toDelete.length === 0) {
        console.log('🧹 No old unused hashtags found');
        return 0;
      }

      // Batch delete
      const batch = writeBatch(db);
      toDelete.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();

      // Clear cache
      this.hashtagCache.clear();

      console.log(`✅ Cleaned up ${toDelete.length} unused hashtags`);
      return toDelete.length;
    } catch (error) {
      console.error('❌ Error cleaning up unused hashtags:', error);
      return 0;
    }
  }

  // Get service stats
  getStats(): {
    hashtagsCached: number;
    postsCached: number;
    memoryUsage: string;
  } {
    const hashtagMemory = JSON.stringify([...this.hashtagCache.values()]).length;
    const postMemory = JSON.stringify([...this.postCache.values()]).length;
    const totalMemory = Math.round((hashtagMemory + postMemory) / 1024);
    
    return {
      hashtagsCached: this.hashtagCache.size,
      postsCached: this.postCache.size,
      memoryUsage: `${totalMemory}KB`
    };
  }

  // Clear all caches
  clearCache(): void {
    this.hashtagCache.clear();
    this.postCache.clear();
    console.log('🧹 Hashtag service cache cleared');
  }
}

export default new OptimizedHashtagService();
