import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, auth } from './firebaseConfig';
import { doc, updateDoc, setDoc, onSnapshot, collection, query, where, getDoc, deleteField } from 'firebase/firestore';

// Cấu hình notification handler cho background/foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false, // Temporarily disable sound to avoid ExoPlayer thread issue
      shouldSetBadge: true,
      // Quan trọng: Luôn hiển thị notification
      shouldActivateApp: true,
    };
  },
});

// Cấu hình notification categories (cho iOS)
if (Platform.OS === 'ios') {
  Notifications.setNotificationCategoryAsync('social', [
    {
      identifier: 'view',
      buttonTitle: 'Xem',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'reply',
      buttonTitle: 'Trả lời',
      options: { opensAppToForeground: true },
    },
  ]);
}

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.initialized = false;
    this.messageUnsubscribe = null;
  }

  // Utility functions for token encoding/decoding
  encodeTokenForFirestore(token) {
    return token
      .replace(/\[/g, '_LB_')  // [ -> _LB_ (Left Bracket)
      .replace(/\]/g, '_RB_')  // ] -> _RB_ (Right Bracket)
      .replace(/~/g, '_TLD_')  // ~ -> _TLD_ (Tilde)
      .replace(/\*/g, '_AST_') // * -> _AST_ (Asterisk)
      .replace(/\//g, '_SL_'); // / -> _SL_ (Slash)
  }

  decodeTokenFromFirestore(encodedToken) {
    return encodedToken
      .replace(/_LB_/g, '[')
      .replace(/_RB_/g, ']')
      .replace(/_TLD_/g, '~')
      .replace(/_AST_/g, '*')
      .replace(/_SL_/g, '/');
  }

  async initialize() {
    try {
      console.log('🔄 Initializing notification service...');

      // Kiểm tra device compatibility
      if (!Device.isDevice) {
        console.log('❌ Must use physical device for push notifications');
        return false;
      }

      // Setup notification channels for Android
      await this.setupAndroidChannels();

      // Request permissions và get token
      const token = await this.registerForPushNotifications();
      if (!token) {
        console.log('❌ Failed to get push token');
        return false;
      }

      this.expoPushToken = token;

      // Clean up old invalid tokens
      await this.cleanupInvalidTokensInFirestore();

      // Save token to Firestore
      await this.saveTokenToFirestore(token);

      // Setup listeners
      this.setupNotificationListeners();

      this.initialized = true;
      console.log('✅ Notification service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Error initializing notification service:', error);
      return false;
    }
  }

  async registerForPushNotifications() {
    try {
      // Check permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Notification permissions denied');
        return null;
      }

      // Get Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId ??
        Constants.expoConfig?.projectId;

      if (!projectId) {
        console.log('❌ No project ID found');
        return null;
      }

      const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = tokenResponse.data;

      console.log('✅ Got Expo push token:', token);
      await AsyncStorage.setItem('expoPushToken', token);

      return token;
    } catch (error) {
      console.error('❌ Error getting push token:', error);
      return null;
    }
  }

  async saveTokenToFirestore(token) {
    try {
      const user = auth.currentUser;
      if (!user || !token) return;

      // Tạo safe key cho Firestore bằng cách encode token
      const safeTokenKey = this.encodeTokenForFirestore(token);

      const userRef = doc(db, 'users', user.uid);

      // Lưu token với cả safe key và original token (sử dụng setDoc với merge: true để tự động tạo document nếu chưa tồn tại)
      await setDoc(userRef, {
        [`expoPushTokens.${safeTokenKey}`]: {
          token: token,  // Token gốc để gửi notification
          timestamp: new Date().toISOString(),
          device: Platform.OS,
          appVersion: Constants.expoConfig?.version || '1.0.0'
        },
        // Cập nhật current token để dễ truy cập
        currentExpoPushToken: token,
        lastTokenUpdate: new Date().toISOString()
      }, { merge: true });

      console.log('✅ Token saved to Firestore with safe key:', safeTokenKey);
    } catch (error) {
      console.error('❌ Error saving token to Firestore:', error);
    }
  }

  async setupAndroidChannels() {
    if (Platform.OS === 'android') {
      console.log('📱 Setting up Android notification channels...');

      // Default channel - HIGH importance for background visibility  
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Thông báo chung',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
        sound: undefined,
        showBadge: true,
        enableLights: true,
        enableVibrate: true,
      });

      // Messages - MAX importance
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Tin nhắn',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4CAF50',
        sound: undefined,
        showBadge: true,
        enableLights: true,
        enableVibrate: true,
      });

      // Calls - MAX importance with special sound
      await Notifications.setNotificationChannelAsync('calls', {
        name: 'Cuộc gọi',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 1000, 500, 1000],
        lightColor: '#2196F3',
        sound: undefined,
        showBadge: true,
        enableLights: true,
        enableVibrate: true,
      });

      // Social - HIGH importance for background visibility
      await Notifications.setNotificationChannelAsync('social', {
        name: 'Tương tác xã hội',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF9800',
        sound: undefined,
        showBadge: true,
        enableLights: true,
        enableVibrate: true,
        description: 'Thông báo về like, comment, follow và mention',
      });

      // System notifications
      await Notifications.setNotificationChannelAsync('system', {
        name: 'Hệ thống',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 150, 150, 150],
        lightColor: '#9E9E9E',
        sound: undefined,
        showBadge: false,
        enableLights: false,
        enableVibrate: true,
      });

      console.log('✅ Android notification channels setup complete');
    } else if (Platform.OS === 'ios') {
      console.log('📱 iOS notification categories already configured');
    }
  }

  setupNotificationListeners() {
    // Listen for foreground notifications
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        this.handleNotificationReceived(notification);
      }
    );

    // Listen for notification taps
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('👆 Notification tapped:', response);
        this.handleNotificationTap(response);
      }
    );
  }

  handleNotificationReceived(notification) {
    // Có thể thêm logic xử lý notification khi app foreground
    // Ví dụ: update badge count, play custom sound, etc.
  }

  handleNotificationTap(response) {
    const { data } = response.notification.request.content;

    if (data && typeof data === 'object') {
      // Navigate based on notification type
      switch (data.type) {
        case 'message':
          if (data.chatId) {
            // Navigate to chat screen
            console.log('Navigate to chat:', data.chatId);
          }
          break;
        case 'call':
          if (data.callId) {
            // Navigate to call screen
            console.log('Navigate to call:', data.callId);
          }
          break;
        default:
          console.log('Unknown notification type:', data.type);
      }
    }
  }

  async scheduleLocalNotification(notification) {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title || 'ChappAt',
          body: notification.body || 'You have a new notification',
          data: notification.data || {},
          sound: notification.sound !== false,
          badge: notification.badge,
        },
        trigger: notification.trigger || null,
      });

      console.log('✅ Local notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('❌ Error scheduling notification:', error);
      return null;
    }
  }

  async clearBadge() {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('❌ Error clearing badge:', error);
    }
  }

  async cancelNotification(notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('✅ Notification cancelled:', notificationId);
    } catch (error) {
      console.error('❌ Error cancelling notification:', error);
    }
  }

  cleanup() {
    if (this.notificationListener) {
      if (this.notificationListener && typeof this.notificationListener.remove === "function") this.notificationListener.remove();
      this.notificationListener = null;
    }

    if (this.responseListener) {
      if (this.responseListener && typeof this.responseListener.remove === "function") this.responseListener.remove();
      this.responseListener = null;
    }

    if (this.messageUnsubscribe) {
      this.messageUnsubscribe();
      this.messageUnsubscribe = null;
    }

    this.initialized = false;
    console.log('✅ Notification service cleaned up');
  }

  // Listen for new messages from Firestore
  listenForNewMessages(userId) {
    if (this.messageUnsubscribe) {
      this.messageUnsubscribe();
    }

    const messagesQuery = query(
      collection(db, 'messages'),
      where('receiverId', '==', userId),
      where('status', '==', 'unread')
    );

    this.messageUnsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const messageData = change.doc.data();

          this.scheduleLocalNotification({
            title: 'Tin nhắn mới 📩',
            body: `${messageData.senderName}: ${messageData.text}`,
            data: {
              type: 'message',
              chatId: messageData.chatId,
              senderId: messageData.senderId
            },
          });
        }
      });
    }, (error) => {
      // Silently ignore permission errors during logout
      const errorStr = String(error?.message || error?.code || error);
      if (!errorStr.includes('permission-denied') && !errorStr.includes('Missing or insufficient permissions')) {
        console.error('Message listener error:', error);
      }
    });

    return this.messageUnsubscribe;
  }


  async cleanupInvalidTokensInFirestore() {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) return;

      const userData = userDoc.data();
      const expoPushTokens = userData.expoPushTokens || {};

      // Tìm các token có ký tự không hợp lệ
      const invalidTokenKeys = Object.keys(expoPushTokens).filter(key =>
        key.includes('[') ||
        key.includes(']') ||
        key.includes('~') ||
        key.includes('*') ||
        key.includes('/')
      );

      if (invalidTokenKeys.length > 0) {
        console.log('🧹 Cleaning up invalid token keys:', invalidTokenKeys);

        // Xóa các token không hợp lệ
        const updates = {};
        invalidTokenKeys.forEach(key => {
          updates[`expoPushTokens.${key}`] = deleteField();
        });

        await updateDoc(userRef, updates);
        console.log('✅ Cleaned up invalid tokens from Firestore');
      }
    } catch (error) {
      console.error('❌ Error cleaning up invalid tokens:', error);
    }
  }

  getExpoPushToken() {
    return this.expoPushToken;
  }

  isInitialized() {
    return this.initialized;
  }
}

// Export singleton instance
export default new NotificationService();



