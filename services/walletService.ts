import { db, functions as fbFunctions } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

export type CoinTransactionType = 'topup' | 'spend' | 'purchase' | 'adjustment';

export interface CoinTransaction {
  id?: string;
  userId: string;
  type: CoinTransactionType;
  amount: number; // positive for topup, negative for spend/purchase
  createdAt?: any;
  metadata?: Record<string, any>;
}

const USER_COLLECTION = 'users';

async function getBalance(uid: string): Promise<number> {
  const userRef = doc(db, USER_COLLECTION, uid);
  const snap = await getDoc(userRef);
  const data = snap.exists() ? (snap.data() as any) : {};
  return Number(data.coins || 0);
}

async function topup(uid: string, amount: number, metadata: Record<string, any> = {}) {
  if (!uid) throw new Error('Missing uid');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Amount must be > 0');
  const fn = httpsCallable(fbFunctions, 'walletTopup');
  await fn({ amount, metadata });
}

async function spend(uid: string, amount: number, metadata: Record<string, any> = {}) {
  if (!uid) throw new Error('Missing uid');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Amount must be > 0');
  const fn = httpsCallable(fbFunctions, 'walletSpend');
  await fn({ amount, metadata });
}

async function purchaseItem(uid: string, itemId: string) {
  if (!uid) throw new Error('Missing uid');
  if (!itemId) throw new Error('Missing itemId');
  const fn = httpsCallable(fbFunctions, 'walletPurchase');
  await fn({ itemId });
}

export const walletService = {
  getBalance,
  topup,
  spend,
  purchaseItem,
};
