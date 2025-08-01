import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

/**
 * Hook để xử lý notifications
 * Bao gồm việc lắng nghe notification khi nhận và khi người dùng tương tác
 */
export const useNotificationHandlers = () => {
  const router = useRouter();

  useEffect(() => {
    // Lắng nghe thông báo khi nhận (foreground)
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Received notification:', notification);
      // Có thể thêm logic xử lý notification ở đây
    });

    // Lắng nghe khi người dùng nhấn vào thông báo
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const screen = response?.notification?.request?.content?.data?.screen;
      if (screen) {
        router.push(screen);
      }
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, [router]);
};

/**
 * Cấu hình notification handler mặc định
 */
export const setupNotificationHandler = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
};
