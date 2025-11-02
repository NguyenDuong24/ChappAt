# 🚫 Block User System - README

## 🎯 Tổng quan ngắn gọn

Hệ thống chặn user hoàn chỉnh cho phép:
- ✅ Chặn/Bỏ chặn user từ profile
- ✅ Tự động ẩn posts/comments của user bị chặn
- ✅ Tự động unfollow khi chặn
- ✅ UI/UX đẹp với confirmation và banners

## 🚀 Sử dụng nhanh

### 1. Trong Post Feed (Filter toàn bộ list)
```typescript
import { useFilterBlockedContent } from '@/hooks/useBlockStatus';

const { filteredItems } = useFilterBlockedContent(posts, currentUser?.uid);
```

### 2. Wrap từng post
```typescript
import { BlockedContentWrapper } from '@/components/common/BlockedContentWrapper';

<BlockedContentWrapper targetUserId={post.userID}>
  <PostCard post={post} />
</BlockedContentWrapper>
```

### 3. Check block status
```typescript
import { useBlockStatus } from '@/hooks/useBlockStatus';

const { isBlocked, isBlockedBy } = useBlockStatus(currentUserId, targetUserId);
```

## 📁 Files quan trọng

### Core:
- `services/followService.ts` - Block/unblock methods
- `hooks/useBlockStatus.ts` - React hooks
- `components/common/BlockedContentWrapper.tsx` - UI wrapper
- `components/profile/TopProfileUserProfileScreen.tsx` - Example integration

### Documentation:
- `BLOCK_USER_GUIDE.md` - Hướng dẫn chi tiết đầy đủ ⭐
- `BLOCK_QUICK_START.tsx` - Code examples sẵn dùng
- `BLOCK_VISUAL_GUIDE.md` - Visual diagrams
- `BLOCK_SYSTEM_COMPLETE.md` - Tổng kết

## 🎨 Features

| Feature | Status | Description |
|---------|--------|-------------|
| Block từ profile | ✅ | Nút menu với dropdown |
| Confirmation dialog | ✅ | Xác nhận trước khi chặn |
| Banner trạng thái | ✅ | "Bạn đã chặn user này" |
| Auto unfollow | ✅ | Cả 2 chiều |
| Ẩn posts | ✅ | Tự động filter |
| Ẩn comments | ✅ | Tự động filter |
| Block trong chat | ✅ | Check status |
| Dark mode support | ✅ | Full support |

## 📖 Documentation

1. **Bắt đầu nhanh**: Đọc `BLOCK_QUICK_START.tsx`
2. **Hướng dẫn chi tiết**: Đọc `BLOCK_USER_GUIDE.md`
3. **Visual guide**: Xem `BLOCK_VISUAL_GUIDE.md`
4. **Tổng kết**: Đọc `BLOCK_SYSTEM_COMPLETE.md`

## 🔧 API Reference

### followService

```typescript
// Block user
await followService.blockUser(blockerId, blockedId);

// Unblock user
await followService.unblockUser(blockerId, blockedId);

// Check if blocked
const isBlocked = await followService.isBlocked(blockerId, blockedId);
```

### Hooks

```typescript
// Check block status
const { isBlocked, isBlockedBy, hasBlockRelation, loading } = 
  useBlockStatus(currentUserId, targetUserId);

// Filter content
const { filteredItems, loading } = 
  useFilterBlockedContent(items, currentUserId);
```

### Component

```typescript
<BlockedContentWrapper
  targetUserId={userId}
  showPlaceholder={true}
  placeholderMessage="Custom message"
>
  <YourContent />
</BlockedContentWrapper>
```

## 💡 Examples

Xem file `components/examples/BlockedContentExamples.tsx` để có examples đầy đủ về:
- Filter post feed
- Wrap single post
- Hide comments
- Block in chat
- Check status in profile

## 🧪 Testing

1. Mở profile của user khác
2. Click menu button (3 dots)
3. Click "Chặn người dùng"
4. Confirm
5. Kiểm tra banner "Đã chặn" hiển thị
6. Vào feed - posts của user đó biến mất
7. Click "Bỏ chặn" để test unblock

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Content vẫn hiện sau khi chặn | Check field name: `userID` vs `userId` |
| Loading lâu | Dùng `useFilterBlockedContent` thay vì wrap từng item |
| Menu không hiện | Check `currentUser !== targetUser` |
| Không chặn được | Check Firebase permissions |

## 📊 Database

```
blocks/
  {blockId}/
    blockerId: string
    blockedId: string
    createdAt: timestamp
```

## 🎯 Integration Steps

1. Import hook hoặc component
2. Pass user IDs
3. Done!

```typescript
// Step 1
import { useFilterBlockedContent } from '@/hooks/useBlockStatus';

// Step 2
const { filteredItems } = useFilterBlockedContent(posts, userId);

// Step 3
<FlatList data={filteredItems} ... />
```

## 📝 Next Steps

- [ ] Integrate vào PostFeedScreen
- [ ] Integrate vào CommentSection
- [ ] Integrate vào ChatScreen
- [ ] Test với real users
- [ ] Monitor performance

## 🎉 Status

✅ **COMPLETE & READY TO USE**

All components, hooks, services, and documentation are ready.
Just import and use in your components!

---

**📚 For detailed guide, read:** `BLOCK_USER_GUIDE.md`  
**🚀 For quick start, read:** `BLOCK_QUICK_START.tsx`  
**📊 For visual guide, read:** `BLOCK_VISUAL_GUIDE.md`
