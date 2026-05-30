/**
 * NearbySettings Component
 * Settings screen for the "Chạm Sóng" (Near Match) feature.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NearbySettings as Settings } from '@/types/nearby';

const RADIUS_OPTIONS = [
  { value: 10, label: '10m - Chính xác cao', icon: 'locate-outline' as const },
  { value: 30, label: '30m - Cân bằng', icon: 'compass-outline' as const },
  { value: 50, label: '50m - Thoải mái', icon: 'globe-outline' as const },
];

interface Props {
  settings: Settings | null;
  loading: boolean;
  saving: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  onToggleNotifications: (enabled: boolean) => void;
  onSetRadius: (radius: number) => void;
  onSetVisibility: (visibility: 'visible' | 'hidden') => void;
  onClearHistory: () => void;
}

export function NearbySettingsView({
  settings,
  loading,
  saving,
  onToggleEnabled,
  onToggleNotifications,
  onSetRadius,
  onSetVisibility,
  onClearHistory,
}: Props) {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Đang tải cài đặt...</Text>
      </View>
    );
  }

  if (!settings) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Không có dữ liệu cài đặt</Text>
      </View>
    );
  }

  const handleClearHistory = () => {
    Alert.alert(
      'Xóa lịch sử gặp gần',
      'Bạn có chắc muốn xóa toàn bộ lịch sử những người đã từng ở gần? Hành động này không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: onClearHistory,
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Text style={styles.headerEmoji}>🌊</Text>
        </View>
        <Text style={styles.headerTitle}>Chạm Sóng</Text>
        <Text style={styles.headerSubtitle}>
          Kết nối với những người thú vị đang ở gần bạn
        </Text>
      </View>

      {/* Master toggle */}
      <View style={styles.section}>
        <View style={styles.masterToggle}>
          <View style={styles.masterToggleInfo}>
            <Text style={styles.masterToggleTitle}>Bật Chạm Sóng</Text>
            <Text style={styles.masterToggleDesc}>
              Cho phép phát hiện người dùng khác ở gần bạn
            </Text>
          </View>
          <Switch
            value={settings.enabled}
            onValueChange={onToggleEnabled}
            trackColor={{ false: '#374151', true: '#7C3AED' }}
            thumbColor={settings.enabled ? '#A78BFA' : '#6B7280'}
            disabled={saving}
          />
        </View>
      </View>

      {settings.enabled && (
        <>
          {/* Detection Radius */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Khoảng cách phát hiện</Text>
            <Text style={styles.sectionDesc}>
              Chọn khoảng cách tối đa để phát hiện người ở gần
            </Text>
            <View style={styles.radiusOptions}>
              {RADIUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.radiusOption,
                    settings.detectionRadius === opt.value && styles.radiusOptionActive,
                  ]}
                  onPress={() => onSetRadius(opt.value)}
                  disabled={saving}
                >
                  <Ionicons
                    name={opt.icon}
                    size={20}
                    color={
                      settings.detectionRadius === opt.value ? '#A78BFA' : '#6B7280'
                    }
                  />
                  <Text
                    style={[
                      styles.radiusLabel,
                      settings.detectionRadius === opt.value &&
                        styles.radiusLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {settings.detectionRadius === opt.value && (
                    <Ionicons name="checkmark-circle" size={20} color="#A78BFA" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notifications */}
          <View style={styles.section}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Thông báo khi có người ở gần</Text>
                <Text style={styles.settingDesc}>
                  Nhận thông báo nhẹ nhàng khi có ai đó trong khu vực
                </Text>
              </View>
              <Switch
                value={settings.allowNotifications}
                onValueChange={onToggleNotifications}
                trackColor={{ false: '#374151', true: '#7C3AED' }}
                thumbColor={settings.allowNotifications ? '#A78BFA' : '#6B7280'}
                disabled={saving}
              />
            </View>
          </View>

          {/* Visibility */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chế độ hiển thị</Text>
            <View style={styles.visibilityOptions}>
              <TouchableOpacity
                style={[
                  styles.visibilityOption,
                  settings.visibility === 'visible' && styles.visibilityOptionActive,
                ]}
                onPress={() => onSetVisibility('visible')}
                disabled={saving}
              >
                <Ionicons
                  name="eye-outline"
                  size={24}
                  color={settings.visibility === 'visible' ? '#A78BFA' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.visibilityLabel,
                    settings.visibility === 'visible' && styles.visibilityLabelActive,
                  ]}
                >
                  Hiển thị
                </Text>
                <Text style={styles.visibilityDesc}>
                  Người khác có thể phát hiện bạn
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.visibilityOption,
                  settings.visibility === 'hidden' && styles.visibilityOptionActive,
                ]}
                onPress={() => onSetVisibility('hidden')}
                disabled={saving}
              >
                <Ionicons
                  name="eye-off-outline"
                  size={24}
                  color={settings.visibility === 'hidden' ? '#A78BFA' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.visibilityLabel,
                    settings.visibility === 'hidden' && styles.visibilityLabelActive,
                  ]}
                >
                  Ẩn
                </Text>
                <Text style={styles.visibilityDesc}>
                  Tạm thời ẩn khỏi phát hiện gần
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Privacy Info */}
          <View style={styles.privacySection}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#34D399" />
            <View style={styles.privacyInfo}>
              <Text style={styles.privacyTitle}>Riêng tư của bạn được bảo vệ</Text>
              <Text style={styles.privacyDesc}>
                • Vị trí chính xác không bao giờ được hiển thị\n
                • Danh tính chỉ tiết lộ khi cả hai cùng gửi tín hiệu\n
                • Bạn có thể xóa lịch sử hoặc ẩn bất cứ lúc nào
              </Text>
            </View>
          </View>
        </>
      )}

      {/* Clear History */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.dangerButton}
          onPress={handleClearHistory}
          disabled={saving}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
          <Text style={styles.dangerText}>Xóa lịch sử gặp gần</Text>
        </TouchableOpacity>
        <Text style={styles.dangerDesc}>
          Xóa tất cả dữ liệu về những người bạn đã từng ở gần
        </Text>
      </View>

      {/* Saving indicator */}
      {saving && (
        <View style={styles.savingBanner}>
          <Text style={styles.savingText}>Đang lưu...</Text>
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 20,
  },
  loadingText: {
    fontSize: 15,
    color: '#9CA3AF',
  },

  // Header
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  headerIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerEmoji: {
    fontSize: 32,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  // Sections
  section: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 12,
  },

  // Master toggle
  masterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  masterToggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  masterToggleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 2,
  },
  masterToggleDesc: {
    fontSize: 13,
    color: '#9CA3AF',
  },

  // Radius options
  radiusOptions: {
    gap: 8,
  },
  radiusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#374151',
  },
  radiusOptionActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  radiusLabel: {
    flex: 1,
    fontSize: 14,
    color: '#D1D5DB',
    fontWeight: '500',
  },
  radiusLabelActive: {
    color: '#A78BFA',
  },

  // Setting rows
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
    color: '#9CA3AF',
  },

  // Visibility
  visibilityOptions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  visibilityOption: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#374151',
    gap: 6,
  },
  visibilityOptionActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  visibilityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  visibilityLabelActive: {
    color: '#A78BFA',
  },
  visibilityDesc: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Privacy
  privacySection: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.2)',
  },
  privacyInfo: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34D399',
    marginBottom: 6,
  },
  privacyDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
  },

  // Danger zone
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  dangerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  dangerDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },

  // Saving banner
  savingBanner: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  savingText: {
    fontSize: 13,
    color: '#A78BFA',
    fontWeight: '500',
  },

  bottomSpacer: {
    height: 40,
  },
});
