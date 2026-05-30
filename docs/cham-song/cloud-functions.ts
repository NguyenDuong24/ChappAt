/**
 * Firebase Cloud Function — Chạm Sóng Server-Side Logic
 * 
 * Deploy: firebase deploy --only functions
 * 
 * This handles the server-side matching to avoid client-side race conditions
 * and ensure privacy (exact locations never leave the server).
 */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// ─── Constants ─────────────────────────────────────────────────
const LOCATION_TTL_MS = 5 * 60 * 1000;
const SIGNAL_WINDOW_MS = 2 * 60 * 1000;
const ENCOUNTER_TTL_MS = 5 * 60 * 1000;

// ─── Helper: Haversine distance ────────────────────────────
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function geohash4Encode(lat: number, lng: number): string {
  const latBucket = Math.floor((lat + 90) / 0.7);
  const lngBucket = Math.floor((lng + 180) / 0.7);
  let hash = 0;
  const combined = `${latBucket}|${lngBucket}`;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).slice(0, 4).padEnd(4, '0');
}

function getDistanceBucket(distance: number): string {
  if (distance <= 10) return '0-10m';
  if (distance <= 30) return '10-30m';
  return '30-50m';
}

// ─── Location Cleanup (runs every 5 minutes) ───────────────
export const cleanupOldLocations = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async () => {
    const cutoff = Date.now() - LOCATION_TTL_MS;
    const batch = db.batch();
    let count = 0;

    const snap = await db
      .collection('location_snapshots')
      .where('timestamp', '<', cutoff)
      .limit(500)
      .get();

    for (const doc of snap.docs) {
      batch.delete(doc.ref);
      count++;
    }

    if (count > 0) {
      await batch.commit();
      console.log(`Cleaned up ${count} old location snapshots`);
    }
  });

// ─── Encounter Expiration (runs every 2 minutes) ────────────
export const expireOldEncounters = functions.pubsub
  .schedule('every 2 minutes')
  .onRun(async () => {
    const cutoff = Date.now() - ENCOUNTER_TTL_MS;
    const batch = db.batch();
    let count = 0;

    const snap = await db
      .collection('nearby_encounters')
      .where('status', 'in', ['detected', 'notified_a', 'notified_b', 'notified_both'])
      .get();

    for (const doc of snap.docs) {
      const data = doc.data();
      const firstSeen = data.firstSeenAt?.toMillis?.() ?? data.firstSeenAt;
      if (firstSeen && firstSeen < cutoff) {
        batch.update(doc.ref, {
          status: 'expired',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        count++;
      }
    }

    if (count > 0) {
      await batch.commit();
      console.log(`Expired ${count} encounters`);
    }
  });

// ─── On Signal Created → Check for Match ───────────────────
export const onSignalCreated = functions.firestore
  .document('nearby_signals/{signalId}')
  .onCreate(async (snap, context) => {
    const signal = snap.data();
    const { encounterId, userId, type } = signal;

    // Get encounter
    const encounterDoc = await db.collection('nearby_encounters').doc(encounterId).get();
    if (!encounterDoc.exists) return;

    const encounter = encounterDoc.data()!;
    const otherUserId = encounter.userAId === userId ? encounter.userBId : encounter.userAId;

    // Check if other user already sent a signal in the same encounter
    const windowStart = Date.now() - SIGNAL_WINDOW_MS;
    
    const otherSignals = await db
      .collection('nearby_signals')
      .where('encounterId', '==', encounterId)
      .where('userId', '==', otherUserId)
      .get();

    const matched = otherSignals.docs.some((doc) => {
      const sig = doc.data();
      const sigTime = sig.createdAt?.toMillis?.() ?? sig.createdAt;
      return sigTime != null && sigTime > windowStart;
    });

    if (matched) {
      // Create match
      const matchRef = db.collection('nearby_matches').doc();
      const source = type === 'shake' ? 'nearby_shake' : 'nearby_tap';

      await db.runTransaction(async (t) => {
        t.set(matchRef, {
          id: matchRef.id,
          userAId: encounter.userAId,
          userBId: encounter.userBId,
          encounterId,
          source,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        t.update(encounterDoc.ref, {
          status: 'matched',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      // Send push notifications to both users
      // In production, get FCM tokens and send via admin.messaging()
      console.log(`Match created: ${encounter.userAId} ↔ ${encounter.userBId}`);
    }
  });

// ─── On Location Updated → Check for Nearby Users ──────────
export const onLocationUpdated = functions.firestore
  .document('location_snapshots/{userId}')
  .onWrite(async (change, context) => {
    const after = change.after;
    if (!after.exists) return;

    const location = after.data()!;
    const userId = location.userId;
    const geohash = location.geohash4;
    const { latitude, longitude } = location;
    const timestamp = location.timestamp;

    // Skip stale locations
    if (Date.now() - timestamp > LOCATION_TTL_MS) return;

    // Check user settings
    const settingsDoc = await db.collection('nearby_settings').doc(userId).get();
    if (!settingsDoc.exists) return;

    const settings = settingsDoc.data()!;
    if (!settings.enabled || settings.visibility === 'hidden') return;

    // Notif limit check
    const today = new Date().toISOString().split('T')[0];
    const notifCounts = settings.notificationCounts ?? {};
    const todayCount = notifCounts[today] ?? 0;
    if (todayCount >= (settings.dailyNotificationLimit ?? 10)) return;

    // Find users in same geohash
    const nearbySnap = await db
      .collection('location_snapshots')
      .where('geohash4', '==', geohash)
      .where('userId', '!=', userId)
      .get();

    for (const doc of nearbySnap.docs) {
      const otherLoc = doc.data();
      if (Date.now() - otherLoc.timestamp > LOCATION_TTL_MS) continue;

      const otherId = otherLoc.userId;

      // Check block
      const blockA = await db
        .collection('user_blocks')
        .where('blockerId', '==', userId)
        .where('blockedId', '==', otherId)
        .limit(1)
        .get();
      if (!blockA.empty) continue;

      const blockB = await db
        .collection('user_blocks')
        .where('blockerId', '==', otherId)
        .where('blockedId', '==', userId)
        .limit(1)
        .get();
      if (!blockB.empty) continue;

      // Calculate distance
      const distance = haversineDistance(latitude, longitude, otherLoc.latitude, otherLoc.longitude);

      if (distance > (settings.detectionRadius ?? 50)) continue;

      // Check existing active encounter
      const existingA = await db
        .collection('nearby_encounters')
        .where('userAId', '==', userId)
        .where('userBId', '==', otherId)
        .where('status', 'in', ['detected', 'notified_a', 'notified_b', 'notified_both'])
        .limit(1)
        .get();

      const existingB = await db
        .collection('nearby_encounters')
        .where('userAId', '==', otherId)
        .where('userBId', '==', userId)
        .where('status', 'in', ['detected', 'notified_a', 'notified_b', 'notified_both'])
        .limit(1)
        .get();

      if (!existingA.empty || !existingB.empty) {
        // Update existing
        const existingDoc = !existingA.empty ? existingA.docs[0] : existingB.docs[0];
        await existingDoc.ref.update({
          lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
          proximityCount: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        // Create new encounter
        const encounterRef = db.collection('nearby_encounters').doc();
        await encounterRef.set({
          id: encounterRef.id,
          userAId: userId,
          userBId: otherId,
          firstSeenAt: admin.firestore.FieldValue.serverTimestamp(),
          lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
          distanceBucket: getDistanceBucket(distance),
          geohash4: geohash,
          status: 'detected',
          proximityCount: 1,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Update notification count
        await db.collection('nearby_settings').doc(userId).update({
          [`notificationCounts.${today}`]: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Send push notification (in production, use FCM)
        console.log(`Encounter: ${userId} ↔ ${otherId} at ${distance.toFixed(1)}m`);
      }
    }
  });
