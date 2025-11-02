import messaging from '@react-native-firebase/messaging';
import notificationService from './services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebaseConfig';
import { doc, updateDoc, getDoc, deleteField } from 'firebase/firestore';
import { auth } from './firebaseConfig';

class FirebaseMessaging {
  async initialize() {
    await this.requestUserPermission();
    await this.getFCMToken();
    this.setupMessageHandlers();
  }

  async requestUserPermission() {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      return true;
    } else {
      return false;
    }
  }

  async getFCMToken() {
    try {
      // Kiểm tra xem đã có token chưa
      const fcmToken = await AsyncStorage.getItem('fcmToken');
      
      if (!fcmToken) {
        // Lấy token mới
        const token = await messaging().getToken();
        if (token) {
          await AsyncStorage.setItem('fcmToken', token);
          
          // Lưu token lên Firestore cho user hiện tại
          await this.saveFCMTokenToFirestore(token);
          return token;
        }
      } else {
        // Đảm bảo token hiện có cũng được đồng bộ lên Firestore cho user hiện tại
        await this.saveFCMTokenToFirestore(fcmToken);
        return fcmToken;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
    }
  }

  async saveFCMTokenToFirestore(token) {
    try {
      const uid = auth?.currentUser?.uid;
      if (uid && token) {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
          [`fcmTokens.${token}`]: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error saving FCM token to Firestore:', error);
    }
  }

  setupMessageHandlers() {
    // Xử lý khi app đang mở (foreground)
    messaging().onMessage(async (remoteMessage) => {
      if (remoteMessage.notification) {
        // Chỉ tạo local notification nếu app đang active
        // Khi app ở background/quit, FCM tự động hiển thị notification
        await notificationService.scheduleLocalNotification({
          title: remoteMessage.notification.title || 'ChappAt',
          body: remoteMessage.notification.body || 'Bạn có tin nhắn mới',
          data: remoteMessage.data || {},
          categoryId: this.getCategoryFromData(remoteMessage.data),
        });
      }
    });

    // Xử lý khi app được mở từ notification (background state)
    messaging().onNotificationOpenedApp((remoteMessage) => {
      this.handleNotificationTap(remoteMessage);
    });

    // Xử lý khi app được mở từ notification (terminated state)
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          // Delay để đảm bảo navigation đã ready
          setTimeout(() => {
            this.handleNotificationTap(remoteMessage);
          }, 2000);
        }
      });

    // Lắng nghe thay đổi token
    messaging().onTokenRefresh((token) => {
      AsyncStorage.setItem('fcmToken', token);
      this.saveFCMTokenToFirestore(token);
    });

    // Setup background message handler cho data-only messages
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      // Xử lý data-only messages khi app ở background
      if (remoteMessage.data && !remoteMessage.notification) {
        // Tạo local notification cho data-only messages
        await notificationService.scheduleLocalNotification({
          title: remoteMessage.data.title || 'ChappAt',
          body: remoteMessage.data.body || 'Bạn có thông báo mới',
          data: remoteMessage.data,
          categoryId: this.getCategoryFromData(remoteMessage.data),
        });
      }
    });
  }

  getCategoryFromData(data) {
    if (!data) return undefined;
    
    switch (data.type) {
      case 'message':
        return 'message';
      case 'call':
        return 'call';
      case 'friend_request':
        return 'friend_request';
      default:
        return undefined;
    }
  }

  handleNotificationTap(remoteMessage) {
    if (remoteMessage.data) {
      const { type, chatId, callId, userId, groupId } = remoteMessage.data;
      
      // Xử lý navigation dựa trên type
      switch (type) {
        case 'message':
          if (chatId) {
            // Navigate to chat screen
          }
          break;
        case 'call':
          if (callId) {
            // Navigate to call screen hoặc trigger call UI
          }
          break;
        case 'group':
          if (groupId) {
            // Navigate to group
          }
          break;
        case 'friend_request':
          if (userId) {
            // Navigate to friend requests
          }
          break;
        default:
          // Navigate to main screen
      }
    }
  }

  // Gửi notification đến user khác
  async sendNotificationToUser(targetUserId, notification) {
    try {
      // Lấy FCM tokens của target user từ Firestore
      const userDoc = await getDoc(doc(db, 'users', targetUserId));
      const userData = userDoc.data();
      
      if (userData && userData.fcmTokens) {
        const tokens = Object.keys(userData.fcmTokens);
        
        // Gửi notification qua server hoặc Cloud Functions
        const payload = {
          tokens,
          notification: {
            title: notification.title,
            body: notification.body,
          },
          data: notification.data || {},
        };
        
        // Gọi API server để gửi push notification
        await this.callServerToSendNotification(payload);
      }
    } catch (error) {
      console.error('Error sending notification to user:', error);
    }
  }

  async callServerToSendNotification(payload) {
    try {
      // Gọi API server hoặc Cloud Functions để gửi push notification
      const response = await fetch('YOUR_SERVER_ENDPOINT/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send notification');
      }
    } catch (error) {
      console.error('Error calling server to send notification:', error);
    }
  }

  // Xóa FCM token khi user logout
  async removeFCMToken() {
    try {
      const token = await AsyncStorage.getItem('fcmToken');
      const uid = auth?.currentUser?.uid || (await AsyncStorage.getItem('userId'));
      
      if (token && uid) {
        // Xóa token khỏi Firestore
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
          [`fcmTokens.${token}`]: deleteField(),
        });
      }
      
      // Xóa token khỏi local storage
      await AsyncStorage.removeItem('fcmToken');
      
      // Xóa token khỏi FCM
      try { await messaging().deleteToken(); } catch (_e) {}
    } catch (error) {
      console.error('Error removing FCM token:', error);
    }
  }
}

export default new FirebaseMessaging();
