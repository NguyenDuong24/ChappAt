import { 
  collection, 
  doc, 
  query, 
  orderBy, 
  limit,
  startAfter,
  onSnapshot, 
  getDocs,
  getDoc,
  where,
  serverTimestamp,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  DocumentSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';

interface GroupMember {
  userId: string;
  role: 'admin' | 'member';
  joinedAt: any;
  displayName?: string;
  profileUrl?: string;
}

interface GroupData {
  id: string;
  name: string;
  description?: string;
  members: GroupMember[];
  memberIds?: string[];
  createdAt: any;
  updatedAt: any;
  lastMessage?: any;
  messageCount: number;
  _cachedAt?: number;
}

class OptimizedGroupService {
  private groupCache = new Map<string, GroupData>();
  private memberCache = new Map<string, GroupMember[]>();
  private activeListeners = new Map<string, Unsubscribe>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 phút cache
  private readonly MAX_CACHE_SIZE = 50;

  // Get group with caching
  async getGroup(groupId: string): Promise<GroupData | null> {
    // Check cache first
    if (this.groupCache.has(groupId)) {
      const cached = this.groupCache.get(groupId)!;
      if (this.isCacheValid(cached)) {
        console.log('📦 Using cached group:', groupId);
        return cached;
      }
      this.groupCache.delete(groupId);
    }

    try {
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      if (groupDoc.exists()) {
        const groupData = {
          id: groupDoc.id,
          ...groupDoc.data(),
          _cachedAt: Date.now()
        } as GroupData;
        
        this.setCache(groupId, groupData);
        return groupData;
      }
      return null;
    } catch (error) {
      console.error('Error fetching group:', error);
      return null;
    }
  }

  // Get multiple groups with batch loading
  async getGroups(groupIds: string[]): Promise<Map<string, GroupData>> {
    const result = new Map<string, GroupData>();
    const uncachedIds: string[] = [];

    // Check cache first
    groupIds.forEach(id => {
      if (this.groupCache.has(id)) {
        const cached = this.groupCache.get(id)!;
        if (this.isCacheValid(cached)) {
          result.set(id, cached);
        } else {
          this.groupCache.delete(id);
          uncachedIds.push(id);
        }
      } else {
        uncachedIds.push(id);
      }
    });

    // Batch fetch uncached groups
    if (uncachedIds.length > 0) {
      const batchPromises = uncachedIds.map(async (id) => {
        try {
          const groupDoc = await getDoc(doc(db, 'groups', id));
          if (groupDoc.exists()) {
            const groupData = {
              id: groupDoc.id,
              ...groupDoc.data(),
              _cachedAt: Date.now()
            } as GroupData;
            
            this.setCache(id, groupData);
            result.set(id, groupData);
          }
        } catch (error) {
          console.error('Error fetching group:', id, error);
        }
      });

      await Promise.all(batchPromises);
    }

    console.log(`✅ Loaded ${result.size} groups (${uncachedIds.length} from Firebase)`);
    return result;
  }

  // Get user's groups with optimized loading
  async getUserGroups(userId: string): Promise<GroupData[]> {
    try {
      // Query groups where user is a member
      const groupsQuery = query(
        collection(db, 'groups'),
        where('memberIds', 'array-contains', userId),
        orderBy('updatedAt', 'desc'),
        limit(20)
      );

      const snapshot = await getDocs(groupsQuery);
      const groups: GroupData[] = [];

      snapshot.docs.forEach(doc => {
        const groupData = {
          id: doc.id,
          ...doc.data(),
          _cachedAt: Date.now()
        } as GroupData;
        
        this.setCache(doc.id, groupData);
        groups.push(groupData);
      });

      console.log(`✅ Loaded ${groups.length} user groups`);
      return groups;
    } catch (error) {
      console.error('Error fetching user groups:', error);
      return [];
    }
  }

  // Setup optimized real-time listener for group messages
  setupGroupMessagesListener(
    groupId: string, 
    callback: (messages: any[]) => void,
    pageSize: number = 20
  ): Unsubscribe {
    const listenerKey = `group_${groupId}_messages`;
    
    // Remove existing listener
    if (this.activeListeners.has(listenerKey)) {
      this.activeListeners.get(listenerKey)!();
    }

    const messagesRef = collection(doc(db, 'groups', groupId), 'messages');
    const q = query(
      messagesRef,
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).reverse(); // Reverse to show chronological order

      callback(messages);
    }, (error) => {
      console.error('Group messages listener error:', error);
    });

    this.activeListeners.set(listenerKey, unsubscribe);
    console.log(`📡 Setup group messages listener: ${groupId}`);
    
    return unsubscribe;
  }

  // Batch send message to group members
  async sendGroupMessage(
    groupId: string, 
    senderId: string, 
    messageData: any
  ): Promise<string | null> {
    try {
      // Get group info from cache first
      let group = this.groupCache.get(groupId);
      if (!group || !this.isCacheValid(group)) {
        const fetchedGroup = await this.getGroup(groupId);
        if (!fetchedGroup) throw new Error('Group not found');
        group = fetchedGroup;
      }

      // Add message to group's messages subcollection
      const messagesRef = collection(doc(db, 'groups', groupId), 'messages');
      const messageWithTimestamp = {
        ...messageData,
        groupId,
        uid: senderId,
        createdAt: serverTimestamp(),
        status: 'sent',
        reactions: {},
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(messagesRef, messageWithTimestamp);

      // Update group's last message and message count
      await updateDoc(doc(db, 'groups', groupId), {
        lastMessage: {
          text: messageData.text || '',
          senderName: messageData.senderName || '',
          createdAt: serverTimestamp()
        },
        messageCount: (group.messageCount || 0) + 1,
        updatedAt: serverTimestamp()
      });

      // Update cache
      if (this.groupCache.has(groupId)) {
        const cachedGroup = this.groupCache.get(groupId)!;
        cachedGroup.messageCount = (cachedGroup.messageCount || 0) + 1;
        cachedGroup.lastMessage = {
          text: messageData.text || '',
          senderName: messageData.senderName || '',
          createdAt: new Date()
        };
      }

      console.log('✅ Group message sent:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error sending group message:', error);
      throw error;
    }
  }

  // Batch operations for group management
  async batchUpdateGroupMembers(
    groupId: string, 
    operations: Array<{
      type: 'add' | 'remove' | 'update';
      userId: string;
      role?: 'admin' | 'member';
    }>
  ): Promise<void> {
    try {
      const batch = writeBatch(db);
      const groupRef = doc(db, 'groups', groupId);

      // Get current group data
      const group = await this.getGroup(groupId);
      if (!group) throw new Error('Group not found');

      let updatedMembers = [...group.members];
      let updatedMemberIds = group.memberIds || [];

      operations.forEach(op => {
        switch (op.type) {
          case 'add':
            if (!updatedMemberIds.includes(op.userId)) {
              updatedMembers.push({
                userId: op.userId,
                role: op.role || 'member',
                joinedAt: serverTimestamp()
              });
              updatedMemberIds.push(op.userId);
            }
            break;
          case 'remove':
            updatedMembers = updatedMembers.filter(m => m.userId !== op.userId);
            updatedMemberIds = updatedMemberIds.filter(id => id !== op.userId);
            break;
          case 'update':
            const memberIndex = updatedMembers.findIndex(m => m.userId === op.userId);
            if (memberIndex >= 0 && op.role) {
              updatedMembers[memberIndex].role = op.role;
            }
            break;
        }
      });

      batch.update(groupRef, {
        members: updatedMembers,
        memberIds: updatedMemberIds,
        updatedAt: serverTimestamp()
      });

      await batch.commit();

      // Update cache
      if (this.groupCache.has(groupId)) {
        const cachedGroup = this.groupCache.get(groupId)!;
        cachedGroup.members = updatedMembers;
        (cachedGroup as any).memberIds = updatedMemberIds;
      }

      console.log(`✅ Batch updated ${operations.length} member operations`);
    } catch (error) {
      console.error('Error batch updating group members:', error);
      throw error;
    }
  }

  // Cleanup methods
  removeListener(groupId: string) {
    const listenerKey = `group_${groupId}_messages`;
    if (this.activeListeners.has(listenerKey)) {
      this.activeListeners.get(listenerKey)!();
      this.activeListeners.delete(listenerKey);
      console.log(`📡 Removed listener: ${listenerKey}`);
    }
  }

  clearCache() {
    this.groupCache.clear();
    this.memberCache.clear();
    console.log('🧹 Group cache cleared');
  }

  cleanup() {
    // Remove all listeners
    this.activeListeners.forEach(unsubscribe => unsubscribe());
    this.activeListeners.clear();
    
    // Clear caches
    this.clearCache();
    
    console.log('🧹 OptimizedGroupService cleanup completed');
  }

  // Private helper methods
  private setCache(groupId: string, groupData: GroupData) {
    if (this.groupCache.size >= this.MAX_CACHE_SIZE) {
      this.cleanupCache();
    }
    this.groupCache.set(groupId, groupData);
  }

  private isCacheValid(data: any): boolean {
    return Date.now() - (data._cachedAt || 0) < this.CACHE_DURATION;
  }

  private cleanupCache() {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.groupCache.forEach((data, key) => {
      if (now - (data._cachedAt || 0) > this.CACHE_DURATION) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.groupCache.delete(key));
    
    // If still too large, remove oldest entries
    if (this.groupCache.size >= this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.groupCache.entries());
      entries.sort((a, b) => (a[1]._cachedAt || 0) - (b[1]._cachedAt || 0));
      
      const toRemove = entries.slice(0, Math.floor(this.MAX_CACHE_SIZE * 0.3));
      toRemove.forEach(([key]) => this.groupCache.delete(key));
    }

    console.log('🧹 Group cache cleaned up, size:', this.groupCache.size);
  }

  // Get cache stats for monitoring
  getCacheStats() {
    return {
      groupCacheSize: this.groupCache.size,
      memberCacheSize: this.memberCache.size,
      activeListeners: this.activeListeners.size,
      maxCacheSize: this.MAX_CACHE_SIZE,
      cacheDuration: this.CACHE_DURATION
    };
  }
}

export default new OptimizedGroupService();
