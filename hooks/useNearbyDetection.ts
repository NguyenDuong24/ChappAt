/**
 * useNearbyDetection Hook
 * Manages real-time nearby user detection.
 * - Reports user location periodically
 * - Listens for nearby encounters
 * - Manages encounter flow (detect → notify → signal → match)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { AppState, AppStateStatus, Platform } from 'react-native';
import {
  updateLocation,
  findNearbyLocationSnapshots,
  findActiveEncounter,
  createEncounter,
  updateEncounter,
  expireOldEncounters,
  isUserBlocked,
  incrementNotificationCount,
  getTodayNotificationCount,
  getNearbySettings,
} from '@/services/nearbyService';
import {
  LocationSnapshot,
  NearbyEncounter,
  CheckNearbyResponse,
} from '@/types/nearby';
import geohash from 'ngeohash';

const LOCATION_TASK = 'NEARBY_LOCATION_TRACKING';
const NEARBY_CHECK_INTERVAL = 60_000;
const LOCATION_UPDATE_INTERVAL = 45_000;

// ─── Geohash helpers ───────────────────────────────────────────
function computeGeohash4(lat: number, lng: number): string {
  try {
    return geohash.encode(lat, lng, 4);
  } catch {
    // Fallback if geohash-common is unavailable
    const latBucket = Math.floor((lat + 90) / 0.7);
    const lngBucket = Math.floor((lng + 180) / 0.7);
    return `${latBucket}|${lngBucket}`.slice(0, 4);
  }
}

function decodeApproxGeohash4(gh4: string): { latitude: number; longitude: number } {
  try {
    return geohash.decode(gh4);
  } catch {
    // Fallback: estimate from our custom format
    const parts = gh4.split('|');
    if (parts.length === 2) {
      const latBucket = parseInt(parts[0], 10) || 0;
      const lngBucket = parseInt(parts[1], 10) || 0;
      return {
        latitude: latBucket * 0.7 + 0.35 - 90,
        longitude: lngBucket * 0.7 + 0.35 - 180,
      };
    }
    return { latitude: 0, longitude: 0 };
  }
}

function getNeighborGeohash4List(gh4: string): string[] {
  try {
    return [gh4, ...geohash.neighbors(gh4)].filter(Boolean);
  } catch {
    return [gh4];
  }
}

interface NearbyDetectionState {
  /** Whether detection is active */
  isActive: boolean;
  /** Current active encounter (someone nearby now) */
  activeEncounter: NearbyEncounter | null;
  /** Whether we're checking for nearby users */
  isChecking: boolean;
  /** Whether the user has sent a signal in the current encounter */
  hasSentSignal: boolean;
  /** Whether the other user has sent a signal */
  otherSentSignal: boolean;
  /** Whether a match was just created */
  justMatched: boolean;
  /** Error message if any */
  error: string | null;
}

export function useNearbyDetection(userId: string | null) {
  const [state, setState] = useState<NearbyDetectionState>({
    isActive: false,
    activeEncounter: null,
    isChecking: false,
    hasSentSignal: false,
    otherSentSignal: false,
    justMatched: false,
    error: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const locationUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>('active');
  const runningCheckRef = useRef(false);
  const lastLocationRef = useRef<LocationSnapshot | null>(null);
  const startingRef = useRef(false);

  // Start detection
  const startDetection = useCallback(async () => {
    if (!userId) return;
    if (startingRef.current || intervalRef.current || locationUpdateRef.current) return;
    startingRef.current = true;

    try {
      setState((s) => ({ ...s, isChecking: true, error: null }));

      // Check settings
      const settings = await getNearbySettings(userId);
      if (!settings.enabled) {
        setState((s) => ({ ...s, isChecking: false, isActive: false }));
        return;
      }

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setState((s) => ({
          ...s,
          isChecking: false,
          error: 'Cần quyền vị trí để phát hiện người ở gần.',
        }));
        return;
      }

      setState((s) => ({ ...s, isActive: true }));

      // Start periodic checks
      performNearbyCheck(userId, settings.detectionRadius).catch(console.error);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        performNearbyCheck(userId, settings.detectionRadius).catch(console.error);
      }, NEARBY_CHECK_INTERVAL);

      // Start periodic location updates
      updateMyLocation(userId).catch(console.error);
      if (locationUpdateRef.current) clearInterval(locationUpdateRef.current);
      locationUpdateRef.current = setInterval(() => {
        updateMyLocation(userId).catch(console.error);
      }, LOCATION_UPDATE_INTERVAL);

      setState((s) => ({ ...s, isChecking: false }));
    } catch (err: any) {
      setState((s) => ({
        ...s,
        isChecking: false,
        error: err.message || 'Không thể khởi động phát hiện.',
      }));
    } finally {
      startingRef.current = false;
    }
  }, [userId]);

  const stopDetection = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (locationUpdateRef.current) {
      clearInterval(locationUpdateRef.current);
      locationUpdateRef.current = null;
    }
    startingRef.current = false;
    setState((s) => ({
      ...s,
      isActive: false,
      activeEncounter: null,
      hasSentSignal: false,
      otherSentSignal: false,
    }));
  }, []);

  // ─── Core logic ────────────────────────────────────────────

  const updateMyLocation = async (uid: string) => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const snapshot: LocationSnapshot = {
        userId: uid,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        geohash4: computeGeohash4(loc.coords.latitude, loc.coords.longitude),
        timestamp: Date.now(),
        source: 'foreground',
      };

      lastLocationRef.current = snapshot;
      await updateLocation(snapshot);
    } catch (err) {
      // Silently fail - location may not be available
    }
  };

  const performNearbyCheck = async (uid: string, radius: number) => {
    if (runningCheckRef.current) return;
    runningCheckRef.current = true;

    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const gh4 = computeGeohash4(loc.coords.latitude, loc.coords.longitude);

      // Update my location
      const mySnapshot: LocationSnapshot = {
        userId: uid,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        geohash4: gh4,
        timestamp: Date.now(),
        source: 'foreground',
      };

      lastLocationRef.current = mySnapshot;
      await updateLocation(mySnapshot);

      const nearbySnapshots = await findNearbyLocationSnapshots(
        getNeighborGeohash4List(gh4),
        uid,
      );

      if (nearbySnapshots.length === 0) {
        // No one nearby: expire old encounters
        await expireOldEncounters(uid);
        if (state.activeEncounter) {
          setState((s) => ({ ...s, activeEncounter: null }));
        }
        return;
      }

      // Check each nearby user
      for (const otherLocation of nearbySnapshots) {
        const otherId = otherLocation.userId;
        const distance = calculateDistance(
          mySnapshot.latitude,
          mySnapshot.longitude,
          otherLocation.latitude,
          otherLocation.longitude,
        );
        if (distance > radius) continue;

        // Check block status
        const blocked = await isUserBlocked(uid, otherId);
        if (blocked) continue;

        // Check if there's already an active encounter
        const existing = await findActiveEncounter(uid, otherId);
        if (existing) {
          // Update encounter
          await updateEncounter(existing.id, {
            lastSeenAt: new Date(),
            proximityCount: (existing.proximityCount ?? 0) + 1,
          });

          setState((s) => ({ ...s, activeEncounter: { ...existing } }));
          continue;
        }

        // Only create encounter if within radius
        const encounter = await createEncounter(uid, otherId, distance, gh4);

        // Send notification if allowed
        await sendNearbyNotification(uid, encounter.id);

        setState((s) => ({
          ...s,
          activeEncounter: encounter,
          hasSentSignal: false,
          otherSentSignal: false,
        }));
      }
    } catch (err) {
      // Silently fail on individual checks
      console.warn('Nearby check failed:', err);
    } finally {
      runningCheckRef.current = false;
    }
  };

  const sendNearbyNotification = async (uid: string, encounterId: string) => {
    try {
      const settings = await getNearbySettings(uid);
      if (!settings.allowNotifications) return;

      const todayCount = await getTodayNotificationCount(uid);
      if (todayCount >= settings.dailyNotificationLimit) return;

      await incrementNotificationCount(uid);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌊 Có ai đó đang ở gần bạn',
          body: 'Mở app và gửi tín hiệu nếu bạn muốn kết nối!',
          data: { type: 'nearby_alert', encounterId },
        },
        trigger: null, // immediate
      });
    } catch (err) {
      console.warn('Failed to send nearby notification:', err);
    }
  };

  // ─── Signal/Match ──────────────────────────────────────────

  const markSignalSent = useCallback(() => {
    setState((s) => ({ ...s, hasSentSignal: true }));
  }, []);

  const markOtherSignal = useCallback(() => {
    setState((s) => ({ ...s, otherSentSignal: true }));
  }, []);

  const markMatched = useCallback(() => {
    setState((s) => ({
      ...s,
      justMatched: true,
      activeEncounter: null,
    }));
  }, []);

  const resetMatch = useCallback(() => {
    setState((s) => ({ ...s, justMatched: false }));
  }, []);

  const clearEncounter = useCallback(() => {
    setState((s) => ({
      ...s,
      activeEncounter: null,
      hasSentSignal: false,
      otherSentSignal: false,
    }));
  }, []);

  // ─── App state handling ────────────────────────────────────

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        // App came to foreground - restart detection
        if (userId) startDetection();
      }
      appStateRef.current = nextState;
    });

    return () => sub.remove();
  }, [userId, startDetection]);

  // ─── Cleanup ───────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (locationUpdateRef.current) clearInterval(locationUpdateRef.current);
    };
  }, []);

  return {
    ...state,
    startDetection,
    stopDetection,
    markSignalSent,
    markOtherSignal,
    markMatched,
    resetMatch,
    clearEncounter,
  };
}

// ─── Distance calculation (Haversine) ─────────────────────────
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth radius in meters
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
