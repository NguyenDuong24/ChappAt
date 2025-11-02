"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.giftsRedeem = exports.giftsSend = exports.walletPurchase = exports.walletSpend = exports.walletTopup = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
// Utility to adjust coins atomically
async function adjustCoins(uid, delta) {
    const userRef = db.collection('users').doc(uid);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        const coins = (snap.exists ? Number(snap.get('coins') || 0) : 0) + delta;
        if (coins < 0)
            throw new functions.https.HttpsError('failed-precondition', 'INSUFFICIENT_FUNDS');
        tx.set(userRef, { coins }, { merge: true });
    });
}
// Record a coin transaction
async function logCoinTx(uid, type, amount, metadata = {}) {
    const txRef = db.collection('users').doc(uid).collection('coinTransactions').doc();
    await txRef.set({ userId: uid, type, amount, createdAt: admin.firestore.FieldValue.serverTimestamp(), metadata });
}
exports.walletTopup = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'auth required');
    const uid = context.auth.uid;
    const amount = Number(data?.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0)
        throw new functions.https.HttpsError('invalid-argument', 'amount');
    await adjustCoins(uid, amount);
    await logCoinTx(uid, 'topup', amount, data?.metadata || {});
    return { ok: true };
});
exports.walletSpend = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'auth required');
    const uid = context.auth.uid;
    const amount = Number(data?.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0)
        throw new functions.https.HttpsError('invalid-argument', 'amount');
    await adjustCoins(uid, -amount);
    await logCoinTx(uid, 'spend', -amount, data?.metadata || {});
    return { ok: true };
});
// Purchase via itemId read from shopItems/{itemId}
exports.walletPurchase = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'auth required');
    const uid = context.auth.uid;
    const itemId = String(data?.itemId || '');
    if (!itemId)
        throw new functions.https.HttpsError('invalid-argument', 'itemId');
    const itemRef = db.collection('shopItems').doc(itemId);
    await db.runTransaction(async (tx) => {
        const [itemSnap, userSnap] = await Promise.all([tx.get(itemRef), tx.get(db.collection('users').doc(uid))]);
        if (!itemSnap.exists)
            throw new functions.https.HttpsError('not-found', 'ITEM_NOT_FOUND');
        const price = Number(itemSnap.get('price') || 0);
        if (!Number.isFinite(price) || price <= 0)
            throw new functions.https.HttpsError('failed-precondition', 'INVALID_PRICE');
        const coins = Number((userSnap.exists ? userSnap.get('coins') : 0) || 0);
        if (coins < price)
            throw new functions.https.HttpsError('failed-precondition', 'INSUFFICIENT_FUNDS');
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
exports.giftsSend = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'auth required');
    const senderUid = context.auth.uid;
    const receiverUid = String(data?.receiverUid || '');
    const roomId = String(data?.roomId || '');
    const giftId = String(data?.giftId || '');
    const senderName = String(data?.senderName || '');
    if (!receiverUid || !roomId || !giftId)
        throw new functions.https.HttpsError('invalid-argument', 'params');
    if (receiverUid === senderUid)
        throw new functions.https.HttpsError('failed-precondition', 'CANNOT_GIFT_SELF');
    const giftRef = db.collection('gifts').doc(giftId);
    const userRef = db.collection('users').doc(senderUid);
    const receiverRef = db.collection('users').doc(receiverUid);
    const messageRef = db.collection('rooms').doc(roomId).collection('messages').doc();
    const receiptRef = receiverRef.collection('giftsReceived').doc();
    const txRef = userRef.collection('coinTransactions').doc();
    await db.runTransaction(async (tx) => {
        const [giftSnap, userSnap] = await Promise.all([tx.get(giftRef), tx.get(userRef)]);
        let gift = null;
        if (!giftSnap.exists) {
            // fallback from env default
            const fallback = [
                { id: 'banh-mi-thit', name: 'Bánh mì thịt', price: 20, icon: '🥖' },
                { id: 'tra-sua', name: 'Trà sữa', price: 15, icon: '🧋' },
                { id: 'hoa-hong', name: 'Hoa hồng', price: 10, icon: '🌹' },
                { id: 'cafe-sua', name: 'Cà phê sữa', price: 12, icon: '☕️' },
            ].find(g => g.id === giftId) || null;
            if (!fallback)
                throw new functions.https.HttpsError('not-found', 'GIFT_NOT_FOUND');
            gift = fallback;
        }
        else {
            const d = giftSnap.data();
            if (d.active === false)
                throw new functions.https.HttpsError('failed-precondition', 'GIFT_INACTIVE');
            gift = { id: giftSnap.id, name: d.name || giftSnap.id, price: Number(d.price || 0), icon: d.icon };
            if (!Number.isFinite(gift.price) || gift.price <= 0)
                throw new functions.https.HttpsError('failed-precondition', 'INVALID_GIFT_PRICE');
        }
        const coins = Number((userSnap.exists ? userSnap.get('coins') : 0) || 0);
        if (coins < gift.price)
            throw new functions.https.HttpsError('failed-precondition', 'INSUFFICIENT_FUNDS');
        // Deduct coins and write artifacts
        tx.set(userRef, { coins: coins - gift.price }, { merge: true });
        tx.set(txRef, { userId: senderUid, type: 'spend', amount: -gift.price, createdAt: admin.firestore.FieldValue.serverTimestamp(), metadata: { kind: 'gift', giftId: gift.id, to: receiverUid, roomId } });
        tx.set(messageRef, { uid: senderUid, toUid: receiverUid, type: 'gift', text: `🎁 ${senderName || 'Bạn'} đã tặng quà: ${gift.icon || ''} ${gift.name} (🥖 ${gift.price})`, gift: { id: gift.id, name: gift.name, price: gift.price, icon: gift.icon || '🎁' }, createdAt: admin.firestore.FieldValue.serverTimestamp(), status: 'sent', readBy: [] });
        tx.set(receiptRef, { fromUid: senderUid, fromName: senderName || 'Bạn', roomId, gift: { id: gift.id, name: gift.name, price: gift.price, icon: gift.icon || '🎁' }, createdAt: admin.firestore.FieldValue.serverTimestamp(), status: 'unread' });
        tx.set(receiverRef, { giftReceivedCount: admin.firestore.FieldValue.increment(1), giftReceivedValue: admin.firestore.FieldValue.increment(gift.price) }, { merge: true });
    });
    return { ok: true };
});
exports.giftsRedeem = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'auth required');
    const uid = context.auth.uid;
    const receiptId = String(data?.receiptId || '');
    const rate = Number(data?.rate ?? 1);
    if (!receiptId)
        throw new functions.https.HttpsError('invalid-argument', 'receiptId');
    const receiptRef = db.collection('users').doc(uid).collection('giftsReceived').doc(receiptId);
    const userRef = db.collection('users').doc(uid);
    const txRef = userRef.collection('coinTransactions').doc();
    let redeemValueReturn = 0;
    await db.runTransaction(async (tx) => {
        const receiptSnap = await tx.get(receiptRef);
        if (!receiptSnap.exists)
            throw new functions.https.HttpsError('not-found', 'RECEIPT_NOT_FOUND');
        const rec = receiptSnap.data();
        if (rec.redeemed)
            throw new functions.https.HttpsError('failed-precondition', 'ALREADY_REDEEMED');
        const price = Number(rec?.gift?.price || 0);
        const redeemValue = Math.max(0, Math.round(price * (Number.isFinite(rate) ? Math.max(0, Math.min(1, rate)) : 1)));
        if (!Number.isFinite(redeemValue) || redeemValue <= 0)
            throw new functions.https.HttpsError('failed-precondition', 'INVALID_REDEEM_VALUE');
        redeemValueReturn = redeemValue;
        const userSnap = await tx.get(userRef);
        const coins = Number((userSnap.exists ? userSnap.get('coins') : 0) || 0) + redeemValue;
        tx.set(userRef, { coins, giftRedeemedValue: admin.firestore.FieldValue.increment(redeemValue) }, { merge: true });
        tx.set(txRef, { userId: uid, type: 'redeem', amount: redeemValue, createdAt: admin.firestore.FieldValue.serverTimestamp(), metadata: { kind: 'gift_redeem', receiptId } });
        tx.update(receiptRef, { redeemed: true, redeemedAt: admin.firestore.FieldValue.serverTimestamp(), redeemValue, status: 'read' });
    });
    return { ok: true, redeemValue: redeemValueReturn };
});
