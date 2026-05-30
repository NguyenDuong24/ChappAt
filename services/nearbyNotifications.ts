/**
 * Nearby Notification Handler
 * Handles incoming push notifications for the Chạm Sóng feature.
 * Should be registered in the app's root layout.
 */
import * as Notifications from 'expo-notifications';
import { checkMutualSignal, createMatch } from '@/services/nearbyService';

// ─── Configure notification handler ───────────────────────────

export function configureNearbyNotifications(onMatchFound?: (matchId: string) => void) {
  // Handle notifications received while app is in foreground
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      const data = notification.request.content.data;
      if (data?.type === 'nearby_alert') {
        // App is in foreground - the useNearbyDetection hook handles this
        // We can show a custom in-app alert here if needed
        console.log('Nearby alert received in foreground:', data.encounterId);
      }

      if (data?.type === 'nearby_match') {
        // Match was created (push from backend or other user's action)
        onMatchFound?.(data.matchId as string);
      }
    },
  );

  // Handle notification taps (when user taps notification to open app)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;

      if (data?.type === 'nearby_alert') {
        // User tapped the nearby alert notification
        // Navigate to nearby-match screen with encounterId
        const encounterId = data.encounterId as string;
        if (encounterId) {
          // Navigation will be handled by the app's linking config
          console.log('Navigating to nearby match with encounter:', encounterId);
        }
      }

      if (data?.type === 'nearby_match') {
        // User tapped the match notification
        const matchId = data.matchId as string;
        if (matchId) {
          onMatchFound?.(matchId);
        }
      }
    },
  );

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}

// ─── Send match notification ──────────────────────────────────

export async function sendMatchNotification(
  userId: string,
  matchId: string,
  otherUserName?: string,
) {
  try {
    // This would typically be done server-side via FCM
    // But for MVP, we can trigger local notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '✨ Bạn có một Chạm Sóng!',
        body: otherUserName
          ? `Bạn và ${otherUserName} vừa cùng gửi tín hiệu cho nhau!`
          : 'Hai bạn vừa cùng gửi tín hiệu cho nhau!',
        data: { type: 'nearby_match', matchId },
        sound: 'notification.mp3',
      },
      trigger: null, // immediate
    });
  } catch (err) {
    console.warn('Failed to send match notification:', err);
  }
}

// ─── Notification channel setup (Android) ─────────────────────

export async function setupNearbyNotificationChannel() {
  await Notifications.setNotificationChannelAsync('nearby_alerts', {
    name: 'Chạm Sóng',
    description: 'Thông báo khi có người ở gần bạn',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'notification.mp3',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#8B5CF6',
    enableVibrate: true,
  });
}
