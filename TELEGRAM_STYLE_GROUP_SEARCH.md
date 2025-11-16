# Hệ Thống Tìm Kiếm Nhóm Kiểu Telegram

## Tổng Quan
Hệ thống tìm kiếm nhóm được thiết kế theo phong cách Telegram, cho phép người dùng:
- Tìm kiếm toàn bộ nhóm công khai (không chỉ nhóm đã tham gia)
- Xem thông tin chi tiết nhóm trong kết quả tìm kiếm
- Tham gia nhóm công khai ngay từ kết quả tìm kiếm
- Phân biệt rõ ràng giữa nhóm đã tham gia và chưa tham gia

## Tính Năng Chính

### 1. Tìm Kiếm Toàn Cục (Global Search)
- **Debounce 400ms**: Tránh gọi API quá nhiều khi người dùng nhập
- **Tìm kiếm theo tên và mô tả**: Tìm trong cả hai trường
- **Sắp xếp thông minh**:
  - Khớp chính xác (exact match) được ưu tiên
  - Bắt đầu bằng từ khóa (starts with) đứng thứ hai
  - Sắp xếp theo số lượng thành viên (phổ biến hơn lên trước)
- **Giới hạn 50 kết quả**: Giống Telegram để tối ưu hiệu suất

### 2. Hiển Thị Kết Quả
Khi tìm kiếm, UI tự động chuyển sang **Search Mode** với:
- Thanh chỉ báo "Tìm kiếm nhóm công khai: X kết quả"
- Ẩn bộ lọc (All/Public/Private) vì chỉ tìm nhóm công khai
- Hiển thị thông tin chi tiết cho mỗi nhóm:
  - **Mô tả nhóm** (nếu có)
  - **Số lượng thành viên**
  - **Biểu tượng "Công khai"**
  - **Nút "Tham gia"** nếu chưa tham gia

### 3. Tham Gia Nhóm
- Người dùng có thể tham gia nhóm công khai ngay từ kết quả tìm kiếm
- UI cập nhật ngay lập tức sau khi tham gia
- Nút "Tham gia" biến mất, thay thế bằng tin nhắn cuối cùng

### 4. Quản Lý State
```javascript
const [searchResults, setSearchResults] = useState([]); // Kết quả tìm kiếm
const [searching, setSearching] = useState(false);      // Loading state
const [isSearchMode, setIsSearchMode] = useState(false); // Chế độ hiển thị
```

## Cấu Trúc Code

### 1. File: `app/(tabs)/groups/index.jsx`

#### State Management
```javascript
const [searchResults, setSearchResults] = useState([]);
const [searching, setSearching] = useState(false);
const [isSearchMode, setIsSearchMode] = useState(false);
```

#### Debounced Search Effect
```javascript
useEffect(() => {
  const delayDebounce = setTimeout(() => {
    if (searchQuery.trim().length > 0) {
      setIsSearchMode(true);
      searchPublicGroups(searchQuery.trim());
    } else {
      setIsSearchMode(false);
      setSearchResults([]);
    }
  }, 400);
  return () => clearTimeout(delayDebounce);
}, [searchQuery]);
```

#### Search Function
```javascript
const searchPublicGroups = async (queryText) => {
  // 1. Query all public groups
  // 2. Filter by name/description
  // 3. Check if user already joined
  // 4. Sort by relevance & popularity
  // 5. Limit to 50 results
};
```

### 2. File: `components/groups/EnhancedGroupList.tsx`

#### Props
```typescript
interface GroupListProps {
  groups?: any[];
  currentUser: any;
  onRefresh: () => void;
  listHeader?: React.ReactNode;
  onJoinGroup?: (groupId: string) => void;
  isSearchMode?: boolean; // Chế độ tìm kiếm
}
```

### 3. File: `components/groups/EnhancedGroupItem.tsx`

#### Props
```typescript
interface GroupItemProps {
  // ... existing props
  isJoined?: boolean;           // Đã tham gia hay chưa
  onJoinGroup?: (groupId: string) => void; // Callback tham gia
  isSearchResult?: boolean;     // Hiển thị dạng kết quả tìm kiếm
}
```

#### UI cho Search Results
```javascript
{isSearchResult || !isJoined ? (
  <View>
    {/* Hiển thị mô tả */}
    {groupDescription && <Text>{groupDescription}</Text>}
    
    {/* Hiển thị số thành viên + badge công khai */}
    <View>
      <Icon name="account-group" />
      <Text>{memberCount} thành viên</Text>
      <Icon name="earth" />
      <Text>Công khai</Text>
    </View>
  </View>
) : (
  // Hiển thị tin nhắn cuối cùng như bình thường
)}
```

## Luồng Hoạt Động

### Khi Người Dùng Nhập Từ Khóa:
1. **Input onChange** → Cập nhật `searchQuery`
2. **useEffect debounce** → Chờ 400ms
3. **searchPublicGroups()** → Query Firestore
4. **setIsSearchMode(true)** → Chuyển sang chế độ tìm kiếm
5. **UI update** → Hiển thị kết quả

### Khi Người Dùng Xóa Từ Khóa:
1. **searchQuery = ''** 
2. **setIsSearchMode(false)** → Quay lại danh sách nhóm của user
3. **UI update** → Hiển thị nhóm đã tham gia

### Khi Người Dùng Tham Gia Nhóm:
1. **Bấm nút "Tham gia"** → Gọi `onJoinGroup(groupId)`
2. **joinGroup()** → Update Firestore (thêm user vào members)
3. **Update local state** → `setGroups()`, `setUserGroups()`
4. **UI update** → Nút "Tham gia" biến mất, hiển thị tin nhắn

## Tối Ưu Hóa

### 1. Performance
- Debounce 400ms để giảm số lượng truy vấn
- Giới hạn 50 kết quả
- Sử dụng `useMemo` cho các giá trị tính toán

### 2. UX
- Loading indicator khi đang tìm kiếm
- Empty state khi không có kết quả
- Smooth transition giữa các chế độ
- Cập nhật UI ngay lập tức sau khi tham gia

### 3. Firestore Optimization
- Query chỉ nhóm public (`where('type', '==', 'public')`)
- Filter phía client để giảm tải Firestore
- Không tạo index phức tạp

## So Sánh Với Telegram

| Tính Năng | Telegram | Ứng Dụng Này |
|-----------|----------|--------------|
| Tìm kiếm toàn cục | ✅ | ✅ |
| Hiển thị số thành viên | ✅ | ✅ |
| Hiển thị mô tả nhóm | ✅ | ✅ |
| Tham gia ngay từ kết quả | ✅ | ✅ |
| Fuzzy search | ✅ | ⚠️ (Có thể cải thiện) |
| Search by username | ✅ | ❌ (Chưa có) |
| Phân trang kết quả | ✅ | ⚠️ (Limit 50) |

## Cải Tiến Trong Tương Lai

### 1. Fuzzy Search
Sử dụng thư viện như `fuse.js` để tìm kiếm gần đúng tốt hơn:
```javascript
import Fuse from 'fuse.js';

const fuse = new Fuse(groups, {
  keys: ['name', 'description'],
  threshold: 0.3
});
```

### 2. Username/Link Support
Cho phép nhóm có username (như @groupname) để chia sẻ dễ dàng:
```javascript
const searchByUsername = (username) => {
  return query(groupsRef, where('username', '==', username));
};
```

### 3. Phân Trang
Implement infinite scroll cho kết quả tìm kiếm:
```javascript
const loadMoreResults = async (lastDoc) => {
  const q = query(
    groupsRef,
    startAfter(lastDoc),
    limit(20)
  );
  // ...
};
```

### 4. Search History
Lưu lịch sử tìm kiếm của người dùng:
```javascript
const [searchHistory, setSearchHistory] = useState([]);

const saveSearchHistory = (query) => {
  const history = [...searchHistory, query].slice(-5);
  setSearchHistory(history);
  AsyncStorage.setItem('search_history', JSON.stringify(history));
};
```

### 5. Trending Groups
Hiển thị nhóm phổ biến khi chưa nhập từ khóa:
```javascript
const getTrendingGroups = async () => {
  return query(
    groupsRef,
    where('type', '==', 'public'),
    orderBy('members', 'desc'),
    limit(10)
  );
};
```

## Testing

### Test Cases
1. ✅ Tìm kiếm với từ khóa có kết quả
2. ✅ Tìm kiếm với từ khóa không có kết quả
3. ✅ Debounce hoạt động đúng
4. ✅ Tham gia nhóm từ kết quả tìm kiếm
5. ✅ UI cập nhật sau khi tham gia
6. ✅ Xóa từ khóa quay lại danh sách ban đầu

### Manual Testing
```bash
# 1. Nhập từ khóa "test" → Xem kết quả
# 2. Bấm "Tham gia" → Kiểm tra cập nhật
# 3. Xóa từ khóa → Kiểm tra quay lại
# 4. Tìm nhóm đã tham gia → Không hiển thị nút "Tham gia"
```

## Troubleshooting

### Vấn đề: Không tìm thấy nhóm
**Giải pháp**: Kiểm tra trường `type` trong Firestore phải là `'public'`

### Vấn đề: UI không cập nhật sau khi tham gia
**Giải pháp**: Đảm bảo cập nhật cả `groups` và `userGroups` state

### Vấn đề: Tìm kiếm quá chậm
**Giải pháp**: 
- Tăng debounce time
- Giảm số lượng kết quả
- Tạo Firestore index

## Kết Luận

Hệ thống tìm kiếm nhóm này cung cấp trải nghiệm tương tự Telegram với:
- ✅ Tìm kiếm toàn cục nhanh chóng
- ✅ Hiển thị thông tin chi tiết
- ✅ Tham gia nhóm dễ dàng
- ✅ UI/UX mượt mà

Các tính năng nâng cao có thể được bổ sung dần theo nhu cầu thực tế.
