# 🚫 Hệ thống Chặn User - Hướng dẫn sử dụng

## 📋 Tổng quan

Hệ thống chặn user hoàn chỉnh cho phép người dùng:
- ✅ Chặn/Bỏ chặn người dùng khác
- ✅ Tự động ẩn nội dung của user bị chặn
- ✅ Tự động unfollow khi chặn
- ✅ Ngăn nhắn tin từ user bị chặn
- ✅ Kiểm tra trạng thái block realtime

## 🏗️ Cấu trúc

### 1. **Service Layer** (`services/followService.ts`)

```typescript
// Chặn user
await followService.blockUser(currentUserId, targetUserId);

// Bỏ chặn user
await followService.unblockUser(currentUserId, targetUserId);

// Kiểm tra đã chặn chưa
const isBlocked = await followService.isBlocked(currentUserId, targetUserId);
```

### 2. **Custom Hooks** (`hooks/useBlockStatus.ts`)

#### Hook 1: `useBlockStatus` - Kiểm tra trạng thái block

```typescript
const { isBlocked, isBlockedBy, hasBlockRelation, loading } = useBlockStatus(
  currentUserId,
  targetUserId
);

// isBlocked: User hiện tại đã chặn target user
// isBlockedBy: User hiện tại bị target user chặn
// hasBlockRelation: Có quan hệ chặn (1 trong 2 chiều)
// loading: Đang tải
```

#### Hook 2: `useFilterBlockedContent` - Lọc nội dung

```typescript
const { filteredItems, loading } = useFilterBlockedContent(
  posts, // Array of items with userID or userId field
  currentUserId
);
```

### 3. **Component** (`components/common/BlockedContentWrapper.tsx`)

Wrapper component để ẩn nội dung:

```tsx
<BlockedContentWrapper
  targetUserId={post.userID}
  showPlaceholder={true}
  placeholderMessage="Nội dung đã bị ẩn"
>
  <YourPostComponent />
</BlockedContentWrapper>
```

## 🎯 Cách sử dụng

### A. Trong Profile Screen

Profile screen đã được tích hợp đầy đủ:

```tsx
// TopProfileUserProfileScreen.tsx
// ✅ Đã có nút chặn
// ✅ Đã có banner hiển thị trạng thái
// ✅ Đã có xác nhận trước khi chặn
```

### B. Trong Post Feed

**Cách 1: Lọc toàn bộ danh sách (KHUYẾN NGHỊ)**

```tsx
import { useFilterBlockedContent } from '@/hooks/useBlockStatus';

function PostFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  
  // Lọc posts tự động
  const { filteredItems: filteredPosts, loading } = useFilterBlockedContent(
    posts,
    user?.uid
  );

  return (
    <FlatList
      data={filteredPosts}
      renderItem={({ item }) => <PostCard post={item} />}
    />
  );
}
```

**Cách 2: Wrap từng post**

```tsx
import { BlockedContentWrapper } from '@/components/common/BlockedContentWrapper';

function PostCard({ post }) {
  return (
    <BlockedContentWrapper
      targetUserId={post.userID}
      showPlaceholder={true}
    >
      <View>
        {/* Post content */}
      </View>
    </BlockedContentWrapper>
  );
}
```

**Cách 3: Ẩn hoàn toàn (không hiển thị placeholder)**

```tsx
<BlockedContentWrapper
  targetUserId={post.userID}
  showPlaceholder={false} // Hoàn toàn ẩn
>
  <PostContent />
</BlockedContentWrapper>
```

### C. Trong Comment Section

```tsx
function CommentList({ comments }) {
  const { user } = useAuth();
  const { filteredItems: filteredComments } = useFilterBlockedContent(
    comments,
    user?.uid
  );

  return (
    <>
      {filteredComments.map(comment => (
        <CommentCard key={comment.id} comment={comment} />
      ))}
    </>
  );
}
```

### D. Trong Chat/Message

```tsx
function ChatScreen({ chatId, targetUserId }) {
  const { user } = useAuth();
  const { isBlocked, isBlockedBy } = useBlockStatus(user?.uid, targetUserId);

  if (isBlocked || isBlockedBy) {
    return (
      <View style={styles.blockedContainer}>
        <Text>Không thể nhắn tin với người dùng này</Text>
      </View>
    );
  }

  return <ChatInterface />;
}
```

## 🔥 Các tính năng chính

### 1. Chặn User từ Profile

```tsx
// Trong TopProfileUserProfileScreen.tsx
const handleBlockToggle = async () => {
  if (!isBlocked) {
    // Hiển thị xác nhận
    Alert.alert(
      '⚠️ Chặn người dùng',
      'Bạn có chắc muốn chặn?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Chặn', onPress: async () => {
          await followService.blockUser(currentUserId, targetUserId);
          setIsBlocked(true);
        }}
      ]
    );
  } else {
    // Bỏ chặn trực tiếp
    await followService.unblockUser(currentUserId, targetUserId);
    setIsBlocked(false);
  }
};
```

### 2. Tự động ẩn nội dung

Khi user A chặn user B:
- ✅ Tất cả posts của B sẽ bị ẩn khỏi feed của A
- ✅ Comments của B sẽ không hiển thị cho A
- ✅ A không thể nhắn tin với B
- ✅ Tự động unfollow cả 2 chiều

### 3. UI/UX

#### Banner trạng thái đã chặn:
```tsx
{isBlocked && (
  <View style={styles.blockedBanner}>
    <Feather name="slash" size={18} color="#EF4444" />
    <Text>Bạn đã chặn người dùng này</Text>
  </View>
)}
```

#### Menu chặn:
- Icon menu (3 chấm) bên cạnh nút Follow
- Dropdown menu với tùy chọn "Chặn" hoặc "Bỏ chặn"
- Màu đỏ cảnh báo cho action nguy hiểm

### 4. Database Structure

```firestore
blocks/
  {blockId}/
    blockerId: string (người chặn)
    blockedId: string (người bị chặn)
    createdAt: timestamp
```

## 📝 Checklist Integration

Để tích hợp vào màn hình/component của bạn:

- [ ] Import `BlockedContentWrapper` hoặc `useFilterBlockedContent`
- [ ] Wrap hoặc filter nội dung user-generated
- [ ] Test với user bị chặn
- [ ] Kiểm tra performance với nhiều items
- [ ] Thêm loading state nếu cần

## ⚡ Performance Tips

1. **Sử dụng `useFilterBlockedContent` cho danh sách lớn** - chỉ filter 1 lần
2. **Sử dụng `BlockedContentWrapper` cho single items** - kiểm tra từng item
3. **Cache block status** - hook đã tự động cache
4. **Lazy load** - chỉ kiểm tra khi cần thiết

## 🎨 Customization

### Custom placeholder message:

```tsx
<BlockedContentWrapper
  targetUserId={userId}
  placeholderMessage="Người dùng này đã bị chặn"
>
  {children}
</BlockedContentWrapper>
```

### Custom placeholder component:

Sửa trong `BlockedContentWrapper.tsx` để custom UI hoàn toàn.

## 🐛 Troubleshooting

**Q: Nội dung vẫn hiển thị sau khi chặn?**
- Kiểm tra `userID` field đúng trong data
- Đảm bảo `currentUser.uid` đã được truyền vào
- Check console log xem có error không

**Q: Loading quá lâu?**
- Sử dụng `useFilterBlockedContent` thay vì wrap từng item
- Cache block relationships ở level cao hơn
- Implement pagination

**Q: Muốn kiểm tra 2 chiều (block lẫn nhau)?**
- `useBlockStatus` hook đã hỗ trợ cả `isBlocked` và `isBlockedBy`

## 📚 Related Files

- `services/followService.ts` - Block/unblock logic
- `hooks/useBlockStatus.ts` - Hooks để check & filter
- `components/common/BlockedContentWrapper.tsx` - UI wrapper
- `components/profile/TopProfileUserProfileScreen.tsx` - Profile integration example

## ✅ Testing

Test cases đã cover:
1. ✅ Chặn user thành công
2. ✅ Bỏ chặn user thành công
3. ✅ Ẩn posts của user bị chặn
4. ✅ Tự động unfollow khi chặn
5. ✅ UI hiển thị đúng trạng thái
6. ✅ Confirmation dialog trước khi chặn

---

**🎉 Hệ thống đã sẵn sàng sử dụng!**

Chỉ cần import và sử dụng trong các component cần thiết.
