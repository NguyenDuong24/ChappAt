import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import {
  Platform,
  AppState,
  AppStateStatus,
  NativeEventSubscription,
} from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  orderBy,
  limit,
  Timestamp,
  DocumentData,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

interface NotificationListeners {
  chatMessages: (() => void) | null;
  groupMessages: (() => void) | null;
  comments: (() => void) | null;
  posts: (() => void) | null;
  userDoc: (() => void) | null;
}

class ExpoPushNotificationService {
  // URL của Expo Push API
  private readonly EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
  private expoPushToken: string | null = null;
  private currentUserId: string | null = null;
  private appState: AppStateStatus = AppState.currentState;
  private listeners: NotificationListeners = {
    chatMessages: null,
    groupMessages: null,
    comments: null,
    posts: null,
    userDoc: null,
  };
  private lastNotificationTime: { [key: string]: number } = {};
  private notificationDebounceTime = 1000; // 1 giây
  private chatMessageListeners: Map<string, () => void> = new Map();
  private groupMessageListeners: Map<string, () => void> = new Map();
  private commentListeners: Map<string, () => void> = new Map();
  private devicePushToken: { type: string; data: string } | null = null;
  private appStateSubscription: NativeEventSubscription | null = null;

  /**
   * Khởi tạo service với realtime listeners
   */
  async initializeWithRealtimeListeners(userId: string) {
    if (this.currentUserId && this.currentUserId !== userId) {
      this.cleanup();
    }
    this.currentUserId = userId;
    await this.registerForPushNotifications();
    await this.setupNotificationChannels();
    this.setupAppStateListener();
    await this.startRealtimeListeners();
    console.log(
      "✅ Expo Push Notification Service initialized với realtime listeners",
    );
  }

  /**
   * Đăng ký push notifications
   */
  private async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log("⚠️ Push notifications chỉ hoạt động trên thiết bị thật");
      return null;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("❌ Không có quyền gửi notification!");
      return null;
    }

    try {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

      if (!projectId) {
        console.warn(
          "⚠️ Không tìm thấy Project ID, sử dụng local notifications",
        );
        return null;
      }

      const pushTokenString = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;

      this.expoPushToken = pushTokenString;
      await AsyncStorage.setItem("expoPushToken", pushTokenString);

      // Đồng bộ token lên Firestore để thiết bị khác có thể gửi push cho bạn
      if (this.currentUserId) {
        await this.syncPushTokenToUser(this.currentUserId, pushTokenString);
      }

      // NEW: Lấy native device token (FCM trên Android, APNs trên iOS) để xác nhận cấu hình FCM/APNs
      try {
        const native = await Notifications.getDevicePushTokenAsync();
        if (native && native.data) {
          this.devicePushToken = native as any;
          console.log(
            `✅ Native device push token (${native.type}):`,
            String(native.data).substring(0, 24) + "...",
          );
          if (this.currentUserId) {
            await this.syncNativeDeviceToken(this.currentUserId, native);
          }
        } else {
          console.warn("⚠️ Không lấy được native device push token");
        }
      } catch (e) {
        console.warn("⚠️ Lỗi khi lấy native device push token:", e);
      }

      console.log("✅ Expo Push Token:", pushTokenString);
      return pushTokenString;
    } catch (error) {
      console.error("❌ Lỗi khi lấy push token:", error);
      return null;
    }
  }

  // NEW: Đồng bộ FCM/APNs token lên Firestore để kiểm chứng cấu hình FCM hoạt động
  private async syncNativeDeviceToken(
    userId: string,
    native: { type: string; data: string },
  ) {
    try {
      const userRef = doc(db, "users", userId);
      const payload: any = {
        pushTokenUpdatedAt: new Date().toISOString(),
      };
      if (native.type === "fcm") {
        payload.fcmToken = native.data;
      } else if (native.type === "apns") {
        payload.apnsToken = native.data;
      } else {
        payload.devicePushToken = native.data;
        payload.devicePushTokenType = native.type;
      }
      await updateDoc(userRef, payload).catch(async () => {
        await setDoc(userRef, payload, { merge: true });
      });
      console.log("✅ Synced native device token to Firestore");
    } catch (e) {
      console.warn("⚠️ Cannot sync native device token to Firestore:", e);
    }
  }

  // Getter cho native token (FCM/APNs)
  getNativeDevicePushToken(): { type: string; data: string } | null {
    return this.devicePushToken;
  }

  /**
   * Thiết lập notification channels cho Android
   */
  private async setupNotificationChannels() {
    if (Platform.OS !== "android") return;

    try {
      // Channel mặc định dùng khi không chỉ định channelId
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.HIGH,
        sound: undefined,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#4f8bff",
      });

      await Notifications.setNotificationChannelAsync("messages", {
        name: "Tin nhắn",
        importance: Notifications.AndroidImportance.HIGH,
        sound: undefined,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#4f8bff",
      });

      await Notifications.setNotificationChannelAsync("groups", {
        name: "Nhóm",
        importance: Notifications.AndroidImportance.HIGH,
        sound: undefined,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#51cf66",
      });

      await Notifications.setNotificationChannelAsync("comments", {
        name: "Bình luận",
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: undefined,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#ffd43b",
      });

      await Notifications.setNotificationChannelAsync("posts", {
        name: "Bài viết",
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: undefined,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#ff6b6b",
      });

      // Channel cho cuộc gọi với priority cao nhất
      await Notifications.setNotificationChannelAsync("calls", {
        name: "Cuộc gọi",
        importance: Notifications.AndroidImportance.MAX,
        sound: undefined,
        vibrationPattern: [0, 500, 500, 500],
        lightColor: "#00ff00",
        enableVibrate: true,
        enableLights: true,
      });

      console.log("✅ Android notification channels đã được tạo");
    } catch (error) {
      console.error("❌ Lỗi khi tạo notification channels:", error);
    }
  }

  /**
   * Lắng nghe thay đổi trạng thái app
   */
  private setupAppStateListener() {
    this.appStateSubscription?.remove();
    this.appStateSubscription = AppState.addEventListener(
      "change",
      this.handleAppStateChange,
    );
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    console.log("🔄 App state changed:", this.appState, "->", nextAppState);
    this.appState = nextAppState;

    if (nextAppState === "background" || nextAppState === "inactive") {
      console.log("📱 App đang ở background - notifications sẽ được hiển thị");
    } else if (nextAppState === "active") {
      console.log("📱 App đang ở foreground");
    }
  };

  /**
   * Bắt đầu tất cả realtime listeners
   */
  private async startRealtimeListeners() {
    if (!this.currentUserId) {
      console.warn("⚠️ Không có userId để bắt đầu listeners");
      return;
    }

    console.log(
      "🎧 Bắt đầu realtime listeners cho userId:",
      this.currentUserId,
    );
    await this.listenToChatMessages();
    await this.listenToGroupMessages();
    await this.listenToComments();
    await this.listenToPosts();
  }

  /**
   * Lắng nghe tin nhắn chat 1-1
   */
  private async listenToChatMessages() {
    if (!this.currentUserId) return;

    try {
      const chatsRef = collection(db, "chats");
      const q = query(
        chatsRef,
        where("participants", "array-contains", this.currentUserId),
      );

      this.listeners.chatMessages = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const chatData = change.doc.data();
            this.listenToMessagesInChat(change.doc.id, chatData);
          }
          // Note: We don't need to re-subscribe on 'modified' because the message listener
          // is already active and listening to the subcollection.
        });
      }, (error) => {
        const errorStr = String(error?.message || error?.code || error);
        if (!errorStr.includes('permission-denied') && !errorStr.includes('Missing or insufficient permissions')) {
          console.error("Error in chatMessages listener:", error);
        }
      });

      console.log("✅ Đang lắng nghe chat messages");
    } catch (error) {
      console.error("❌ Lỗi khi lắng nghe chat messages:", error);
    }
  }

  /**
   * Lắng nghe tin nhắn trong một chat cụ thể
   */
  private listenToMessagesInChat(chatId: string, chatData: DocumentData) {
    // Hủy listener cũ nếu có
    const oldListener = this.chatMessageListeners.get(chatId);
    if (oldListener) {
      oldListener();
    }

    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "desc"), limit(1));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const messageData = change.doc.data();

          if (
            this.isAppInBackground() &&
            messageData.senderId !== this.currentUserId &&
            this.isRecentMessage(messageData.timestamp)
          ) {
            this.sendChatNotification(chatId, messageData, chatData);
          }
        }
      });
    }, (error) => {
      const errorStr = String(error?.message || error?.code || error);
      if (!errorStr.includes('permission-denied') && !errorStr.includes('Missing or insufficient permissions')) {
        console.error(`Error in chat messages listener for ${chatId}:`, error);
      }
    });

    this.chatMessageListeners.set(chatId, unsubscribe);
  }

  /**
   * Lắng nghe tin nhắn nhóm
   */
  private async listenToGroupMessages() {
    if (!this.currentUserId) return;

    try {
      const groupsRef = collection(db, "groups");
      const q = query(
        groupsRef,
        where("members", "array-contains", this.currentUserId),
      );

      this.listeners.groupMessages = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const groupData = change.doc.data();
            this.listenToMessagesInGroup(change.doc.id, groupData);
          }
          // Note: We don't need to re-subscribe on 'modified'
        });
      }, (error) => {
        const errorStr = String(error?.message || error?.code || error);
        if (!errorStr.includes('permission-denied') && !errorStr.includes('Missing or insufficient permissions')) {
          console.error("Error in groupMessages listener:", error);
        }
      });

      console.log("✅ Đang lắng nghe group messages");
    } catch (error) {
      console.error("❌ Lỗi khi lắng nghe group messages:", error);
    }
  }

  /**
   * Lắng nghe tin nhắn trong một nhóm cụ thể
   */
  private listenToMessagesInGroup(groupId: string, groupData: DocumentData) {
    // Hủy listener cũ nếu có
    const oldListener = this.groupMessageListeners.get(groupId);
    if (oldListener) {
      oldListener();
    }

    const messagesRef = collection(db, "groups", groupId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "desc"), limit(1));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const messageData = change.doc.data();

          if (
            this.isAppInBackground() &&
            messageData.senderId !== this.currentUserId &&
            this.isRecentMessage(messageData.timestamp)
          ) {
            this.sendGroupNotification(groupId, messageData, groupData);
          }
        }
      });
    }, (error) => {
      const errorStr = String(error?.message || error?.code || error);
      if (!errorStr.includes('permission-denied') && !errorStr.includes('Missing or insufficient permissions')) {
        console.error(`Error in group messages listener for ${groupId}:`, error);
      }
    });

    this.groupMessageListeners.set(groupId, unsubscribe);
  }

  /**
   * Lắng nghe bình luận trên bài viết
   */
  private async listenToComments() {
    if (!this.currentUserId) return;

    try {
      const postsRef = collection(db, "posts");
      const q = query(
        postsRef,
        where("userId", "==", this.currentUserId),
        limit(50),
      );

      this.listeners.comments = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const postData = change.doc.data();
            this.listenToCommentsInPost(change.doc.id, postData);
          } else if (change.type === "removed") {
            // Stop listening to comments for this post
            const unsubscribe = this.commentListeners.get(change.doc.id);
            if (unsubscribe) {
              unsubscribe();
              this.commentListeners.delete(change.doc.id);
            }
          }
        });
      }, (error) => {
        const errorStr = String(error?.message || error?.code || error);
        if (!errorStr.includes('permission-denied') && !errorStr.includes('Missing or insufficient permissions')) {
          console.error("Error in comments listener:", error);
        }
      });

      console.log("✅ Đang lắng nghe comments");
    } catch (error) {
      console.error("❌ Lỗi khi lắng nghe comments:", error);
    }
  }

  /**
   * Lắng nghe bình luận trong một bài viết cụ thể
   */
  private listenToCommentsInPost(postId: string, postData: DocumentData) {
    // Avoid duplicate listeners
    if (this.commentListeners.has(postId)) return;

    const commentsRef = collection(db, "posts", postId, "comments");
    const q = query(commentsRef, orderBy("timestamp", "desc"), limit(1));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const commentData = change.doc.data();

          if (
            this.isAppInBackground() &&
            commentData.userId !== this.currentUserId &&
            this.isRecentMessage(commentData.timestamp)
          ) {
            this.sendCommentNotification(postId, commentData, postData);
          }
        }
      });
    }, (error) => {
      const errorStr = String(error?.message || error?.code || error);
      if (!errorStr.includes('permission-denied') && !errorStr.includes('Missing or insufficient permissions')) {
        console.error(`Error in comments listener for post ${postId}:`, error);
      }
    });

    this.commentListeners.set(postId, unsubscribe);
  }

  /**
   * Lắng nghe bài viết mới từ bạn bè
   */
  private async listenToPosts() {
    if (!this.currentUserId) return;

    try {
      const userDocRef = doc(db, "users", this.currentUserId);

      let lastFriendsJson = "";

      if (this.listeners.userDoc) {
        this.listeners.userDoc();
      }

      this.listeners.userDoc = onSnapshot(userDocRef, (snapshot) => {
        const userData = snapshot.data();
        const friends = userData?.friends || [];

        // Optimize: Only re-subscribe if friends list (first 10) actually changed
        const currentFriendsJson = JSON.stringify(friends.slice(0, 10));
        if (currentFriendsJson === lastFriendsJson) return;
        lastFriendsJson = currentFriendsJson;

        if (friends.length > 0) {
          const postsRef = collection(db, "posts");
          const q = query(
            postsRef,
            where("userId", "in", friends.slice(0, 10)),
            orderBy("timestamp", "desc"),
            limit(1),
          );

          // Unsubscribe previous listener if exists
          if (this.listeners.posts) {
            this.listeners.posts();
          }

          this.listeners.posts = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === "added") {
                const postData = change.doc.data();

                if (
                  this.isAppInBackground() &&
                  postData.userId !== this.currentUserId &&
                  this.isRecentMessage(postData.timestamp)
                ) {
                  this.sendPostNotification(change.doc.id, postData);
                }
              }
            });
          }, (error) => {
            const errorStr = String(error?.message || error?.code || error);
            if (!errorStr.includes('permission-denied') && !errorStr.includes('Missing or insufficient permissions')) {
              console.error("Error in posts listener:", error);
            }
          });
        }
      }, (error) => {
        const errorStr = String(error?.message || error?.code || error);
        if (!errorStr.includes('permission-denied') && !errorStr.includes('Missing or insufficient permissions')) {
          console.error("Error listening to user doc for posts:", error);
        }
      });

      console.log("✅ Đang lắng nghe posts");
    } catch (error) {
      console.error("❌ Lỗi khi lắng nghe posts:", error);
    }
  }

  /**
   * Đồng bộ push token lên Firestore
   */
  private async syncPushTokenToUser(userId: string, token: string) {
    try {
      const userRef = doc(db, "users", userId);
      // Lưu token trực tiếp vào user document để client khác có thể đọc và gửi push
      await updateDoc(userRef, {
        expoPushToken: token,
        expoPlatform: Platform.OS,
        pushTokenUpdatedAt: new Date().toISOString(),
      }).catch(async () => {
        // Nếu update thất bại (doc chưa tồn tại), setDoc merge
        await setDoc(
          userRef,
          {
            expoPushToken: token,
            expoPlatform: Platform.OS,
            pushTokenUpdatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      });
      console.log("✅ Synced Expo push token to Firestore");
    } catch (e) {
      console.warn("⚠️ Cannot sync push token to Firestore:", e);
    }
  }

  private async getUserPushToken(userId: string): Promise<string | null> {
    try {
      const snap = await getDoc(doc(db, "users", userId));
      if (snap.exists()) {
        const data: any = snap.data();
        return data?.expoPushToken || null;
      }
      return null;
    } catch (e) {
      console.warn("⚠️ Cannot read user push token:", e);
      return null;
    }
  }

  private async isUserNotificationMuted(userId: string): Promise<boolean> {
    try {
      const snap = await getDoc(doc(db, "users", userId));
      if (!snap.exists()) return false;
      const data: any = snap.data();
      return data.doNotDisturb === true || data.notificationSettings?.doNotDisturb === true;
    } catch (e) {
      console.warn("Cannot read notification preference:", e);
      return false;
    }
  }

  async sendPushToUser(
    userId: string,
    notification: { title: string; body: string; data?: any },
  ) {
    try {
      if (await this.isUserNotificationMuted(userId)) {
        console.log("User has Do Not Disturb enabled:", userId);
        return false;
      }

      const token = await this.getUserPushToken(userId);
      if (!token) {
        console.log("⚠️ User has no Expo push token:", userId);
        return false;
      }
      return await this.sendRealPushNotification(token, notification);
    } catch (e) {
      console.error("❌ Failed to send push to user:", e);
      return false;
    }
  }

  /**
   * Gửi notification cho tin nhắn chat
   */
  private async sendChatNotification(
    chatId: string,
    messageData: DocumentData,
    chatData: DocumentData,
  ) {
    const notificationKey = `chat_${chatId}_${messageData.timestamp}`;

    if (this.shouldSendNotification(notificationKey)) {
      try {
        const senderName = await this.getUserName(messageData.senderId);

        let body = messageData.text || "";
        if (messageData.imageUrl) {
          body = "📷 Đã gửi một hình ảnh";
        } else if (messageData.videoUrl) {
          body = "🎥 Đã gửi một video";
        }

        await Notifications.scheduleNotificationAsync({
          content: {
            title: senderName,
            body,
            data: {
              type: "message",
              chatId,
              senderId: messageData.senderId,
            },
            sound: undefined,
            badge: 1,
          },
          // Với Android, nếu không chỉ định channelId, sẽ dùng 'default' (đã set HIGH)
          trigger: null,
        });

        console.log("📬 Đã gửi chat notification:", senderName);
        this.lastNotificationTime[notificationKey] = Date.now();
      } catch (error) {
        console.error("❌ Lỗi khi gửi chat notification:", error);
      }
    }
  }

  /**
   * Gửi notification cho tin nhắn nhóm
   */
  private async sendGroupNotification(
    groupId: string,
    messageData: DocumentData,
    groupData: DocumentData,
  ) {
    const notificationKey = `group_${groupId}_${messageData.timestamp}`;

    if (this.shouldSendNotification(notificationKey)) {
      try {
        const senderName = await this.getUserName(messageData.senderId);
        const groupName = groupData.name || "Nhóm";

        let body = messageData.text || "";
        if (messageData.imageUrl) {
          body = "📷 Đã gửi một hình ảnh";
        } else if (messageData.videoUrl) {
          body = "🎥 Đã gửi một video";
        }

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${groupName}`,
            body: `${senderName}: ${body}`,
            data: {
              type: "group",
              groupId,
              senderId: messageData.senderId,
            },
            sound: undefined,
            badge: 1,
          },
          trigger: null,
        });

        console.log("📬 Đã gửi group notification:", groupName);
        this.lastNotificationTime[notificationKey] = Date.now();
      } catch (error) {
        console.error("❌ Lỗi khi gửi group notification:", error);
      }
    }
  }

  /**
   * Gửi notification cho bình luận
   */
  private async sendCommentNotification(
    postId: string,
    commentData: DocumentData,
    postData: DocumentData,
  ) {
    const notificationKey = `comment_${postId}_${commentData.timestamp}`;

    if (this.shouldSendNotification(notificationKey)) {
      try {
        const commenterName = await this.getUserName(commentData.userId);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "💬 Bình luận mới",
            body: `${commenterName} đã bình luận: ${commentData.text}`,
            data: {
              type: "comment",
              postId,
              commentId: commentData.id,
              userId: commentData.userId,
            },
            sound: undefined,
            badge: 1,
          },
          trigger: null,
        });

        console.log("📬 Đã gửi comment notification");
        this.lastNotificationTime[notificationKey] = Date.now();
      } catch (error) {
        console.error("❌ Lỗi khi gửi comment notification:", error);
      }
    }
  }

  /**
   * Gửi notification cho bài viết mới
   */
  private async sendPostNotification(postId: string, postData: DocumentData) {
    const notificationKey = `post_${postId}_${postData.timestamp}`;

    if (this.shouldSendNotification(notificationKey)) {
      try {
        const authorName = await this.getUserName(postData.userId);

        let body = postData.text || "Đã đăng một bài viết mới";
        if (postData.imageUrl) {
          body = "📷 Đã đăng một hình ảnh mới";
        }

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${authorName}`,
            body,
            data: {
              type: "post",
              postId,
              userId: postData.userId,
            },
            sound: undefined,
            badge: 1,
          },
          trigger: null,
        });

        console.log("📬 Đã gửi post notification");
        this.lastNotificationTime[notificationKey] = Date.now();
      } catch (error) {
        console.error("❌ Lỗi khi gửi post notification:", error);
      }
    }
  }

  /**
   * Kiểm tra app có đang ở background không
   */
  private isAppInBackground(): boolean {
    return this.appState === "background" || this.appState === "inactive";
  }

  /**
   * Kiểm tra tin nhắn có mới không (trong 10 giây)
   */
  private isRecentMessage(timestamp: Timestamp | Date | any): boolean {
    if (!timestamp) return false;

    let messageTime: number;

    if (timestamp instanceof Timestamp) {
      messageTime = timestamp.toMillis();
    } else if (timestamp instanceof Date) {
      messageTime = timestamp.getTime();
    } else if (typeof timestamp === "number") {
      messageTime = timestamp;
    } else if (timestamp.toDate && typeof timestamp.toDate === "function") {
      messageTime = timestamp.toDate().getTime();
    } else {
      return false;
    }

    const now = Date.now();
    const diff = now - messageTime;

    return diff < 10000; // 10 giây
  }

  /**
   * Kiểm tra có nên gửi notification không (debounce)
   */
  private shouldSendNotification(key: string): boolean {
    const lastTime = this.lastNotificationTime[key] || 0;
    const now = Date.now();

    return now - lastTime > this.notificationDebounceTime;
  }

  /**
   * Lấy tên người dùng
   */
  private async getUserName(userId: string): Promise<string> {
    try {
      const cachedName = await AsyncStorage.getItem(`userName_${userId}`);
      if (cachedName) return cachedName;

      const userDocRef = doc(db, "users", userId);
      const userSnapshot = await getDoc(userDocRef);

      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        const name = userData.displayName || userData.name || "Người dùng";
        await AsyncStorage.setItem(`userName_${userId}`, name);
        return name;
      }

      return "Người dùng";
    } catch (error) {
      console.error("❌ Lỗi khi lấy tên người dùng:", error);
      return "Người dùng";
    }
  }

  /**
   * Dọn dẹp và hủy tất cả listeners
   */
  cleanup() {
    // Hủy các main listeners
    Object.values(this.listeners).forEach((unsubscribe) => {
      if (unsubscribe) {
        unsubscribe();
      }
    });

    // Hủy chat message listeners
    this.chatMessageListeners.forEach((unsubscribe) => unsubscribe());
    this.chatMessageListeners.clear();

    // Hủy group message listeners
    this.groupMessageListeners.forEach((unsubscribe) => unsubscribe());
    this.groupMessageListeners.clear();

    // Hủy comment listeners
    this.commentListeners.forEach((unsubscribe) => unsubscribe());
    this.commentListeners.clear();

    this.listeners = {
      chatMessages: null,
      groupMessages: null,
      comments: null,
      posts: null,
      userDoc: null,
    };

    console.log("🧹 Đã dọn dẹp tất cả notification listeners");
  }

  /**
   * Lấy Expo Push Token hiện tại
   */
  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Gửi push notification thực sự qua Expo Push API
   * (Giữ lại method cũ cho tương thích)
   */
  async sendRealPushNotification(
    expoPushToken: string,
    notification: {
      title: string;
      body: string;
      data?: any;
      sound?: string;
      badge?: number;
      priority?: "default" | "normal" | "high";
      channelId?: string;
    },
  ) {
    try {
      // Validate token format
      if (!this.isValidExpoPushToken(expoPushToken)) {
        console.error("❌ Invalid Expo push token format:", expoPushToken);
        return false;
      }

      const message = {
        to: expoPushToken,
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        sound: notification.sound || "default",
        badge: notification.badge || 1,
        priority: notification.priority || "high",
        channelId: notification.channelId || "default",
        // Quan trọng: Đảm bảo notification hiển thị khi app background
        _displayInForeground: true,
        // Android specific
        ...(Platform.OS === "android" && {
          android: {
            sound: notification.sound || "default",
            priority: notification.priority || "high",
            channelId: notification.channelId || "default",
            bypassDnd: true,
            ongoing: true,
            sticky: true,
            fullScreenIntent: true,
          },
        }),
        // iOS specific
        ...(Platform.OS === "ios" && {
          ios: {
            sound: notification.sound || "default",
            _displayInForeground: true,
          },
        }),
      };

      console.log("📤 Sending real push notification:", {
        to: expoPushToken.substring(0, 20) + "...",
        title: notification.title,
        body: notification.body,
      });

      const response = await fetch(this.EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();

      if (response.ok && result.data && !result.data.error) {
        console.log("✅ Push notification sent successfully:", result.data.id);
        return true;
      } else {
        console.error("❌ Push notification failed:", result);
        return false;
      }
    } catch (error) {
      console.error("❌ Error sending push notification:", error);
      return false;
    }
  }

  /**
   * Gửi push notification hàng loạt (batch)
   */
  async sendBatchPushNotifications(
    notifications: Array<{
      expoPushToken: string;
      title: string;
      body: string;
      data?: any;
    }>,
  ) {
    try {
      const messages = notifications
        .filter((notif) => this.isValidExpoPushToken(notif.expoPushToken))
        .map((notif) => ({
          to: notif.expoPushToken,
          title: notif.title,
          body: notif.body,
          data: notif.data || {},
          sound: undefined,
          badge: 1,
          priority: "high",
          _displayInForeground: true,
        }));

      if (messages.length === 0) {
        console.log("❌ No valid tokens for batch send");
        return [];
      }

      console.log(`📤 Sending ${messages.length} batch push notifications`);

      const response = await fetch(this.EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();

      if (response.ok) {
        console.log(
          "✅ Batch push notifications sent:",
          result.data?.length || 0,
        );
        return result.data || [];
      } else {
        console.error("❌ Batch push notifications failed:", result);
        return [];
      }
    } catch (error) {
      console.error("❌ Error sending batch push notifications:", error);
      return [];
    }
  }

  /**
   * Kiểm tra format của Expo push token
   */
  private isValidExpoPushToken(token: string): boolean {
    return (
      token.startsWith("ExponentPushToken[") ||
      token.startsWith("ExpoPushToken[")
    );
  }

  /**
   * Gửi notification với fallback
   * - Thử real push notification trước
   * - Nếu fail thì fallback về local notification
   */
  async sendNotificationWithFallback(
    expoPushToken: string,
    notification: {
      title: string;
      body: string;
      data: any;
    },
  ) {
    try {
      // Thử gửi real push notification trước
      const pushSuccess = await this.sendRealPushNotification(
        expoPushToken,
        notification,
      );

      if (pushSuccess) {
        console.log("✅ Real push notification sent successfully");
        return true;
      }

      // Fallback to local notification
      console.log("🔄 Falling back to local notification");
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: undefined,
        },
        trigger: null, // Show immediately
      });

      console.log("✅ Local notification sent as fallback");
      return true;
    } catch (error) {
      console.error("❌ Error sending notification with fallback:", error);
      return false;
    }
  }

  /**
   * Test push notification
   */
  async testPushNotification(expoPushToken: string) {
    return await this.sendRealPushNotification(expoPushToken, {
      title: "🧪 Test Notification",
      body: "This is a test push notification from SaiGon Match!",
      data: { test: true, timestamp: new Date().toISOString() },
      priority: "high",
    });
  }
}

export default new ExpoPushNotificationService();
