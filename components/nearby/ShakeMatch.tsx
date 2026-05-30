/**
 * ShakeMatch Screen Component
 * The interactive screen where users shake, hold, or tap to send a signal.
 * Shows animation and status during the matching process.
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NearbyEncounter, SignalType } from '@/types/nearby';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  encounter: NearbyEncounter | null;
  isShaking: boolean;
  shakeProgress: number;
  holdProgress: number;
  signalSent: boolean;
  isWaiting: boolean;
  matched: boolean;
  signalType: SignalType;
  error: string | null;
  onSendTapSignal: () => void;
  onStartHold: () => void;
  onCancelHold: () => void;
  onStartShake: () => void;
  onDismiss: () => void;
  onViewMatch?: () => void;
}

export function ShakeMatch({
  encounter,
  isShaking,
  shakeProgress,
  holdProgress,
  signalSent,
  isWaiting,
  matched,
  signalType,
  error,
  onSendTapSignal,
  onStartHold,
  onCancelHold,
  onStartShake,
  onDismiss,
  onViewMatch,
}: Props) {
  // Animations
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const waitingDots = useRef(new Animated.Value(0)).current;
  const waitingLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Shake ripple effect
  useEffect(() => {
    if (isShaking) {
      rippleAnim.setValue(0);
      Animated.timing(rippleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [isShaking]);

  // Phone shake animation
  useEffect(() => {
    if (shakeProgress > 0 && signalType === 'shake') {
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 50,
          easing: Easing.bounce,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: -1,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [shakeProgress]);

  // Waiting dots animation
  useEffect(() => {
    if (isWaiting) {
      waitingLoopRef.current?.stop();
      waitingLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(waitingDots, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(waitingDots, {
            toValue: 0,
            duration: 1,
            useNativeDriver: true,
          }),
        ]),
      );
      waitingLoopRef.current.start();
      return () => {
        waitingLoopRef.current?.stop();
        waitingLoopRef.current = null;
        waitingDots.setValue(0);
      };
    }
    waitingLoopRef.current?.stop();
    waitingLoopRef.current = null;
    waitingDots.setValue(0);
  }, [isWaiting, waitingDots]);

  const rotateInterpolation = rotateAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-5deg', '5deg'],
  });

  const rippleScale = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });

  const rippleOpacity = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0],
  });

  // ─── Matched State ────────────────────────────────────────
  if (matched) {
    return (
      <View style={styles.container}>
        <View style={styles.matchedCard}>
          <Text style={styles.matchedEmoji}>🎉</Text>
          <Text style={styles.matchedTitle}>Bạn có một Chạm Sóng!</Text>
          <Text style={styles.matchedSubtitle}>
            Hai bạn vừa cùng gửi tín hiệu cho nhau.{'\n'}
            Hãy xem profile và bắt đầu trò chuyện!
          </Text>

          <TouchableOpacity
            style={styles.matchActionButton}
            onPress={onViewMatch}
          >
            <Ionicons name="chatbubbles-outline" size={20} color="#fff" />
            <Text style={styles.matchActionText}>Xem kết nối</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.matchLaterButton} onPress={onDismiss}>
            <Text style={styles.matchLaterText}>Để sau</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Waiting State ────────────────────────────────────────
  if (isWaiting) {
    return (
      <View style={styles.container}>
        <View style={styles.waitingCard}>
          <Animated.View
            style={[styles.waitingIcon, { opacity: waitingDots.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.5, 1, 0.5],
            }) }]}
          >
            <Ionicons name="pulse-outline" size={48} color="#8B5CF6" />
          </Animated.View>

          <Text style={styles.waitingTitle}>Đang tìm tín hiệu...</Text>
          <Text style={styles.waitingSubtitle}>
            Đang chờ tín hiệu phản hồi từ người ở gần bạn.{'\n'}
            Nếu họ cũng gửi tín hiệu, hai bạn sẽ được kết nối!
          </Text>

          <View style={styles.waitingDots}>
            {[0, 1, 2].map((i) => (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    opacity: waitingDots.interpolate({
                      inputRange: [i * 0.33, i * 0.33 + 0.33],
                      outputRange: [0.3, 1],
                      extrapolate: 'clamp',
                    }),
                  },
                ]}
              />
            ))}
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="information-circle-outline" size={16} color="#F59E0B" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.cancelButton} onPress={onDismiss}>
            <Text style={styles.cancelText}>Thoát</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Interactive State (Shake / Hold / Tap) ───────────────
  return (
    <View style={styles.container}>
      {/* Background ripple on shake */}
      {isShaking && (
        <Animated.View
          style={[
            styles.ripple,
            {
              transform: [{ scale: rippleScale }],
              opacity: rippleOpacity,
            },
          ]}
        />
      )}

      <View style={styles.card}>
        {/* Phone icon with shake animation */}
        <Animated.View
          style={[styles.phoneIcon, { transform: [{ rotate: rotateInterpolation }] }]}
        >
          <Ionicons name="phone-portrait-outline" size={64} color="#8B5CF6" />
        </Animated.View>

        <Text style={styles.title}>Chạm Sóng</Text>
        <Text style={styles.subtitle}>
          Có ai đó đang ở gần bạn.{'\n'}
          Hãy gửi tín hiệu để kết nối!
        </Text>

        {/* Shake progress bar */}
        {signalType === 'shake' && shakeProgress > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${shakeProgress * 100}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {shakeProgress >= 1 ? '✨ Đã nhận rung!' : '🫨 Đang rung...'}
            </Text>
          </View>
        )}

        {/* Hold progress bar */}
        {signalType === 'hold' && holdProgress > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  styles.holdFill,
                  { width: `${holdProgress * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {holdProgress >= 1
                ? '✨ Đã gửi!'
                : `Giữ nút... ${Math.round(holdProgress * 100)}%`}
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          {/* Tap signal button */}
          <TouchableOpacity
            style={styles.tapButton}
            onPress={onSendTapSignal}
            activeOpacity={0.7}
          >
            <Ionicons name="flash-outline" size={24} color="#fff" />
            <Text style={styles.tapText}>Gửi tín hiệu</Text>
          </TouchableOpacity>

          {/* Hold button */}
          <TouchableOpacity
            style={styles.holdButton}
            onPressIn={onStartHold}
            onPressOut={onCancelHold}
            activeOpacity={0.7}
          >
            <View style={styles.holdInner}>
              <Ionicons name="finger-print-outline" size={22} color="#8B5CF6" />
              <Text style={styles.holdText}>Giữ 3s</Text>
            </View>
            {holdProgress > 0 && (
              <View
                style={[
                  styles.holdOverlay,
                  { width: `${holdProgress * 100}%` },
                ]}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Shake hint */}
        <TouchableOpacity style={styles.shakeHint} onPress={onStartShake}>
          <Ionicons name="phone-portrait-outline" size={18} color="#6B7280" />
          <Text style={styles.shakeHintText}>
            Hoặc rung điện thoại để gửi tín hiệu
          </Text>
        </TouchableOpacity>

        {/* Privacy reminder */}
        <View style={styles.privacyRow}>
          <Ionicons name="lock-closed-outline" size={12} color="#4B5563" />
          <Text style={styles.privacyText}>
            Danh tính chỉ được tiết lộ khi cả hai cùng gửi tín hiệu
          </Text>
        </View>

        <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
          <Text style={styles.closeText}>Đóng</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: 20,
  },
  ripple: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  card: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  phoneIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 24,
    alignItems: 'center',
  },
  progressBar: {
    width: '80%',
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 3,
  },
  holdFill: {
    backgroundColor: '#EC4899',
  },
  progressText: {
    fontSize: 14,
    color: '#A78BFA',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    width: '100%',
    justifyContent: 'center',
  },
  tapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  tapText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  holdButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  holdInner: {
    alignItems: 'center',
    zIndex: 1,
  },
  holdText: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '600',
    marginTop: 2,
  },
  holdOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  shakeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  shakeHintText: {
    fontSize: 13,
    color: '#6B7280',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 24,
  },
  privacyText: {
    fontSize: 11,
    color: '#4B5563',
  },
  closeButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  closeText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },

  // ─── Waiting state ───────────────────────────────────────
  waitingCard: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  waitingIcon: {
    marginBottom: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  waitingSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  waitingDots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8B5CF6',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#F59E0B',
    flex: 1,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
  },
  cancelText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
  },

  // ─── Matched state ───────────────────────────────────────
  matchedCard: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1F2937',
    borderRadius: 24,
    padding: 32,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  matchedEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  matchedTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F9FAFB',
    marginBottom: 8,
    textAlign: 'center',
  },
  matchedSubtitle: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  matchActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    marginBottom: 12,
  },
  matchActionText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  matchLaterButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  matchLaterText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
});
