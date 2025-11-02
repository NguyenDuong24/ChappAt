# 🔒 Block System - Full Integration Guide

## 📋 Tổng quan

Hệ thống chặn người dùng đã được triển khai đầy đủ. Tài liệu này hướng dẫn cách tích hợp vào các màn hình còn lại của app.

## ✅ Đã hoàn thành

### 1. Backend & Services
- ✅ `followService.ts` - blockUser(), unblockUser(), isBlocked()
- ✅ Firestore structure cho blocks collection

### 2. Hooks
- ✅ `useBlockStatus.ts` - Check block status realtime
- ✅ `useFilterBlockedContent` - Filter posts/comments
- ✅ `useChatPermission` - Check chat permission
- ✅ `useFilteredUserList` - Filter user lists

### 3. Components
- ✅ `BlockedContentWrapper.tsx` - Wrapper cho posts/comments
- ✅ `BlockedChatView.tsx` - Banner cho chat bị chặn
- ✅ `UserProfile.tsx` - Full integration với block UI

### 4. Documentation
- ✅ `BLOCK_USER_GUIDE.md` - Hướng dẫn tổng quan
- ✅ `USER_PROFILE_BLOCK_INTEGRATION.md` - Chi tiết UserProfile
- ✅ Các file examples

## 🚀 Cần tích hợp vào các màn hình

### 1. 💬 **Chat Screen** - PRIORITY HIGH

#### File: `app/chat/[id].tsx` hoặc `components/chat/ChatScreen.tsx`

```tsx
import { useChatPermission } from '@/hooks/useChatPermission';
import { BlockedChatView } from '@/components/common/BlockedChatView';
import { useAuth } from '@/context/authContext';

function ChatScreen({ route }) {
  const { user: currentUser } = useAuth();
  const { otherUserId } = route.params;
  
  // Check if chat is allowed
  const { canChat, reason, isBlocked, isBlockedBy } = useChatPermission(
    currentUser?.uid,
    otherUserId
  );

  // If blocked, show blocked view instead of chat
  if (!canChat) {
    return (
      <BlockedChatView 
        isBlocked={isBlocked}
        isBlockedBy={isBlockedBy}
        otherUserName={otherUserName}
      />
    );
  }

  // Normal chat UI
  return (
    <View>
      {/* Chat messages */}
      {/* Message input */}
    </View>
  );
}
```

#### Message Input - Disable khi blocked:
```tsx
<TextInput
  placeholder="Nhập tin nhắn..."
  value={message}
  onChangeText={setMessage}
  editable={canChat}  // Disable input nếu không thể chat
  style={[
    styles.input,
    !canChat && styles.disabledInput
  ]}
/>

{!canChat && (
  <Text style={styles.blockedText}>
    {reason}
  </Text>
)}
```

### 2. 📱 **Post Feed** - PRIORITY HIGH

#### File: `app/(tabs)/home/index.tsx` hoặc `components/home/PostFeed.tsx`

```tsx
import { useFilterBlockedContent } from '@/hooks/useBlockStatus';
import { BlockedContentWrapper } from '@/components/common/BlockedContentWrapper';
import { useAuth } from '@/context/authContext';

function PostFeed() {
  const { user: currentUser } = useAuth();
  const [posts, setPosts] = useState([]);

  // Filter out posts từ người bị chặn
  const { filteredItems: filteredPosts } = useFilterBlockedContent(
    posts,
    currentUser?.uid,
    (post) => post.userID || post.userId
  );

  return (
    <FlatList
      data={filteredPosts}  // Sử dụng filteredPosts thay vì posts
      renderItem={({ item }) => (
        <BlockedContentWrapper
          userId={item.userID || item.userId}
          currentUserId={currentUser?.uid}
          contentType="post"
        >
          <PostCard post={item} />
        </BlockedContentWrapper>
      )}
    />
  );
}
```

#### Alternative: Filter ở query level (Recommended cho performance)
```tsx
import { blockUtils } from '@/utils/blockUtils';

async function fetchPosts() {
  const allPosts = await getPostsFromFirestore();
  
  // Filter blocked users
  const filteredPosts = await blockUtils.filterBlockedUsers(
    allPosts,
    currentUser.uid,
    (post) => post.userId
  );
  
  setPosts(filteredPosts);
}
```

### 3. 💬 **Comments Section** - PRIORITY MEDIUM

#### File: `components/common/CommentSection.tsx`

```tsx
import { useFilterBlockedContent } from '@/hooks/useBlockStatus';
import { BlockedContentWrapper } from '@/components/common/BlockedContentWrapper';

function CommentSection({ postId }) {
  const { user: currentUser } = useAuth();
  const [comments, setComments] = useState([]);

  // Filter blocked comments
  const { filteredItems: filteredComments } = useFilterBlockedContent(
    comments,
    currentUser?.uid,
    (comment) => comment.userId
  );

  return (
    <View>
      {filteredComments.map((comment) => (
        <BlockedContentWrapper
          key={comment.id}
          userId={comment.userId}
          currentUserId={currentUser?.uid}
          contentType="comment"
        >
          <CommentItem comment={comment} />
        </BlockedContentWrapper>
      ))}
    </View>
  );
}
```

### 4. 👥 **User List / Search** - PRIORITY HIGH

#### File: `components/home/ListUser.tsx`, `app/AddFriend.tsx`, etc.

```tsx
import { useFilteredUserList } from '@/hooks/useBlockStatus';
import { useAuth } from '@/context/authContext';

function UserList() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);

  // Filter blocked users
  const { filteredUsers, loading } = useFilteredUserList(
    users,
    currentUser?.uid
  );

  return (
    <FlatList
      data={filteredUsers}  // Sử dụng filteredUsers
      renderItem={({ item }) => (
        <UserItem user={item} />
      )}
    />
  );
}
```

#### User Search với filter:
```tsx
import { blockUtils } from '@/utils/blockUtils';

async function handleSearch(query: string) {
  const searchResults = await searchUsers(query);
  
  // Filter blocked users
  const filteredResults = await blockUtils.filterBlockedUsers(
    searchResults,
    currentUser.uid,
    (user) => user.id || user.uid
  );
  
  setSearchResults(filteredResults);
}
```

### 5. 🔔 **Notifications** - PRIORITY MEDIUM

#### File: `app/NotificationsScreen.tsx`

```tsx
import { useFilterBlockedContent } from '@/hooks/useBlockStatus';

function NotificationsScreen() {
  const { user: currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);

  // Filter notifications từ người bị chặn
  const { filteredItems: filteredNotifications } = useFilterBlockedContent(
    notifications,
    currentUser?.uid,
    (notification) => notification.senderId || notification.fromUserId
  );

  return (
    <FlatList
      data={filteredNotifications}
      renderItem={({ item }) => <NotificationItem notification={item} />}
    />
  );
}
```

### 6. 👁️ **Profile Visitors / Views** - PRIORITY LOW

```tsx
import { useFilteredUserList } from '@/hooks/useBlockStatus';

function ProfileVisitors() {
  const { user: currentUser } = useAuth();
  const [visitors, setVisitors] = useState([]);

  const { filteredUsers: filteredVisitors } = useFilteredUserList(
    visitors,
    currentUser?.uid
  );

  return (
    <FlatList
      data={filteredVisitors}
      renderItem={({ item }) => <VisitorItem visitor={item} />}
    />
  );
}
```

### 7. 🎯 **Friend Suggestions** - PRIORITY MEDIUM

```tsx
import { useFilteredUserList } from '@/hooks/useBlockStatus';

function FriendSuggestions() {
  const { user: currentUser } = useAuth();
  const [suggestions, setSuggestions] = useState([]);

  const { filteredUsers: filteredSuggestions } = useFilteredUserList(
    suggestions,
    currentUser?.uid
  );

  return (
    <View>
      <Text>Gợi ý kết bạn</Text>
      <FlatList
        data={filteredSuggestions}
        renderItem={({ item }) => <SuggestionCard user={item} />}
      />
    </View>
  );
}
```

## 🎨 UI Components Integration

### Button "Nhắn tin" trong bất kỳ màn hình nào:

```tsx
import { useChatPermission } from '@/hooks/useChatPermission';

function SendMessageButton({ targetUserId }) {
  const { user: currentUser } = useAuth();
  const { canChat, reason } = useChatPermission(currentUser?.uid, targetUserId);

  const handlePress = () => {
    if (!canChat) {
      Alert.alert('Không thể nhắn tin', reason);
      return;
    }
    // Navigate to chat
    navigation.navigate('Chat', { userId: targetUserId });
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={!canChat}
      style={[styles.button, !canChat && styles.disabledButton]}
    >
      <Icon name="message" />
      <Text>Nhắn tin</Text>
    </TouchableOpacity>
  );
}
```

## 📊 Performance Optimization

### 1. Batch Queries
Thay vì check từng user một, batch check nhiều users cùng lúc:

```typescript
// Trong blockUtils.ts đã có:
import { blockUtils } from '@/utils/blockUtils';

// Check multiple users at once
const blockedUserIds = await blockUtils.getBlockedUserIds(currentUserId);
const isUserBlocked = blockedUserIds.includes(targetUserId);
```

### 2. Cache Block Status
```tsx
// Sử dụng React Query hoặc SWR để cache
import { useQuery } from '@tanstack/react-query';

function useBlockStatusCached(currentUserId, targetUserId) {
  return useQuery({
    queryKey: ['blockStatus', currentUserId, targetUserId],
    queryFn: () => followService.isBlocked(currentUserId, targetUserId),
    staleTime: 5 * 60 * 1000, // Cache 5 phút
  });
}
```

### 3. Optimize Firestore Queries
```typescript
// Thay vì filter sau khi fetch, filter trong query
async function fetchPostsExcludingBlocked(currentUserId: string) {
  const blockedUserIds = await blockUtils.getBlockedUserIds(currentUserId);
  
  // Query posts NOT from blocked users
  const postsRef = collection(db, 'posts');
  const q = query(
    postsRef,
    where('userId', 'not-in', blockedUserIds.slice(0, 10)), // Firestore limit 10
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  
  return getDocs(q);
}
```

## 🔧 Utility Functions

### Check visibility trước khi render:
```tsx
import { useUserVisibility } from '@/hooks/useBlockStatus';

function UserCard({ user }) {
  const { user: currentUser } = useAuth();
  const { isVisible, loading } = useUserVisibility(currentUser?.uid, user.id);

  if (loading) return <Skeleton />;
  if (!isVisible) return null; // Không render gì cả

  return <UserCardContent user={user} />;
}
```

## 🎯 Priority Integration Order

### Phase 1 - Critical (Ngay lập tức)
1. ✅ UserProfile - DONE
2. 💬 Chat Screen - Ngăn tin nhắn
3. 👥 User List - Ẩn người bị chặn
4. 🔍 Search - Filter blocked users

### Phase 2 - Important (Tuần tới)
5. 📱 Post Feed - Ẩn posts
6. 💬 Comments - Ẩn comments
7. 👥 Friend Suggestions - Filter blocked

### Phase 3 - Nice to have (Khi có thời gian)
8. 🔔 Notifications - Filter blocked
9. 👁️ Profile Visitors - Filter blocked
10. 🎮 Other features

## 📝 Testing Checklist

Sau khi tích hợp vào từng màn hình, test các scenarios:

### User A blocks User B:
- [ ] A không thấy posts của B trong feed
- [ ] A không thấy comments của B
- [ ] A không thấy B trong user list
- [ ] A không thể nhắn tin với B
- [ ] A không thấy B trong suggestions
- [ ] B không thấy A trong user list
- [ ] B không thể nhắn tin với A
- [ ] B không thể xem profile của A

### User A unblocks User B:
- [ ] A lại thấy posts của B
- [ ] A lại thấy B trong user list
- [ ] A có thể nhắn tin với B
- [ ] All features restored

## 🚨 Common Issues & Solutions

### Issue 1: Performance lag khi filter nhiều items
**Solution**: Sử dụng `useMemo` và filter ở backend level
```tsx
const filteredPosts = useMemo(() => {
  return blockUtils.filterBlockedUsers(posts, currentUserId, getUserId);
}, [posts, currentUserId]);
```

### Issue 2: UI không update sau khi block/unblock
**Solution**: Force refresh data sau action
```tsx
await followService.blockUser(currentUserId, targetUserId);
// Refresh data
await refetchPosts();
await refetchUserList();
```

### Issue 3: Blocked user vẫn hiện trong search
**Solution**: Always filter search results
```tsx
const searchResults = await searchUsers(query);
const filtered = await blockUtils.filterBlockedUsers(
  searchResults,
  currentUserId,
  (user) => user.id
);
```

## 🎉 Summary

- ✅ Backend/Services: Ready
- ✅ Hooks: Ready
- ✅ Components: Ready
- ✅ UserProfile: Integrated
- ⏳ Chat: Need integration
- ⏳ Feed: Need integration
- ⏳ User List: Need integration

**Next Steps**: 
1. Tích hợp vào Chat Screen (Priority 1)
2. Tích hợp vào Post Feed (Priority 2)
3. Tích hợp vào User List (Priority 3)

Liên hệ nếu cần support thêm! 🚀
