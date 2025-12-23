import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  getDocs, 
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  writeBatch,
  startAfter,
  DocumentSnapshot,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import userCacheService from './userCacheService';
import optimizedHashtagService from './optimizedHashtagService';
import ExpoPushNotificationService from './expoPushNotificationService';

export interface OptimizedSocialPost {
  id: string;
  userID: string;
  content: string;
  images: string[];
  hashtags: string[];
  likes: string[];
  comments: number;
  shares: number;
  timestamp: any;
  type: 'post' | 'share' | 'story';
  privacy: 'public' | 'friends' | 'private';
  userInfo?: {
    displayName: string;
    profileUrl?: string;
    username: string;
  };
  isLiked?: boolean;
  likeCount?: number;
}

interface PostsCache {
  posts: OptimizedSocialPost[];
  lastDoc?: DocumentSnapshot;
  hasMore: boolean;
  lastUpdated?: number;
}

type SortType = 'latest' | 'popular' | 'trending';

class OptimizedSocialService {
  private postsCache = new Map<string, PostsCache>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly PAGE_SIZE = 20;

  // Cache management
  private setCache(key: string, data: PostsCache): void {
    this.postsCache.set(key, {
      ...data,
      lastUpdated: Date.now()
    });
  }

  private getCache(key: string): PostsCache | null {
    const cached = this.postsCache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - (cached.lastUpdated || 0) > this.CACHE_DURATION) {
      this.postsCache.delete(key);
      return null;
    }
    
    return cached;
  }

  // Load posts with optimized pagination and caching
  async loadPosts(
    currentUserId: string,
    sortType: SortType = 'latest',
    refresh: boolean = false,
    hashtag?: string
  ): Promise<{
    posts: OptimizedSocialPost[];
    hasMore: boolean;
  }> {
    const cacheKey = `posts_${sortType}_${hashtag || 'all'}_${currentUserId}`;
    
    // Check cache first
    if (!refresh) {
      const cached = this.getCache(cacheKey);
      if (cached) {
        console.log('🚀 Using cached social posts');
        return {
          posts: cached.posts,
          hasMore: cached.hasMore
        };
      }
    }

    try {
      const postsRef = collection(db, 'posts');
      
      // Build query based on type
      let q;
      if (hashtag) {
        // Search by hashtag
        q = query(
          postsRef,
          where('hashtags', 'array-contains', hashtag),
          firestoreLimit(this.PAGE_SIZE * 2) // Get more to sort client-side
        );
      } else {
        // General posts query - simplified to avoid complex indexes
        q = query(
          postsRef,
          firestoreLimit(this.PAGE_SIZE * 2)
        );
      }

      const snapshot = await getDocs(q);
      let posts: OptimizedSocialPost[] = [];
      const userIds = new Set<string>();

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Skip shared posts, only keep original posts for explore
        if (data.type === 'share') return;
        
        const post: OptimizedSocialPost = {
          id: doc.id,
          userID: data.userID || '',
          content: data.content || '',
          images: Array.isArray(data.images) ? data.images : [],
          hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
          likes: Array.isArray(data.likes) ? data.likes : [],
          comments: data.comments || 0,
          shares: data.shares || 0,
          timestamp: data.timestamp,
          type: data.type || 'post',
          privacy: data.privacy || 'public',
          isLiked: Array.isArray(data.likes) ? data.likes.includes(currentUserId) : false,
          likeCount: Array.isArray(data.likes) ? data.likes.length : 0
        };

        posts.push(post);
        
        if (post.userID) {
          userIds.add(post.userID);
        }
      });

      // Preload user information
      if (userIds.size > 0) {
        await userCacheService.preloadUsers(Array.from(userIds));
        const usersMap = await userCacheService.getUsers(Array.from(userIds));
        
        // Enrich posts with user info
        posts = posts.map(post => {
          if (post.userID) {
            const userInfo = usersMap.get(post.userID);
            if (userInfo) {
              post.userInfo = {
                displayName: userInfo.displayName || userInfo.fullName || 'Anonymous',
                profileUrl: userInfo.profileUrl || undefined,
                username: userInfo.username || userInfo.email || ''
              };
            }
          }
          return post;
        });
      }

      // Apply client-side sorting
      switch (sortType) {
        case 'popular':
          posts.sort((a, b) => b.likeCount! - a.likeCount!);
          break;
        case 'trending':
          // Sort by engagement (likes + comments + shares)
          posts.sort((a, b) => {
            const engagementA = (a.likeCount || 0) + (a.comments || 0) + (a.shares || 0);
            const engagementB = (b.likeCount || 0) + (b.comments || 0) + (b.shares || 0);
            return engagementB - engagementA;
          });
          break;
        case 'latest':
        default:
          posts.sort((a, b) => {
            const timestampA = a.timestamp?.seconds * 1000 + a.timestamp?.nanoseconds / 1000000;
            const timestampB = b.timestamp?.seconds * 1000 + b.timestamp?.nanoseconds / 1000000;
            return timestampB - timestampA;
          });
          break;
      }

      // Limit results
      const finalPosts = posts.slice(0, this.PAGE_SIZE);
      const hasMore = posts.length > this.PAGE_SIZE;

      // Cache results
      this.setCache(cacheKey, {
        posts: finalPosts,
        hasMore,
        lastDoc: snapshot.docs[snapshot.docs.length - 1]
      });

      console.log(`✅ Loaded ${finalPosts.length} ${sortType} posts (hashtag: ${hashtag || 'all'})`);
      return {
        posts: finalPosts,
        hasMore
      };
    } catch (error) {
      console.error('❌ Error loading posts:', error);
      return { posts: [], hasMore: false };
    }
  }

  // Load more posts for pagination
  async loadMorePosts(
    currentUserId: string,
    sortType: SortType = 'latest',
    hashtag?: string
  ): Promise<OptimizedSocialPost[]> {
    const cacheKey = `posts_${sortType}_${hashtag || 'all'}_${currentUserId}`;
    const cached = this.getCache(cacheKey);
    
    if (!cached || !cached.lastDoc || !cached.hasMore) {
      return [];
    }

    try {
      const postsRef = collection(db, 'posts');
      
      let q;
      if (hashtag) {
        q = query(
          postsRef,
          where('hashtags', 'array-contains', hashtag),
          startAfter(cached.lastDoc),
          firestoreLimit(this.PAGE_SIZE)
        );
      } else {
        q = query(
          postsRef,
          startAfter(cached.lastDoc),
          firestoreLimit(this.PAGE_SIZE)
        );
      }

      const snapshot = await getDocs(q);
      const newPosts: OptimizedSocialPost[] = [];
      const userIds = new Set<string>();

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        if (data.type === 'share') return;
        
        const post: OptimizedSocialPost = {
          id: doc.id,
          userID: data.userID || '',
          content: data.content || '',
          images: Array.isArray(data.images) ? data.images : [],
          hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
          likes: Array.isArray(data.likes) ? data.likes : [],
          comments: data.comments || 0,
          shares: data.shares || 0,
          timestamp: data.timestamp,
          type: data.type || 'post',
          privacy: data.privacy || 'public',
          isLiked: Array.isArray(data.likes) ? data.likes.includes(currentUserId) : false,
          likeCount: Array.isArray(data.likes) ? data.likes.length : 0
        };

        newPosts.push(post);
        
        if (post.userID) {
          userIds.add(post.userID);
        }
      });

      // Preload user information for new posts
      if (userIds.size > 0) {
        await userCacheService.preloadUsers(Array.from(userIds));
        const usersMap = await userCacheService.getUsers(Array.from(userIds));
        
        newPosts.forEach(post => {
          if (post.userID) {
            const userInfo = usersMap.get(post.userID);
            if (userInfo) {
              post.userInfo = {
                displayName: userInfo.displayName || userInfo.fullName || 'Anonymous',
                profileUrl: userInfo.profileUrl || undefined,
                username: userInfo.username || userInfo.email || ''
              };
            }
          }
        });
      }

      // Update cache
      const updatedPosts = [...cached.posts, ...newPosts];
      this.setCache(cacheKey, {
        posts: updatedPosts,
        hasMore: snapshot.docs.length === this.PAGE_SIZE,
        lastDoc: snapshot.docs[snapshot.docs.length - 1]
      });

      console.log(`✅ Loaded ${newPosts.length} more posts`);
      return newPosts;
    } catch (error) {
      console.error('❌ Error loading more posts:', error);
      return [];
    }
  }

  // Batch toggle likes for multiple posts
  async batchToggleLikes(
    likesToggles: Array<{
      postId: string;
      userId: string;
      isLiked: boolean;
    }>
  ): Promise<void> {
    if (likesToggles.length === 0) return;

    try {
      const batch = writeBatch(db);
      
      likesToggles.forEach(({ postId, userId, isLiked }) => {
        const postRef = doc(db, 'posts', postId);
        
        if (isLiked) {
          // Remove like
          batch.update(postRef, {
            likes: arrayRemove(userId)
          });
        } else {
          // Add like
          batch.update(postRef, {
            likes: arrayUnion(userId)
          });
        }
      });

      await batch.commit();

      // NEW: Push notification to post owner only when adding like (not removing)
      try {
        await Promise.all(likesToggles.filter(t => !t.isLiked).map(async ({ postId, userId }) => {
          try {
            const postSnap = await getDoc(doc(db, 'posts', postId));
            if (!postSnap.exists()) return;
            const post = postSnap.data() as any;
            const ownerId = post.userId || post.userID;
            if (!ownerId || ownerId === userId) return;

            // Get liker name from cache or fetch
            let likerName = 'Ai đó';
            try {
              const cached = await userCacheService.getUser(userId);
              likerName = cached?.displayName || cached?.username || cached?.fullName || 'Ai đó';
            } catch {}

            await ExpoPushNotificationService.sendPushToUser(ownerId, {
              title: '❤️ Lượt thích mới',
              body: `${likerName} đã thích bài viết của bạn`,
              data: { type: 'like', postId, userId },
            });
          } catch (e) {
            console.warn('⚠️ Failed to send like push:', e);
          }
        }));
      } catch (e) {
        console.warn('⚠️ Batch like push error:', e);
      }

      // Update cache
      this.postsCache.forEach((cache) => {
        cache.posts = cache.posts.map(post => {
          const toggle = likesToggles.find(t => t.postId === post.id);
          if (toggle) {
            const newLikes = toggle.isLiked 
              ? post.likes.filter(id => id !== toggle.userId)
              : [...post.likes, toggle.userId];
            
            return {
              ...post,
              likes: newLikes,
              likeCount: newLikes.length,
              isLiked: newLikes.includes(toggle.userId)
            };
          }
          return post;
        });
      });

      console.log(`✅ Batch toggled likes for ${likesToggles.length} posts`);
    } catch (error) {
      console.error('❌ Error batch toggling likes:', error);
      throw error;
    }
  }

  // Toggle like for single post
  async toggleLike(postId: string, userId: string, isLiked: boolean): Promise<void> {
    return this.batchToggleLikes([{ postId, userId, isLiked }]);
  }

  // Get posts by user with caching
  async getUserPosts(
    userId: string,
    currentUserId: string,
    limit: number = 20
  ): Promise<OptimizedSocialPost[]> {
    const cacheKey = `user_posts_${userId}_${limit}`;
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      console.log('🚀 Using cached user posts');
      return cached.posts;
    }

    try {
      const postsRef = collection(db, 'posts');
      const q = query(
        postsRef,
        where('userID', '==', userId),
        firestoreLimit(limit)
      );

      const snapshot = await getDocs(q);
      const posts: OptimizedSocialPost[] = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        const post: OptimizedSocialPost = {
          id: doc.id,
          userID: data.userID || '',
          content: data.content || '',
          images: Array.isArray(data.images) ? data.images : [],
          hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
          likes: Array.isArray(data.likes) ? data.likes : [],
          comments: data.comments || 0,
          shares: data.shares || 0,
          timestamp: data.timestamp,
          type: data.type || 'post',
          privacy: data.privacy || 'public',
          isLiked: Array.isArray(data.likes) ? data.likes.includes(currentUserId) : false,
          likeCount: Array.isArray(data.likes) ? data.likes.length : 0
        };

        posts.push(post);
      });

      // Sort by timestamp
      posts.sort((a, b) => {
        const timestampA = a.timestamp?.seconds * 1000 + a.timestamp?.nanoseconds / 1000000;
        const timestampB = b.timestamp?.seconds * 1000 + b.timestamp?.nanoseconds / 1000000;
        return timestampB - timestampA;
      });

      // Get user info
      const userInfo = await userCacheService.getUser(userId);
      if (userInfo) {
        posts.forEach(post => {
          post.userInfo = {
            displayName: userInfo.displayName || userInfo.fullName || 'Anonymous',
            profileUrl: userInfo.profileUrl || undefined,
            username: userInfo.username || userInfo.email || ''
          };
        });
      }

      // Cache results
      this.setCache(cacheKey, {
        posts,
        hasMore: posts.length === limit
      });

      console.log(`✅ Loaded ${posts.length} posts for user ${userId}`);
      return posts;
    } catch (error) {
      console.error('❌ Error getting user posts:', error);
      return [];
    }
  }

  // Search posts with optimized full-text search
  async searchPosts(
    searchTerm: string,
    currentUserId: string,
    limit: number = 20
  ): Promise<OptimizedSocialPost[]> {
    if (!searchTerm.trim()) return [];
    
    const cacheKey = `search_posts_${searchTerm}_${limit}`;
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      console.log('🚀 Using cached post search');
      return cached.posts;
    }

    try {
      // Check if it's a hashtag search
      if (searchTerm.startsWith('#')) {
        const hashtag = searchTerm.toLowerCase();
        const hashtagPosts = await optimizedHashtagService.getPostsByHashtag(hashtag, limit);
        
        // Convert to OptimizedSocialPost format
        const convertedPosts: OptimizedSocialPost[] = hashtagPosts.map(post => ({
          ...post,
          images: post.images || [],
          shares: 0,
          privacy: (post.privacy as 'public' | 'friends' | 'private') || 'public',
          type: (post.type as 'post' | 'share' | 'story') || 'post',
          isLiked: post.likes.includes(currentUserId),
          likeCount: post.likes.length
        }));
        
        return convertedPosts;
      }

      // Regular content search - get all posts and filter in memory
      // This is not ideal for large datasets but works for smaller ones
      const postsRef = collection(db, 'posts');
      const q = query(
        postsRef,
        firestoreLimit(200) // Get more to search in memory
      );

      const snapshot = await getDocs(q);
      const posts: OptimizedSocialPost[] = [];
      const userIds = new Set<string>();
      const searchTermLower = searchTerm.toLowerCase();

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const content = (data.content || '').toLowerCase();
        
        // Simple text matching
        if (content.includes(searchTermLower)) {
          const post: OptimizedSocialPost = {
            id: doc.id,
            userID: data.userID || '',
            content: data.content || '',
            images: Array.isArray(data.images) ? data.images : [],
            hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
            likes: Array.isArray(data.likes) ? data.likes : [],
            comments: data.comments || 0,
            shares: data.shares || 0,
            timestamp: data.timestamp,
            type: data.type || 'post',
            privacy: data.privacy || 'public',
            isLiked: Array.isArray(data.likes) ? data.likes.includes(currentUserId) : false,
            likeCount: Array.isArray(data.likes) ? data.likes.length : 0
          };

          posts.push(post);
          
          if (post.userID) {
            userIds.add(post.userID);
          }
        }
      });

      // Preload user information
      if (userIds.size > 0) {
        await userCacheService.preloadUsers(Array.from(userIds));
        const usersMap = await userCacheService.getUsers(Array.from(userIds));
        
        posts.forEach(post => {
          if (post.userID) {
            const userInfo = usersMap.get(post.userID);
            if (userInfo) {
              post.userInfo = {
                displayName: userInfo.displayName || userInfo.fullName || 'Anonymous',
                profileUrl: userInfo.profileUrl || undefined,
                username: userInfo.username || userInfo.email || ''
              };
            }
          }
        });
      }

      // Sort by relevance (exact matches first, then by timestamp)
      posts.sort((a, b) => {
        const aExact = a.content.toLowerCase().includes(searchTermLower) ? 1 : 0;
        const bExact = b.content.toLowerCase().includes(searchTermLower) ? 1 : 0;
        
        if (aExact !== bExact) return bExact - aExact;
        
        const timestampA = a.timestamp?.seconds * 1000 + a.timestamp?.nanoseconds / 1000000;
        const timestampB = b.timestamp?.seconds * 1000 + b.timestamp?.nanoseconds / 1000000;
        return timestampB - timestampA;
      });

      // Limit results
      const searchResults = posts.slice(0, limit);

      // Cache results
      this.setCache(cacheKey, {
        posts: searchResults,
        hasMore: posts.length > limit
      });

      console.log(`✅ Found ${searchResults.length} posts for search: ${searchTerm}`);
      return searchResults;
    } catch (error) {
      console.error('❌ Error searching posts:', error);
      return [];
    }
  }

  // Get trending posts based on recent engagement
  async getTrendingPosts(currentUserId: string, limit: number = 20): Promise<OptimizedSocialPost[]> {
    const result = await this.loadPosts(currentUserId, 'trending');
    return result.posts.slice(0, limit);
  }

  // Clear cache for specific user or all
  clearCache(userId?: string): void {
    if (userId) {
      const keysToRemove: string[] = [];
      this.postsCache.forEach((_, key) => {
        if (key.includes(userId)) {
          keysToRemove.push(key);
        }
      });
      keysToRemove.forEach(key => this.postsCache.delete(key));
      console.log(`🧹 Cleared cache for user ${userId}`);
    } else {
      this.postsCache.clear();
      console.log('🧹 Cleared all social posts cache');
    }
  }

  // Get service stats
  getStats(): {
    cachedQueries: number;
    totalPosts: number;
    memoryUsage: string;
  } {
    let totalPosts = 0;
    this.postsCache.forEach(cache => {
      totalPosts += cache.posts.length;
    });
    
    const memoryUsage = `${Math.round(
      (JSON.stringify([...this.postsCache.values()]).length / 1024)
    )}KB`;
    
    return {
      cachedQueries: this.postsCache.size,
      totalPosts,
      memoryUsage
    };
  }

  // Add comment to post
  async addComment(postId: string, commentData: any, skipNotification: boolean = false): Promise<void> {
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        comments: arrayUnion({
          ...commentData,
          id: commentData.id || Date.now().toString(),
          timestamp: commentData.timestamp || new Date()
        })
      });

      // Clear relevant cache entries
      this.clearCache(commentData.userId);
      
      console.log('✅ Comment added to post:', postId);

      // Notify owner of the post via Expo Push (nếu không skip)
      if (!skipNotification) {
        try {
          const snap = await getDoc(postRef);
          if (snap.exists()) {
            const post = snap.data() as any;
            const ownerId = post.userId || post.userID;
            const commenterName = commentData.username || commentData.displayName || 'Ai đó';
            const commentText = commentData.text || '';
            const body = `${commenterName}: ${commentText.substring(0, 100)}`;

            if (ownerId && ownerId !== commentData.userId) {
              const ExpoPushNotificationService = (await import('./expoPushNotificationService')).default;
              await ExpoPushNotificationService.sendPushToUser(ownerId, {
                title: '💬 Bình luận mới',
                body,
                data: { 
                  type: 'comment', 
                  postId, 
                  userId: commentData.userId,
                  senderId: commentData.userId,
                  action: 'comment'
                },
              });
              console.log('✅ Comment push notification sent to:', ownerId);
            }
          }
        } catch (e) {
          console.warn('⚠️ Không thể gửi push khi có comment:', e);
        }
      }
    } catch (error) {
      console.error('❌ Error adding comment:', error);
      throw error;
    }
  }

  // Increment share count for post
  async incrementShareCount(postId: string): Promise<void> {
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        shares: increment(1)
      });

      // Update cache if exists
      this.postsCache.forEach((cache, key) => {
        if (cache.posts) {
          cache.posts = cache.posts.map(post => 
            post.id === postId 
              ? { ...post, shares: (post.shares || 0) + 1 }
              : post
          );
        }
      });

      console.log('✅ Share count incremented for post:', postId);
    } catch (error) {
      console.error('❌ Error incrementing share count:', error);
      throw error;
    }
  }
}

export default new OptimizedSocialService();
