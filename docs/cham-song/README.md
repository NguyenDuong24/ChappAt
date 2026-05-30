# Chạm Sóng — Near Match Feature

## 📁 File Structure

```
types/
  nearby.ts                          # TypeScript types & interfaces

services/
  nearbyService.ts                   # Firebase CRUD operations
  nearbyBackgroundTask.ts            # Background location tracking (expo-task-manager)
  nearbyNotifications.ts             # Push notification handler

hooks/
  useNearbySettings.ts               # Settings state management
  useNearbyDetection.ts              # Nearby detection & encounter flow
  useShakeToMatch.ts                 # Shake/hold/tap gesture → match

components/nearby/
  ProfileBadge.tsx                   # "Từng ở gần bạn" badge on profiles
  NearbyAlert.tsx                    # Bottom sheet when someone is nearby
  ShakeMatch.tsx                     # Interactive shake/tap/hold screen
  NearbySettings.tsx                 # Settings view

app/
  nearby-match.tsx                   # Main screen (entry point)
```

## 🔌 Integration Guide

### 1. Register background task (app/_layout.tsx or App.tsx)

```tsx
import { BACKGROUND_LOCATION_TASK } from './services/nearbyBackgroundTask';
import { setupNearbyNotificationChannel } from './services/nearbyNotifications';

// In root component:
useEffect(() => {
  setupNearbyNotificationChannel();
}, []);
```

### 2. Add navigation route

In your app layout, add:
```tsx
// app/nearby-match.tsx already exists as the screen
// Navigate via: router.push('/nearby-match')
```

### 3. Add ProfileBadge to user profile

```tsx
import { ProfileBadge } from '@/components/nearby/ProfileBadge';

// In profile screen:
<ProfileBadge 
  currentUserId={currentUser.uid} 
  profileUserId={profileUser.uid}
  onPressDetails={(history) => {
    // Show encounter history modal
  }}
/>
```

### 4. Wire up notification handler

```tsx
// In _layout.tsx:
import { configureNearbyNotifications } from '@/services/nearbyNotifications';

useEffect(() => {
  const cleanup = configureNearbyNotifications((matchId) => {
    router.push(`/match/${matchId}`);
  });
  return cleanup;
}, []);
```

### 5. Settings entry point

Add a settings row that navigates to `/nearby-match?mode=settings` or directly use:
```tsx
router.push('/nearby-match');
```

## 🔥 Firestore Security Rules

See `firestore.rules` for the complete ruleset.

Key collections:
- `nearby_settings` — User's nearby preferences
- `nearby_encounters` — Proximity encounters between users
- `nearby_signals` — Shake/tap/hold signals
- `nearby_matches` — Successful nearby matches
- `location_snapshots` — Ephemeral location data (TTL: 5 min)

## 🎯 Feature Flow

```
1. User enables "Chạm Sóng" in settings
2. App requests location permission
3. Background task + foreground check track location
4. Location stored as low-precision geohash (4 chars ~20km)
5. When 2 users share same geohash4 bucket → check distance
6. If within radius → create nearby_encounter (status: detected)
7. Push notification: "Có ai đó đang ở gần bạn"
8. Both users can send signal via: Tap / Hold 3s / Shake
9. If both send signal within 2 min → create match
10. Match notification: "Bạn có một Chạm Sóng!"
11. Profile badge shows "Từng ở gần bạn" on encounters
```

## 🛡️ Privacy

- Only 4-char geohash stored (~20km area)
- No exact coordinates persisted
- Identity hidden until mutual signal
- User can delete history, hide, or block
- Location snapshots auto-expire after 5 minutes

## 🚀 Version 2 Roadmap

- [ ] Real shake detection (currently simulated via button)
- [ ] Age/distance filters
- [ ] Enhanced match animation
- [ ] Anonymous mode
- [ ] Safety report/block integration
- [ ] Daily notification limits
- [ ] Encounter heatmap (privacy-preserving)
