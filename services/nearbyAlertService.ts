import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import encounterService from './encounterService';
import { NearbyUser } from './proximityService';

export type NearbyEncounterAlert = {
  user: NearbyUser;
  distance: number;
  address: string;
  message: string;
  happenedAt: Date;
};

const NEARBY_DISTANCE_METERS = 50;
const PASSED_BY_DISTANCE_METERS = 100;
const LIVE_ALERT_COOLDOWN_MS = 10 * 60 * 1000;
const HISTORY_COOLDOWN_MS = 60 * 60 * 1000;

class NearbyAlertService {
  private liveAlertCooldown = new Map<string, number>();
  private historyCooldown = new Map<string, number>();
  private lastAddress = '';
  private lastAddressAt = 0;

  shouldRecordPassedBy(user: NearbyUser) {
    if (!user?.id || user.distance > PASSED_BY_DISTANCE_METERS) return false;
    const last = this.historyCooldown.get(user.id) || 0;
    return Date.now() - last > HISTORY_COOLDOWN_MS;
  }

  shouldTriggerLiveAlert(user: NearbyUser) {
    if (!user?.id || user.distance > NEARBY_DISTANCE_METERS) return false;
    const last = this.liveAlertCooldown.get(user.id) || 0;
    return Date.now() - last > LIVE_ALERT_COOLDOWN_MS;
  }

  async getReadableAddress(location: { latitude: number; longitude: number }) {
    const now = Date.now();
    if (this.lastAddress && now - this.lastAddressAt < 5 * 60 * 1000) return this.lastAddress;

    try {
      const result = await Location.reverseGeocodeAsync(location);
      const first = result?.[0];
      const address = [first?.district, first?.city || first?.region].filter(Boolean).join(', ');
      this.lastAddress = address || 'gần bạn';
      this.lastAddressAt = now;
      return this.lastAddress;
    } catch {
      return 'gần bạn';
    }
  }

  formatPassedByMessage(user: NearbyUser, address: string, date = new Date()) {
    const time = new Intl.DateTimeFormat('vi-VN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
    return `Bạn đã đi ngang qua ${user.name || 'một người'} tại ${address} lúc ${time}`;
  }

  async recordPassedBy(myId: string, user: NearbyUser, currentLocation: { latitude: number; longitude: number }) {
    if (!this.shouldRecordPassedBy(user)) return null;

    const address = await this.getReadableAddress(currentLocation);
    this.historyCooldown.set(user.id, Date.now());
    await encounterService.recordEncounter(myId, user.id, user.distance, { ...currentLocation, address });
    return {
      user,
      distance: user.distance,
      address,
      message: this.formatPassedByMessage(user, address),
      happenedAt: new Date(),
    } satisfies NearbyEncounterAlert;
  }

  async triggerLiveNearbyAlert(user: NearbyUser, address: string) {
    if (!this.shouldTriggerLiveAlert(user)) return false;

    this.liveAlertCooldown.set(user.id, Date.now());
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Có người đang ở rất gần bạn ✨',
        body: `${user.name || 'Một người'} đang cách bạn khoảng ${Math.round(user.distance)}m tại ${address}`,
        data: { type: 'nearby_user', userId: user.id },
        sound: true,
      },
      trigger: AppState.currentState === 'active' ? null : null,
    });

    return true;
  }
}

export const nearbyAlertService = new NearbyAlertService();
export default nearbyAlertService;
