import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';

export interface Follow {
  id?: string;
  followerId: string;
  followingId: string;
  createdAt: any;
}

class FollowService {
  private followsCollection = collection(db, 'follows');

  /**
   * Follow a user
   */
  async followUser(followerId: string, followingId: string): Promise<boolean> {
    try {
      // Check if already following
      const isFollowing = await this.isFollowing(followerId, followingId);
      if (isFollowing) {
        console.log('Already following this user');
        return false;
      }

      // Add follow relationship
      await addDoc(this.followsCollection, {
        followerId,
        followingId,
        createdAt: serverTimestamp(),
      });

      console.log('✅ Successfully followed user');
      return true;
    } catch (error) {
      console.error('❌ Error following user:', error);
      return false;
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    try {
      // Find the follow document
      const q = query(
        this.followsCollection,
        where('followerId', '==', followerId),
        where('followingId', '==', followingId)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('No follow relationship found');
        return false;
      }

      // Delete the follow document
      const followDoc = snapshot.docs[0];
      await deleteDoc(doc(db, 'follows', followDoc.id));

      console.log('✅ Successfully unfollowed user');
      return true;
    } catch (error) {
      console.error('❌ Error unfollowing user:', error);
      return false;
    }
  }

  /**
   * Check if user A is following user B
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    try {
      const q = query(
        this.followsCollection,
        where('followerId', '==', followerId),
        where('followingId', '==', followingId)
      );

      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('❌ Error checking follow status:', error);
      return false;
    }
  }

  /**
   * Get followers count for a user
   */
  async getFollowersCount(userId: string): Promise<number> {
    try {
      const q = query(
        this.followsCollection,
        where('followingId', '==', userId)
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('❌ Error getting followers count:', error);
      return 0;
    }
  }

  /**
   * Get following count for a user
   */
  async getFollowingCount(userId: string): Promise<number> {
    try {
      const q = query(
        this.followsCollection,
        where('followerId', '==', userId)
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('❌ Error getting following count:', error);
      return 0;
    }
  }

  /**
   * Get list of followers for a user
   */
  async getFollowers(userId: string): Promise<Follow[]> {
    try {
      const q = query(
        this.followsCollection,
        where('followingId', '==', userId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Follow[];
    } catch (error) {
      console.error('❌ Error getting followers:', error);
      return [];
    }
  }

  /**
   * Get list of users that a user is following
   */
  async getFollowing(userId: string): Promise<Follow[]> {
    try {
      const q = query(
        this.followsCollection,
        where('followerId', '==', userId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Follow[];
    } catch (error) {
      console.error('❌ Error getting following:', error);
      return [];
    }
  }

  /**
   * Block a user
   */
  async blockUser(blockerId: string, blockedId: string): Promise<boolean> {
    try {
      // Check if already blocked
      const isBlocked = await this.isBlocked(blockerId, blockedId);
      if (isBlocked) {
        console.log('Already blocked this user');
        return false;
      }

      // Add block relationship
      await addDoc(collection(db, 'blocks'), {
        blockerId,
        blockedId,
        createdAt: serverTimestamp(),
      });

      // Unfollow if following
      await this.unfollowUser(blockerId, blockedId);
      await this.unfollowUser(blockedId, blockerId);

      console.log('✅ Successfully blocked user');
      return true;
    } catch (error) {
      console.error('❌ Error blocking user:', error);
      return false;
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'blocks'),
        where('blockerId', '==', blockerId),
        where('blockedId', '==', blockedId)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('No block relationship found');
        return false;
      }

      const blockDoc = snapshot.docs[0];
      await deleteDoc(doc(db, 'blocks', blockDoc.id));

      console.log('✅ Successfully unblocked user');
      return true;
    } catch (error) {
      console.error('❌ Error unblocking user:', error);
      return false;
    }
  }

  /**
   * Check if user A has blocked user B
   */
  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'blocks'),
        where('blockerId', '==', blockerId),
        where('blockedId', '==', blockedId)
      );

      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('❌ Error checking block status:', error);
      return false;
    }
  }
}

export const followService = new FollowService();
