# Tích Hợp "Chạm Sóng" — 3 bước, 2 dòng code

## ✅ Đã hoàn thành (17 files)

Tất cả code đã viết xong:
- `types/nearby.ts`
- `services/nearbyService.ts`, `nearbyBackgroundTask.ts`, `nearbyNotifications.ts`
- `hooks/useNearbySettings.ts`, `useNearbyDetection.ts`, `useShakeToMatch.ts`
- `components/nearby/NearbySettings.tsx`, `NearbyAlert.tsx`, `ShakeMatch.tsx`, `ProfileBadge.tsx`, `UserProfileNearbySection.tsx`, `NearbyEntryButton.tsx`
- `app/nearby-match.tsx`
- `features/cham-song/index.ts`
- `docs/cham-song/` (rules, indexes, functions, README)

---

## Bước 1: Thêm nút vào Explore (1 dòng)

Mở `app/(tabs)/explore/_layout.jsx`, thêm 2 dòng này:

```jsx
import { NearbyEntryButton } from '@/components/nearby/NearbyEntryButton';

// Trong component export, trước `return`, thêm:
// <NearbyEntryButton />
```

Đặt ngay sau `<RevealScalableView>` hoặc cuối layout.

---

## Bước 2: Gắn badge vào profile người khác (1 dòng)

Tìm màn hình xem profile user khác (có thể ở `app/(tabs)/explore/user/`), thêm:

```jsx
import { UserProfileNearbySection } from '@/components/nearby/UserProfileNearbySection';

// Sau phần header profile:
<UserProfileNearbySection currentUserId={myUid} profileUserId={theirUid} />
```

Nếu dùng `<ProfileBadge>` cũ, thay bằng `<UserProfileNearbySection>` (có thêm modal lịch sử gặp gỡ).

---

## Bước 3: Đăng ký notification (5 dòng)

Mở `app/_layout.jsx`, thêm vào đầu `MainLayout`:

```jsx
import { setupNearbyNotificationChannel, configureNearbyNotifications } from '@/services/nearbyNotifications';
import { useRouter } from 'expo-router';

// Trong component:
const router = useRouter();
useEffect(() => {
  setupNearbyNotificationChannel();
  const cleanup = configureNearbyNotifications(() => router.push('/nearby-match'));
  return cleanup;
}, []);
```

---

## Deploy Firestore

1. Copy `docs/cham-song/firestore.rules` → Firebase Console
2. Tạo indexes từ `docs/cham-song/firestore.indexes.json`
3. (Optional) Deploy `docs/cham-song/cloud-functions.ts`

---

## Test Flow

1. Mở app → bấm nút tím 🌊 ở Explore
2. Bật Chạm Sóng → cấp quyền vị trí
3. Có user gần → alert → shake/giữ/bấm → 💜 MATCH!
