import { db } from '../firebaseConfig';
import { collection, query, where, orderBy, limit, getDocs, Timestamp, addDoc, updateDoc } from 'firebase/firestore';

export interface TrendingHashtag {
  tag: string;
  count: number;
  posts: string[];
  lastUsed: Date;
}

export class HashtagService {
  private static mapHashtagDoc(doc: any): TrendingHashtag | null {
    const data = doc.data();
    const rawTag = String(data.tag || data.name || data.hashtag || doc.id || '').trim();

    if (!rawTag) return null;

    return {
      tag: rawTag.startsWith('#') ? rawTag : `#${rawTag}`,
      count: Number(data.count || data.total || data.usage || 0),
      posts: Array.isArray(data.posts) ? data.posts : [],
      lastUsed: data.lastUsed?.toDate?.() || new Date(0),
    };
  }

  static async getTrendingHashtagsToday(limitCount: number = 8): Promise<TrendingHashtag[]> {
    try {
      const hashtagsRef = collection(db, 'hashtags');
      const q = query(hashtagsRef, orderBy('count', 'desc'), limit(limitCount));
      const querySnapshot = await getDocs(q);

      const results: TrendingHashtag[] = [];
      querySnapshot.forEach((doc) => {
        const hashtag = this.mapHashtagDoc(doc);
        if (hashtag) results.push(hashtag);
      });

      return results.slice(0, limitCount);
    } catch (error) {
      console.error('Error fetching trending hashtags:', error);
      return [];
    }
  }

  static async getTrendingHashtagsThisWeek(limitCount: number = 10): Promise<TrendingHashtag[]> {
    try {
      const hashtagsRef = collection(db, 'hashtags');
      const q = query(
        hashtagsRef,
        orderBy('count', 'desc'),
        limit(100)
      );

      const querySnapshot = await getDocs(q);
      const allHashtags: TrendingHashtag[] = [];

      querySnapshot.forEach((doc) => {
        const hashtag = this.mapHashtagDoc(doc);
        if (hashtag) allHashtags.push(hashtag);
      });

      if (allHashtags.length === 0) {
        return [];
      }

      const today = new Date();
      const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const weekHashtags = allHashtags.filter(hashtag => hashtag.lastUsed >= startOfWeek);
      const result = weekHashtags.length > 0 ? weekHashtags : allHashtags;

      return result.slice(0, limitCount);
    } catch (error) {
      console.error('Error fetching weekly trending hashtags:', error);
      return [];
    }
  }

  static async updateHashtagCount(hashtag: string, postId: string): Promise<void> {
    try {
      const hashtagRef = collection(db, 'hashtags');
      const normalizedTag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;

      const q = query(hashtagRef, where('tag', '==', normalizedTag));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        await addDoc(hashtagRef, {
          tag: normalizedTag,
          count: 1,
          posts: [postId],
          lastUsed: Timestamp.now(),
          createdAt: Timestamp.now(),
        });
      } else {
        const docRef = querySnapshot.docs[0].ref;
        const existingData = querySnapshot.docs[0].data();
        const currentPosts = existingData.posts || [];

        if (!currentPosts.includes(postId)) {
          await updateDoc(docRef, {
            count: (existingData.count || 0) + 1,
            posts: [...currentPosts, postId],
            lastUsed: Timestamp.now(),
          });
        }
      }
    } catch (error) {
      console.error('Error upmatch hashtag count:', error);
    }
  }

  static formatPostCount(count: number): string {
    if (count >= 1000000) {
      return Math.floor(count / 100000) / 10 + 'M';
    } else if (count >= 1000) {
      return Math.floor(count / 100) / 10 + 'k';
    }
    return count.toString();
  }

  static getRandomColor(): string {
    const colors = [
      '#FF6B6B', '#8A4AF3', '#5D3FD3', '#FF9500',
      '#4CAF50', '#2196F3', '#E91E63', '#9C27B0',
      '#FF5722', '#795548', '#607D8B', '#FFC107'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

export default HashtagService;
