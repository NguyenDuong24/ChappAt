# Android Release Change Notes - 2026-05-30

## Build

- App package: `saigonmatch.com.vn`
- Version name: `1.0.7`
- Version code: `8`
- Play Console bundle: `android/app/build/outputs/bundle/release/app-release.aab`
- USB install APK: `android/app/build/outputs/apk/release/app-release.apk`

## Changes

- Removed the visible native Android splash artwork by switching `Theme.App.SplashScreen` to `@drawable/transparent_splash_icon`.
- Kept the React `AnimatedSplashScreen` as the only branded splash screen, using `assets/images/splash.png`.
- Added `assets/images/transparent-splash.png` for future Expo config/plugin regeneration.
- Reduced app launcher icon visual size with padding in:
  - `assets/images/icon.png`
  - `assets/images/adaptive-icon.png`
  - `android/app/src/main/res/mipmap-*/ic_launcher*.webp`
- Bumped Android release version from `1.0.6` / `7` to `1.0.7` / `8`.
- Added fail-closed NSFW image moderation before publishing images in private chat, group chat, and post creation.
- Blocked sensitive images are not sent or posted.
- Blocked sensitive images are quarantined to Storage under `flagged-content/{uid}/...` and logged to Firestore `flagged_content`.
- Fixed group chat image upload path to match Storage Rules: `group-images/{groupId}/{uid}/...`.
- Removed hardcoded Home trending hashtag data from `components/home/ListUser.tsx`.
- Removed sample hashtag fallback from Explore/Home hashtag loading; trending hashtags now come from Firebase `hashtags` only.
- Set the app default theme to dark by switching `DEFAULT_THEME` to `dark` and Expo `userInterfaceStyle` to `dark`.
- Improved the chat send button with a stable `send` icon, cleaner gradient, smaller button frame, and better shadow/contrast.
- Reworked `UnifiedChatInput` dock colors to follow dark/light chat themes without Android blur washing out the input background.
- Replaced the send glyph with a stable Material icon and added disabled/active gradients that keep contrast in dark and light themes.
- Tightened `UnifiedChatInput` alignment: 40x40 action buttons, centered dock row, 42px input minimum height, and stable send/mic placement.

## Notes

- Android 12+ always shows a system launch surface briefly. The custom logo on that first surface is now transparent, so users should only see the branded splash screen rendered by the app.
- Keep the release signing files backed up:
  - `android/app/saigonmatch-production.keystore`
  - `android/keystore.properties`
