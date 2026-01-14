import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { UserVibe } from '@/types/vibe';

// Utility function to check if a vibe has expired (24 hours)
const isVibeExpired = (vibe: UserVibe | null): boolean => {
  if (!vibe || !vibe.createdAt) return true;

  const now = new Date();
  const createdAt = vibe.createdAt.toDate ? vibe.createdAt.toDate() : new Date(vibe.createdAt);
  const hoursDifference = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  return hoursDifference >= 24;
};

// Utility function to get remaining hours for a vibe
const getVibeTimeRemaining = (vibe: UserVibe | null): number => {
  if (!vibe || !vibe.createdAt) return 0;

  const now = new Date();
  const createdAt = vibe.createdAt.toDate ? vibe.createdAt.toDate() : new Date(vibe.createdAt);
  const hoursDifference = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  return Math.max(0, 24 - hoursDifference);
};

interface UserInfo {
  uid: string;
  username: string;
  profileUrl?: string;
  email?: string;
  // Thêm các trường khác nếu cần
  currentVibe?: UserVibe | null;
  activeFrame?: string;
}

interface UserContextType {
  userCache: Map<string, UserInfo>;
  getUserInfo: (userId: string) => Promise<UserInfo | null>;
  getUsersInfo: (userIds: string[]) => Promise<Map<string, UserInfo>>;
  clearCache: () => void;
  invalidateUserCache: (userId: string) => void;
  preloadUsers: (userIds: string[]) => Promise<void>;
  cleanExpiredVibes: () => void;
  getVibeTimeRemaining: (vibe: UserVibe | null) => number;
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
  const cacheRef = useRef<Map<string, UserInfo>>(new Map());

  // Sync ref with state
  useEffect(() => {
    cacheRef.current = userCache;
  }, [userCache]);

  // Dọn dẹp các vibe đã hết hạn trong cache
  const cleanExpiredVibes = useCallback(() => {
    setUserCache(prevCache => {
      const newCache = new Map(prevCache);
      let changed = false;
      newCache.forEach((userInfo, userId) => {
        if (userInfo.currentVibe && isVibeExpired(userInfo.currentVibe)) {
          const updatedUserInfo = { ...userInfo, currentVibe: null };
          newCache.set(userId, updatedUserInfo);
          changed = true;
        }
      });
      return changed ? newCache : prevCache;
    });
  }, []);

  // Effect để tự động dọn dẹp vibe hết hạn mỗi giờ
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      cleanExpiredVibes();
    }, 60 * 60 * 1000);

    cleanExpiredVibes();
    return () => clearInterval(cleanupInterval);
  }, [cleanExpiredVibes]);

  // Lấy thông tin một user (kiểm tra cache trước)
  const getUserInfo = useCallback(async (userId: string): Promise<UserInfo | null> => {
    if (!userId) return null;

    // Kiểm tra cache từ ref để không bị phụ thuộc vào state trong dependency array
    const cachedUserInfo = cacheRef.current.get(userId);
    if (cachedUserInfo) {
      if (cachedUserInfo.currentVibe && isVibeExpired(cachedUserInfo.currentVibe)) {
        const updatedUserInfo = { ...cachedUserInfo, currentVibe: null };
        setUserCache(prev => new Map(prev).set(userId, updatedUserInfo));
        return updatedUserInfo;
      }
      return cachedUserInfo;
    }

    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        let currentVibe = userData.currentVibe || null;
        if (currentVibe && isVibeExpired(currentVibe)) {
          currentVibe = null;
        }

        const userInfo: UserInfo = {
          uid: userId,
          username: userData.username || 'Unknown User',
          profileUrl: userData.profileUrl,
          email: userData.email,
          currentVibe: currentVibe,
          activeFrame: userData.activeFrame,
        };

        setUserCache(prev => new Map(prev).set(userId, userInfo));
        return userInfo;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  }, []); // No dependencies!

  // Lấy thông tin nhiều users cùng lúc (batch)
  const getUsersInfo = useCallback(async (userIds: string[]): Promise<Map<string, UserInfo>> => {
    const result = new Map<string, UserInfo>();
    const uncachedIds: string[] = [];

    userIds.forEach(userId => {
      const userInfo = cacheRef.current.get(userId);
      if (userInfo) {
        result.set(userId, userInfo);
      } else {
        uncachedIds.push(userId);
      }
    });

    if (uncachedIds.length === 0) {
      return result;
    }

    try {
      const promises = uncachedIds.map(async (userId) => {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          let currentVibe = userData.currentVibe || null;
          if (currentVibe && isVibeExpired(currentVibe)) {
            currentVibe = null;
          }

          const userInfo: UserInfo = {
            uid: userId,
            username: userData.username || 'Unknown User',
            profileUrl: userData.profileUrl,
            email: userData.email,
            currentVibe: currentVibe,
            activeFrame: userData.activeFrame,
          };
          return { userId, userInfo };
        }
        return null;
      });

      const results = await Promise.all(promises);

      setUserCache(prev => {
        const newCache = new Map(prev);
        results.forEach(item => {
          if (item) {
            newCache.set(item.userId, item.userInfo);
            result.set(item.userId, item.userInfo);
          }
        });
        return newCache;
      });

      return result;
    } catch (error) {
      console.error('Error fetching users info:', error);
      return result;
    }
  }, []); // No dependencies!

  // Preload users
  const preloadUsers = useCallback(async (userIds: string[]): Promise<void> => {
    await getUsersInfo(userIds);
  }, [getUsersInfo]);

  // Xóa cache
  const clearCache = useCallback(() => {
    setUserCache(new Map());
  }, []);

  // Xóa cache cho một user cụ thể
  const invalidateUserCache = useCallback((userId: string) => {
    setUserCache(prev => {
      const newCache = new Map(prev);
      newCache.delete(userId);
      return newCache;
    });
  }, []);

  const value: UserContextType = {
    userCache,
    getUserInfo,
    getUsersInfo,
    clearCache,
    invalidateUserCache,
    preloadUsers,
    cleanExpiredVibes,
    getVibeTimeRemaining: getVibeTimeRemaining,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
