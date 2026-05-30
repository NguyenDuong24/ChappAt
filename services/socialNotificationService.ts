import { db } from '../firebaseConfig';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp, query, where, getDocs, deleteDoc, limit } from 'firebase/firestore';
import { CoreNotificationService } from './core';
import ExpoPushNotificationService from './expoPushNotificationService';

// Cache để tránh fetch user info nhiều lần
const userInfoCache = new Map<string, { name: string; avatar?: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 phút

class SocialNotificationService {
  // Helper để lấy user info với cache
  private async getUserInfo(userId: string): Promise<{ name: string; avatar?: string }> {
    const cached = userInfoCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return { name: cached.name, avatar: cached.avatar };
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const name = userData.username || userData.displayName || userData.name || 'Người dùng';
        const avatar = userData.profileUrl || userData.photoURL;
        
        // Cache kết quả
        userInfoCache.set(userId, { name, avatar, timestamp: Date.now() });
        return { name, avatar };
      }
    } catch (error) {
      console.error('❌ Error fetching user info:', error);
    }
    
    return { name: 'Người dùng' };
  }

  // Tạo notification khi có người like bài viết
  async createLikeNotification(postId: string, postAuthorId: string, likerUserId: string, likerName?: string, likerAvatar?: string) {
    try {
      // Không tạo notification nếu người like chính là tác giả
      if (postAuthorId === likerUserId) {
        console.log('⏭️ Skip like notification - user liked their own post');
        return;
      }

      // Lấy thông tin người like nếu chưa có
      let senderName = likerName;
      let senderAvatar = likerAvatar;
      
      if (!senderName) {
        const userInfo = await this.getUserInfo(likerUserId);
        senderName = userInfo.name;
        senderAvatar = senderAvatar || userInfo.avatar;
      }

      // Kiểm tra xem đã có notification like cho bài viết này từ user này chưa (giới hạn query)
      const existingQuery = query(
        collection(db, 'notifications'),
        where('receiverId', '==', postAuthorId),
        where('senderId', '==', likerUserId),
        where('type', '==', 'like'),
        where('data.postId', '==', postId),
        limit(1)
      );
      
      const existingDocs = await getDocs(existingQuery);
      if (!existingDocs.empty) {
        console.log('⏭️ Like notification already exists, skipping');
        return;
      }

      // Tạo notification mới
      const notificationData = {
        receiverId: postAuthorId,
        senderId: likerUserId,
        senderName: senderName,
        senderAvatar: senderAvatar || null,
        type: 'like',
        title: 'Lượt thích mới',
        message: `${senderName} đã thích bài viết của bạn`,
        data: {
          postId,
          actionType: 'like'
        },
        isRead: false,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'notifications'), notificationData);
      console.log('✅ Like notification created:', docRef.id);

      // Gửi push notification nếu user có token
      await this.sendPushNotification(postAuthorId, {
        title: 'Lượt thích mới ❤️',
        body: `${senderName} đã thích bài viết của bạn`,
        data: {
          type: 'like',
          postId,
          senderId: likerUserId,
          userId: likerUserId, // For navigation
          notificationId: docRef.id,
          action: 'like'
        }
      });

      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating like notification:', error);
    }
  }

  // Tạo notification khi có người comment bài viết
  async createCommentNotification(postId: string, postAuthorId: string, commenterUserId: string, commenterName?: string, commentText: string = '', commenterAvatar?: string) {
    try {
      // Không tạo notification nếu người comment chính là tác giả
      if (postAuthorId === commenterUserId) {
        console.log('⏭️ Skip comment notification - user commented on their own post');
        return;
      }

      // Lấy thông tin người comment nếu chưa có (sử dụng cache)
      let senderName = commenterName;
      let senderAvatar = commenterAvatar;
      
      if (!senderName) {
        const userInfo = await this.getUserInfo(commenterUserId);
        senderName = userInfo.name;
        senderAvatar = senderAvatar || userInfo.avatar;
      }

      const truncatedComment = commentText.length > 50 
        ? `${commentText.substring(0, 50)}...` 
        : commentText;

      const notificationData = {
        receiverId: postAuthorId,
        senderId: commenterUserId,
        senderName: senderName,
        senderAvatar: senderAvatar || null,
        type: 'comment',
        title: 'Bình luận mới',
        message: `${senderName} đã bình luận: "${truncatedComment}"`,
        data: {
          postId,
          actionType: 'comment',
          commentText: commentText.substring(0, 200) // Giới hạn độ dài lưu trong data
        },
        isRead: false,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'notifications'), notificationData);
      console.log('✅ Comment notification created:', docRef.id);

      // Gửi push notification
      await this.sendPushNotification(postAuthorId, {
        title: 'Bình luận mới 💬',
        body: `${senderName}: ${commentText.substring(0, 100)}`,
        data: {
          type: 'comment',
          postId,
          senderId: commenterUserId,
          userId: commenterUserId, // For navigation
          notificationId: docRef.id,
          action: 'comment',
          commentText: commentText.substring(0, 200)
        }
      });

      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating comment notification:', error);
    }
  }

  // Tạo notification khi có người follow
  async createFollowNotification(followedUserId: string, followerUserId: string, followerName?: string, followerAvatar?: string) {
    try {
      // Không tạo notification nếu follow chính mình
      if (followedUserId === followerUserId) return;

      // Lấy thông tin người follow nếu chưa có
      let senderName = followerName;
      let senderAvatar = followerAvatar;
      
      if (!senderName) {
        try {
          const followerDoc = await getDoc(doc(db, 'users', followerUserId));
          if (followerDoc.exists()) {
            const followerData = followerDoc.data();
            senderName = followerData.username || followerData.displayName || followerData.name || 'Unknown User';
            senderAvatar = followerData.profileUrl || followerData.photoURL;
          }
        } catch (error) {
          console.error('❌ Error fetching follower info:', error);
          senderName = 'Unknown User';
        }
      }

      // Kiểm tra xem đã có notification follow chưa
      const existingQuery = query(
        collection(db, 'notifications'),
        where('receiverId', '==', followedUserId),
        where('senderId', '==', followerUserId),
        where('type', '==', 'follow')
      );
      
      const existingDocs = await getDocs(existingQuery);
      if (!existingDocs.empty) {
        console.log('Follow notification already exists');
        return;
      }

      const notificationData = {
        receiverId: followedUserId,
        senderId: followerUserId,
        senderName: senderName,
        senderAvatar: senderAvatar || null,
        type: 'follow',
        title: 'Người theo dõi mới',
        message: `${senderName} đã bắt đầu theo dõi bạn`,
        data: {
          actionType: 'follow'
        },
        isRead: false,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'notifications'), notificationData);
      console.log('✅ Follow notification created:', docRef.id);

      // Gửi push notification
      await this.sendPushNotification(followedUserId, {
        title: 'Người theo dõi mới 👤',
        body: `${senderName} đã bắt đầu theo dõi bạn`,
        data: {
          type: 'follow',
          senderId: followerUserId,
          userId: followerUserId, // For navigation
          notificationId: docRef.id,
          action: 'follow'
        }
      });

      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating follow notification:', error);
    }
  }

  // Tạo notification khi được mention
  async createMentionNotification(postId: string, mentionedUserId: string, mentionerUserId: string, mentionerName?: string, content: string = '', mentionerAvatar?: string) {
    try {
      // Không tạo notification nếu mention chính mình
      if (mentionedUserId === mentionerUserId) return;

      // Lấy thông tin người mention nếu chưa có
      let senderName = mentionerName;
      let senderAvatar = mentionerAvatar;
      
      if (!senderName) {
        try {
          const mentionerDoc = await getDoc(doc(db, 'users', mentionerUserId));
          if (mentionerDoc.exists()) {
            const mentionerData = mentionerDoc.data();
            senderName = mentionerData.username || mentionerData.displayName || mentionerData.name || 'Unknown User';
            senderAvatar = mentionerData.profileUrl || mentionerData.photoURL;
          }
        } catch (error) {
          console.error('❌ Error fetching mentioner info:', error);
          senderName = 'Unknown User';
        }
      }

      const notificationData = {
        receiverId: mentionedUserId,
        senderId: mentionerUserId,
        senderName: senderName,
        senderAvatar: senderAvatar || null,
        type: 'mention',
        title: 'Bạn được nhắc đến',
        message: `${senderName} đã nhắc đến bạn trong một bài viết`,
        data: {
          postId,
          actionType: 'mention',
          content: content.substring(0, 100)
        },
        isRead: false,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'notifications'), notificationData);
      console.log('✅ Mention notification created:', docRef.id);

      // Gửi push notification
      await this.sendPushNotification(mentionedUserId, {
        title: 'Bạn được nhắc đến 📢',
        body: `${senderName} đã nhắc đến bạn trong một bài viết`,
        data: {
          type: 'mention',
          postId,
          senderId: mentionerUserId,
          userId: mentionerUserId, // For navigation
          notificationId: docRef.id,
          action: 'mention',
          content: content.substring(0, 200)
        }
      });

      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating mention notification:', error);
    }
  }

  // Gửi REAL push notification (hiển thị trên thanh thông báo khi app background/tắt)
  async sendPushNotification(userId: string, notification: any) {
    try {
      // Lấy thông tin user để có token
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        console.log('❌ User document not found:', userId);
        return;
      }

      const userData = userDoc.data();
      let expoPushToken = userData.expoPushToken;

      if (!expoPushToken) {
        console.log('❌ No push token found for user:', userId);
        return;
      }

      console.log('📤 Sending REAL push notification to user:', userId);
      
      // Gửi REAL push notification qua Expo Push API
      const success = await ExpoPushNotificationService.sendRealPushNotification(expoPushToken, {
        title: notification.title,
        body: notification.body || notification.message,
        data: notification.data || {},
        priority: 'high',
        sound: undefined,
        badge: 1,
        channelId: 'social' // Sử dụng social channel với HIGH importance
      });

      if (success) {
        console.log('✅ REAL Push notification sent successfully to user:', userId);
      } else {
        console.log('🔄 Real push failed, trying fallback...');
        // Fallback to local notification
        await CoreNotificationService.scheduleLocalNotification({
          title: notification.title,
          body: notification.body || notification.message,
          data: notification.data || {}
        });
      }
    } catch (error) {
      console.error('❌ Error sending push notification:', error);
    }
  }

  // Xóa notification khi unlike
  async removeLikeNotification(postId: string, postAuthorId: string, likerUserId: string) {
    try {
      const query_ref = query(
        collection(db, 'notifications'),
        where('receiverId', '==', postAuthorId),
        where('senderId', '==', likerUserId),
        where('type', '==', 'like'),
        where('data.postId', '==', postId)
      );
      
      const snapshot = await getDocs(query_ref);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      console.log(`✅ ${snapshot.docs.length} like notifications removed`);
    } catch (error) {
      console.error('❌ Error removing like notification:', error);
    }
  }

  // Xóa notification khi unfollow
  async removeFollowNotification(followedUserId: string, followerUserId: string) {
    try {
      const query_ref = query(
        collection(db, 'notifications'),
        where('receiverId', '==', followedUserId),
        where('senderId', '==', followerUserId),
        where('type', '==', 'follow')
      );
      
      const snapshot = await getDocs(query_ref);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      console.log(`✅ ${snapshot.docs.length} follow notifications removed`);
    } catch (error) {
      console.error('❌ Error removing follow notification:', error);
    }
  }
}

export default new SocialNotificationService();
