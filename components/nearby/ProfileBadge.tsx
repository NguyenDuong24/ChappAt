/**
 * ProfileBadge Component
 * Displays "Từng ở gần bạn" badge on user profiles.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  checkHasEncountered,
  getEncounterHistory,
  EncounterHistoryItem,
} from '@/services/nearbyService';

interface Props {
  currentUserId: string;
  profileUserId: string;
  /** Called when user taps the badge for details */
  onPressDetails?: (history: EncounterHistoryItem[]) => void;
}

export function ProfileBadge({ currentUserId, profileUserId, onPressDetails }: Props) {
  const [encounterInfo, setEncounterInfo] = useState<{
    hasEncountered: boolean;
    todayCount: number;
    recentCount: number;
    history: EncounterHistoryItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId || !profileUserId || currentUserId === profileUserId) {
      setLoading(false);
      return;
    }

    loadEncounterInfo();
  }, [currentUserId, profileUserId]);

  const loadEncounterInfo = async () => {
    try {
      const { hasEncountered, todayCount } = await checkHasEncountered(
        currentUserId,
        profileUserId,
      );

      if (hasEncountered) {
        const history = await getEncounterHistory(currentUserId);
        const userHistory = history.filter(
          (h) => h.otherUserId === profileUserId,
        );

        setEncounterInfo({
          hasEncountered,
          todayCount,
          recentCount: userHistory.length,
          history: userHistory,
        });
      } else {
        setEncounterInfo({
          hasEncountered: false,
          todayCount: 0,
          recentCount: 0,
          history: [],
        });
      }
    } catch (err) {
      console.warn('Failed to load encounter info:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !encounterInfo || !encounterInfo.hasEncountered) {
    return null;
  }

  const { todayCount, recentCount, history } = encounterInfo;

  // Determine which message to show
  let badgeText: string;
  let icon: keyof typeof Ionicons.glyphMap = 'people-outline';
  let color = '#6B7280';

  if (todayCount > 0) {
    badgeText = 'Hai bạn từng ở gần nhau hôm nay';
    icon = 'today-outline';
    color = '#8B5CF6'; // Purple for today
  } else if (recentCount >= 3) {
    badgeText = 'Các bạn đã từng xuất hiện ở cùng một khu vực nhiều lần';
    icon = 'repeat-outline';
    color = '#EC4899'; // Pink for frequent
  } else {
    badgeText = 'Các bạn đã từng gặp gần đây';
    icon = 'location-outline';
    color = '#6B7280'; // Gray for casual
  }

  return (
    <TouchableOpacity
      style={[styles.badge, { borderColor: color }]}
      onPress={() => onPressDetails?.(history)}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.text, { color }]}>{badgeText}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
  },
});
