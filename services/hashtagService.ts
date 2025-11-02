import { db } from '../firebaseConfig';
import { collection, query, where, orderBy, limit, getDocs, Timestamp, addDoc, updateDoc } from 'firebase/firestore';

export interface TrendingHashtag {
  tag: string;
  count: number;
  posts: string[];
  lastUsed: Date;
}

export class HashtagService {
  // Lấy hashtags trending trong ngày
  static async getTrendingHashtagsToday(limitCount: number = 10): Promise<TrendingHashtag[]> {
    try {
      // Đơn giản hóa query để tránh lỗi composite index
      // Lấy tất cả hashtags và filter trong code
      const hashtagsRef = collection(db, 'hashtags');
      const q = query(
        hashtagsRef,
        orderBy('count', 'desc'),
        limit(50) // Lấy 50 hashtags top để filter
      );

      const querySnapshot = await getDocs(q);
      const allHashtags: TrendingHashtag[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        allHashtags.push({
          tag: data.tag || doc.id,
          count: data.count || 0,
          posts: data.posts || [],
          lastUsed: data.lastUsed?.toDate() || new Date(),
        });
      });

      // Nếu không có dữ liệu, tạo sample data
      if (allHashtags.length === 0) {
        return this.getSampleHashtags(limitCount);
      }

      // Filter hashtags được sử dụng trong ngày
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const todayHashtags = allHashtags.filter(hashtag => {
        const lastUsed = hashtag.lastUsed;
        return lastUsed >= startOfDay && lastUsed < endOfDay;
      });

      // Nếu không có hashtags hôm nay, trả về top hashtags
      const result = todayHashtags.length > 0 ? todayHashtags : allHashtags;
      
      return result.slice(0, limitCount);
    } catch (error) {
      console.error('Error fetching trending hashtags:', error);
      return this.getSampleHashtags(limitCount);
    }
  }

  // Lấy hashtags trending trong tuần
  static async getTrendingHashtagsThisWeek(limitCount: number = 10): Promise<TrendingHashtag[]> {
    try {
      // Đơn giản hóa query để tránh lỗi composite index
      const hashtagsRef = collection(db, 'hashtags');
      const q = query(
        hashtagsRef,
        orderBy('count', 'desc'),
        limit(100) // Lấy 100 hashtags top để filter
      );

      const querySnapshot = await getDocs(q);
      const allHashtags: TrendingHashtag[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        allHashtags.push({
          tag: data.tag || doc.id,
          count: data.count || 0,
          posts: data.posts || [],
          lastUsed: data.lastUsed?.toDate() || new Date(),
        });
      });

      // Nếu không có dữ liệu, tạo sample data
      if (allHashtags.length === 0) {
        return this.getSampleHashtags(limitCount);
      }

      // Filter hashtags được sử dụng trong tuần
      const today = new Date();
      const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const weekHashtags = allHashtags.filter(hashtag => {
        const lastUsed = hashtag.lastUsed;
        return lastUsed >= startOfWeek;
      });

      // Nếu không có hashtags tuần này, trả về top hashtags
      const result = weekHashtags.length > 0 ? weekHashtags : allHashtags;
      
      return result.slice(0, limitCount);
    } catch (error) {
      console.error('Error fetching weekly trending hashtags:', error);
      return this.getSampleHashtags(limitCount);
    }
  }

  // Tạo hashtags mẫu khi không có dữ liệu
  static getSampleHashtags(limitCount: number = 10): TrendingHashtag[] {
    const sampleHashtags = [
      { tag: '#Dating', count: 2150, posts: [], lastUsed: new Date() },
      { tag: '#Love', count: 1890, posts: [], lastUsed: new Date() },
      { tag: '#Romance', count: 1234, posts: [], lastUsed: new Date() },
      { tag: '#Weekend', count: 987, posts: [], lastUsed: new Date() },
      { tag: '#Coffee', count: 756, posts: [], lastUsed: new Date() },
      { tag: '#Music', count: 654, posts: [], lastUsed: new Date() },
      { tag: '#Travel', count: 543, posts: [], lastUsed: new Date() },
      { tag: '#Food', count: 432, posts: [], lastUsed: new Date() },
      { tag: '#Fitness', count: 321, posts: [], lastUsed: new Date() },
      { tag: '#Photography', count: 210, posts: [], lastUsed: new Date() },
    ];
    
    return sampleHashtags.slice(0, limitCount);
  }

  // Cập nhật hoặc tạo mới hashtag khi có post mới
  static async updateHashtagCount(hashtag: string, postId: string): Promise<void> {
    try {
      const hashtagRef = collection(db, 'hashtags');
      const normalizedTag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
      
      // Kiểm tra xem hashtag đã tồn tại chưa
      const q = query(hashtagRef, where('tag', '==', normalizedTag));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Tạo mới hashtag
        await addDoc(hashtagRef, {
          tag: normalizedTag,
          count: 1,
          posts: [postId],
          lastUsed: Timestamp.now(),
          createdAt: Timestamp.now(),
        });
      } else {
        // Cập nhật hashtag existing
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
      console.error('Error updating hashtag count:', error);
    }
  }

  // Format số lượng posts (1000 -> 1k, 1000000 -> 1M)
  static formatPostCount(count: number): string {
    if (count >= 1000000) {
      return Math.floor(count / 100000) / 10 + 'M';
    } else if (count >= 1000) {
      return Math.floor(count / 100) / 10 + 'k';
    }
    return count.toString();
  }

  // Lấy màu ngẫu nhiên cho hashtag
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
