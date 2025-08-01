import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  arrayUnion, 
  arrayRemove,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';

// Types
interface HashtagData {
  id: string;
  tag: string;
  count: number;
  posts: string[];
  users: string[];
  createdAt: Timestamp;
  lastUsed: Timestamp;
}

interface PostData {
  id: string;
  content: string;
  hashtags: string[];
  timestamp: Timestamp;
  userID: string;
  username: string;
}

// Hashtags phổ biến cho ứng dụng hẹn hò
export const POPULAR_HASHTAGS = [
  '#SingleLife', '#Dating', '#LookingForLove', '#Romance', '#Relationship',
  '#Coffee', '#Travel', '#Fitness', '#Music', '#Movies', '#Books', '#Art',
  '#Foodie', '#Adventure', '#Beach', '#Nature', '#Photography', '#Dance',
  '#Yoga', '#Gym', '#Running', '#Hiking', '#Cooking', '#Wine', '#Beer',
  '#Weekend', '#Friday', '#Saturday', '#Sunday', '#SelfCare', '#Happy',
  '#Smile', '#Fashion', '#Style', '#Cute', '#Handsome', '#Beautiful',
  '#Fun', '#Party', '#Concert', '#Festival', '#Friends', '#Family'
];

// Hashtags theo danh mục cho ứng dụng hẹn hò
export const HASHTAG_CATEGORIES = {
  interests: {
    title: 'Sở thích',
    tags: ['#Music', '#Movies', '#Books', '#Art', '#Photography', '#Dance', '#Gaming', '#Reading']
  },
  activities: {
    title: 'Hoạt động',
    tags: ['#Travel', '#Fitness', '#Yoga', '#Gym', '#Running', '#Hiking', '#Cooking', '#Shopping']
  },
  food: {
    title: 'Ẩm thực',
    tags: ['#Foodie', '#Coffee', '#Wine', '#Beer', '#Pizza', '#Sushi', '#Dessert', '#BBQ']
  },
  lifestyle: {
    title: 'Lối sống',
    tags: ['#SingleLife', '#Weekend', '#SelfCare', '#Happy', '#Adventure', '#Chill', '#Party', '#Fashion']
  },
  dating: {
    title: 'Hẹn hò',
    tags: ['#Dating', '#LookingForLove', '#Romance', '#Relationship', '#FirstDate', '#Dinner', '#MovieNight', '#Walk']
  },
  mood: {
    title: 'Tâm trạng',
    tags: ['#Happy', '#Excited', '#Relaxed', '#Motivated', '#Grateful', '#Blessed', '#Peaceful', '#Energetic']
  }
};

// Hàm cải thiện để tách hashtag
export const extractHashtags = (text: string): string[] => {
  if (!text) return [];
  
  // Regex cải thiện để hỗ trợ Unicode và tiếng Việt
  const regex = /#[\w\u00C0-\u024F\u1E00-\u1EFF]+/g;
  const hashtags = text.match(regex) || [];
  
  // Loại bỏ trùng lặp và chuyển về lowercase để so sánh
  const uniqueHashtags = [...new Set(hashtags.map((tag: string) => tag.toLowerCase()))];
  
  return uniqueHashtags;
};

// Hàm suggest hashtag dựa trên nội dung
export const suggestHashtags = (content: string): string[] => {
  if (!content) return [];
  
  const suggestions: string[] = [];
  const lowerContent = content.toLowerCase();
  
  // Mapping từ khóa với hashtag
  const keywordMapping = {
    'cà phê': '#Coffee',
    'coffee': '#Coffee',
    'du lịch': '#Travel',
    'travel': '#Travel',
    'gym': '#Gym',
    'fitness': '#Fitness',
    'yoga': '#Yoga',
    'ăn': '#Foodie',
    'food': '#Foodie',
    'âm nhạc': '#Music',
    'music': '#Music',
    'phim': '#Movies',
    'movie': '#Movies',
    'sách': '#Books',
    'book': '#Books',
    'hạnh phúc': '#Happy',
    'happy': '#Happy',
    'vui': '#Happy',
    'weekend': '#Weekend',
    'cuối tuần': '#Weekend',
    'hẹn hò': '#Dating',
    'dating': '#Dating',
    'yêu': '#Love',
    'love': '#Love',
    'single': '#SingleLife',
    'độc thân': '#SingleLife'
  };
  
  Object.entries(keywordMapping).forEach(([keyword, hashtag]) => {
    if (lowerContent.includes(keyword) && !suggestions.includes(hashtag)) {
      suggestions.push(hashtag);
    }
  });
  
  return suggestions.slice(0, 5); // Giới hạn 5 suggestions
};

// Cập nhật hoặc tạo hashtag document
export const updateHashtagStats = async (hashtags: string[], postId: string, userId: string): Promise<void> => {
  try {
    for (const hashtag of hashtags) {
      const tagDocRef = doc(db, 'hashtags', hashtag.toLowerCase());
      const tagDocSnap = await getDoc(tagDocRef);
      
      if (tagDocSnap.exists()) {
        await updateDoc(tagDocRef, {
          count: increment(1),
          posts: arrayUnion(postId),
          lastUsed: Timestamp.now(),
          users: arrayUnion(userId)
        });
      } else {
        await setDoc(tagDocRef, {
          tag: hashtag,
          count: 1,
          posts: [postId],
          users: [userId],
          createdAt: Timestamp.now(),
          lastUsed: Timestamp.now()
        });
      }
    }
  } catch (error) {
    console.error('Error updating hashtag stats:', error);
  }
};

// Xóa hashtag khỏi stats khi xóa post
export const removeHashtagStats = async (hashtags: string[], postId: string, userId: string): Promise<void> => {
  try {
    for (const hashtag of hashtags) {
      const tagDocRef = doc(db, 'hashtags', hashtag.toLowerCase());
      const tagDocSnap = await getDoc(tagDocRef);
      
      if (tagDocSnap.exists()) {
        const data = tagDocSnap.data();
        const newCount = Math.max(0, data.count - 1);
        
        if (newCount === 0) {
          // Xóa document nếu không còn ai sử dụng
          await deleteDoc(tagDocRef);
        } else {
          await updateDoc(tagDocRef, {
            count: increment(-1),
            posts: arrayRemove(postId),
            users: arrayRemove(userId)
          });
        }
      }
    }
  } catch (error) {
    console.error('Error removing hashtag stats:', error);
  }
};

// Lấy hashtags trending
export const getTrendingHashtags = async (limitCount: number = 20): Promise<HashtagData[]> => {
  try {
    const hashtagsRef = collection(db, 'hashtags');
    // Sử dụng single field order để tránh composite index
    const q = query(
      hashtagsRef,
      orderBy('count', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as HashtagData));
  } catch (error) {
    console.error('Error getting trending hashtags:', error);
    return [];
  }
};

// Tìm kiếm hashtags
export const searchHashtags = async (searchTerm: string, limitCount: number = 10): Promise<HashtagData[]> => {
  try {
    if (!searchTerm) return [];
    
    const hashtagsRef = collection(db, 'hashtags');
    // Sử dụng single field query để tránh composite index
    const q = query(
      hashtagsRef,
      where('tag', '>=', searchTerm.toLowerCase()),
      where('tag', '<=', searchTerm.toLowerCase() + '\uf8ff'),
      limit(limitCount * 2) // Lấy nhiều hơn để có thể sort
    );
    
    const querySnapshot = await getDocs(q);
    const hashtags = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as HashtagData));
    
    // Sort manually by count và limit
    return hashtags
      .sort((a, b) => b.count - a.count)
      .slice(0, limitCount);
      
  } catch (error) {
    console.error('Error searching hashtags:', error);
    return [];
  }
};

// Lấy posts theo hashtag
export const getPostsByHashtag = async (hashtag: string, limitCount: number = 20): Promise<PostData[]> => {
  try {
    console.log('🔍 getPostsByHashtag called with:', hashtag);
    
    const postsRef = collection(db, 'posts');
    
    // Thử tìm kiếm với nhiều format khác nhau
    const searchFormats = [
      hashtag, // Nguyên bản
      hashtag.toLowerCase(), // Lowercase
      hashtag.startsWith('#') ? hashtag : `#${hashtag}`, // Với #
      hashtag.startsWith('#') ? hashtag.toLowerCase() : `#${hashtag.toLowerCase()}` // Với # và lowercase
    ];
    
    console.log('🔍 Searching with formats:', searchFormats);
    
    let allPosts: PostData[] = [];
    
    // Tìm kiếm với từng format
    for (const format of searchFormats) {
      console.log('🔍 Searching for hashtag format:', format);
      const q = query(
        postsRef,
        where('hashtags', 'array-contains', format),
        limit(limitCount * 2)
      );
      
      const querySnapshot = await getDocs(q);
      const posts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PostData));
      
      console.log(`🔍 Found ${posts.length} posts for format "${format}"`);
      allPosts = [...allPosts, ...posts];
    }
    
    // Loại bỏ trùng lặp
    const uniquePosts = allPosts.filter((post, index, self) => 
      index === self.findIndex(p => p.id === post.id)
    );
    
    console.log('🔍 Total unique posts found:', uniquePosts.length);
    
    // Sort manually by timestamp và limit
    const sortedPosts = uniquePosts
      .sort((a, b) => {
        const timeA = a.timestamp?.toDate?.() || (a.timestamp instanceof Date ? a.timestamp : new Date());
        const timeB = b.timestamp?.toDate?.() || (b.timestamp instanceof Date ? b.timestamp : new Date());
        return timeB.getTime() - timeA.getTime();
      })
      .slice(0, limitCount);
      
    console.log('🔍 Returning sorted posts:', sortedPosts.length);
    return sortedPosts;
      
  } catch (error) {
    console.error('🔍 Error getting posts by hashtag:', error);
    return [];
  }
};

// Validate hashtag
export const validateHashtag = (hashtag: string): boolean => {
  if (!hashtag || typeof hashtag !== 'string') return false;
  
  // Bắt đầu bằng # và có ít nhất 1 ký tự
  const regex = /^#[\w\u00C0-\u024F\u1E00-\u1EFF]+$/;
  return regex.test(hashtag) && hashtag.length >= 2 && hashtag.length <= 30;
};

// Format hashtag
export const formatHashtag = (text: string): string => {
  if (!text) return '';
  
  let formatted = text.trim();
  if (!formatted.startsWith('#')) {
    formatted = '#' + formatted;
  }
  
  // Loại bỏ khoảng trắng và ký tự đặc biệt
  formatted = formatted.replace(/[^\w\u00C0-\u024F\u1E00-\u1EFF#]/g, '');
  
  return formatted;
};
