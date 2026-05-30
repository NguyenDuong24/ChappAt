/**
 * Background Location Tracking Task
 * Registered with expo-task-manager for continuous nearby detection
 * even when the app is in background.
 */
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import firestore from '@react-native-firebase/firestore';
import geohash from 'ngeohash';
import { LocationSnapshot } from '@/types/nearby';

export const BACKGROUND_LOCATION_TASK = 'NEARBY_BACKGROUND_LOCATION';

// geohash-4 helper (standard format, same as foreground hook)
function encodeGeohash4(lat: number, lng: number): string {
  try {
    return geohash.encode(lat, lng, 4);
  } catch {
    // Fallback if geohash-common fails
    const latBucket = Math.floor((lat + 90) / 0.7);
    const lngBucket = Math.floor((lng + 180) / 0.7);
    return `${latBucket}|${lngBucket}`.slice(0, 4);
  }
}

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error.message);
    return;
  }

  try {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (!locations || locations.length === 0) return;

    const latest = locations[locations.length - 1];
    const { latitude, longitude } = latest.coords;

    // Get current user from secure store or auth
    // Since we can't access React context here, we store userId in task data
    const taskData = (data as any).extra ?? {};
    const userId = taskData.userId;

    if (!userId) {
      console.warn('No userId in background task data');
      return;
    }

    // Check if user has nearby enabled
    const settingsDoc = await firestore()
      .collection('nearby_settings')
      .doc(userId)
      .get();

    if (!settingsDoc.exists) return;
    const settings = settingsDoc.data();
    if (!settings?.enabled || settings?.visibility === 'hidden') return;

    // Update location snapshot
    const snapshot: LocationSnapshot = {
      userId,
      latitude,
      longitude,
      geohash4: encodeGeohash4(latitude, longitude),
      timestamp: Date.now(),
      source: 'background',
    };

    await firestore()
      .collection('location_snapshots')
      .doc(userId)
      .set({
        ...snapshot,
        serverTimestamp: firestore.FieldValue.serverTimestamp(),
      });

    // Find nearby users in same geohash bucket
    const nearbySnap = await firestore()
      .collection('location_snapshots')
      .where('geohash4', '==', snapshot.geohash4)
      .where('userId', '!=', userId)
      .get();

    const now = Date.now();
    const LOCATION_TTL = 5 * 60 * 1000;

    for (const doc of nearbySnap.docs) {
      const otherLoc = doc.data() as LocationSnapshot;

      // Skip stale locations
      if (now - otherLoc.timestamp > LOCATION_TTL) continue;

      const otherId = otherLoc.userId;

      // Check block
      const blockSnap = await firestore()
        .collection('user_blocks')
        .where('blockerId', '==', userId)
        .where('blockedId', '==', otherId)
        .limit(1)
        .get();

      if (!blockSnap.empty) continue;

      const reverseBlock = await firestore()
        .collection('user_blocks')
        .where('blockerId', '==', otherId)
        .where('blockedId', '==', userId)
        .limit(1)
        .get();

      if (!reverseBlock.empty) continue;

      // Check for existing active encounter
      const existingEncounter = await firestore()
        .collection('nearby_encounters')
        .where('userAId', 'in', [userId, otherId])
        .where('userBId', 'in', [userId, otherId])
        .where('status', 'in', ['detected', 'notified_a', 'notified_b', 'notified_both'])
        .limit(1)
        .get();

      if (!existingEncounter.empty) {
        // Update existing encounter
        await existingEncounter.docs[0].ref.update({
          lastSeenAt: firestore.FieldValue.serverTimestamp(),
          proximityCount: firestore.FieldValue.increment(1),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      } else {
        // Calculate approximate distance
        const distance = haversineDistance(
          latitude,
          longitude,
          otherLoc.latitude,
          otherLoc.longitude,
        );

        if (distance <= (settings?.detectionRadius ?? 50)) {
          // Create new encounter
          const distBucket =
            distance <= 10 ? '0-10m' : distance <= 30 ? '10-30m' : '30-50m';

          await firestore()
            .collection('nearby_encounters')
            .add({
              userAId: userId,
              userBId: otherId,
              firstSeenAt: firestore.FieldValue.serverTimestamp(),
              lastSeenAt: firestore.FieldValue.serverTimestamp(),
              distanceBucket: distBucket,
              geohash4: snapshot.geohash4,
              status: 'detected',
              proximityCount: 1,
              createdAt: firestore.FieldValue.serverTimestamp(),
              updatedAt: firestore.FieldValue.serverTimestamp(),
            });
        }
      }
    }
  } catch (err) {
    console.error('Background location task processing error:', err);
  }
});

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── Registration helper ──────────────────────────────────────

export async function registerBackgroundLocationTask(userId: string) {
  const foreground = await Location.getForegroundPermissionsAsync();
  if (foreground.status !== 'granted') {
    console.warn('Foreground location permission is required before background tracking');
    return false;
  }

  let background: Location.PermissionResponse;
  try {
    background = await Location.getBackgroundPermissionsAsync();
  } catch (error: any) {
    console.warn(
      'Background location permission is unavailable in this build; add ACCESS_BACKGROUND_LOCATION and rebuild the native app',
      error?.message || error,
    );
    return false;
  }

  if (background.status !== 'granted') {
    console.warn('Background location permission not granted; foreground detection still works');
    return false;
  }

  // Check if already registered
  const isRegistered = await TaskManager.isTaskRegisteredAsync(
    BACKGROUND_LOCATION_TASK,
  );

  if (!isRegistered) {
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 60000,
      distanceInterval: 50,
      deferredUpdatesInterval: 60000,
      deferredUpdatesDistance: 50,
      foregroundService: {
        notificationTitle: 'Chạm Sóng',
        notificationBody: 'Đang tìm kiếm người ở gần bạn...',
        notificationColor: '#8B5CF6',
      },
      // Pass userId as extra data
      pausesUpdatesAutomatically: true,
      activityType: Location.ActivityType.Other,
    });
  }

  return true;
}

export async function unregisterBackgroundLocationTask() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(
    BACKGROUND_LOCATION_TASK,
  );

  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}
