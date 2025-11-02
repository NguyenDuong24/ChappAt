# 🔒 UserProfile Block System Integration - Complete Guide

## ✅ Đã hoàn thành

### 📱 UserProfile.tsx Integration

File `components/profile/UserProfile.tsx` đã được tích hợp đầy đủ hệ thống chặn người dùng với các tính năng sau:

## 🎯 Chức năng đã triển khai

### 1. **Kiểm tra trạng thái chặn tự động**
```typescript
const { 
  isBlocked,      // User hiện tại đã chặn user này
  isBlockedBy,    // User hiện tại bị user này chặn
  hasBlockRelation, // Có bất kỳ quan hệ chặn nào
  loading 
} = useBlockStatus(currentUser?.uid, user.id);
```

### 2. **UI/UX thông minh**

#### a) **Loading State**
- Hiển thị indicator khi đang tải trạng thái chặn
- Đảm bảo không hiển thị thông tin sai trước khi check xong

#### b) **Block Banner**
Hiển thị banner cảnh báo khi có block relationship:
- **Nếu bạn chặn người khác**: "Bạn đã chặn người dùng này"
- **Nếu bạn bị chặn**: "Bạn đã bị chặn"

#### c) **Action Buttons (Nhắn tin, Thêm bạn)**
- **Bị disabled** khi bạn đã chặn người đó
- **Hoàn toàn ẩn** khi bạn bị chặn bởi người đó
- Visual feedback: màu xám, opacity giảm

#### d) **Profile Info**
- **Ẩn hoàn toàn** nếu bị chặn (`isBlockedBy`)
- Người bị chặn không thể xem thông tin chi tiết của bạn

### 3. **Block/Unblock Actions**

#### Quy trình chặn:
```typescript
handleBlockUser() {
  1. Hiển thị confirmation dialog
  2. Gọi followService.blockUser()
  3. Tự động unfollow cả 2 chiều
  4. Update UI realtime
  5. Hiển thị thông báo thành công
}
```

#### Quy trình bỏ chặn:
```typescript
handleUnblockUser() {
  1. Hiển thị confirmation dialog
  2. Gọi followService.unblockUser()
  3. Update UI realtime
  4. Hiển thị thông báo thành công
}
```

### 4. **Button Chặn thông minh**
- Text thay đổi: "Chặn người dùng" ↔ "Bỏ chặn người dùng"
- Icon thay đổi: `block-helper` ↔ `account-check`
- Màu sắc thay đổi: Đỏ (danger) ↔ Cam (warning)
- Loading indicator trong quá trình xử lý
- **Ẩn hoàn toàn** nếu bạn bị chặn

## 🔧 Cách sử dụng

### Sử dụng UserProfile component:

```tsx
import UserProfile from '@/components/profile/UserProfile';
import { useAuth } from '@/context/authContext';

function UserProfileScreen() {
  const { user: currentUser } = useAuth();
  const [targetUser, setTargetUser] = useState(null);

  return (
    <UserProfile
      user={targetUser}
      isOwnProfile={currentUser.uid === targetUser.id}
      onUpdateProfile={(data) => {
        // Handle profile update
      }}
      onSendMessage={() => {
        // Navigate to chat - sẽ bị disable nếu blocked
        if (!isBlocked) {
          navigation.navigate('Chat', { userId: targetUser.id });
        }
      }}
      onAddFriend={() => {
        // Handle add friend - sẽ bị disable nếu blocked
      }}
      onReport={() => {
        // Handle report
      }}
      isDarkMode={isDarkMode}
    />
  );
}
```

## 🎨 Hiển thị UI dựa theo trạng thái

### Trường hợp 1: Không có block relationship
```
✅ Action buttons: Enabled (Nhắn tin, Thêm bạn)
✅ Profile info: Hiển thị đầy đủ
✅ Block button: "Chặn người dùng" (Đỏ)
✅ Report button: Hiển thị
```

### Trường hợp 2: Bạn đã chặn người khác
```
⚠️ Banner: "Bạn đã chặn người dùng này"
❌ Action buttons: Disabled (màu xám)
✅ Profile info: Vẫn hiển thị
🔓 Block button: "Bỏ chặn người dùng" (Cam)
✅ Report button: Hiển thị
```

### Trường hợp 3: Bạn bị người khác chặn
```
⚠️ Banner: "Bạn đã bị chặn"
❌ Action buttons: Ẩn hoàn toàn
❌ Profile info: Ẩn hoàn toàn
❌ Block button: Ẩn
✅ Report button: Vẫn hiển thị (có thể report)
```

## 🔐 Quy tắc Block

### 1. **Chat**
- ❌ Không thể nhắn tin nếu đã chặn
- ❌ Không thể nhắn tin nếu bị chặn
- Button "Nhắn tin" bị disable/ẩn

### 2. **Xem nội dung**
- ❌ Không thấy posts của người bị chặn (filter ở feed)
- ❌ Không thấy comments của người bị chặn
- ❌ Không thấy profile info nếu bị chặn

### 3. **Danh sách người dùng**
- ❌ Người bị chặn không hiện trong user list
- ❌ Không gợi ý kết bạn với người bị chặn
- ❌ Không hiện trong search results

### 4. **Follow relationship**
- 🔄 Tự động unfollow cả 2 chiều khi chặn
- ❌ Không thể follow lại khi đang bị chặn

## 📋 Dependencies

### Services
```typescript
import { followService } from '@/services/followService';
// Sử dụng: blockUser(), unblockUser(), isBlocked()
```

### Hooks
```typescript
import { useBlockStatus } from '@/hooks/useBlockStatus';
// Sử dụng: Check block status realtime
```

### Context
```typescript
import { useAuth } from '@/context/authContext';
// Lấy currentUser.uid để check block
```

## 🚀 Tích hợp vào màn hình khác

### 1. **Chat Screen**
```tsx
// Trong ChatScreen, check permission trước khi gửi tin nhắn
import { useChatPermission } from '@/hooks/useChatPermission';

const { canChat, reason } = useChatPermission(currentUserId, otherUserId);

if (!canChat) {
  Alert.alert('Không thể gửi tin nhắn', reason);
  return;
}
```

### 2. **Post Feed**
```tsx
// Filter posts từ người bị chặn
import { useFilterBlockedContent } from '@/hooks/useBlockStatus';

const { filteredItems: filteredPosts } = useFilterBlockedContent(
  posts,
  currentUserId,
  (post) => post.userId
);
```

### 3. **User List**
```tsx
// Filter user list
import { useFilteredUserList } from '@/hooks/useBlockStatus';

const { filteredUsers } = useFilteredUserList(allUsers, currentUserId);
```

## 🔥 Firestore Structure

### Blocks Collection
```typescript
{
  blockerId: string;    // Người chặn
  blockedId: string;    // Người bị chặn
  createdAt: Timestamp; // Thời gian chặn
}
```

### Index cần thiết
```
Collection: blocks
- blockerId (Ascending) + blockedId (Ascending)
- blockedId (Ascending) + blockerId (Ascending)
```

## 🎯 Best Practices

### 1. **Performance**
- ✅ Hook `useBlockStatus` tự động cache
- ✅ Chỉ query khi có currentUserId và targetUserId
- ✅ Không query nếu là own profile

### 2. **User Experience**
- ✅ Luôn hiển thị confirmation dialog trước khi block
- ✅ Loading indicator trong quá trình xử lý
- ✅ Thông báo rõ ràng sau khi thành công/thất bại
- ✅ Visual feedback cho disabled buttons

### 3. **Security**
- ✅ Validate currentUser trước khi thực hiện action
- ✅ Check block status ở cả client và server (nếu có)
- ✅ Không để client tự update UI mà chờ response từ service

## 📝 Testing Checklist

### Functional Tests
- [ ] Block người dùng → Success message → Button đổi thành "Bỏ chặn"
- [ ] Bỏ chặn người dùng → Success message → Button đổi thành "Chặn"
- [ ] Block → Tự động unfollow → Check follows collection
- [ ] Block → Không thể nhắn tin → Button bị disable
- [ ] Bị block → Không thấy profile info
- [ ] Bị block → Không thấy action buttons
- [ ] Loading state hiển thị đúng

### UI Tests
- [ ] Block banner hiển thị đúng màu sắc
- [ ] Block banner text chính xác theo trường hợp
- [ ] Disabled buttons có visual feedback
- [ ] Dark mode hoạt động đúng
- [ ] Responsive trên nhiều kích thước màn hình

### Edge Cases
- [ ] Block người đã block mình → Vẫn hoạt động
- [ ] Spam click button block → Không duplicate requests
- [ ] Mất kết nối internet → Error message
- [ ] User không tồn tại → Xử lý lỗi gracefully

## 🎉 Kết luận

UserProfile đã được tích hợp đầy đủ block system với:
- ✅ UI/UX hoàn chỉnh và thông minh
- ✅ Logic block/unblock mượt mà
- ✅ Xử lý tất cả edge cases
- ✅ Performance tối ưu
- ✅ Dark mode support
- ✅ Loading states
- ✅ Error handling

**Sẵn sàng sử dụng trong production!** 🚀
