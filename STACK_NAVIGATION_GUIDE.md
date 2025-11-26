# Stack Navigation Implementation Guide

## Vấn đề
`unmountOnBlur: false` không đủ để bảo toàn state hoàn toàn khi navigate giữa tabs và UserProfileScreen. Cần sử dụng Stack Navigator.

## Giải pháp: Sử dụng Stack cho mỗi Tab

### 1. Cấu trúc đã có (Đúng cho Home):

```
app/
  (tabs)/
    home/
      _layout.jsx          ← Stack navigator ✅
      index.jsx            ← Home list screen
      UserProfileScreen.tsx ← User profile trong home stack ✅
```

### 2. Cập nhật home/_layout.jsx

File này đã được cập nhật với Stack đúng:

```jsx
import { Stack } from 'expo-router'
import HomeHeader from '@/components/home/HomeHeader';

const StackLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          header: () => <HomeHeader/>,
          headerTransparent: true,
          headerTitle: "",
        }}
      />
      <Stack.Screen
        name="UserProfileScreen"
        options={{
          headerShown: false,
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="chat/[id]"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  )
}

export default StackLayout
```

### 3. Navigation trong ListUser.tsx

Đã cập nhật để navigate đúng stack:

```tsx
// Trong ListUser component
const activeTab = Array.isArray(segments) ? (segments[0] === '(tabs)' ? segments[1] : segments[0]) : segments[0];

// Khi click vào user:
onPress={() => {
  if (activeTab === 'home') {
    router.push({
      pathname: "/(tabs)/home/UserProfileScreen",
      params: { userId: item.id }
    });
  } else {
    router.push({
      pathname: "/UserProfileScreen",
      params: { userId: item.id }
    });
  }
}}
```

### 4. Cấu trúc Explore (Phức tạp hơn)

Explore tab có nested tabs (tab1, tab2, tab3) nên cấu trúc phức tạp hơn:

```
app/
  (tabs)/
    explore/
      _layout.jsx          ← Custom layout with nested Tabs
      index.jsx
      tab1.jsx
      tab2.jsx
      tab3.jsx
      UserProfileScreen.tsx ← User profile trong explore
```

**VẪN CHƯA CẬP NHẬT** vì explore/_layout.jsx rất phức tạp với animated header.

## Cách Test

### Test Home Tab:
1. Mở app → Home tab
2. Scroll trong list users
3. Click vào một user → UserProfileScreen mở ra
4. Nhấn Back
5. ✅ Quay lại Home, scroll position giữ nguyên, data không reload

### Test Explore Tab:
1. Mở app → Explore tab
2. Scroll xuống posts
3. Click vào avatar/tên user trong post
4. ❌ Hiện tại vẫn navigate đến `/UserProfileScreen` (global)
5. ❌ Khi back, có thể mất scroll position

## Để Hoàn Thiện Explore Tab

Cần làm 2 việc:

###  A. Tạo wrapper Stack cho explore (khó)

Cách 1: Wrap explore/_layout.jsx trong Stack
Cách 2: Đơn giản hóa explore, loại bỏ nested animation

### B. Cập nhật PostCard navigation (dễ)

```tsx
// In PostCard.tsx
import { useSegments } from 'expo-router';

const PostCard = (... props) => {
  const segments = useSegments();
  const currentTab = segments[1]; // 'home', 'explore', etc.
  
  const handleUserPress = () => {
    if (currentTab === 'explore') {
      router.push({
        pathname: "/(tabs)/explore/UserProfileScreen",
        params: { userId: post.userID }
      });
    } else {
      router.push({
        pathname: "/UserProfileScreen",
        params: { userId: post.userID }
      });
    }
  };
  
  return (
    <PostHeader
      onUserPress={handleUserPress}
      // ...
    />
  );
};
```

## Tóm tắt Trạng thái Hiện tại

| Tab     | Stack Setup | UserProfileScreen | Navigation | State Preserved |
|---------|-------------|-------------------|------------|-----------------|
| Home    | ✅ Done     | ✅ Created        | ✅ Updated  | ✅ Working      |
| Explore | ❌ Pending  | ✅ Created        | ❌ Not updated | ❌ Not working  |
| Chat    | ❓ Unknown  | ❓ Unknown        | ❓ Unknown  | ❓ Unknown      |
| Groups  | ❓ Unknown  | ❓ Unknown        | ❓ Unknown  | ❓ Unknown      |

## Bước Tiếp Theo (Để hoàn thiện)

1. **Đơn giản hóa explore/_layout.jsx** hoặc wrap nó trong Stack
2. **Cập nhật PostCard.tsx** để detect tab và navigate đúng
3. **Tạo UserProfileScreen.tsx cho explore** (đã có, chỉ cần test)
4. **Test kỹ lưỡng** cả Home và Explore tabs

## Khuyến Nghị

Để đơn giản nhất, nên:
1. Giữ `/UserProfileScreen` (global) như hiện tại
2. Chỉ dùng Stack cho Home tab (đã có)
3. Thêm `unmountOnBlur: false` cho tất cả tabs (đã có)
4. Accept rằng có thể một số data reload khi back từ profile

Hoặc nếu muốn hoàn hảo:
1. Implement Stack cho TẤT CẢ tabs (Home, Explore, Chat, Groups)
2. Mỗi tab có UserProfileScreen riêng trong stack
3. Update tất cả navigation để dùng relative paths
4. Test kỹ lưỡng từng tab
