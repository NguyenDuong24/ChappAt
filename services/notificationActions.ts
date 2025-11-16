/**
 * Notification Actions Service
 * Handles all actions that can be performed from notifications
 * (Accept/decline friend requests, follow back, like back, etc.)
 */

import { db } from '@/firebaseConfig';
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';
import { Alert } from 'react-native';

export class NotificationActionsService {
  /**
   * Accept a friend request
   */
  static async acceptFriendRequest(
    currentUserId: string,
    senderId: string,
    senderName: string
  ): Promise<boolean> {
    try {
      console.log('🤝 Accepting friend request from:', senderId);

      // Update friend request status
      const requestQuery = query(
        collection(db, 'friendRequests'),
        where('senderId', '==', senderId),
        where('receiverId', '==', currentUserId),
        where('status', '==', 'pending')
      );

      const requestSnapshot = await getDocs(requestQuery);

      if (requestSnapshot.empty) {
        console.warn('⚠️ No pending friend request found');
        Alert.alert('Lỗi', 'Không tìm thấy lời mời kết bạn');
        return false;
      }

      const requestDoc = requestSnapshot.docs[0];

      // Update request status
      await updateDoc(requestDoc.ref, {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
      });

      // Add to current user's friends
      const currentUserRef = doc(db, 'users', currentUserId);
      await updateDoc(currentUserRef, {
        friends: arrayUnion(senderId),
        friendCount: increment(1),
        updatedAt: serverTimestamp(),
      });

      // Add to sender's friends
      const senderRef = doc(db, 'users', senderId);
      await updateDoc(senderRef, {
        friends: arrayUnion(currentUserId),
        friendCount: increment(1),
        updatedAt: serverTimestamp(),
      });

      // Create friendship document for both sides
      const friendshipId1 = `${currentUserId}_${senderId}`;
      const friendshipId2 = `${senderId}_${currentUserId}`;

      await setDoc(doc(db, 'friendships', friendshipId1), {
        userId: currentUserId,
        friendId: senderId,
        createdAt: serverTimestamp(),
        status: 'active',
      });

      await setDoc(doc(db, 'friendships', friendshipId2), {
        userId: senderId,
        friendId: currentUserId,
        createdAt: serverTimestamp(),
        status: 'active',
      });

      // Send acceptance notification to sender
      await addDoc(collection(db, 'notifications'), {
        type: 'accepted_invite',
        senderId: currentUserId,
        receiverId: senderId,
        title: 'Lời mời kết bạn đã được chấp nhận',
        message: `đã chấp nhận lời mời kết bạn của bạn`,
        timestamp: serverTimestamp(),
        isRead: false,
        data: {
          userId: currentUserId,
        },
      });

      console.log('✅ Friend request accepted successfully');
      Alert.alert('Thành công', `Bạn và ${senderName} đã trở thành bạn bè!`);
      return true;
    } catch (error) {
      console.error('❌ Error accepting friend request:', error);
      Alert.alert('Lỗi', 'Không thể chấp nhận lời mời. Vui lòng thử lại.');
      return false;
    }
  }

  /**
   * Decline a friend request
   */
  static async declineFriendRequest(
    currentUserId: string,
    senderId: string,
    senderName: string
  ): Promise<boolean> {
    try {
      console.log('❌ Declining friend request from:', senderId);

      const requestQuery = query(
        collection(db, 'friendRequests'),
        where('senderId', '==', senderId),
        where('receiverId', '==', currentUserId),
        where('status', '==', 'pending')
      );

      const requestSnapshot = await getDocs(requestQuery);

      if (requestSnapshot.empty) {
        console.warn('⚠️ No pending friend request found');
        return false;
      }

      const requestDoc = requestSnapshot.docs[0];

      // Update request status
      await updateDoc(requestDoc.ref, {
        status: 'declined',
        declinedAt: serverTimestamp(),
      });

      console.log('✅ Friend request declined successfully');
      Alert.alert('Đã từ chối', `Bạn đã từ chối lời mời từ ${senderName}`);
      return true;
    } catch (error) {
      console.error('❌ Error declining friend request:', error);
      Alert.alert('Lỗi', 'Không thể từ chối lời mời. Vui lòng thử lại.');
      return false;
    }
  }

  /**
   * Follow a user back
   */
  static async followUser(
    currentUserId: string,
    targetUserId: string,
    targetUserName: string
  ): Promise<boolean> {
    try {
      console.log('👤 Following user:', targetUserId);

      // Add to current user's following
      const currentUserRef = doc(db, 'users', currentUserId);
      await updateDoc(currentUserRef, {
        following: arrayUnion(targetUserId),
        followingCount: increment(1),
        updatedAt: serverTimestamp(),
      });

      // Add to target user's followers
      const targetUserRef = doc(db, 'users', targetUserId);
      await updateDoc(targetUserRef, {
        followers: arrayUnion(currentUserId),
        followersCount: increment(1),
        updatedAt: serverTimestamp(),
      });

      // Create follow document
      const followId = `${currentUserId}_${targetUserId}`;
      await setDoc(doc(db, 'follows', followId), {
        followerId: currentUserId,
        followingId: targetUserId,
        createdAt: serverTimestamp(),
      });

      // Send follow notification
      await addDoc(collection(db, 'notifications'), {
        type: 'follow',
        senderId: currentUserId,
        receiverId: targetUserId,
        title: 'Người theo dõi mới',
        message: `đã bắt đầu theo dõi bạn`,
        timestamp: serverTimestamp(),
        isRead: false,
        data: {
          userId: currentUserId,
        },
      });

      console.log('✅ User followed successfully');
      Alert.alert('Thành công', `Bạn đã theo dõi ${targetUserName}`);
      return true;
    } catch (error) {
      console.error('❌ Error following user:', error);
      Alert.alert('Lỗi', 'Không thể theo dõi người dùng. Vui lòng thử lại.');
      return false;
    }
  }

  /**
   * Unfollow a user
   */
  static async unfollowUser(
    currentUserId: string,
    targetUserId: string
  ): Promise<boolean> {
    try {
      console.log('👤 Unfollowing user:', targetUserId);

      // Remove from current user's following
      const currentUserRef = doc(db, 'users', currentUserId);
      await updateDoc(currentUserRef, {
        following: arrayRemove(targetUserId),
        followingCount: increment(-1),
        updatedAt: serverTimestamp(),
      });

      // Remove from target user's followers
      const targetUserRef = doc(db, 'users', targetUserId);
      await updateDoc(targetUserRef, {
        followers: arrayRemove(currentUserId),
        followersCount: increment(-1),
        updatedAt: serverTimestamp(),
      });

      // Remove follow document
      const followId = `${currentUserId}_${targetUserId}`;
      const followRef = doc(db, 'follows', followId);
      const followDoc = await getDoc(followRef);
      if (followDoc.exists()) {
        await updateDoc(followRef, {
          deletedAt: serverTimestamp(),
        });
      }

      console.log('✅ User unfollowed successfully');
      return true;
    } catch (error) {
      console.error('❌ Error unfollowing user:', error);
      return false;
    }
  }

  /**
   * Like a post
   */
  static async likePost(
    currentUserId: string,
    postId: string,
    postOwnerId: string
  ): Promise<boolean> {
    try {
      console.log('❤️ Liking post:', postId);

      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);

      if (!postDoc.exists()) {
        console.warn('⚠️ Post not found');
        Alert.alert('Lỗi', 'Không tìm thấy bài viết');
        return false;
      }

      const postData = postDoc.data();
      const likes = postData.likes || [];

      // Check if already liked
      if (likes.includes(currentUserId)) {
        console.log('⚠️ Post already liked');
        return true;
      }

      // Update post likes
      await updateDoc(postRef, {
        likes: arrayUnion(currentUserId),
        likeCount: increment(1),
        updatedAt: serverTimestamp(),
      });

      // Create like document
      await setDoc(doc(db, 'likes', `${currentUserId}_${postId}`), {
        userId: currentUserId,
        postId: postId,
        createdAt: serverTimestamp(),
      });

      // Send like notification to post owner (if not self)
      if (postOwnerId !== currentUserId) {
        await addDoc(collection(db, 'notifications'), {
          type: 'like',
          senderId: currentUserId,
          receiverId: postOwnerId,
          title: 'Lượt thích mới',
          message: `đã thích bài viết của bạn`,
          timestamp: serverTimestamp(),
          isRead: false,
          data: {
            postId: postId,
            userId: currentUserId,
          },
        });
      }

      console.log('✅ Post liked successfully');
      return true;
    } catch (error) {
      console.error('❌ Error liking post:', error);
      Alert.alert('Lỗi', 'Không thể thích bài viết. Vui lòng thử lại.');
      return false;
    }
  }

  /**
   * Unlike a post
   */
  static async unlikePost(currentUserId: string, postId: string): Promise<boolean> {
    try {
      console.log('💔 Unliking post:', postId);

      const postRef = doc(db, 'posts', postId);

      // Update post likes
      await updateDoc(postRef, {
        likes: arrayRemove(currentUserId),
        likeCount: increment(-1),
        updatedAt: serverTimestamp(),
      });

      // Remove like document
      const likeRef = doc(db, 'likes', `${currentUserId}_${postId}`);
      const likeDoc = await getDoc(likeRef);
      if (likeDoc.exists()) {
        await updateDoc(likeRef, {
          deletedAt: serverTimestamp(),
        });
      }

      console.log('✅ Post unliked successfully');
      return true;
    } catch (error) {
      console.error('❌ Error unliking post:', error);
      return false;
    }
  }

  /**
   * Check if user is following another user
   */
  static async isFollowing(
    currentUserId: string,
    targetUserId: string
  ): Promise<boolean> {
    try {
      const followId = `${currentUserId}_${targetUserId}`;
      const followDoc = await getDoc(doc(db, 'follows', followId));
      return followDoc.exists() && !followDoc.data()?.deletedAt;
    } catch (error) {
      console.error('❌ Error checking follow status:', error);
      return false;
    }
  }

  /**
   * Check if users are friends
   */
  static async areFriends(userId1: string, userId2: string): Promise<boolean> {
    try {
      const friendshipId = `${userId1}_${userId2}`;
      const friendshipDoc = await getDoc(doc(db, 'friendships', friendshipId));
      return friendshipDoc.exists() && friendshipDoc.data()?.status === 'active';
    } catch (error) {
      console.error('❌ Error checking friendship status:', error);
      return false;
    }
  }
}
