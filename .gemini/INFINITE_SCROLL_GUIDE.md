# Tính Năng Infinite Scroll - Load Thêm Tin Nhắn

## 📋 Tổng Quan

Ứng dụng chat của bạn đã được implement tính năng **infinite scroll / pagination** giống như Messenger, Telegram, Zalo. Tính năng này cho phép:

- ✅ Kéo lên trên cùng để load thêm tin nhắn cũ hơn
- ✅ Messages được cache locally để tăng tốc độ
- ✅ Tự động load thêm khi scroll đạt ngưỡng
- ✅ Hiển thị indicator "Đang tải thêm..." khi đang fetch data
- ✅ Maintain scroll position sau khi load (không bị nhảy)

## 🎯 Hoạt Động Như Thế Nào?

### 1. **Cache-First Strategy**
```
Lần đầu mở chat → Check cache → Hiển thị ngay lập tức → Fetch fresh data từ Firebase
```

### 2. **Scroll Detection**
```
User kéo lên top (< 100px) → Trigger loadMore() → Fetch older messages → Insert vào đầu danh sách
```

### 3. **Real-time Updates**
```
Tin nhắn mới → Tự động append vào cuối → Scroll to bottom (nếu user đang ở cuối)
```

## 🛠️ Technical Implementation

### A. Group Chat (`app/groups/[id].tsx`)

**Hook Usage:**
```typescript
const {
  messages,
  loading: messagesLoading,
  hasMore,
  loadMore,
  refresh
} = useOptimizedGroupMessages({
  groupId: id as string,
  currentUserId: user?.uid || '',
  pageSize: 30,
  enabled: true
});
```

**Component Props:**
```tsx
<GroupMessageList
  messages={messages}
  onLoadMore={loadMore}
  hasMore={hasMore}
  loadingMore={messagesLoading && messages.length > 0}
  //... other props
/>
```

### B. Chat 1-1 (`app/chat/[id].tsx`)

**Hook Usage:**
```typescript
const { 
  messages, 
  loading: messagesLoading, 
  hasMore, 
  loadMoreMessages,
  refreshMessages 
} = useOptimizedChatMessages({
  roomId,
  pageSize: 20,
  enableRealtime: true
});
```

**Component Props:**
```tsx
<MessageList 
  messages={displayMessages}
  onLoadMore={loadMoreMessages}
  hasMore={hasMore}
  loadingMore={messagesLoading}
  //... other props
/>
```

## 📊 Data Flow

```
┌─────────────────────────────────────────────────┐
│  User scrolls to top (< 100px from top)         │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Component detects scroll position              │
│  - Check: hasMore = true?                       │
│  - Check: loadingMore = false?                  │
│  - Check: Not already loading?                  │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Call onLoadMore()                              │
│  - Store current content height                 │
│  - Set isLoadingMoreRef = true                  │
│  - Show "Đang tải thêm..." indicator            │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Hook fetches older messages from Firebase      │
│  - Query: where createdAt < oldest message      │
│  - orderBy: createdAt desc                      │
│  - limit: pageSize (20-30)                      │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Prepend older messages to array                │
│  - New messages inserted at START of array      │
│  - Maintain scroll position (không nhảy)        │
│  - Cache messages locally                       │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Update UI                                       │
│  - Hide loading indicator                       │
│  - Update hasMore flag                          │
│  - Reset isLoadingMoreRef                       │
└─────────────────────────────────────────────────┘
```

## 🗄️ Caching Strategy

### Message Cache Service (`services/messageCacheService.ts`)

**Lưu trữ:**
```typescript
await messageCacheService.cacheMessages(roomId, messages);
```

**Đọc cache:**
```typescript
const cachedMessages = await messageCacheService.getCachedMessages(roomId);
```

**Cache metadata:**
```typescript
const cacheMeta = await messageCacheService.getCacheMeta(roomId);
// Returns: { totalCached, lastUpdated }
```

Cache sẽ được refresh nếu:
- Quá 5 phút (stale)
- User pull-to-refresh
- New messages arrive

## 📱 UI/UX Details

### Loading States

**Initial Load** (đang load lần đầu):
```
┌─────────────────────┐
│  Đang tải nhóm...   │
└─────────────────────┘
```

**Load More** (đang load thêm):
```
┌─────────────────────┐
│  ↑ Đang tải thêm... │  ← Top of chat
├─────────────────────┤
│  Message 1          │
│  Message 2          │
│  ...                │
```

**Has More** (còn tin nhắn cũ hơn):
```
┌─────────────────────┐
│ ↑ Kéo lên để xem    │  ← Hint text
│   tin nhắn cũ hơn   │
├─────────────────────┤
│  Message 1          │
```

**No More** (hết tin nhắn):
```
┌─────────────────────┐
│  (no indicator)     │
├─────────────────────┤
│  Message 1 (oldest) │
```

## ⚠️ Performance Optimizations

1. **Debounce Scroll Events**: Throttled to 100ms
2. **Memoized Messages**: Prevent re-renders
3. **Virtual Scrolling**: FlatList for groups (better performance)
4. **Cache-First**: Instant display from cache
5. **Lazy Loading**: Only load when needed
6. **Smart Scroll**: Only auto-scroll when user at bottom

## 🐛 Troubleshooting

### "Tin nhắn không load thêm khi kéo lên"

**Kiểm tra:**
1. `hasMore` có = `true`?
2. `loadingMore` có = `false`?  
3. Console có log "📖 [loadMoreMessages]"?
4. Firebase rules có cho phép read không?

### "Scroll bị nhảy sau khi load"

**Nguyên nhân:** FlatList cần maintain scroll position

**Giải pháp:** Component đã implement `previousContentHeight` tracking

### "Cache không hoạt động"

**Kiểm tra:**
1. AsyncStorage có permission?
2. Cache key format đúng chưa?
3. Xóa cache và thử lại: `messageCacheService.clearCache(roomId)`

## 🎓 Best Practices

### For Developers:

1. **Always check `hasMore` before calling `loadMore()`**
```typescript
if (hasMore && !loadingMore) {
  loadMore();
}
```

2. **Use proper page size**
- Too small (< 10): Too many requests
- Too large (> 50): Slow initial load
- Recommended: 20-30 messages

3. **Handle edge cases**
```typescript
if (messages.length === 0) return; // No messages yet
if (!hasMore) return; // No more to load
if (loadingMore) return; // Already loading
```

4. **Cache invalidation**
```typescript
// Refresh on important events
onNewMessage(() => refresh());
onRoomChange(() => refresh());
```

## 📈 Monitoring

Theo dõi hiệu suất qua logs:

```bash
# Check cache hits
✅ [Message Hook] Loaded {X} messages from cache

# Check Firebase reads
🔍 [Message Hook] Fetching fresh data from Firestore

# Check pagination
📖 [loadMoreMessages] Loading messages older than: {timestamp}
📖 [loadMoreMessages] Loaded {X} older messages
```

## 🚀 Future Improvements

- [ ] Implement virtual scrolling for 1-1 chat
- [ ] Add pull-to-refresh gesture
- [ ] Prefetch next page in background
- [ ] Compress cached messages
- [ ] Add cache size limits
- [ ] Implement message search with pagination

---

**✨ Enjoy your smooth infinite scroll chat experience!**
