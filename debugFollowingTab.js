// Debug script for following tab
import { db } from './firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { followService } from './services/followService';

export const debugFollowingTab = async (userId) => {
  console.log('🔍 Debugging following tab for user:', userId);

  try {
    // Check follows
    console.log('📋 Checking follows...');
    const following = await followService.getFollowing(userId);
    console.log('Following users:', following);

    if (following.length === 0) {
      console.log('❌ No following users found');
      return;
    }

    // Check posts for each following user
    for (const follow of following) {
      console.log(`📝 Checking posts for user: ${follow.followingId}`);
      const q = query(
        collection(db, 'posts'),
        where('userId', '==', follow.followingId)
      );
      const snapshot = await getDocs(q);
      console.log(`Posts count for ${follow.followingId}:`, snapshot.size);
      snapshot.forEach(doc => {
        console.log('Post:', doc.id, doc.data());
      });
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
};
