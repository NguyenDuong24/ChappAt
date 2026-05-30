# SIMPLE SOLUTION - No Explore Restructure

## ❌ VẤN ĐỀ
Khi ở Explore tab → Click user profile → Back → Về Home tab (SAI!)

## ✅ GIẢI PHÁP ĐƠN GIẢN

**KHÔNG** restructure explore folder (quá phức tạp).  
**CHỈ** add `UserProfileScreen` vào explore như một sibling file.

### Các files cần:

1. ✅ `app/(tabs)/explore/UserProfileScreen.tsx` - ĐÃCÓ
2. ⚠️ `components/profile/PostCard.tsx` - CẦN UPDATE

## 📝 UPDATE PostCard.tsx

File: `components/profile/PostCard.tsx`

### BƯỚC 1: Line 21
```tsx
import { useRouter, useSegments } from 'expo-router';
```

### BƯỚC 2: Sau line 191
```tsx
const router = useRouter();
const segments = useSegments();
const currentUserId = authUser?.uid;

// Detect current tab
const currentTab = Array.isArray(segments) && segments[0] === '(tabs)' ? segments[1] : null;
```

### BƯỚC 3: Sau line 325 (trước return)
```tsx
// Smart navigation
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
    router.push(`/UserProfileScreen?userId=${post.userID}`);
  }
};
```

### BƯỚC 4: Line 339
```tsx
onUserPress={handleUserPress}
```

## 🎯 Tại sao cách này hoạt động?

**Home Stack:**
```
/(tabs)/home/
  ├── _layout.jsx (Stack)
  ├── index.jsx
  └── UserProfileScreen.tsx ← Được push vào stack
```

**Explore (Không cần Stack):**
```
/(tabs)/explore/
  ├── _layout.jsx (Tabs - giữ nguyên)
  ├── tab1.jsx
  ├── tab2.jsx
  ├── tab3.jsx
  └── UserProfileScreen.tsx ← Sẽ được modal push
```

Vì explore dùng `Tabs` layout, khi push UserProfileScreen nó sẽ open as modal overlay, và khi back sẽ về lại explore tab!

## ✅ Kết quả mong đợi:

- Home → Profile → Back = Home ✅
- Explore → Profile → Back = Explore ✅  
- Both preserve state ✅

## 🚀 CHỈ CẦN EDIT 1 FILE

components/profile/PostCard.tsx theo 4 bước trên!

Xem chi tiết trong: `POSTCARD_EDIT_GUIDE.md`
