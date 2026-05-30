# Fix Explore Tab Navigation - URGENT

## Vấn đề
Khi ở Explore tab → click user profile → back → Quay về Home tab thay vì Explore tab ❌

## Nguyên nhân
PostCard sử dụng global `/UserProfileScreen` không maintain được stack của explore tab.

## Giải pháp Đã Thực Hiện

### 1. Restructure Explore Folder ✅

**Before:**
```
app/(tabs)/explore/
  ├── _layout.jsx (nested Tabs with header)
  ├── index.jsx
  ├── tab1.jsx
  ├── tab2.jsx
  ├── tab3.jsx
  ├── UserProfileScreen.tsx
  └── HashtagScreen.tsx
```

**After:**
```
app/(tabs)/explore/
  ├── _layout.jsx (NEW: Stack wrapper)
  ├── (tabs)/
  │   ├── _layout.jsx (nested Tabs with header)
  │   ├── index.jsx
  │   ├── tab1.jsx
  │   ├── tab2.jsx
  │   └── tab3.jsx
  ├── UserProfileScreen.tsx
  └── HashtagScreen.tsx
```

### 2. New Explore Stack (_layout.jsx)

```jsx
import { Stack } from 'expo-router';

export default function ExploreStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="UserProfileScreen" />
      <Stack.Screen name="HashtagScreen" />
    </Stack>
  );
}
```

## ⚠️ CHƯA HOÀN THÀNH

### Cần update PostCard.tsx

File: `components/profile/PostCard.tsx`

**Step 1: Import useSegments**
```tsx
// Line 21
import { useRouter, useSegments } from 'expo-router';
```

**Step 2: Detect current tab**
```tsx
// Around line 191-192, after const router = useRouter();
const segments = useSegments();
const currentUserId = authUser?.uid;

// Detect current tab for smart navigation
const currentTab = Array.isArray(segments) && segments[0] === '(tabs)' ? segments[1] : null;
```

**Step 3: Create handleUserPress function**
```tsx
// Add after handlePrivacyChange function (around line 325):
const handleUserPress = () => {
  if (currentTab === 'home') {
    router.push({
      pathname: "/(tabs)/home/UserProfileScreen",
      params: { userId: post.userID }
    });
  } else if (currentTab === 'explore') {
    router.push({
      pathname: "/(tabs)/explore/UserProfileScreen",
      params: { userId: post.userID }
    });
  } else {
    // Fallback to global
    router.push(`/UserProfileScreen?userId=${post.userID}`);
  }
};
```

**Step 4: Update PostHeader**
```tsx
// Line 339, change from:
onUserPress={() => router.push(`/UserProfileScreen?userId=${post.userID}`)}

// To:
onUserPress={handleUserPress}
```

## Manual Steps Needed

1. **Edit PostCard.tsx** theo 4 steps trên
2. **Test**: 
   - Explore → Click user → Profile opens
   - Back → Should return to Explore tab ✅
   - Data should be preserved ✅

## Expected Result

```
Explorer Tab (Posts Feed)
    ↓ (click user avatar)
    `/(tabs)/explore/UserProfileScreen`
    ↓ (back button)
Explorer Tab (Same position, same data) ✅
```

## Why This Works

**Stack Navigation:**
```
[Explore (tabs) Screen] 
     ↓
[Explore UserProfileScreen]
     ↓ (back)
[Explore (tabs) Screen] ← Returns correctly!
```

**vs Old Way:**
```
[Explore Tab]
     ↓
[Global /UserProfileScreen] ← Outside explore stack!
     ↓ (back)
[??? Random screen] ← Navigation confused
```

## Files Modified So Far

✅ `app/(tabs)/explore/_layout.jsx` - New Stack wrapper
✅ `app/(tabs)/explore/(tabs)/_layout.jsx` - Moved nested tabs here  
✅ `app/(tabs)/explore/(tabs)/index.jsx` - Moved
✅ `app/(tabs)/explore/(tabs)/tab1.jsx` - Moved
✅ `app/(tabs)/explore/(tabs)/tab2.jsx` - Moved
✅ `app/(tabs)/explore/(tabs)/tab3.jsx` - Moved
⚠️ `components/profile/PostCard.tsx` - NEEDS MANUAL UPDATE

## Next Action

**MANUALLY UPDATE `components/profile/PostCard.tsx`** theo 4 steps ở trên.

Tôi đã thử automatic edit nhiều lần nhưng file này complex nên cần manual editing cẩn thận.
