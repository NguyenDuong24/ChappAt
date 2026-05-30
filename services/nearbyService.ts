/**
 * Near Match Service Layer
 * Firebase Firestore operations for "Chạm Sóng" feature.
 * Uses Firebase JS SDK (v9 modular) matching the project's firebaseConfig.
 */
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  writeBatch,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import {
  NearbySettings,
  NearbySettingsPayload,
  DEFAULT_NEARBY_SETTINGS,
  NearbyEncounter,
  NearbyEncounterPayload,
  NearbySignal,
  NearbySignalPayload,
  NearbyMatch,
  NearbyMatchPayload,
  LocationSnapshot,
  DistanceBucket,
  getDistanceBucket,
  EncounterStatus,
  SignalType,
} from '@/types/nearby';

// ─── Collection References ────────────────────────────────────
const nearbySettingsCol = (userId?: string) =>
  userId
    ? doc(db, 'nearby_settings', userId)
    : collection(db, 'nearby_settings');

const nearbyEncountersCol = () => collection(db, 'nearby_encounters');
const nearbySignalsCol = () => collection(db, 'nearby_signals');
const nearbyMatchesCol = () => collection(db, 'nearby_matches');
const locationSnapshotsCol = () => collection(db, 'location_snapshots');
const userBlocksCol = () => collection(db, 'user_blocks');

// ─── Constants ─────────────────────────────────────────────────
const LOCATION_TTL_MS = 5 * 60 * 1000;
export const SIGNAL_WINDOW_MS = 2 * 60 * 1000;
export const MIN_PROXIMITY_DURATION_MS = 30 * 1000;
export const ENCOUNTER_TTL_MS = 5 * 60 * 1000;

// ─── Settings CRUD ────────────────────────────────────────────

export async function getNearbySettings(userId: string): Promise<NearbySettings> {
  const ref = doc(db, 'nearby_settings', userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return { userId, ...DEFAULT_NEARBY_SETTINGS } as NearbySettings;
  }
  const data = snap.data() as any;
  return {
    ...data,
    userId,
    createdAt: data.createdAt?.toDate?.() ?? null,
    updatedAt: data.updatedAt?.toDate?.() ?? null,
  } as NearbySettings;
}

export async function saveNearbySettings(
  userId: string,
  settings: Partial<Omit<NearbySettings, 'userId' | 'createdAt'>>,
): Promise<void> {
  const ref = doc(db, 'nearby_settings', userId);
  const now = serverTimestamp();
  const existing = await getDoc(ref);

  if (!existing.exists()) {
    await setDoc(ref, {
      userId,
      ...DEFAULT_NEARBY_SETTINGS,
      ...settings,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await updateDoc(ref, {
      ...settings,
      updatedAt: now,
    });
  }
}

export async function deleteNearbyHistory(userId: string): Promise<void> {
  const batch = writeBatch(db);
  
  const [encA, encB] = await Promise.all([
    getDocs(query(nearbyEncountersCol(), where('userAId', '==', userId))),
    getDocs(query(nearbyEncountersCol(), where('userBId', '==', userId))),
  ]);

  for (const d of [...encA.docs, ...encB.docs]) {
    batch.delete(d.ref);
    const signals = await getDocs(
      query(nearbySignalsCol(), where('encounterId', '==', d.id)),
    );
    for (const sig of signals.docs) {
      batch.delete(sig.ref);
    }
  }
  await batch.commit();
}

// ─── Location Tracking ─────────────────────────────────────────

export async function updateLocation(snapshot: LocationSnapshot): Promise<void> {
  const ref = doc(db, 'location_snapshots', snapshot.userId);
  await setDoc(ref, {
    ...snapshot,
    serverTimestamp: serverTimestamp(),
  });
}

export async function cleanupOldLocations(): Promise<void> {
  const cutoff = Date.now() - LOCATION_TTL_MS;
  const snap = await getDocs(
    query(locationSnapshotsCol(), where('timestamp', '<', cutoff), limit(100)),
  );

  if (snap.empty) return;
  const batch = writeBatch(db);
  for (const docSnap of snap.docs) {
    batch.delete(docSnap.ref);
  }
  await batch.commit();
}

// ─── Nearby Detection ──────────────────────────────────────────

export async function findNearbyUsers(
  geohash4: string,
  excludeUserId: string,
): Promise<string[]> {
  const snapshots = await findNearbyLocationSnapshots([geohash4], excludeUserId);
  return snapshots.map((l) => l.userId);
}

export async function findNearbyLocationSnapshots(
  geohash4List: string[],
  excludeUserId: string,
  maxResults = 50,
): Promise<LocationSnapshot[]> {
  const uniqueGeohashes = Array.from(new Set(geohash4List.filter(Boolean))).slice(0, 10);
  if (uniqueGeohashes.length === 0) return [];

  const snaps = await Promise.all(
    uniqueGeohashes.map((geohash4) =>
      getDocs(
        query(
          locationSnapshotsCol(),
          where('geohash4', '==', geohash4),
          limit(maxResults),
        ),
      ),
    ),
  );

  const now = Date.now();
  const byUser = new Map<string, LocationSnapshot>();
  for (const snap of snaps) {
    for (const docSnap of snap.docs) {
      const location = docSnap.data() as LocationSnapshot;
      if (location.userId === excludeUserId) continue;
      if (now - Number(location.timestamp || 0) >= LOCATION_TTL_MS) continue;

      const existing = byUser.get(location.userId);
      if (!existing || Number(location.timestamp || 0) > Number(existing.timestamp || 0)) {
        byUser.set(location.userId, location);
      }
    }
  }

  return Array.from(byUser.values())
    .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
    .slice(0, maxResults);
}

export async function findNearbyUsersLegacy(
  geohash4: string,
  excludeUserId: string,
): Promise<string[]> {
  const snap = await getDocs(
    query(
      locationSnapshotsCol(),
      where('geohash4', '==', geohash4),
      where('userId', '!=', excludeUserId),
    ),
  );

  const now = Date.now();
  return snap.docs
    .map((d) => d.data() as LocationSnapshot)
    .filter((l) => now - l.timestamp < LOCATION_TTL_MS)
    .map((l) => l.userId);
}

// ─── Encounter Management ──────────────────────────────────────

export async function findActiveEncounter(
  userAId: string,
  userBId: string,
): Promise<(NearbyEncounter & { id: string }) | null> {
  const activeStatuses = ['detected', 'notified_a', 'notified_b', 'notified_both'];

  const [snapA, snapB] = await Promise.all([
    getDocs(
      query(
        nearbyEncountersCol(),
        where('userAId', '==', userAId),
        where('userBId', '==', userBId),
        where('status', 'in', activeStatuses),
        limit(1),
      ),
    ),
    getDocs(
      query(
        nearbyEncountersCol(),
        where('userAId', '==', userBId),
        where('userBId', '==', userAId),
        where('status', 'in', activeStatuses),
        limit(1),
      ),
    ),
  ]);

  if (!snapA.empty) {
    return { id: snapA.docs[0].id, ...(snapA.docs[0].data() as any) };
  }
  if (!snapB.empty) {
    return { id: snapB.docs[0].id, ...(snapB.docs[0].data() as any) };
  }
  return null;
}

export async function createEncounter(
  userAId: string,
  userBId: string,
  distanceMeters: number,
  geohash4: string,
): Promise<NearbyEncounter> {
  const ref = doc(nearbyEncountersCol());
  const now = serverTimestamp();

  const payload = {
    userAId,
    userBId,
    firstSeenAt: now,
    lastSeenAt: now,
    distanceBucket: getDistanceBucket(distanceMeters),
    geohash4,
    status: 'detected' as EncounterStatus,
    proximityCount: 1,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(ref, payload);
  return { id: ref.id, ...payload } as unknown as NearbyEncounter;
}

export async function updateEncounter(
  encounterId: string,
  updates: {
    lastSeenAt?: any;
    proximityCount?: any;
    status?: EncounterStatus;
  },
): Promise<void> {
  await updateDoc(doc(db, 'nearby_encounters', encounterId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function expireOldEncounters(userId: string): Promise<void> {
  const cutoff = Date.now() - ENCOUNTER_TTL_MS;
  const activeStatuses = ['detected', 'notified_a', 'notified_b', 'notified_both'];

  const [snapA, snapB] = await Promise.all([
    getDocs(
      query(
        nearbyEncountersCol(),
        where('userAId', '==', userId),
        where('status', 'in', activeStatuses),
      ),
    ),
    getDocs(
      query(
        nearbyEncountersCol(),
        where('userBId', '==', userId),
        where('status', 'in', activeStatuses),
      ),
    ),
  ]);

  const batch = writeBatch(db);
  let count = 0;
  for (const d of [...snapA.docs, ...snapB.docs]) {
    const data = d.data();
    const firstSeenMs = data.firstSeenAt?.toMillis?.() ?? data.firstSeenAt;
    if (firstSeenMs && firstSeenMs < cutoff) {
      batch.update(d.ref, {
        status: 'expired',
        updatedAt: serverTimestamp(),
      });
      count++;
    }
  }
  if (count > 0) await batch.commit();
}

// ─── Signal Management ─────────────────────────────────────────

export async function sendSignal(
  encounterId: string,
  userId: string,
  type: SignalType,
): Promise<NearbySignal> {
  const ref = doc(nearbySignalsCol());
  const now = serverTimestamp();

  const payload: NearbySignalPayload = {
    id: ref.id,
    encounterId,
    userId,
    type,
    createdAt: now,
  };

  await setDoc(ref, payload);
  return { ...payload } as unknown as NearbySignal;
}

export async function checkMutualSignal(
  encounterId: string,
  userId: string,
): Promise<boolean> {
  const encSnap = await getDoc(doc(db, 'nearby_encounters', encounterId));
  if (!encSnap.exists()) return false;

  const data = encSnap.data();
  const otherUserId = data.userAId === userId ? data.userBId : data.userAId;

  const now = Date.now();
  const windowStart = now - SIGNAL_WINDOW_MS;

  const signals = await getDocs(
    query(
      nearbySignalsCol(),
      where('encounterId', '==', encounterId),
      where('userId', '==', otherUserId),
    ),
  );

  return signals.docs.some((d) => {
    const sig = d.data();
    const sigTime = sig.createdAt?.toMillis?.() ?? sig.createdAt;
    return sigTime != null && sigTime > windowStart;
  });
}

// ─── Match Creation ────────────────────────────────────────────

export async function createMatch(
  userAId: string,
  userBId: string,
  encounterId: string,
  source: 'nearby_shake' | 'nearby_tap',
): Promise<NearbyMatch> {
  const ref = doc(nearbyMatchesCol());
  const now = serverTimestamp();

  await setDoc(ref, {
    id: ref.id,
    userAId,
    userBId,
    encounterId,
    source,
    createdAt: now,
  });

  await updateDoc(doc(db, 'nearby_encounters', encounterId), {
    status: 'matched',
    updatedAt: now,
  });

  return { id: ref.id, userAId, userBId, encounterId, source, createdAt: now } as unknown as NearbyMatch;
}

// ─── Encounter History (for profile badge) ─────────────────────

export interface EncounterHistoryItem {
  encounterId: string;
  otherUserId: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  distanceBucket: DistanceBucket;
  status: EncounterStatus;
}

export async function getEncounterHistory(
  userId: string,
  maxResults = 20,
): Promise<EncounterHistoryItem[]> {
  const [snapA, snapB] = await Promise.all([
    getDocs(
      query(
        nearbyEncountersCol(),
        where('userAId', '==', userId),
        orderBy('lastSeenAt', 'desc'),
        limit(maxResults),
      ),
    ),
    getDocs(
      query(
        nearbyEncountersCol(),
        where('userBId', '==', userId),
        orderBy('lastSeenAt', 'desc'),
        limit(maxResults),
      ),
    ),
  ]);

  const items: EncounterHistoryItem[] = [];

  for (const d of [...snapA.docs, ...snapB.docs]) {
    const data = d.data();
    const otherUserId = data.userAId === userId ? data.userBId : data.userAId;
    items.push({
      encounterId: d.id,
      otherUserId,
      firstSeenAt: data.firstSeenAt?.toDate?.() ?? new Date(data.firstSeenAt),
      lastSeenAt: data.lastSeenAt?.toDate?.() ?? new Date(data.lastSeenAt),
      distanceBucket: data.distanceBucket,
      status: data.status,
    });
  }

  return items.sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());
}

export async function checkHasEncountered(
  userId: string,
  otherUserId: string,
): Promise<{ hasEncountered: boolean; todayCount: number }> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [snapA, snapB] = await Promise.all([
    getDocs(
      query(
        nearbyEncountersCol(),
        where('userAId', '==', userId),
        where('userBId', '==', otherUserId),
      ),
    ),
    getDocs(
      query(
        nearbyEncountersCol(),
        where('userAId', '==', otherUserId),
        where('userBId', '==', userId),
      ),
    ),
  ]);

  const allDocs = [...snapA.docs, ...snapB.docs];
  let todayCount = 0;

  for (const d of allDocs) {
    const data = d.data();
    const seen = data.lastSeenAt?.toDate?.() ?? new Date(data.lastSeenAt);
    if (seen >= todayStart) todayCount++;
  }

  return { hasEncountered: allDocs.length > 0, todayCount };
}

// ─── Notification Count Tracking ──────────────────────────────

export async function incrementNotificationCount(userId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const ref = doc(db, 'nearby_settings', userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return 1;

  const data = snap.data() as any;
  const notifCounts = data.notificationCounts ?? {};
  const todayCount = (notifCounts[today] ?? 0) + 1;

  await updateDoc(ref, {
    [`notificationCounts.${today}`]: todayCount,
    updatedAt: serverTimestamp(),
  });

  return todayCount;
}

export async function getTodayNotificationCount(userId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const snap = await getDoc(doc(db, 'nearby_settings', userId));
  if (!snap.exists()) return 0;

  const data = snap.data() as any;
  return data.notificationCounts?.[today] ?? 0;
}

// ─── Safety: Check Blocks ─────────────────────────────────────

export async function isUserBlocked(userId: string, otherUserId: string): Promise<boolean> {
  const [snap, snapRev] = await Promise.all([
    getDocs(
      query(
        userBlocksCol(),
        where('blockerId', '==', userId),
        where('blockedId', '==', otherUserId),
        limit(1),
      ),
    ),
    getDocs(
      query(
        userBlocksCol(),
        where('blockerId', '==', otherUserId),
        where('blockedId', '==', userId),
        limit(1),
      ),
    ),
  ]);

  return !snap.empty || !snapRev.empty;
}
