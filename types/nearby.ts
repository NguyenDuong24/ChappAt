/**
 * Near Match - Type Definitions
 * "Chạm Sóng" feature: proximity-based matching
 */

// ─── User Settings ────────────────────────────────────────────
export interface NearbySettings {
  userId: string;
  enabled: boolean;
  allowNotifications: boolean;
  /** distance in meters (10, 30, 50) */
  detectionRadius: number;
  /** 'visible' | 'hidden' - user can hide from nearby detection */
  visibility: 'visible' | 'hidden';
  /** max notifications per day */
  dailyNotificationLimit: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export const DEFAULT_NEARBY_SETTINGS: Omit<NearbySettings, 'userId'> = {
  enabled: false,
  allowNotifications: true,
  detectionRadius: 50,
  visibility: 'visible',
  dailyNotificationLimit: 10,
  createdAt: null,
  updatedAt: null,
};

// ─── Encounter ────────────────────────────────────────────────
export type EncounterStatus =
  | 'detected'
  | 'notified_a'
  | 'notified_b'
  | 'notified_both'
  | 'expired'
  | 'matched';

export type DistanceBucket = '0-10m' | '10-30m' | '30-50m';

export interface NearbyEncounter {
  id: string;
  userAId: string;
  userBId: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  distanceBucket: DistanceBucket;
  /** approximate geohash (4 chars ~20km area - low precision for privacy) */
  geohash4: string;
  status: EncounterStatus;
  /** how many times these users crossed paths in this encounter window */
  proximityCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export function getDistanceBucket(meters: number): DistanceBucket {
  if (meters <= 10) return '0-10m';
  if (meters <= 30) return '10-30m';
  return '30-50m';
}

// ─── Signal ────────────────────────────────────────────────────
export type SignalType = 'shake' | 'tap' | 'hold';

export interface NearbySignal {
  id: string;
  encounterId: string;
  userId: string;
  type: SignalType;
  createdAt: Date;
}

// ─── Match ────────────────────────────────────────────────────
export type MatchSource = 'nearby_shake' | 'nearby_tap';

export interface NearbyMatch {
  id: string;
  userAId: string;
  userBId: string;
  encounterId: string;
  source: MatchSource;
  createdAt: Date;
}

// ─── Payload types for Firestore ──────────────────────────────
export interface NearbySettingsPayload extends Omit<NearbySettings, 'createdAt' | 'updatedAt'> {
  createdAt: any; // Firestore Timestamp
  updatedAt: any;
}

export interface NearbyEncounterPayload extends Omit<NearbyEncounter, 'firstSeenAt' | 'lastSeenAt' | 'createdAt' | 'updatedAt'> {
  firstSeenAt: any;
  lastSeenAt: any;
  createdAt: any;
  updatedAt: any;
}

export interface NearbySignalPayload {
  id: string;
  encounterId: string;
  userId: string;
  type: SignalType;
  createdAt: any;
}

export interface NearbyMatchPayload extends Omit<NearbyMatch, 'createdAt'> {
  createdAt: any;
}

// ─── Location Snapshot (ephemeral, not persisted long-term) ──
export interface LocationSnapshot {
  userId: string;
  latitude: number;
  longitude: number;
  /** 4-char geohash for bucketing */
  geohash4: string;
  /** unix timestamp ms */
  timestamp: number;
  /** 'foreground' | 'background' */
  source: 'foreground' | 'background';
}

// ─── API Request/Response ─────────────────────────────────────
export interface SendSignalRequest {
  encounterId: string;
  userId: string;
  type: SignalType;
}

export interface CheckNearbyResponse {
  hasNearby: boolean;
  encounterId?: string;
  distance?: number;
  distanceBucket?: DistanceBucket;
}
