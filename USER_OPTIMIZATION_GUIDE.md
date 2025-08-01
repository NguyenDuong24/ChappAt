# Hệ Thống Tối Ưu Hóa Tải Dữ Liệu User

## Tổng Quan
Hệ thống này giải quyết vấn đề lag khi tải thông tin người dùng bằng cách:
1. **Caching**: Lưu trữ thông tin user trong memory để tránh tải lại
2. **Batch Loading**: Tải nhiều user cùng lúc thay vì từng user một
3. **Preloading**: Tải trước thông tin user khi cần thiết

## Cấu Trúc

### 1. UserContext (`context/UserContext.tsx`)
- Quản lý cache thông tin user
- Cung cấp các method để tải user info
- Tự động cache kết quả để tránh tải lại

### 2. Optimized Hooks
- `useOptimizedPosts`: Tối ưu tải posts với user info
- `useOptimizedMessages`: Tối ưu tải tin nhắn với user info  
- `useOptimizedUsers`: Tối ưu tải danh sách users/friends

### 3. Updated Components
- `PostCard`: Sử dụng UserContext thay vì fetch trực tiếp

## Cách Sử Dụng

### 1. Wrap App với UserProvider
```jsx
// app/_layout.jsx
<UserProvider>
  <MainLayout />
</UserProvider>
```

### 2. Sử dụng trong Components
```jsx
// Trong component
import { useUserContext } from '@/context/UserContext';

const { getUserInfo, getUsersInfo, preloadUsers } = useUserContext();

// Lấy thông tin 1 user
const userInfo = await getUserInfo(userId);

// Lấy thông tin nhiều users
const usersMap = await getUsersInfo([userId1, userId2, userId3]);

// Preload users (không cần đợi kết quả)
await preloadUsers([userId1, userId2, userId3]);
```

### 3. Sử dụng Optimized Hooks

#### Posts
```jsx
import { useOptimizedPosts } from '@/hooks/useOptimizedPosts';

const { posts, loading, hasMore, loadMorePosts, refreshPosts } = useOptimizedPosts(10);

// posts đã bao gồm userInfo sẵn
posts.forEach(post => {
  console.log(post.userInfo?.username);
});
```

#### Messages
```jsx
import { useOptimizedMessages } from '@/hooks/useOptimizedMessages';

const { chatPreviews, loading, loadChatMessages } = useOptimizedMessages(currentUserId);

// chatPreviews đã bao gồm thông tin user
chatPreviews.forEach(chat => {
  console.log(chat.otherUser.username);
  console.log(chat.lastMessage.senderInfo?.username);
});
```

#### Users/Friends
```jsx
import { useOptimizedUsers } from '@/hooks/useOptimizedUsers';

const { 
  users, 
  friends, 
  friendRequests, 
  searchUsers, 
  loadMoreUsers 
} = useOptimizedUsers(currentUserId);
```

## Lợi Ích

### Trước khi tối ưu:
- Mỗi PostCard tải user info riêng lẻ
- 10 posts = 10 Firebase calls
- Tải lại cùng user nhiều lần
- Lag khi scroll qua nhiều posts

### Sau khi tối ưu:
- Batch load tất cả users cùng lúc
- 10 posts với 5 unique users = 1 batch call  
- Cache user info, không tải lại
- Smooth scrolling, không lag

## Performance Improvements

1. **Giảm Firebase Calls**: Từ N calls xuống 1 batch call
2. **Memory Caching**: User info được cache trong memory
3. **Pagination**: Tải dần dần, không tải hết cùng lúc
4. **Preloading**: Tải trước khi cần thiết

## Migration Guide

### PostCard Component
```jsx
// Trước
<PostCard 
  post={post} 
  user={user} 
  // ... other props
/>

// Sau  
<PostCard 
  post={post} 
  user={user} 
  postUserInfo={post.userInfo} // Truyền user info sẵn
  // ... other props
/>
```

### Sử dụng Hook thay vì fetch riêng lẻ
```jsx
// Trước
const [posts, setPosts] = useState([]);
useEffect(() => {
  // Fetch posts, rồi fetch user cho mỗi post
}, []);

// Sau
const { posts, loading, loadMorePosts } = useOptimizedPosts();
// posts đã có sẵn user info
```

## Best Practices

1. **Luôn sử dụng UserContext** thay vì fetch Firebase trực tiếp
2. **Preload users** khi biết trước sẽ cần
3. **Sử dụng batch loading** cho danh sách
4. **Clear cache** khi cần thiết (logout, refresh)

## Monitoring

Để theo dõi hiệu suất:
```jsx
const { userCache } = useUserContext();
console.log('Cached users:', userCache.size);
```
