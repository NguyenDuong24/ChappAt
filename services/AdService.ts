// ─────────────────────────────────────────────────────────────
// Ad Service — xử lý quảng cáo AdMob
// ─────────────────────────────────────────────────────────────
import { ADS, TEST_IDS } from '../config/ads'
import { Platform } from 'react-native'
import mobileAds from 'react-native-google-mobile-ads'

// Môi trường: true = dùng Ad thật, false = dùng Test Ad
const IS_PRODUCTION = __DEV__ === false

/**
 * Trả về Ad Unit ID — tự động chọn production hoặc test
 */
export function getAdUnitId(type: 'banner' | 'interstitial' | 'rewarded'): string {
  if (IS_PRODUCTION) {
    return ADS[type]
  }
  return TEST_IDS[type]
}

/**
 * Kiểm tra xem có đang chạy production không
 */
export function isProduction(): boolean {
  return IS_PRODUCTION
}

let initializePromise: Promise<void> | null = null

export function initializeAdMob(): Promise<void> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return Promise.resolve()
  }

  if (!initializePromise) {
    initializePromise = mobileAds()
      .initialize()
      .then(() => undefined)
      .catch((error) => {
        initializePromise = null
        console.warn('[AdMob] Initialization failed:', error)
      })
  }

  return initializePromise
}
