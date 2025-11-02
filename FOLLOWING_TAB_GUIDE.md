# Tab "Theo Dõi" - Hướng Dẫn

## Tổng Quan
Tab "Theo Dõi" (tab3) đã được thêm vào màn hình Explore để hiển thị các bài viết từ những người dùng mà bạn đang theo dõi.

## Tính Năng

### 1. **Hiển Thị Bài Viết Từ Người Theo Dõi**
- Tự động lấy danh sách người dùng mà bạn đang theo dõi
- Hiển thị bài viết của họ theo thứ tự thời gian mới nhất
- Hỗ trợ pagination (tải thêm khi cuộn xuống)

### 2. **Tính Năng Tương Tác**
- **Like/Unlike**: Thích hoặc bỏ thích bài viết với optimistic update
- **Comment**: Thêm bình luận vào bài viết
- **Delete**: Xóa bài viết của chính bạn
- **Share**: Chia sẻ bài viết (sẽ được triển khai)

### 3. **UI/UX**
- **Pull to refresh**: Kéo xuống để làm mới danh sách
- **Infinite scroll**: Tự động tải thêm khi cuộn gần cuối
- **Loading states**: Hiển thị skeleton loader khi đang tải
- **Empty state**: Thông báo khi chưa theo dõi ai hoặc chưa có bài viết
- **Smooth animations**: Tích hợp với header animation

## Cấu Trúc File

### File Chính
- `app/(tabs)/explore/tab3.jsx` - Tab component chính
- `app/(tabs)/explore/_layout.jsx` - Layout với 3 tabs

### Services Sử Dụng
- `services/followService.ts` - Service quản lý follow/unfollow
  - `getFollowing(userId)` - Lấy danh sách người đang theo dõi

### Firestore Collections
- `follows` - Lưu trữ quan hệ theo dõi
  - `followerId`: ID người theo dõi
  - `followingId`: ID người được theo dõi
  - `createdAt`: Thời gian theo dõi
- `posts` - Lưu trữ bài viết
  - `userId`: ID người đăng
  - `likes`: Array ID người đã like
  - `createdAt`: Thời gian đăng

## Logic Hoạt Động

### 1. Lấy Bài Viết
```javascript
// Bước 1: Lấy danh sách người đang theo dõi
const following = await followServiceInstance.getFollowing(currentUserId);
const followingIds = following.map(f => f.followingId);

// Bước 2: Query bài viết từ những người đó
// Firestore 'in' operator chỉ hỗ trợ tối đa 10 giá trị
// Nên phải batch query nếu theo dõi > 10 người
for (let i = 0; i < followingIds.length; i += 10) {
  const batch = followingIds.slice(i, i + 10);
  const posts = await getDocs(
    query(
      collection(db, 'posts'),
      where('userId', 'in', batch),
      orderBy('createdAt', 'desc'),
      limit(10)
    )
  );
}

// Bước 3: Gộp và sắp xếp tất cả bài viết
allPosts.sort((a, b) => b.createdAt - a.createdAt);
```

### 2. Pagination
- Sử dụng `startAfter` để tải thêm bài viết
- `hasMore` flag để biết còn bài viết nữa không
- `loadingMore` state để hiển thị loading indicator

### 3. Optimistic Updates
- Khi like/unlike, UI cập nhật ngay lập tức
- Nếu API call thất bại, revert lại trạng thái cũ
- Đảm bảo UX mượt mà không lag

## Cách Sử Dụng

### Điều Hướng
- Nhấn vào tab "Theo Dõi" trong header hoặc floating action bar
- URL: `/(tabs)/explore/tab3`

### Tương Tác
1. **Xem bài viết**: Cuộn để xem các bài viết
2. **Like**: Nhấn vào icon tim
3. **Comment**: Nhấn vào icon bình luận
4. **Refresh**: Kéo xuống ở đầu danh sách
5. **Load more**: Cuộn xuống cuối danh sách

## Styling

### Colors
- Gradient: `['#4facfe', '#00f2fe']` (Blue gradient)
- Active color: `COLORS.success`
- Tương thích dark/light mode

### Layout
- Integrated với header animation
- Safe area insets cho notch devices
- Responsive padding và spacing

## Tối Ưu Hóa

### Performance
1. **Lazy loading**: Chỉ load dữ liệu khi cần
2. **Batch queries**: Tối ưu Firestore queries
3. **Memoization**: Tránh re-render không cần thiết
4. **Infinite scroll**: Load dữ liệu dần dần

### Firestore Limits
- Firestore `in` operator: Tối đa 10 giá trị
- Solution: Batch queries cho nhiều hơn 10 following
- Read operations: Tính phí theo số documents đọc

## Cải Tiến Tương Lai

### Gợi Ý
1. **Filter**: Lọc theo loại content (text, image, video)
2. **Sort**: Sắp xếp theo popularity, engagement
3. **Cache**: Cache bài viết đã xem để giảm network calls
4. **Realtime**: Cập nhật realtime khi có bài viết mới
5. **Stories**: Tích hợp stories từ người theo dõi
6. **Suggested follows**: Gợi ý người theo dõi mới

### Bugs Cần Fix
- Handle case khi following list rất lớn (>100 người)
- Optimize batch queries performance
- Add retry logic cho failed requests

## Testing

### Test Cases
1. ✅ Hiển thị bài viết từ người theo dõi
2. ✅ Empty state khi chưa theo dõi ai
3. ✅ Like/Unlike functionality
4. ✅ Pull to refresh
5. ✅ Infinite scroll
6. ✅ Delete own posts
7. ⏳ Share functionality (TODO)
8. ⏳ Realtime updates (TODO)

### Manual Testing
```bash
# 1. Follow một số users
# 2. Đảm bảo họ có bài viết
# 3. Vào tab "Theo Dõi"
# 4. Verify posts hiển thị đúng
# 5. Test like/comment/delete
# 6. Test pagination
```

## Troubleshooting

### Không Thấy Bài Viết
- Kiểm tra đã follow ai chưa
- Kiểm tra người đó có bài viết không
- Check console logs cho errors
- Verify Firestore rules cho phép đọc posts

### Performance Issues
- Quá nhiều following (>50): Consider pagination/caching
- Slow queries: Add Firestore indexes
- Large posts: Optimize image loading

### Errors
```javascript
// Common errors:
// 1. "User not authenticated" - User chưa login
// 2. "Permission denied" - Firestore rules
// 3. "Network error" - Connectivity issues
```

## Dependencies

### Required
- Firebase Firestore (queries, collections, etc.)
- React Native (FlatList, animations)
- Expo Router (navigation)
- followService (following logic)

### Context/Hooks
- `useAuth` - User authentication
- `ThemeContext` - Theme colors
- `useExploreHeader` - Header scroll sync

## Kết Luận
Tab "Theo Dõi" giúp người dùng dễ dàng xem và tương tác với nội dung từ những người họ quan tâm, tạo trải nghiệm cá nhân hóa và gắn kết hơn trong ứng dụng.
