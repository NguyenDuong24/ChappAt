/**
 * useShakeToMatch Hook
 * Detects shake gesture and manages the signal/match flow.
 * Uses expo-sensors accelerometer for shake detection.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { sendSignal, checkMutualSignal, createMatch } from '@/services/nearbyService';
import { SignalType, NearbyEncounter } from '@/types/nearby';

// ─── Shake Detection Config ───────────────────────────────────
const SHAKE_THRESHOLD = 1.8; // G-force threshold
const SHAKE_INTERVAL_MS = 200; // Min time between shakes
const SHAKE_REQUIRED_COUNT = 2; // Number of shakes to trigger
const SHAKE_WINDOW_MS = 1000; // Time window to count shakes

// ─── Hold Config ──────────────────────────────────────────────
const HOLD_DURATION_MS = 3000; // 3 seconds hold

interface ShakeMatchState {
  /** Whether shake detection is active */
  isWatching: boolean;
  /** Whether user is currently shaking */
  isShaking: boolean;
  /** Shake progress (0-1) for animation */
  shakeProgress: number;
  /** Whether signal was sent */
  signalSent: boolean;
  /** Whether we're waiting for other user's signal */
  isWaiting: boolean;
  /** Whether match was found */
  matched: boolean;
  /** Hold button progress (0-1) */
  holdProgress: number;
  /** Current signal type being used */
  signalType: SignalType;
  /** Error message */
  error: string | null;
}

export function useShakeToMatch(
  userId: string | null,
  encounter: NearbyEncounter | null,
) {
  const [state, setState] = useState<ShakeMatchState>({
    isWatching: false,
    isShaking: false,
    shakeProgress: 0,
    signalSent: false,
    isWaiting: false,
    matched: false,
    holdProgress: 0,
    signalType: 'shake',
    error: null,
  });

  const shakeCountRef = useRef(0);
  const lastShakeRef = useRef(0);
  const shakeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holdStartRef = useRef<number>(0);
  const subscriptionRef = useRef<any>(null);

  // ─── Start/Stop watching ───────────────────────────────────

  const startWatching = useCallback(
    (type: SignalType = 'shake') => {
      if (!userId || !encounter) return;

      setState((s) => ({
        ...s,
        isWatching: true,
        signalSent: false,
        isWaiting: false,
        matched: false,
        signalType: type,
        error: null,
      }));

      if (type === 'shake') {
        startShakeDetection();
      }
    },
    [userId, encounter],
  );

  const stopWatching = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    if (shakeTimerRef.current) {
      clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = null;
    }
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    shakeCountRef.current = 0;

    setState((s) => ({
      ...s,
      isWatching: false,
      isShaking: false,
      holdProgress: 0,
    }));
  }, []);

  // ─── Shake Detection ──────────────────────────────────────

  const startShakeDetection = () => {
    Accelerometer.setUpdateInterval(100); // 100ms updates

    subscriptionRef.current = Accelerometer.addListener((data) => {
      const { x, y, z } = data;
      const acceleration = Math.sqrt(x * x + y * y + z * z);

      if (acceleration > SHAKE_THRESHOLD) {
        const now = Date.now();

        if (now - lastShakeRef.current > SHAKE_INTERVAL_MS) {
          shakeCountRef.current++;
          lastShakeRef.current = now;

          // Haptic feedback
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

          // Update progress based on shake count
          setState((s) => ({
            ...s,
            isShaking: true,
            shakeProgress: Math.min(shakeCountRef.current / SHAKE_REQUIRED_COUNT, 1),
          }));

          // Check if enough shakes within window
          if (shakeCountRef.current >= SHAKE_REQUIRED_COUNT) {
            handleShakeTriggered();
          }

          // Reset shake animation after a short delay
          setTimeout(() => {
            setState((s) => ({ ...s, isShaking: false }));
          }, 400);
        }
      }
    });

    // Reset shake count if window expires
    shakeTimerRef.current = setInterval(() => {
      const now = Date.now();
      if (now - lastShakeRef.current > SHAKE_WINDOW_MS) {
        shakeCountRef.current = 0;
        setState((s) => ({ ...s, shakeProgress: 0 }));
      }
    }, 500);
  };

  const handleShakeTriggered = async () => {
    if (!userId || !encounter || state.signalSent) return;

    stopWatching();
    await sendMySignal('shake');
  };

  // ─── Hold Button ──────────────────────────────────────────

  const startHold = useCallback(() => {
    if (!userId || !encounter) return;

    holdStartRef.current = Date.now();
    setState((s) => ({ ...s, isWatching: true, signalType: 'hold' }));

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min(elapsed / HOLD_DURATION_MS, 1);

      setState((s) => ({ ...s, holdProgress: progress }));

      if (progress >= 1) {
        // Hold complete
        if (holdTimerRef.current) {
          clearInterval(holdTimerRef.current);
          holdTimerRef.current = null;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        sendMySignal('hold');
      }
    }, 50);
  }, [userId, encounter]);

  const cancelHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setState((s) => ({ ...s, holdProgress: 0, isWatching: false }));
  }, []);

  // ─── Tap Signal ───────────────────────────────────────────

  const sendTapSignal = useCallback(async () => {
    if (!userId || !encounter) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    await sendMySignal('tap');
  }, [userId, encounter]);

  // ─── Common signal logic ──────────────────────────────────

  const sendMySignal = async (type: SignalType) => {
    if (!userId || !encounter) return;

    try {
      setState((s) => ({
        ...s,
        isWatching: false,
        isWaiting: true,
        error: null,
      }));

      // Send my signal
      await sendSignal(encounter.id, userId, type);
      setState((s) => ({ ...s, signalSent: true }));

      // Check if other user already sent signal
      const mutual = await checkMutualSignal(encounter.id, userId);

      if (mutual) {
        // Create match
        const source = type === 'shake' ? 'nearby_shake' : 'nearby_tap';
        await createMatch(
          encounter.userAId,
          encounter.userBId,
          encounter.id,
          source,
        );

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setState((s) => ({
          ...s,
          isWaiting: false,
          matched: true,
        }));
      } else {
        // Wait for other user — poll for a bit
        let attempts = 0;
        const pollInterval = setInterval(async () => {
          attempts++;
          const stillMutual = await checkMutualSignal(encounter.id, userId);

          if (stillMutual) {
            clearInterval(pollInterval);
            const source = type === 'shake' ? 'nearby_shake' : 'nearby_tap';
            await createMatch(
              encounter.userAId,
              encounter.userBId,
              encounter.id,
              source,
            );

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            setState((s) => ({
              ...s,
              isWaiting: false,
              matched: true,
            }));
          } else if (attempts >= 24) {
            // 2 minutes of polling (24 * 5s)
            clearInterval(pollInterval);
            setState((s) => ({
              ...s,
              isWaiting: false,
              error: 'Chưa có tín hiệu từ người kia. Đừng lo, các bạn vẫn từng ở gần nhau!',
            }));
          }
        }, 5000);
      }
    } catch (err: any) {
      setState((s) => ({
        ...s,
        isWaiting: false,
        error: err.message || 'Có lỗi xảy ra. Vui lòng thử lại.',
      }));
    }
  };

  // ─── Reset ────────────────────────────────────────────────

  const reset = useCallback(() => {
    stopWatching();
    setState({
      isWatching: false,
      isShaking: false,
      shakeProgress: 0,
      signalSent: false,
      isWaiting: false,
      matched: false,
      holdProgress: 0,
      signalType: 'shake',
      error: null,
    });
  }, [stopWatching]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) subscriptionRef.current.remove();
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    };
  }, []);

  return {
    ...state,
    startWatching,
    stopWatching,
    startHold,
    cancelHold,
    sendTapSignal,
    reset,
  };
}
