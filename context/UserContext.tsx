import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { UserVibe } from '@/types/vibe';

interface UserInfo {
  uid: string;
  username: string;
  profileUrl?: string;
  email?: string;
  // Thêm các trường khác nếu cần
  currentVibe?: UserVibe | null;
}

interface UserContextType {
  userCache: Map<string, UserInfo>;
  getUserInfo: (userId: string) => Promise<UserInfo | null>;
  getUsersInfo: (userIds: string[]) => Promise<Map<string, UserInfo>>;
  clearCache: () => void;
  preloadUsers: (userIds: string[]) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [userCache, setUserCache] = useState<Map<string, UserInfo>>(new Map());

  // Lấy thông tin một user (kiểm tra cache trước)
  const getUserInfo = useCallback(async (userId: string): Promise<UserInfo | null> => {
    if (!userId) return null;

    // Kiểm tra cache trước
    if (userCache.has(userId)) {
      return userCache.get(userId) || null;
    }

    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const userInfo: UserInfo = {
          uid: userId,
          username: userData.username || 'Unknown User',
          profileUrl: userData.profileUrl,
          email: userData.email,
          currentVibe: userData.currentVibe || null,
        };

        // Lưu vào cache
        setUserCache(prev => new Map(prev).set(userId, userInfo));
        return userInfo;
      } else {
        console.log('No such user:', userId);
        return null;
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  }, [userCache]);

  // Lấy thông tin nhiều users cùng lúc (batch)
  const getUsersInfo = useCallback(async (userIds: string[]): Promise<Map<string, UserInfo>> => {
    const result = new Map<string, UserInfo>();
    const uncachedIds: string[] = [];

    // Kiểm tra cache trước
    userIds.forEach(userId => {
      if (userCache.has(userId)) {
        const userInfo = userCache.get(userId);
        if (userInfo) {
          result.set(userId, userInfo);
        }
      } else {
        uncachedIds.push(userId);
      }
    });

    // Nếu tất cả đã có trong cache, trả về luôn
    if (uncachedIds.length === 0) {
      return result;
    }

    try {
      // Tải những user chưa có trong cache
      // Firebase không hỗ trợ query với array of IDs trực tiếp
      // Nên ta sẽ tải từng user một cách parallel
      const promises = uncachedIds.map(async (userId) => {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const userInfo: UserInfo = {
            uid: userId,
            username: userData.username || 'Unknown User',
            profileUrl: userData.profileUrl,
            email: userData.email,
            currentVibe: userData.currentVibe || null,
          };
          return { userId, userInfo };
        }
        return null;
      });

      const results = await Promise.all(promises);
      const newCacheEntries = new Map(userCache);

      results.forEach(resultItem => {
        if (resultItem) {
          newCacheEntries.set(resultItem.userId, resultItem.userInfo);
          result.set(resultItem.userId, resultItem.userInfo);
        }
      });

      setUserCache(newCacheEntries);
      return result;
    } catch (error) {
      console.error('Error fetching users info:', error);
      return result;
    }
  }, [userCache]);

  // Preload users - tải trước thông tin của nhiều users
  const preloadUsers = useCallback(async (userIds: string[]): Promise<void> => {
    await getUsersInfo(userIds);
  }, [getUsersInfo]);

  // Xóa cache
  const clearCache = useCallback(() => {
    setUserCache(new Map());
  }, []);

  const value: UserContextType = {
    userCache,
    getUserInfo,
    getUsersInfo,
    clearCache,
    preloadUsers,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
