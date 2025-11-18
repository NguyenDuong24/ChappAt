import { coinServerApi } from '../src/services/coinServerApi';

export type CoinTransactionType = 'topup' | 'spend' | 'purchase' | 'adjustment';

export interface CoinTransaction {
  id?: string;
  userId: string;
  type: CoinTransactionType;
  amount: number; // positive for topup, negative for spend/purchase
  createdAt?: any;
  metadata?: Record<string, any>;
}

async function getBalance(): Promise<number> {
  const response = await coinServerApi.getBalance();
  if (response.success) {
    return response.coins;
  } else {
    throw new Error('Failed to get balance');
  }
}

async function topup(uid: string, amount: number, metadata: Record<string, any> = {}) {
  if (!uid) throw new Error('Missing uid');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Amount must be > 0');
  // Use coin server instead of Cloud Functions
  await coinServerApi.topup(amount, metadata);
}

async function spend(uid: string, amount: number, metadata: Record<string, any> = {}) {
  if (!uid) throw new Error('Missing uid');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Amount must be > 0');
  // Use coin server instead of Cloud Functions
  await coinServerApi.spend(amount, metadata);
}

async function purchaseItem(uid: string, itemId: string) {
  if (!uid) throw new Error('Missing uid');
  if (!itemId) throw new Error('Missing itemId');
  // Use coin server instead of Cloud Functions
  await coinServerApi.purchaseItem(itemId);
}

export const walletService = {
  getBalance,
  topup,
  spend,
  purchaseItem,
};
