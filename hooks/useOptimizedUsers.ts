import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, limit, getDocs, where, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useUserContext } from '@/context/UserContext';

interface UserProfile {
  uid: string;
  username: string;
  profileUrl?: string;
  email?: string;
  bio?: string;
  isOnline?: boolean;
  lastSeen?: any;
  friendsCount?: number;
  postsCount?: number;
}

interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: any;
  senderInfo?: UserProfile;
  receiverInfo?: UserProfile;
}

export const useOptimizedUsers = (currentUserId: string) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const { getUsersInfo, preloadUsers } = useUserContext();

  // Load users with pagination and caching
  const loadUsers = useCallback(async (refresh: boolean = false, searchTerm?: string) => {
    if (loading) return;
    
    setLoading(true);
    try {
      let q = query(
        collection(db, 'users'),
        orderBy('username'),
        limit(20)
      );

      if (!refresh && lastDoc) {
        q = query(
          collection(db, 'users'),
          orderBy('username'),
          startAfter(lastDoc),
          limit(20)
        );
      }

      // Add search filter if provided
      if (searchTerm) {
        q = query(
          collection(db, 'users'),
          where('username', '>=', searchTerm),
          where('username', '<=', searchTerm + '\uf8ff'),
          orderBy('username'),
          limit(20)
        );
      }

      const querySnapshot = await getDocs(q);
      const userIds: string[] = [];
      const newUsers: UserProfile[] = [];

      querySnapshot.forEach((doc) => {
        if (doc.id !== currentUserId) { // Exclude current user
          userIds.push(doc.id);
          newUsers.push({ uid: doc.id, ...doc.data() } as UserProfile);
        }
      });

      // Preload user information
      if (userIds.length > 0) {
        await preloadUsers(userIds);
        const usersMap = await getUsersInfo(userIds);
        
        const enrichedUsers = newUsers.map(user => {
          const cachedUser = usersMap.get(user.uid);
          return cachedUser ? { ...user, ...cachedUser } : user;
        });

        if (refresh) {
          setUsers(enrichedUsers);
        } else {
          setUsers(prev => [...prev, ...enrichedUsers]);
        }
      }

      // Update pagination state
      if (querySnapshot.docs.length > 0) {
        setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setHasMore(querySnapshot.docs.length === 20);
      } else {
        setHasMore(false);
      }

    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, lastDoc, loading, getUsersInfo, preloadUsers]);

  // Load friends
  const loadFriends = useCallback(async () => {
    if (!currentUserId) return;
    
    try {
      const friendsQuery = query(
        collection(db, 'friendships'),
        where('participants', 'array-contains', currentUserId),
        where('status', '==', 'accepted')
      );

      const friendsSnapshot = await getDocs(friendsQuery);
      const friendIds: string[] = [];

      friendsSnapshot.forEach((doc) => {
        const data = doc.data();
        const participants = data.participants || [];
        const friendId = participants.find((id: string) => id !== currentUserId);
        if (friendId) {
          friendIds.push(friendId);
        }
      });

      if (friendIds.length > 0) {
        await preloadUsers(friendIds);
        const usersMap = await getUsersInfo(friendIds);
        const friendsList = Array.from(usersMap.values());
        setFriends(friendsList);
      } else {
        setFriends([]);
      }

    } catch (error) {
      console.error('Error loading friends:', error);
    }
  }, [currentUserId, getUsersInfo, preloadUsers]);

  // Load friend requests
  const loadFriendRequests = useCallback(async () => {
    if (!currentUserId) return;
    
    try {
      // Get pending friend requests where current user is receiver
      const receivedRequestsQuery = query(
        collection(db, 'friendRequests'),
        where('receiverId', '==', currentUserId),
        where('status', '==', 'pending'),
        orderBy('timestamp', 'desc')
      );

      // Get pending friend requests where current user is sender
      const sentRequestsQuery = query(
        collection(db, 'friendRequests'),
        where('senderId', '==', currentUserId),
        where('status', '==', 'pending'),
        orderBy('timestamp', 'desc')
      );

      const [receivedSnapshot, sentSnapshot] = await Promise.all([
        getDocs(receivedRequestsQuery),
        getDocs(sentRequestsQuery)
      ]);

      const requests: FriendRequest[] = [];
      const userIds = new Set<string>();

      // Process received requests
      receivedSnapshot.forEach((doc) => {
        const requestData = { id: doc.id, ...doc.data() } as FriendRequest;
        requests.push(requestData);
        userIds.add(requestData.senderId);
      });

      // Process sent requests
      sentSnapshot.forEach((doc) => {
        const requestData = { id: doc.id, ...doc.data() } as FriendRequest;
        requests.push(requestData);
        userIds.add(requestData.receiverId);
      });

      // Load user info for all participants
      if (userIds.size > 0) {
        const userIdsArray = Array.from(userIds);
        await preloadUsers(userIdsArray);
        const usersMap = await getUsersInfo(userIdsArray);

        const requestsWithUsers = requests.map(request => ({
          ...request,
          senderInfo: usersMap.get(request.senderId),
          receiverInfo: usersMap.get(request.receiverId)
        }));

        setFriendRequests(requestsWithUsers);
      } else {
        setFriendRequests([]);
      }

    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  }, [currentUserId, getUsersInfo, preloadUsers]);

  // Search users
  const searchUsers = useCallback(async (searchTerm: string): Promise<UserProfile[]> => {
    if (!searchTerm.trim()) return [];
    
    try {
      const searchQuery = query(
        collection(db, 'users'),
        where('username', '>=', searchTerm.toLowerCase()),
        where('username', '<=', searchTerm.toLowerCase() + '\uf8ff'),
        limit(10)
      );

      const searchSnapshot = await getDocs(searchQuery);
      const userIds: string[] = [];
      const searchResults: UserProfile[] = [];

      searchSnapshot.forEach((doc) => {
        if (doc.id !== currentUserId) {
          userIds.push(doc.id);
          searchResults.push({ uid: doc.id, ...doc.data() } as UserProfile);
        }
      });

      if (userIds.length > 0) {
        await preloadUsers(userIds);
        const usersMap = await getUsersInfo(userIds);
        
        return searchResults.map(user => {
          const cachedUser = usersMap.get(user.uid);
          return cachedUser ? { ...user, ...cachedUser } : user;
        });
      }

      return searchResults;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }, [currentUserId, getUsersInfo, preloadUsers]);

  // Load more users (pagination)
  const loadMoreUsers = useCallback(() => {
    if (hasMore && !loading) {
      loadUsers(false);
    }
  }, [hasMore, loading, loadUsers]);

  // Refresh all data
  const refreshData = useCallback(() => {
    setLastDoc(null);
    setHasMore(true);
    loadUsers(true);
    loadFriends();
    loadFriendRequests();
  }, [loadUsers, loadFriends, loadFriendRequests]);

  // Initial load
  useEffect(() => {
    if (currentUserId) {
      refreshData();
    }
  }, [currentUserId]);

  return {
    users,
    friends,
    friendRequests,
    loading,
    hasMore,
    loadMoreUsers,
    loadFriends,
    loadFriendRequests,
    searchUsers,
    refreshData,
  };
};
