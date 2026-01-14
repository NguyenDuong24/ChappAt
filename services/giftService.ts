import { coinServerApi } from '../src/services/coinServerApi';

export interface GiftItem {
  id: string;
  name: string;
  price: number;
  currencyType?: 'coins' | 'banhMi';
  icon?: string;
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

export async function getGiftCatalog(): Promise<GiftItem[]> {
  try {
    const res = await coinServerApi.getGiftCatalog();
    return res.gifts || [];
  } catch (e) {
    console.error('Failed to get gift catalog from server:', e);
    // Fallback to empty array if server fails
    return [];
  }
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

  return await coinServerApi.sendGift(receiverUid, roomId, giftId, senderName || 'Bạn');
}

export async function listReceivedGifts(uid: string, options: { pageSize?: number; status?: string } = {}) {
  const pageSize = options.pageSize ?? 20;
  const status = options.status;
  try {
    const res = await coinServerApi.getReceivedGifts(pageSize, status);
    const items: GiftReceiptDoc[] = (res.gifts || []).map((g: any) => ({
      id: g.id,
      fromUid: g.fromUid,
      fromName: g.fromName,
      roomId: g.roomId,
      gift: g.gift,
      createdAt: g.createdAt,
      status: g.status,
      redeemed: g.redeemed,
      redeemedAt: g.redeemedAt,
      redeemValue: g.redeemValue,
    }));
    return { items, cursor: null }; // No cursor for now, server doesn't support pagination yet
  } catch (e) {
    console.error('Failed to get received gifts from server:', e);
    return { items: [], cursor: null };
  }
}

export async function redeemGiftReceipt(uid: string, receiptId: string, options: { rate?: number } = {}) {
  const rate = typeof options.rate === 'number' ? Math.max(0, Math.min(1, options.rate)) : 1;
  const res = await coinServerApi.redeemGift(receiptId, rate);
  return { redeemValue: res.redeemValue };
}

// For realtime, we still need Firestore subscription for now
// TODO: Implement realtime on server or use polling
export function subscribeReceivedGifts(uid: string, cb: (items: GiftReceiptDoc[]) => void) {
  // Temporary: return empty function, implement polling later if needed
  console.warn('subscribeReceivedGifts not implemented yet, using server API only');
  cb([]);
  return () => { }; // unsubscribe function
}

export async function markGiftReceiptRead(uid: string, receiptId: string) {
  // Server doesn't have mark read yet, TODO: add to server
  console.warn('markGiftReceiptRead not implemented on server yet');
}

export async function markGiftReceiptsReadBatch(uid: string, ids: string[]) {
  // Server doesn't have batch mark read yet, TODO: add to server
  console.warn('markGiftReceiptsReadBatch not implemented on server yet');
}

export const giftService = { getGiftCatalog, sendGift, listReceivedGifts, subscribeReceivedGifts, markGiftReceiptRead, redeemGiftReceipt, markGiftReceiptsReadBatch };
