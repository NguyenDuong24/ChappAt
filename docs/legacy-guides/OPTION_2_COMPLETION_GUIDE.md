# Option 2: Complete Implementation Guide

## ✅ Đã Hoàn Thành

###  1. Home Tab Stack - HOẠT ĐỘNG HOÀN HẢO ✅
- File: `app/(tabs)/home/_layout.jsx` - đã có Stack navigator
- File: `app/(tabs)/home/UserProfileScreen.tsx` - re-export từ global
- Navigation trong `ListUser.tsx` - đã cập nhật để navigate trong home stack
- **RESULT**: Home → Profile → Back = State Preserved ✅

### 2. Explore Tab Structure - ĐÃ TẠO ✅
- File: `app/(tabs)/explore/_layout.jsx` - NEW Stack navigator
- File: `app/(tabs)/explore/tabs.jsx` - NEW Nested tabs với animated header
- File: `app/(tabs)/explore/UserProfileScreen.tsx` - re-export từ global
- File: `app/(tabs)/explore/index.jsx` - redirect to tab1

## ❌ Cần Hoàn Thành

### 3. Cập nhật PostCard để Navigate trong Explore Stack

Bạn cần edit file: `components/profile/PostCard.tsx`

**Bước 1**: Thêm import `useSegments`
```tsx
// Line 21, change from:
import { useRouter } from 'expo-router';

// To:
import { useRouter, useSegments } from 'expo-router';
```

**Bước 2**: Trong PostCard component, thêm useSegments và detect current tab
```tsx
// Around line 191, after const router = useRouter();
// Add these lines:
const segments = useSegments();
const currentTab = Array.isArray(segments) && segments[0] === '(tabs)' ? segments[1] : null;
```

**Bước 3**: Tạo function to handle user press
```tsx
// Add this function after handlePrivacyChange (around line 325):
const handleUserPress = () => {
  if (currentTab === 'explore') {
    router.push({
      pathname: "/(tabs)/explore/UserProfileScreen",
      params: { userId: post.userID }
    });
  } else {
    router.push(`/UserProfileScreen?userId=${post.userID}`);
  }
};
```

**Bước 4**: Update PostHeader onUserPress
```tsx
// Around line 339, change from:
onUserPress={() => router.push(`/UserProfileScreen?userId=${post.userID}`)}

// To:
onUserPress={handleUserPress}
```

### 4. Fix Explore HashtagScreen Navigation

Cũng trong PostCard, update handleHashtagPress:

```tsx
// Around line 314-317, change to:
const handleHashtagPress = (hashtag: string) => {
  const cleanHashtag = hashtag.replace('#', '');
  if (currentTab === 'explore') {
    router.push({
      pathname: "/(tabs)/explore/HashtagScreen",
      params: { hashtag: cleanHashtag }
    });
  } else {
    router.push(`/HashtagScreen?hashtag=${cleanHashtag}`);
  }
};
```

### 5. Fix Explore Tabs Navigation  

Có vấn đề với file `explore/tabs.jsx` vì nó chứa nested Tabs. Cần sửa lại:

**Option A - Đơn giản hơn**: 
Thay vì dùng file tabs.jsx mới, restore lại `_layout.jsx` cũ nhưng wrap trong Stack.

**Option B - Giữ cấu trúc hiện tại**:
File `explore/tabs.jsx` cần được deploy như một screen riêng trong stack.

Tôi khuyến nghị **Option A** - đơn giản và ít rủi ro hơn.

## Hướng Dẫn Hoàn Thành (Simplified)

### Cách đơn giản nhất:

1. **Xóa file tabs.jsx vừa tạo**
2. **Restore `explore/_layout.jsx` về bản gốc**  
3. **CHỈ cập nhật PostCard** để detect tab và navigate đúng
4. **Accept** rằng explore sẽ dùng global `/UserProfileScreen` HOẶC explore-local

### Nếu muốn hoàn hảo 100%:

Cần restructure toàn bộ explore tab, đây là công việc lớn:
1. Move all explore logic sang một wrapper component
2. Create proper Stack structure
3. Test kỹ lưỡng tất cả animations

## Test Plan

Sau khi hoàn thành, test các scenario:

### ✅ Home Tab:
1. Open Home
2. Scroll list
3. Click user → Profile opens
4. Back → Home with same scroll position ✅

### ⚠️ Explore Tab (Chưa hoàn thành):
1. Open Explore
2. Scroll posts
3. Click user avatar → Should go to explore/UserProfileScreen
4. Back → Explore with same scroll position

## Recommendation

Vì explore tab quá phức tạp với nested tabs + animations, tôi khuyến nghị:

### ✅ KEEP SIMPLE:
- Home tab: Dùng Stack (ĐÃ XONG ✅)
- Explore tab: Dùng global UserProfileScreen với `unmountOnBlur: false`
- Accept một chút scroll position loss ở explore

### 🎯 OR GO FULL:
- Spend thêm thời gian restructure explore completely
- Risk: Có thể break animations
- Benefit: Perfect state preservation

**BẠN CHỌN GÌ?**

## Quick Fix - Minimal Changes

Nếu bạn muốn giải pháp nhanh nhất:

1. **VỨT BỎ** các file explore mới (tabs.jsx, new _layout.jsx)
2. **GIỮ LẠI** explore/_layout.jsx cũ
3. **CHỈ CẬP NHẬT** PostCard với logic detect tab
4. **DONE**

Điều này sẽ cho bạn:
- Home tab: Perfect state preservation ✅
- Explore tab: Acceptable behavior (có thể mất một chút scroll) ⚠️
- Minimal risk, quick implementation ✅
