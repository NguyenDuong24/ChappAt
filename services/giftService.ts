import { db, functions as fbFunctions } from '../firebaseConfig';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query as fsQuery,
  runTransaction,
  serverTimestamp,
  onSnapshot,
  orderBy,
  limit as fsLimit,
  startAfter,
  QueryDocumentSnapshot,
  updateDoc,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

export interface GiftItem {
  id: string;
  name: string;
  price: number; // cost in coins (Bánh mì)
  icon?: string; // emoji or image URL
  active?: boolean;
}

export interface GiftReceiptDoc {
  id: string;
  fromUid: string;
  fromName?: string;
  roomId: string;
  gift: { id: string; name: string; price: number; icon?: string };
  createdAt: any;
  status?: 'unread' | 'read';
  // Redeem info
  redeemed?: boolean;
  redeemedAt?: any;
  redeemValue?: number;
}

const GIFTS_COLLECTION = 'gifts';
const USERS = 'users';

// Cache catalog để giảm số lần getDocs
let giftCatalogCache: { items: GiftItem[]; fetchedAt: number } | null = null;
const GIFT_CACHE_TTL = 5 * 60 * 1000; // 5 phút

const fallbackGifts: GiftItem[] = [
  { id: 'banh-mi-thit', name: 'Bánh mì thịt', price: 20, icon: '🥖', active: true },
  { id: 'tra-sua', name: 'Trà sữa', price: 15, icon: '🧋', active: true },
  { id: 'hoa-hong', name: 'Hoa hồng', price: 10, icon: '🌹', active: true },
  { id: 'cafe-sua', name: 'Cà phê sữa', price: 12, icon: '☕️', active: true },
];

function isFunctionNotFoundError(e: any) {
  const code = e?.code || e?.error?.code || '';
  const msg = String(e?.message || e?.error?.message || '').toLowerCase();
  return code === 'functions/not-found' || code === 'not-found' || msg.includes('not-found') || msg.includes('function not found');
}

export async function getGiftCatalog(): Promise<GiftItem[]> {
  // Dùng cache nếu còn hạn
  if (giftCatalogCache && Date.now() - giftCatalogCache.fetchedAt < GIFT_CACHE_TTL) {
    return giftCatalogCache.items;
  }
  const col = collection(db, GIFTS_COLLECTION);
  const snap = await getDocs(col);
  if (snap.empty) {
    giftCatalogCache = { items: fallbackGifts, fetchedAt: Date.now() };
    return fallbackGifts;
  }
  const items: GiftItem[] = [];
  snap.forEach((d) => {
    const data = d.data() as any;
    if (data && (data.active ?? true)) {
      items.push({
        id: d.id,
        name: data.name || d.id,
        price: Number(data.price || 0),
        icon: data.icon,
        active: data.active ?? true,
      });
    }
  });
  const sorted = items.sort((a, b) => a.price - b.price);
  giftCatalogCache = { items: sorted, fetchedAt: Date.now() };
  return sorted;
}

async function sendGiftLocal(params: {
  senderUid: string;
  senderName: string;
  receiverUid: string;
  roomId: string;
  giftId: string;
}) {
  const { senderUid, senderName, receiverUid, roomId, giftId } = params;
  const userRef = doc(db, USERS, senderUid);
  const receiverRef = doc(db, USERS, receiverUid);
  const giftRef = doc(db, GIFTS_COLLECTION, giftId);
  const txRef = doc(collection(db, USERS, senderUid, 'coinTransactions'));
  const messageRef = doc(collection(db, 'rooms', roomId, 'messages'));
  const receiptRef = doc(collection(db, USERS, receiverUid, 'giftsReceived'));

  // Try cache/fallback first
  let cachedGift: GiftItem | undefined;
  if (giftCatalogCache && Date.now() - giftCatalogCache.fetchedAt < GIFT_CACHE_TTL) {
    cachedGift = giftCatalogCache.items.find((g) => g.id === giftId);
  }
  if (!cachedGift) cachedGift = fallbackGifts.find((g) => g.id === giftId);

  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);

    let gift: GiftItem | null = null;
    if (cachedGift && (cachedGift.active ?? true) && Number(cachedGift.price) > 0) {
      gift = { ...cachedGift };
    } else {
      const giftSnap = await tx.get(giftRef);
      if (!giftSnap.exists()) {
        const fb = fallbackGifts.find((g) => g.id === giftId) || null;
        if (!fb) throw new Error('GIFT_NOT_FOUND');
        gift = fb;
      } else {
        const data = giftSnap.data() as any;
        if (data?.active === false) throw new Error('GIFT_INACTIVE');
        gift = { id: giftSnap.id, name: data.name || giftSnap.id, price: Number(data.price || 0), icon: data.icon, active: data.active ?? true };
      }
    }

    if (!gift || !Number.isFinite(gift.price) || gift.price <= 0) throw new Error('INVALID_GIFT_PRICE');

    const current = userSnap.exists() ? Number((userSnap.data() as any).coins || 0) : 0;
    if (current < gift.price) throw new Error('INSUFFICIENT_FUNDS');

    tx.set(userRef, { coins: increment(-gift.price) }, { merge: true });
    tx.set(txRef, { userId: senderUid, type: 'spend', amount: -gift.price, createdAt: serverTimestamp(), metadata: { kind: 'gift', giftId: gift.id, to: receiverUid, roomId } });
    tx.set(messageRef, { uid: senderUid, toUid: receiverUid, type: 'gift', text: `🎁 ${senderName || 'Bạn'} đã tặng quà: ${gift.icon || ''} ${gift.name} (🥖 ${gift.price})`, gift: { id: gift.id, name: gift.name, price: gift.price, icon: gift.icon || '🎁' }, createdAt: serverTimestamp(), status: 'sent', readBy: [] });
    tx.set(receiptRef, { fromUid: senderUid, fromName: senderName || 'Bạn', roomId, gift: { id: gift.id, name: gift.name, price: gift.price, icon: gift.icon || '🎁' }, createdAt: serverTimestamp(), status: 'unread' });
    tx.set(receiverRef, { giftReceivedCount: increment(1), giftReceivedValue: increment(gift.price) }, { merge: true });
  });
}

export async function sendGift(params: {
  senderUid: string;
  senderName: string;
  receiverUid: string;
  roomId: string;
  giftId: string;
}) {
  const { senderUid, senderName, receiverUid, roomId, giftId } = params;
  if (!senderUid || !receiverUid || !roomId || !giftId) throw new Error('Missing params');
  if (senderUid === receiverUid) throw new Error('CANNOT_GIFT_SELF');

  const fn = httpsCallable(fbFunctions, 'giftsSend');
  try {
    await fn({ receiverUid, roomId, giftId, senderName });
  } catch (e: any) {
    if (isFunctionNotFoundError(e)) {
      // Fallback local when callable not available (dev/no billing)
      await sendGiftLocal(params);
    } else {
      throw e;
    }
  }
}

// Receiver APIs
export async function listReceivedGifts(uid: string, options: { pageSize?: number; cursor?: QueryDocumentSnapshot | null } = {}) {
  const pageSize = options.pageSize ?? 20;
  const colRef = collection(db, USERS, uid, 'giftsReceived');
  let built = fsQuery(colRef, orderBy('createdAt', 'desc'), fsLimit(pageSize));
  if (options.cursor) built = fsQuery(colRef, orderBy('createdAt', 'desc'), startAfter(options.cursor), fsLimit(pageSize));
  const snap = await getDocs(built);
  const items: GiftReceiptDoc[] = [];
  snap.forEach((d) => {
    const data = d.data() as any;
    items.push({
      id: d.id,
      fromUid: data.fromUid,
      fromName: data.fromName,
      roomId: data.roomId,
      gift: data.gift,
      createdAt: data.createdAt,
      status: data.status,
      redeemed: data.redeemed,
      redeemedAt: data.redeemedAt,
      redeemValue: data.redeemValue,
    });
  });
  const last = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
  return { items, cursor: last };
}

// Cho phép người nhận quy đổi quà về Bánh mì (dùng increment để không cần đọc user)
export async function redeemGiftReceipt(uid: string, receiptId: string, options: { rate?: number } = {}) {
  const rate = typeof options.rate === 'number' ? Math.max(0, Math.min(1, options.rate)) : 1;
  const fn = httpsCallable(fbFunctions, 'giftsRedeem');
  try {
    const res: any = await fn({ receiptId, rate });
    return { redeemValue: res?.data?.redeemValue } as any;
  } catch (e: any) {
    if (isFunctionNotFoundError(e)) {
      return await redeemGiftLocal(uid, receiptId, rate);
    }
    throw e;
  }
}

async function redeemGiftLocal(uid: string, receiptId: string, rate = 1) {
  const receiptRef = doc(db, USERS, uid, 'giftsReceived', receiptId);
  const userRef = doc(db, USERS, uid);
  const txRef = doc(collection(db, USERS, uid, 'coinTransactions'));

  return runTransaction(db, async (tx) => {
    const receiptSnap = await tx.get(receiptRef);
    if (!receiptSnap.exists()) throw new Error('RECEIPT_NOT_FOUND');
    const receipt = receiptSnap.data() as any;
    if (receipt.redeemed) throw new Error('ALREADY_REDEEMED');

    const gift = receipt.gift as { id: string; name: string; price: number; icon?: string };
    const price = Number(gift?.price || 0);
    const redeemValue = Math.max(0, Math.round(price * rate));
    if (!Number.isFinite(redeemValue) || redeemValue <= 0) throw new Error('INVALID_REDEEM_VALUE');

    tx.set(userRef, { coins: increment(redeemValue), giftRedeemedValue: increment(redeemValue) }, { merge: true });
    tx.set(txRef, { userId: uid, type: 'redeem', amount: redeemValue, createdAt: serverTimestamp(), metadata: { kind: 'gift_redeem', receiptId, giftId: gift.id, rate } });
    tx.update(receiptRef, { redeemed: true, redeemedAt: serverTimestamp(), redeemValue, status: 'read' });

    return { redeemValue };
  });
}

export function subscribeReceivedGifts(uid: string, cb: (items: GiftReceiptDoc[]) => void) {
  const colRef = collection(db, USERS, uid, 'giftsReceived');
  const q = fsQuery(colRef, orderBy('createdAt', 'desc'), fsLimit(50));
  return onSnapshot(q, (snap) => {
    const list: GiftReceiptDoc[] = [];
    snap.forEach((d) => {
      const data = d.data() as any;
      list.push({ id: d.id, ...data } as GiftReceiptDoc);
    });
    cb(list);
  });
}

export async function markGiftReceiptRead(uid: string, receiptId: string) {
  const ref = doc(db, USERS, uid, 'giftsReceived', receiptId);
  await updateDoc(ref, { status: 'read' });
}

// Gộp nhiều receipt về trạng thái "read" trong 1 batch
export async function markGiftReceiptsReadBatch(uid: string, ids: string[]) {
  if (!ids || ids.length === 0) return;
  const batch = writeBatch(db);
  ids.forEach((id) => {
    const ref = doc(db, USERS, uid, 'giftsReceived', id);
    batch.update(ref, { status: 'read' });
  });
  await batch.commit();
}

export const giftService = { getGiftCatalog, sendGift, listReceivedGifts, subscribeReceivedGifts, markGiftReceiptRead, redeemGiftReceipt, markGiftReceiptsReadBatch };
