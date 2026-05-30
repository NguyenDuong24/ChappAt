# PostCard.tsx - EXACT CODE TO COPY-PASTE

## ⚠️ Hướng dẫn: Mở file `components/profile/PostCard.tsx` và làm theo 4 bước sau:

---

## 📝 BƯỚC 1: Update Import (Line 21)

**TÌM dòng 21:**
```tsx
import { useRouter } from 'expo-router';
```

**THAY BẰNG:**
```tsx
import { useRouter, useSegments } from 'expo-router';
```

---

## 📝 BƯỚC 2: Add useSegments và detect tab (Sau line 191)

**TÌM đoạn code này (lines 191-192):**
```tsx
  const router = useRouter();
  const currentUserId = authUser?.uid;
```

**THAY BẰNG:**
```tsx
  const router = useRouter();
  const segments = useSegments();
  const currentUserId = authUser?.uid;
  
  // Detect current tab for smart navigation
  const currentTab = Array.isArray(segments) && segments[0] === '(tabs)' ? segments[1] : null;
```

---

## 📝 BƯỚC 3: Add handleUserPress function (Sau line 325)

**TÌM đoạn code này (lines 319-325):**
```tsx
  const handlePrivacyChange = async (newPrivacy: PrivacyLevel) => {
    const success = await updatePostPrivacy(post.id, newPrivacy);
    if (success) {
      onPrivacyChange?.(post.id, newPrivacy);
    }
    setShowPrivacySelector(false);
  };
```

**THÊM SAU ĐÓ (sau dòng 325, trước `return`):**
```tsx

  // Smart navigation based on current tab
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

---

## 📝 BƯỚC 4: Update onUserPress (Line 339)

**TÌM dòng 339:**
```tsx
          onUserPress={() => router.push(`/UserProfileScreen?userId=${post.userID}`)}
```

**THAY BẰNG:**
```tsx
          onUserPress={handleUserPress}
```

---

## ✅ KIỂM TRA

Sau khi edit xong, file PostCard.tsx sẽ có:

1. **Line 21**: `import { useRouter, useSegments } from 'expo-router';`
2. **Sau line 191**: có thêm `segments` và `currentTab`
3. **Sau line 325**: có function `handleUserPress`
4. **Line 339**: `onUserPress={handleUserPress}`

---

## 🧪 TEST

Sau khi save file:

1. **Home Tab Test:**
   - Home → Click user → Profile
   - Back → Về Home tab ✅

2. **Explore Tab Test:**
   - Explore → Click user avatar trong post → Profile
   - Back → Về Explore tab (KHÔNG về Home) ✅
   - Data không reload ✅

---

## ❌ Nếu Gặp Lỗi

Nếu sau khi edit có syntax error:
1. Undo changes
2. Message lại cho tôi
3. Attach file PostCard.tsx nguyên bản
