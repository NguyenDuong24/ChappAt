// ─────────────────────────────────────────────────────────────
// AdMob Ad Unit IDs — Production
// Sau khi anh tạo Ad Unit trên dashboard AdMob, thay các ID dưới đây
// ─────────────────────────────────────────────────────────────
import { Platform } from 'react-native'

// Test IDs (dùng để test — Google cung cấp sẵn)
export const TEST_IDS = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
  native: 'ca-app-pub-3940256099942544/2247696110',
}

// ── PRODUCTION ADS (thay sau khi tạo trên AdMob) ────────────

// Banner Ad Unit ID
const BANNER_IOS = ''
const BANNER_ANDROID = ''

// Interstitial Ad Unit ID
const INTERSTITIAL_IOS = ''
const INTERSTITIAL_ANDROID = ''

// Rewarded Ad Unit ID
const REWARDED_IOS = 'ca-app-pub-9793421534392971/7526441306'
const REWARDED_ANDROID = 'ca-app-pub-9793421534392971/7526441306'

export const ADS = {
  banner: Platform.select({ ios: BANNER_IOS, android: BANNER_ANDROID })!,
  interstitial: Platform.select({ ios: INTERSTITIAL_IOS, android: INTERSTITIAL_ANDROID })!,
  rewarded: Platform.select({ ios: REWARDED_IOS, android: REWARDED_ANDROID })!,
}
