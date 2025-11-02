import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// Helper: delete all docs in a subcollection in batches
async function deleteSubcollection(parentRef: FirebaseFirestore.DocumentReference, sub: string, batchSize = 200) {
  let deleted = 0;
  while (true) {
    const snap = await parentRef.collection(sub).limit(batchSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
    if (snap.size < batchSize) break;
  }
  return deleted;
}

// Utility to adjust coins atomically
async function adjustCoins(uid: string, delta: number) {
  const userRef = db.collection('users').doc(uid);
  await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(userRef);
    const coins = (snap.exists ? Number(snap.get('coins') || 0) : 0) + delta;
    if (coins < 0) throw new functions.https.HttpsError('failed-precondition', 'INSUFFICIENT_FUNDS');
    tx.set(userRef, { coins }, { merge: true });
  });
}

// Record a coin transaction
async function logCoinTx(uid: string, type: string, amount: number, metadata: any = {}) {
  const txRef = db.collection('users').doc(uid).collection('coinTransactions').doc();
  await txRef.set({ userId: uid, type, amount, createdAt: admin.firestore.FieldValue.serverTimestamp(), metadata });
}

export const walletTopup = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'auth required');
  const uid = context.auth.uid;
  const amount = Number(data?.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) throw new functions.https.HttpsError('invalid-argument', 'amount');

  await adjustCoins(uid, amount);
  await logCoinTx(uid, 'topup', amount, data?.metadata || {});
  return { ok: true };
});

export const walletSpend = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'auth required');
  const uid = context.auth.uid;
  const amount = Number(data?.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) throw new functions.https.HttpsError('invalid-argument', 'amount');

  await adjustCoins(uid, -amount);
  await logCoinTx(uid, 'spend', -amount, data?.metadata || {});
  return { ok: true };
});

// Purchase via itemId read from shopItems/{itemId}
export const walletPurchase = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'auth required');
  const uid = context.auth.uid;
  const itemId = String(data?.itemId || '');
  if (!itemId) throw new functions.https.HttpsError('invalid-argument', 'itemId');

  const itemRef = db.collection('shopItems').doc(itemId);
  await db.runTransaction(async (tx: any) => {
    const [itemSnap, userSnap] = await Promise.all([tx.get(itemRef), tx.get(db.collection('users').doc(uid))]);
    if (!itemSnap.exists) throw new functions.https.HttpsError('not-found', 'ITEM_NOT_FOUND');
    const price = Number(itemSnap.get('price') || 0);
    if (!Number.isFinite(price) || price <= 0) throw new functions.https.HttpsError('failed-precondition', 'INVALID_PRICE');
    const coins = Number((userSnap.exists ? userSnap.get('coins') : 0) || 0);
    if (coins < price) throw new functions.https.HttpsError('failed-precondition', 'INSUFFICIENT_FUNDS');

    // Deduct + log + grant
    tx.set(db.collection('users').doc(uid), { coins: coins - price }, { merge: true });
    tx.set(db.collection('users').doc(uid).collection('coinTransactions').doc(), {
      userId: uid,
      type: 'purchase',
      amount: -price,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: { itemId },
    });
    tx.set(db.collection('users').doc(uid).collection('items').doc(itemId), {
      itemId,
      grantedAt: admin.firestore.FieldValue.serverTimestamp(),
      meta: { price },
    }, { merge: true });
  });
  return { ok: true };
});

// Gifts: send
export const giftsSend = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'auth required');
  const senderUid = context.auth.uid;
  const receiverUid = String(data?.receiverUid || '');
  const roomId = String(data?.roomId || '');
  const giftId = String(data?.giftId || '');
  const senderName = String(data?.senderName || '');
  if (!receiverUid || !roomId || !giftId) throw new functions.https.HttpsError('invalid-argument', 'params');
  if (receiverUid === senderUid) throw new functions.https.HttpsError('failed-precondition', 'CANNOT_GIFT_SELF');

  const giftRef = db.collection('gifts').doc(giftId);
  const userRef = db.collection('users').doc(senderUid);
  const receiverRef = db.collection('users').doc(receiverUid);
  const messageRef = db.collection('rooms').doc(roomId).collection('messages').doc();
  const receiptRef = receiverRef.collection('giftsReceived').doc();
  const txRef = userRef.collection('coinTransactions').doc();

  await db.runTransaction(async (tx: any) => {
    const [giftSnap, userSnap] = await Promise.all([tx.get(giftRef), tx.get(userRef)]);

    let gift: any = null;
    if (!giftSnap.exists) {
      // fallback from env default
      const fallback = [
        { id: 'banh-mi-thit', name: 'Bánh mì thịt', price: 20, icon: '🥖' },
        { id: 'tra-sua', name: 'Trà sữa', price: 15, icon: '🧋' },
        { id: 'hoa-hong', name: 'Hoa hồng', price: 10, icon: '🌹' },
        { id: 'cafe-sua', name: 'Cà phê sữa', price: 12, icon: '☕️' },
      ].find(g => g.id === giftId) || null;
      if (!fallback) throw new functions.https.HttpsError('not-found', 'GIFT_NOT_FOUND');
      gift = fallback;
    } else {
      const d = giftSnap.data()!;
      if (d.active === false) throw new functions.https.HttpsError('failed-precondition', 'GIFT_INACTIVE');
      gift = { id: giftSnap.id, name: d.name || giftSnap.id, price: Number(d.price || 0), icon: d.icon };
      if (!Number.isFinite(gift.price) || gift.price <= 0) throw new functions.https.HttpsError('failed-precondition', 'INVALID_GIFT_PRICE');
    }

    const coins = Number((userSnap.exists ? userSnap.get('coins') : 0) || 0);
    if (coins < gift.price) throw new functions.https.HttpsError('failed-precondition', 'INSUFFICIENT_FUNDS');

    // Deduct coins and write artifacts
    tx.set(userRef, { coins: coins - gift.price }, { merge: true });
    tx.set(txRef, { userId: senderUid, type: 'spend', amount: -gift.price, createdAt: admin.firestore.FieldValue.serverTimestamp(), metadata: { kind: 'gift', giftId: gift.id, to: receiverUid, roomId } });

    tx.set(messageRef, { uid: senderUid, toUid: receiverUid, type: 'gift', text: `🎁 ${senderName || 'Bạn'} đã tặng quà: ${gift.icon || ''} ${gift.name} (🥖 ${gift.price})`, gift: { id: gift.id, name: gift.name, price: gift.price, icon: gift.icon || '🎁' }, createdAt: admin.firestore.FieldValue.serverTimestamp(), status: 'sent', readBy: [] });

    tx.set(receiptRef, { fromUid: senderUid, fromName: senderName || 'Bạn', roomId, gift: { id: gift.id, name: gift.name, price: gift.price, icon: gift.icon || '🎁' }, createdAt: admin.firestore.FieldValue.serverTimestamp(), status: 'unread' });

    tx.set(receiverRef, { giftReceivedCount: admin.firestore.FieldValue.increment(1), giftReceivedValue: admin.firestore.FieldValue.increment(gift.price) }, { merge: true });
  });

  return { ok: true };
});

export const giftsRedeem = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'auth required');
  const uid = context.auth.uid;
  const receiptId = String(data?.receiptId || '');
  const rate = Number(data?.rate ?? 1);
  if (!receiptId) throw new functions.https.HttpsError('invalid-argument', 'receiptId');

  const receiptRef = db.collection('users').doc(uid).collection('giftsReceived').doc(receiptId);
  const userRef = db.collection('users').doc(uid);
  const txRef = userRef.collection('coinTransactions').doc();

  let redeemValueReturn = 0;

  await db.runTransaction(async (tx: any) => {
    const receiptSnap = await tx.get(receiptRef);
    if (!receiptSnap.exists) throw new functions.https.HttpsError('not-found', 'RECEIPT_NOT_FOUND');
    const rec = receiptSnap.data()!;
    if (rec.redeemed) throw new functions.https.HttpsError('failed-precondition', 'ALREADY_REDEEMED');

    const price = Number(rec?.gift?.price || 0);
    const redeemValue = Math.max(0, Math.round(price * (Number.isFinite(rate) ? Math.max(0, Math.min(1, rate)) : 1)));
    if (!Number.isFinite(redeemValue) || redeemValue <= 0) throw new functions.https.HttpsError('failed-precondition', 'INVALID_REDEEM_VALUE');

    redeemValueReturn = redeemValue;

    const userSnap = await tx.get(userRef);
    const coins = Number((userSnap.exists ? userSnap.get('coins') : 0) || 0) + redeemValue;
    tx.set(userRef, { coins, giftRedeemedValue: admin.firestore.FieldValue.increment(redeemValue) }, { merge: true });
    tx.set(txRef, { userId: uid, type: 'redeem', amount: redeemValue, createdAt: admin.firestore.FieldValue.serverTimestamp(), metadata: { kind: 'gift_redeem', receiptId } });
    tx.update(receiptRef, { redeemed: true, redeemedAt: admin.firestore.FieldValue.serverTimestamp(), redeemValue, status: 'read' });
  });

  return { ok: true, redeemValue: redeemValueReturn };
});

// Ensure userVibes docs always have expiresAt and isActive on create
export const userVibesOnCreate = functions.firestore.document('userVibes/{vibeId}').onCreate(async (snap) => {
  try {
    const data = snap.data() || {} as any;
    const hasExpiresAt = !!data.expiresAt;
    const isActive = data.isActive !== false;

    if (!hasExpiresAt || !isActive) {
      const expiresAt = hasExpiresAt
        ? data.expiresAt
        : admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));

      await snap.ref.set({ expiresAt, isActive: true }, { merge: true });
    }

    return null;
  } catch (e) {
    console.error('userVibesOnCreate error', e);
    return null;
  }
});

// Scheduled cleanup: expire user vibes after 24h (delete + clear users.currentVibe if matches + purge subcollections)
export const cleanupExpiredVibes = functions.pubsub
  .schedule('every 15 minutes')
  .timeZone('Asia/Ho_Chi_Minh')
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    const pageSize = 300; // limit per run

    const snap = await db
      .collection('userVibes')
      .where('expiresAt', '<=', now)
      .limit(pageSize)
      .get();

    if (snap.empty) {
      console.log('cleanupExpiredVibes: no expired vibes.');
      return null;
    }

    const results = await Promise.all(
      snap.docs.map(async (docSnap) => {
        try {
          await db.runTransaction(async (tx: any) => {
            const ref = docSnap.ref;
            const fresh = await tx.get(ref);
            if (!fresh.exists) return;

            const userId = String(fresh.get('userId') || '');

            // Clear users.currentVibe if it points to this vibe
            if (userId) {
              const userRef = db.collection('users').doc(userId);
              const userSnap = await tx.get(userRef);
              if (userSnap.exists) {
                const currentVibe = userSnap.get('currentVibe');
                if (currentVibe && currentVibe.id === ref.id) {
                  tx.update(userRef, { currentVibe: null });
                }
              }
            }

            // Delete expired vibe doc
            tx.delete(ref);
          });

          // Best-effort delete of known subcollections
          const reactionsDeleted = await deleteSubcollection(docSnap.ref, 'reactions');
          const seenByDeleted = await deleteSubcollection(docSnap.ref, 'seenBy');
          console.log(`cleanupExpiredVibes: purged subcollections reactions=${reactionsDeleted}, seenBy=${seenByDeleted} for ${docSnap.id}`);

          return { id: docSnap.id, ok: true };
        } catch (e) {
          console.error('cleanupExpiredVibes: failed for', docSnap.id, e);
          return { id: docSnap.id, ok: false };
        }
      })
    );

    const ok = results.filter((r) => r && r.ok).length;
    console.log(`cleanupExpiredVibes: deleted ${ok}/${snap.size} expired vibes`);
    return null;
  });
