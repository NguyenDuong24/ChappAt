/**
 * UserProfileNearbySection — Drop-in component for user profile views
 * 
 * Usage: In any screen showing another user's profile, add:
 * 
 *   import { UserProfileNearbySection } from '@/components/nearby/UserProfileNearbySection';
 *   <UserProfileNearbySection currentUserId={myUid} profileUserId={theirUid} />
 * 
 * This shows the "Từng ở gần bạn" badge + encounter history when tapped.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  checkHasEncountered,
  getEncounterHistory,
  EncounterHistoryItem,
} from '@/services/nearbyService';

const DISTANCE_LABELS: Record<string, string> = {
  '0-10m': 'Rất gần (<10m)',
  '10-30m': 'Gần (10-30m)',
  '30-50m': 'Trong khu vực (30-50m)',
};

interface Props {
  currentUserId: string;
  profileUserId: string;
}

export function UserProfileNearbySection({ currentUserId, profileUserId }: Props) {
  const [hasEncountered, setHasEncountered] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [history, setHistory] = useState<EncounterHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!currentUserId || !profileUserId || currentUserId === profileUserId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const result = await checkHasEncountered(currentUserId, profileUserId);
        setHasEncountered(result.hasEncountered);
        setTodayCount(result.todayCount);

        if (result.hasEncountered) {
          const allHistory = await getEncounterHistory(currentUserId);
          setHistory(allHistory.filter((h) => h.otherUserId === profileUserId));
        }
      } catch (err) {
        console.warn('Failed to load encounter info:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentUserId, profileUserId]);

  const handlePress = useCallback(() => {
    if (history.length > 0) {
      setShowHistory(true);
    }
  }, [history]);

  const formatDate = (d: Date) => {
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 60) return `${mins} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days === 1) return 'Hôm qua';
    if (days < 7) return `${days} ngày trước`;
    return d.toLocaleDateString('vi-VN');
  };

  if (loading || !hasEncountered) return null;

  const getBadgeConfig = () => {
    if (todayCount > 0) {
      return {
        text: '🌊 Hai bạn từng ở gần nhau hôm nay',
        color: '#8B5CF6',
        icon: 'today-outline' as const,
      };
    }
    if (history.length >= 3) {
      return {
        text: '🔁 Các bạn đã gặp gần đây nhiều lần',
        color: '#EC4899',
        icon: 'repeat-outline' as const,
      };
    }
    return {
      text: '📍 Các bạn đã từng gặp gần đây',
      color: '#6B7280',
      icon: 'location-outline' as const,
    };
  };

  const badge = getBadgeConfig();

  return (
    <>
      <TouchableOpacity
        style={[styles.badge, { borderColor: badge.color }]}
        onPress={handlePress}
        activeOpacity={0.7}
        disabled={history.length === 0}
      >
        <Ionicons name={badge.icon} size={16} color={badge.color} />
        <Text style={[styles.badgeText, { color: badge.color }]}>
          {badge.text}
        </Text>
        {history.length > 0 && (
          <Ionicons name="chevron-forward" size={14} color={badge.color} />
        )}
      </TouchableOpacity>

      {/* History Modal */}
      <Modal
        visible={showHistory}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHistory(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lịch sử gặp gần</Text>
              <TouchableOpacity onPress={() => setShowHistory(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Các bạn đã từng xuất hiện ở cùng một khu vực.{'\n'}
              Vị trí chính xác không được hiển thị để bảo vệ riêng tư.
            </Text>

            <FlatList
              data={history}
              keyExtractor={(item) => item.encounterId}
              renderItem={({ item }) => (
                <View style={styles.historyItem}>
                  <View style={styles.historyDot} />
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyDate}>
                      {formatDate(item.lastSeenAt)}
                    </Text>
                    <Text style={styles.historyDetail}>
                      {DISTANCE_LABELS[item.distanceBucket] ?? 'Gần'} •{' '}
                      {item.status === 'matched'
                        ? '💜 Đã kết nối'
                        : item.status === 'expired'
                        ? 'Đã hết hạn'
                        : 'Đã phát hiện'}
                    </Text>
                  </View>
                </View>
              )}
              contentContainerStyle={styles.historyList}
            />

            <View style={styles.privacyNote}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#34D399" />
              <Text style={styles.privacyText}>
                Vị trí của bạn không bao giờ được chia sẻ
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
    alignSelf: 'flex-start',
    marginVertical: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 20,
    marginBottom: 16,
  },
  historyList: {
    gap: 4,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B5CF6',
    marginTop: 6,
  },
  historyInfo: {
    flex: 1,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 2,
  },
  historyDetail: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
  },
  privacyText: {
    fontSize: 11,
    color: '#6B7280',
  },
});
