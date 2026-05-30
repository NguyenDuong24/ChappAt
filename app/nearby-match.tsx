/**
 * NearbyMatchScreen
 * Main screen that ties together all Chạm Sóng components:
 * - Settings management
 * - Nearby detection
 * - Alert bottom sheet
 * - Shake/Tap/Hold interaction
 * - Match result
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/context/authContext';
import { useNearbySettings } from '@/hooks/useNearbySettings';
import { useNearbyDetection } from '@/hooks/useNearbyDetection';
import { useShakeToMatch } from '@/hooks/useShakeToMatch';
import { NearbySettingsView } from '@/components/nearby/NearbySettings';
import { NearbyAlert } from '@/components/nearby/NearbyAlert';
import { ShakeMatch } from '@/components/nearby/ShakeMatch';
import ProximityRadar from '@/components/nearby/ProximityRadar';
import {
  registerBackgroundLocationTask,
  unregisterBackgroundLocationTask,
} from '@/services/nearbyBackgroundTask';

type ScreenMode = 'settings' | 'idle' | 'alert' | 'interacting';

export default function NearbyMatchScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = user?.uid ?? null;

  const [screenMode, setScreenMode] = useState<ScreenMode>('idle');
  const [showShakeMatch, setShowShakeMatch] = useState(false);

  // Hooks
  const {
    settings,
    loading: settingsLoading,
    saving,
    toggleEnabled,
    toggleNotifications,
    setDetectionRadius,
    setVisibility,
    clearHistory,
    reload: reloadSettings,
  } = useNearbySettings(userId);

  const {
    isActive,
    activeEncounter,
    isChecking,
    justMatched,
    startDetection,
    stopDetection,
    clearEncounter,
    resetMatch,
  } = useNearbyDetection(userId);

  const shakeMatch = useShakeToMatch(userId, activeEncounter);

  // ─── Manage background task based on settings ──────────────

  useEffect(() => {
    if (!userId) return;

    if (settings?.enabled) {
      registerBackgroundLocationTask(userId).catch(console.error);
    } else {
      unregisterBackgroundLocationTask().catch(console.error);
    }

    return () => {
      // Don't unregister on unmount - user may want background tracking
    };
  }, [userId, settings?.enabled]);

  // ─── Start/stop detection based on settings ────────────────

  useEffect(() => {
    if (!userId || !settings) return;

    if (settings.enabled) {
      startDetection();
    } else {
      stopDetection();
    }

    return () => stopDetection();
  }, [userId, settings?.enabled, startDetection, stopDetection]);

  // ─── Show alert when encounter detected ────────────────────

  useEffect(() => {
    if (activeEncounter && !showShakeMatch) {
      setScreenMode('alert');
    } else if (!activeEncounter && screenMode === 'alert') {
      setScreenMode('idle');
    }
  }, [activeEncounter, showShakeMatch]);

  // ─── Hide shake match on matched ───────────────────────────

  useEffect(() => {
    if (justMatched) {
      setShowShakeMatch(false);
      setScreenMode('idle');
    }
  }, [justMatched]);

  // ─── Handlers ──────────────────────────────────────────────

  const handleSendSignal = useCallback(() => {
    setScreenMode('interacting');
    setShowShakeMatch(true);
    shakeMatch.startWatching('tap');
  }, [shakeMatch]);

  const handleStartShake = useCallback(() => {
    setScreenMode('interacting');
    setShowShakeMatch(true);
    shakeMatch.startWatching('shake');
  }, [shakeMatch]);

  const handleDismissAlert = useCallback(() => {
    setScreenMode('idle');
    clearEncounter();
  }, [clearEncounter]);

  const handleDismissShakeMatch = useCallback(() => {
    setShowShakeMatch(false);
    setScreenMode('idle');
    shakeMatch.reset();
  }, [shakeMatch]);

  const handleViewMatch = useCallback(() => {
    // Navigate to match details / chat
    // This would integrate with the existing navigation
    setShowShakeMatch(false);
    setScreenMode('idle');
    resetMatch();
    shakeMatch.reset();
  }, [resetMatch, shakeMatch]);

  const handleOpenSettings = useCallback(() => {
    setScreenMode('settings');
  }, []);

  const handleBackFromSettings = useCallback(() => {
    setScreenMode('idle');
    reloadSettings();
  }, [reloadSettings]);

  // ─── Settings view ─────────────────────────────────────────

  if (screenMode === 'settings') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor="#111827" />
        <View style={styles.navBar}>
          <NavButton
            icon="arrow-back"
            label="Quay lại"
            onPress={handleBackFromSettings}
          />
          <NavTitle text="Cài đặt Chạm Sóng" />
          <View style={styles.navPlaceholder} />
        </View>
        <NearbySettingsView
          settings={settings}
          loading={settingsLoading}
          saving={saving}
          onToggleEnabled={toggleEnabled}
          onToggleNotifications={toggleNotifications}
          onSetRadius={setDetectionRadius}
          onSetVisibility={setVisibility}
          onClearHistory={clearHistory}
        />
      </View>
    );
  }

  // ─── Main view ─────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />

      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <NavButton
          icon="settings-outline"
          label="Cài đặt"
          onPress={handleOpenSettings}
        />
        <NavTitle text="Chạm Sóng" />
        <View style={styles.statusPill}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isActive ? '#34D399' : '#6B7280' },
            ]}
          />
          <NavText
            text={isActive ? 'Đang hoạt động' : 'Tắt'}
            color={isActive ? '#34D399' : '#6B7280'}
          />
        </View>
      </View>

      {/* Unified Radar + Chạm Sóng screen */}
      <View style={styles.unifiedRadarContainer}>
        <ProximityRadar embedded />
      </View>

      {/* Nearby Alert Bottom Sheet */}
      <NearbyAlert
        visible={screenMode === 'alert'}
        encounter={activeEncounter}
        onSendSignal={handleSendSignal}
        onDismiss={handleDismissAlert}
        onOpenSettings={handleOpenSettings}
      />

      {/* Shake/Tap/Hold Match Modal */}
      {showShakeMatch && (
        <View style={StyleSheet.absoluteFill}>
          <ShakeMatch
            encounter={activeEncounter}
            isShaking={shakeMatch.isShaking}
            shakeProgress={shakeMatch.shakeProgress}
            holdProgress={shakeMatch.holdProgress}
            signalSent={shakeMatch.signalSent}
            isWaiting={shakeMatch.isWaiting}
            matched={shakeMatch.matched}
            signalType={shakeMatch.signalType}
            error={shakeMatch.error}
            onSendTapSignal={shakeMatch.sendTapSignal}
            onStartHold={shakeMatch.startHold}
            onCancelHold={shakeMatch.cancelHold}
            onStartShake={handleStartShake}
            onDismiss={handleDismissShakeMatch}
            onViewMatch={handleViewMatch}
          />
        </View>
      )}
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function NavButton({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.navButton}>
      <NavText text={label} onPress={onPress} />
    </View>
  );
}

function NavTitle({ text }: { text: string }) {
  return <NavText text={text} bold />;
}

function NavText({
  text,
  color = '#F9FAFB',
  bold = false,
  onPress,
}: {
  text: string;
  color?: string;
  bold?: boolean;
  onPress?: () => void;
}) {
  return (
    <Text
      style={{
        fontSize: 14,
        color,
        fontWeight: bold ? '700' : '400',
      }}
      onPress={onPress}
    >
      {text}
    </Text>
  );
}

function IdleView({
  isActive,
  isChecking,
  detectionRadius,
}: {
  isActive: boolean;
  isChecking: boolean;
  detectionRadius: number;
}) {
  return (
    <View style={styles.idleContainer}>
      <View style={styles.idleCard}>
        <View style={styles.radarContainer}>
          <View style={styles.radarOuter}>
            <View style={styles.radarMiddle}>
              <View style={styles.radarInner}>
                <Ionicons
                  name={isActive ? 'pulse-outline' : 'power-outline'}
                  size={48}
                  color={isActive ? '#8B5CF6' : '#4B5563'}
                />
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.idleTitle}>
          {isActive ? 'Đang tìm kiếm...' : 'Chạm Sóng đã tắt'}
        </Text>

        <Text style={styles.idleSubtitle}>
          {isActive
            ? `Đang quét trong phạm vi ${detectionRadius}m.\nBạn sẽ nhận thông báo khi có người ở gần.`
            : 'Bật tính năng để kết nối với những người\nthú vị đang ở gần bạn.'}
        </Text>

        {isChecking && (
          <View style={styles.checkingRow}>
            <Text style={styles.checkingText}>Đang kiểm tra...</Text>
          </View>
        )}

        <View style={styles.idleHints}>
          <View style={styles.hintItem}>
            <Ionicons name="flash-outline" size={18} color="#6B7280" />
            <Text style={styles.hintText}>Gửi tín hiệu để kết nối</Text>
          </View>
          <View style={styles.hintItem}>
            <Ionicons name="phone-portrait-outline" size={18} color="#6B7280" />
            <Text style={styles.hintText}>Hoặc rung điện thoại</Text>
          </View>
          <View style={styles.hintItem}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#6B7280" />
            <Text style={styles.hintText}>Danh tính được bảo vệ</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  unifiedRadarContainer: {
    flex: 1,
    backgroundColor: '#111827',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    backgroundColor: '#111827',
  },
  navButton: {
    minWidth: 80,
  },
  navPlaceholder: {
    width: 80,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1F2937',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Idle state
  idleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  idleCard: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  radarContainer: {
    marginBottom: 28,
  },
  radarOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarMiddle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  idleTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  idleSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  checkingRow: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 24,
  },
  checkingText: {
    fontSize: 13,
    color: '#A78BFA',
  },
  idleHints: {
    width: '100%',
    gap: 12,
    paddingHorizontal: 20,
  },
  hintItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#1F2937',
    borderRadius: 12,
  },
  hintText: {
    fontSize: 13,
    color: '#D1D5DB',
  },
});

