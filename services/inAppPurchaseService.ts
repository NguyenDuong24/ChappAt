/**
 * In-App Purchase Service — Google Play Billing & Apple IAP
 * 
 * Wraps react-native-iap for coin/VIP purchases.
 * Only used on Android (Google Play) and iOS (App Store).
 * 
 * Dependencies: react-native-iap
 * Install: npx expo install react-native-iap
 * Config: Add "react-native-iap" to app.json plugins array
 */
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  type PurchaseError,
  type Product,
  type Purchase,
} from 'react-native-iap';
import { Platform } from 'react-native';

// ─── Product IDs (SKUs) ────────────────────────────────────────
// These must match EXACTLY with Google Play Console & App Store Connect
export const IAP_PRODUCT_IDS = {
  // Coin packages — consumable
  coin_10: 'com.saigonmatch.coin_10',
  coin_50: 'com.saigonmatch.coin_50',
  coin_100: 'com.saigonmatch.coin_100',
  coin_500: 'com.saigonmatch.coin_500',

  // Pro subscription — non-consumable / subscription
  pro_monthly: 'com.saigonmatch.pro_monthly',
} as const;

// ─── Types ──────────────────────────────────────────────────────
export interface IAPProductInfo {
  productId: string;
  price: string;           // Formatted price (e.g. "10.000 ₫")
  priceAmountMicros: number;
  priceCurrencyCode: string;
  title: string;
  description: string;
  type: 'inapp' | 'subs';
}

export interface IAPPurchaseResult {
  success: boolean;
  productId: string;
  transactionId?: string;
  transactionDate?: string;
  receipt?: string;
  purchaseToken?: string;
  purchase?: Purchase;
  error?: string;
  errorCode?: string;
}

export type IAPPurchaseHandler = (result: IAPPurchaseResult) => Promise<void>;

// ─── Service ────────────────────────────────────────────────────

let initialized = false;
let purchaseListeners: IAPPurchaseHandler[] = [];
const IAP_ENABLED = process.env.EXPO_PUBLIC_ENABLE_IAP === 'true';

export const inAppPurchaseService = {
  /**
   * Initialize IAP connection. Call once on app startup.
   */
  async initialize(): Promise<boolean> {
    if (initialized) return true;
    if (!this.isAvailable()) {
      console.info('[IAP] Skipped initialization: IAP is disabled or unsupported in this build. Set EXPO_PUBLIC_ENABLE_IAP=true for store builds.');
      return false;
    }

    try {
      // initConnection in v15+ handles flushFailedPurchasesCachedAsPending internally
      await initConnection();
      initialized = true;
      console.log('[IAP] Connection initialized');
      return true;
    } catch (err) {
      console.warn('[IAP] Store billing connection unavailable; falling back to non-IAP payment flow.', err);
      return false;
    }
  },

  /**
   * Clean up IAP connection. Call on app teardown.
   */
  async shutdown(): Promise<void> {
    try {
      await endConnection();
    } catch (err) {
      console.error('[IAP] Shutdown error:', err);
    }
    initialized = false;
  },

  /**
   * Fetch product details from the store
   */
  async getProducts(
    productIds: string[],
  ): Promise<IAPProductInfo[]> {
    if (!initialized) await this.initialize();

    try {
      const products = await fetchProducts({ skus: productIds, type: 'in-app' });

      return products.map((p: any): IAPProductInfo => ({
        productId: p.id,
        price: p.displayPrice || String(p.price ?? ''),
        priceAmountMicros: (p as any).priceAmountMicros ?? 0,
        priceCurrencyCode: p.currency || 'VND',
        title: p.title || '',
        description: p.description || '',
        type: ((p as any).type === 'subs' ? 'subs' : 'inapp') as 'inapp' | 'subs',
      }));
    } catch (err) {
      console.error('[IAP] Failed to get products:', err);
      return [];
    }
  },

  /**
   * Initiate a purchase
   */
  async purchase(
    productId: string,
    offerToken?: string,
  ): Promise<IAPPurchaseResult> {
    if (!initialized) {
      const ok = await this.initialize();
      if (!ok) return { success: false, productId, error: 'IAP not available' };
    }

    try {
      const isSubscription = productId.includes('pro_');
      const request = Platform.OS === 'android'
        ? { google: { skus: [productId], ...(offerToken ? { offerToken } : {}) } }
        : { apple: { sku: productId } };

      const result = await requestPurchase({
        request,
        type: isSubscription ? 'subs' : 'in-app',
      });

      // Handle both single Purchase (v15/Nitro) and Purchase[] (older)
      const purchases: Purchase[] = Array.isArray(result) ? result : [result];
      
      if (!purchases || purchases.length === 0) {
        return {
          success: false,
          productId,
          error: 'Purchase was cancelled',
        };
      }

      const first = purchases[0];

      return {
        success: true,
        productId,
        transactionId: first.transactionId,
        transactionDate: String(first.transactionDate),
        receipt: (first as any).receipt || (first as any).transactionReceipt,
        purchaseToken: (first as any).purchaseToken,
        purchase: first,
      };
    } catch (err: any) {
      const purchaseError = err as PurchaseError;

      // User cancelled — don't treat as error
      if (
        String(purchaseError?.code) === 'E_USER_CANCELLED' ||
        purchaseError?.message?.includes('cancelled')
      ) {
        return { success: false, productId, error: 'cancelled' };
      }

      console.error('[IAP] Purchase error:', err);
      return {
        success: false,
        productId,
        error: purchaseError?.message || String(err),
        errorCode: purchaseError?.code,
      };
    }
  },

  /**
   * Verify purchase with server (validates receipt with Google/Apple)
   */
  async verifyPurchase(
    purchase: IAPPurchaseResult,
    token: string,
  ): Promise<boolean> {
    try {
      const API_BASE_URL = (process.env.EXPO_PUBLIC_SAIGON_SERVER_API_URL || 'https://saigonmatch.com.vn/api').replace(/\/$/, '');
      const response = await fetch(`${API_BASE_URL}/iap/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: purchase.productId,
          transactionId: purchase.transactionId || purchase.purchaseToken,
          receipt: purchase.purchaseToken || purchase.receipt,
          platform: Platform.OS,
        }),
      });

      if (!response.ok) {
        console.error('[IAP] Server verification failed:', response.status);
        return false;
      }

      const data = await response.json();
      const verified = data.valid === true || data.success === true;
      if (verified && purchase.purchase) {
        await finishTransaction({
          purchase: purchase.purchase,
          isConsumable: !purchase.productId.includes('pro_'),
        });
      }

      return verified;
    } catch (err) {
      console.error('[IAP] Verification request failed:', err);
      return false;
    }
  },

  /**
   * Register a purchase completion handler
   */
  onPurchaseCompleted(handler: IAPPurchaseHandler): () => void {
    purchaseListeners.push(handler);
    return () => {
      purchaseListeners = purchaseListeners.filter((h) => h !== handler);
    };
  },

  /**
   * Map coin package id to IAP product id
   */
  getProductId(packageId: string): string {
    const key = packageId as keyof typeof IAP_PRODUCT_IDS;
    return IAP_PRODUCT_IDS[key] || packageId;
  },

  /**
   * Check if IAP is available on this platform
   */
  isAvailable(): boolean {
    // Google Play Billing only on Android, Apple IAP only on iOS
    // Web and other platforms fall back to VietQR
    return IAP_ENABLED && (Platform.OS === 'android' || Platform.OS === 'ios');
  },
};

export default inAppPurchaseService;

