/**
 * useNearbySettings Hook
 * Manages the user's nearby detection preferences.
 */
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import {
  getNearbySettings,
  saveNearbySettings,
  deleteNearbyHistory,
} from '@/services/nearbyService';
import { NearbySettings, DEFAULT_NEARBY_SETTINGS } from '@/types/nearby';

export function useNearbySettings(userId: string | null) {
  const [settings, setSettings] = useState<NearbySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const s = await getNearbySettings(userId!);
      setSettings(s);
    } catch (err) {
      console.error('Failed to load nearby settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = useCallback(
    async (updates: Partial<Omit<NearbySettings, 'userId' | 'createdAt'>>) => {
      if (!userId) return;
      try {
        setSaving(true);
        await saveNearbySettings(userId, updates);
        setSettings((prev) =>
          prev ? { ...prev, ...updates } : null,
        );
      } catch (err) {
        console.error('Failed to save nearby settings:', err);
        Alert.alert('Lỗi', 'Không thể lưu cài đặt. Vui lòng thử lại.');
      } finally {
        setSaving(false);
      }
    },
    [userId],
  );

  const toggleEnabled = useCallback(
    (enabled: boolean) => updateSettings({ enabled }),
    [updateSettings],
  );

  const toggleNotifications = useCallback(
    (allowNotifications: boolean) => updateSettings({ allowNotifications }),
    [updateSettings],
  );

  const setDetectionRadius = useCallback(
    (detectionRadius: number) => updateSettings({ detectionRadius }),
    [updateSettings],
  );

  const setVisibility = useCallback(
    (visibility: 'visible' | 'hidden') => updateSettings({ visibility }),
    [updateSettings],
  );

  const clearHistory = useCallback(async () => {
    if (!userId) return;
    try {
      setSaving(true);
      await deleteNearbyHistory(userId);
      Alert.alert('Đã xóa', 'Lịch sử gặp gần đã được xóa.');
    } catch (err) {
      console.error('Failed to clear history:', err);
      Alert.alert('Lỗi', 'Không thể xóa lịch sử. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  }, [userId]);

  return {
    settings,
    loading,
    saving,
    toggleEnabled,
    toggleNotifications,
    setDetectionRadius,
    setVisibility,
    clearHistory,
    reload: loadSettings,
  };
}
