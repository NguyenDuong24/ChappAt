/**
 * Unified Payment Service
 * 
 * Routes payment to appropriate provider:
 * - Android (Google Play): react-native-iap → Google Play Billing
 * - iOS (App Store):      react-native-iap → Apple IAP  
 * - Web / Fallback:        VietQR / Bank Transfer
 * 
 * This keeps both payment paths while being CHPlay-compliant.
 */
import { Platform } from 'react-native';
import { inAppPurchaseService, IAPPurchaseResult } from './inAppPurchaseService';
import { vietqrPaymentService, COIN_PACKAGES, CoinPackage } from './vietqrPaymentService';

// ─── Types ──────────────────────────────────────────────────────

export type PaymentProvider = 'google_play' | 'apple_iap' | 'vietqr' | 'none';

export interface UnifiedProduct {
  packageId: string;
  coins: number;
  priceVND: number;          // VND price (for display)
  iapProductId?: string;     // Google Play / App Store SKU
  iapPrice?: string;         // Formatted IAP price (e.g. "10.000 ₫")
  name: string;
  bonus: number;
  discount: number;
}

export interface UnifiedPurchaseResult {
  success: boolean;
  provider: PaymentProvider;
  orderId?: string;
  transactionId?: string;
  productId: string;
  coinsAwarded: number;
  bonusAwarded: number;
  amountPaid: number;
  error?: string;
}

// ─── Product Mapping ────────────────────────────────────────────

/**
 * Map app's coin packages to unified products.
 * Each package has both an IAP SKU (for Play/App Store)
 * and a VietQR price (for web/fallback).
 */
export const UNIFIED_PRODUCTS: UnifiedProduct[] = [
  {
    packageId: 'coin_10',
    coins: 10,
    priceVND: 1000,
    iapProductId: 'com.saigonmatch.coin_10',
    name: '10 Coin',
    bonus: 0,
    discount: 0,
  },
  {
    packageId: 'coin_50',
    coins: 50,
    priceVND: 2000,
    iapProductId: 'com.saigonmatch.coin_50',
    name: '50 Coin',
    bonus: 5,
    discount: 10,
  },
  {
    packageId: 'coin_100',
    coins: 100,
    priceVND: 3000,
    iapProductId: 'com.saigonmatch.coin_100',
    name: '100 Coin',
    bonus: 20,
    discount: 20,
  },
  {
    packageId: 'coin_500',
    coins: 500,
    priceVND: 5000,
    iapProductId: 'com.saigonmatch.coin_500',
    name: '500 Coin',
    bonus: 150,
    discount: 30,
  },
];

// ─── Service ────────────────────────────────────────────────────

export const unifiedPaymentService = {
  /**
   * Initialize payment systems
   */
  async initialize(): Promise<void> {
    if (inAppPurchaseService.isAvailable()) {
      await inAppPurchaseService.initialize();
    }
  },

  /**
   * Get available payment provider for current platform
   */
  getProvider(): PaymentProvider {
    if (!inAppPurchaseService.isAvailable()) return 'vietqr';
    if (Platform.OS === 'android') return 'google_play';
    if (Platform.OS === 'ios') return 'apple_iap';
    // Web / other platforms — VietQR
    return 'vietqr';
  },

  /**
   * Get products with IAP prices populated
   */
  async getProductsWithPrices(): Promise<UnifiedProduct[]> {
    const provider = this.getProvider();

    if (provider === 'google_play' || provider === 'apple_iap') {
      const iapSkus = UNIFIED_PRODUCTS
        .map((p) => p.iapProductId!)
        .filter(Boolean);

      const iapProducts = await inAppPurchaseService.getProducts(iapSkus);

      // Merge IAP prices into unified products
      return UNIFIED_PRODUCTS.map((product) => {
        const iap = iapProducts.find((i) => i.productId === product.iapProductId);
        return {
          ...product,
          iapPrice: iap?.price ?? `${product.priceVND.toLocaleString('vi-VN')} ₫`,
        };
      });
    }

    // Web/VietQR — use static VND prices
    return UNIFIED_PRODUCTS.map((p) => ({
      ...p,
      iapPrice: `${p.priceVND.toLocaleString('vi-VN')} ₫`,
    }));
  },

  /**
   * Purchase a coin package using the appropriate provider
   */
  async purchaseCoins(
    product: UnifiedProduct,
    userId: string,
  ): Promise<UnifiedPurchaseResult> {
    const provider = this.getProvider();

    // ── Google Play / Apple IAP ──────────────────────────
    if (provider === 'google_play' || provider === 'apple_iap') {
      const result = await inAppPurchaseService.purchase(product.iapProductId!);

      if (!result.success) {
        return {
          success: false,
          provider,
          productId: product.packageId,
          coinsAwarded: 0,
          bonusAwarded: 0,
          amountPaid: 0,
          error: result.error === 'cancelled' ? 'cancelled' : result.error,
        };
      }

      // Verify receipt with server
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken(false) ?? '';
      const verified = await inAppPurchaseService.verifyPurchase(result, token);
      if (!verified) {
        return {
          success: false,
          provider,
          productId: product.packageId,
          coinsAwarded: 0,
          bonusAwarded: 0,
          amountPaid: 0,
          error: 'purchase_verification_failed',
        };
      }

      return {
        success: true,
        provider,
        transactionId: result.transactionId,
        productId: product.packageId,
        coinsAwarded: product.coins,
        bonusAwarded: product.bonus,
        amountPaid: product.priceVND,
      };
    }

    // ── VietQR (web / fallback) ─────────────────────────
    const coinPackage = COIN_PACKAGES.find((p) => p.id === product.packageId);
    if (!coinPackage) {
      return {
        success: false,
        provider: 'vietqr',
        productId: product.packageId,
        coinsAwarded: 0,
        bonusAwarded: 0,
        amountPaid: 0,
        error: 'Invalid product',
      };
    }

    const vietqrResult = await vietqrPaymentService.createCoinPurchase(coinPackage);

    return {
      success: vietqrResult.success,
      provider: 'vietqr',
      orderId: vietqrResult.orderId,
      productId: product.packageId,
      coinsAwarded: coinPackage.coins,
      bonusAwarded: coinPackage.bonus ?? 0,
      amountPaid: coinPackage.price,
    };
  },

  /**
   * Check if current platform uses in-app purchases (needs Play/App Store)
   */
  usesInAppPurchases(): boolean {
    const p = this.getProvider();
    return p === 'google_play' || p === 'apple_iap';
  },

  /**
   * Format price for display
   */
  formatPrice(product: UnifiedProduct): string {
    if (product.iapPrice) return product.iapPrice;
    return `${product.priceVND.toLocaleString('vi-VN')} ₫`;
  },
};

export default unifiedPaymentService;

