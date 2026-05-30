/**
 * NearbyAlert Component
 * Bottom sheet / alert shown when someone is detected nearby.
 * Provides CTA to send a signal (shake/hold/tap).
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NearbyEncounter, DistanceBucket } from '@/types/nearby';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  encounter: NearbyEncounter | null;
  onSendSignal: () => void;
  onDismiss: () => void;
  onOpenSettings?: () => void;
}

const DISTANCE_LABELS: Record<DistanceBucket, string> = {
  '0-10m': 'ráº¥t gáº§n báº¡n',
  '10-30m': 'gáº§n báº¡n',
  '30-50m': 'trong khu vá»±c cá»§a báº¡n',
};

const WAVE_EMOJIS = ['ðŸ‘‹', 'ðŸŒŠ', 'ðŸ’«', 'âœ¨', 'ðŸ”®'];

export function NearbyAlert({
  visible,
  encounter,
  onSendSignal,
  onDismiss,
  onOpenSettings,
}: Props) {
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const pulseLoopRef = React.useRef<Animated.CompositeAnimation | null>(null);

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();

      // Pulse animation for the signal button
      pulseLoopRef.current?.stop();
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoopRef.current.start();

      return () => {
        pulseLoopRef.current?.stop();
        pulseLoopRef.current = null;
        pulseAnim.setValue(1);
      };
    } else {
      pulseLoopRef.current?.stop();
      pulseLoopRef.current = null;
      pulseAnim.setValue(1);
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const randomEmoji = React.useMemo(() => WAVE_EMOJIS[Math.floor(Math.random() * WAVE_EMOJIS.length)], [encounter?.id]);

  if (!encounter) return null;

  const distanceLabel = DISTANCE_LABELS[encounter.distanceBucket] ?? 'gáº§n báº¡n';
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onDismiss}
        />

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.emoji}>{randomEmoji}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>CÃ³ ai Ä‘Ã³ thÃº vá»‹ Ä‘ang á»Ÿ gáº§n báº¡n</Text>
          <Text style={styles.subtitle}>
            Má»™t ngÆ°á»i dÃ¹ng khÃ¡c Ä‘ang {distanceLabel}.{'\n'}
            Gá»­i tÃ­n hiá»‡u náº¿u báº¡n muá»‘n káº¿t ná»‘i!
          </Text>

          {/* Privacy note */}
          <View style={styles.privacyNote}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#9CA3AF" />
            <Text style={styles.privacyText}>
              Danh tÃ­nh sáº½ chá»‰ hiá»ƒn thá»‹ khi cáº£ hai cÃ¹ng gá»­i tÃ­n hiá»‡u
            </Text>
          </View>

          {/* Signal button */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={styles.signalButton}
              onPress={onSendSignal}
              activeOpacity={0.8}
            >
              <Ionicons name="radio-outline" size={22} color="#fff" />
              <Text style={styles.signalText}>Gá»­i tÃ­n hiá»‡u</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Alternative: Shake */}
          <Text style={styles.orText}>hoáº·c</Text>
          <TouchableOpacity style={styles.shakeHint} onPress={onSendSignal}>
            <Ionicons name="phone-portrait-outline" size={20} color="#8B5CF6" />
            <Text style={styles.shakeHintText}>
              Rung Ä‘iá»‡n thoáº¡i Ä‘á»ƒ káº¿t ná»‘i
            </Text>
          </TouchableOpacity>

          {/* Dismiss */}
          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
            <Text style={styles.dismissText}>Äá»ƒ sau</Text>
          </TouchableOpacity>

          {/* Settings link */}
          {onOpenSettings && (
            <TouchableOpacity
              style={styles.settingsLink}
              onPress={onOpenSettings}
            >
              <Ionicons name="settings-outline" size={14} color="#9CA3AF" />
              <Text style={styles.settingsLinkText}>
                Quáº£n lÃ½ cÃ i Ä‘áº·t Gáº·p Gáº§n ÄÃ¢y
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    alignItems: 'center',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#4B5563',
    borderRadius: 2,
    marginBottom: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emoji: {
    fontSize: 36,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 20,
  },
  privacyText: {
    fontSize: 12,
    color: '#9CA3AF',
    flex: 1,
  },
  signalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  signalText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  orText: {
    fontSize: 13,
    color: '#6B7280',
    marginVertical: 10,
  },
  shakeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  shakeHintText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  dismissButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 30,
  },
  dismissText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  settingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  settingsLinkText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
