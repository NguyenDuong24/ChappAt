import messaging from '@react-native-firebase/messaging';
import { Alert } from 'react-native';

// Yêu cầu quyền nhận thông báo
export async function requestUserPermission() {
    const authStatus = await messaging().requestPermission();
    const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
        console.log('Quyền thông báo được cấp:', authStatus);
        getFCMToken();
    }
}

// Lấy FCM Token
async function getFCMToken() {
    const token = await messaging().getToken();
    console.log('FCM Token:', token);
    return token;
}

// Xử lý thông báo khi ứng dụng mở
export function setupNotificationListeners() {
    // Khi nhận thông báo trong foreground
    messaging().onMessage(async remoteMessage => {
        Alert.alert('Thông báo mới!', remoteMessage.notification?.body);
    });

    // Khi nhấn vào thông báo và mở ứng dụng
    messaging().onNotificationOpenedApp(remoteMessage => {
        console.log('Người dùng nhấn vào thông báo:', remoteMessage);
    });

    // Khi app đóng hoàn toàn và người dùng nhấn vào thông báo để mở app
    messaging().getInitialNotification().then(remoteMessage => {
        if (remoteMessage) {
            console.log('Ứng dụng mở từ thông báo:', remoteMessage);
        }
    });
}
