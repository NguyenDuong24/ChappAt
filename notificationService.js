import * as Notifications from 'expo-notifications';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig'; // Đảm bảo đã cấu hình Firestore

const messaging = getMessaging();

// Đăng ký quyền nhận thông báo
export async function registerForPushNotificationsAsync() {
  let token;
  
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    if (newStatus !== 'granted') {
      alert('Bạn cần cấp quyền để nhận thông báo');
      return;
    }
  }

  token = await getToken(messaging, {
    vapidKey: 'YOUR_VAPID_KEY' // Lấy từ Firebase Console
  });

  return token;
}

// Lắng nghe tin nhắn mới từ Firestore
export function listenForNewMessages(userId) {
  const messagesQuery = query(
    collection(db, 'messages'),
    where('receiverId', '==', userId),
    where('status', '==', 'unread') // Chỉ lắng nghe tin nhắn chưa đọc
  );

  return onSnapshot(messagesQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const messageData = change.doc.data();
        
        Notifications.scheduleNotificationAsync({
          content: {
            title: 'Tin nhắn mới 📩',
            body: `${messageData.senderName}: ${messageData.text}`,
            data: { chatId: messageData.chatId },
          },
          trigger: null,
        });
      }
    });
  });
}
