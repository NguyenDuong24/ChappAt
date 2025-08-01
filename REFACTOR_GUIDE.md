# Refactored Project Structure

## 📁 Cấu trúc mới sau refactor

### Hooks (Custom Hooks)
- **`hooks/useCallListeners.js`** - Quản lý các Firebase listeners cho cuộc gọi
- **`hooks/useNotificationHandlers.js`** - Xử lý notifications
- **`hooks/useCallNavigation.js`** - Quản lý navigation cho các màn hình cuộc gọi
- **`hooks/useAuthRouting.js`** - Xử lý authentication routing

### Services
- **`services/backgroundService.js`** - Quản lý background tasks và notifications

### Constants
- **`constants/Navigation.js`** - Định nghĩa routes, call status, và screen names

### Components
- **`components/common/AppStateManager.jsx`** - Quản lý app state (foreground/background)

## 🔧 Những cải tiến chính

### 1. **Separation of Concerns**
- Tách logic Firebase listeners thành hooks riêng biệt
- Tách notification handling
- Tách navigation logic
- Tách background services

### 2. **Code Reusability**
- Các hooks có thể được sử dụng lại ở nhiều component khác
- Logic được modulize rõ ràng

### 3. **Better Maintainability**
- Code dễ đọc và hiểu hơn
- Dễ dàng debug và test
- Dễ dàng thêm features mới

### 4. **Type Safety & Constants**
- Định nghĩa constants cho routes và call status
- Giảm thiểu magic strings
- Dễ dàng refactor sau này

### 5. **Performance Optimization**
- Sử dụng useCallback để tránh re-render không cần thiết
- Proper cleanup của listeners
- Better memory management

## 📋 Cách sử dụng hooks mới

### useCallListeners
```javascript
import { useIncomingCallListener } from '../hooks/useCallListeners';

// Trong component
const handleIncomingCall = (callData) => {
  // Handle incoming call
};

useIncomingCallListener(userId, handleIncomingCall);
```

### useNotificationHandlers
```javascript
import { useNotificationHandlers } from '../hooks/useNotificationHandlers';

// Trong component
useNotificationHandlers(); // Tự động setup notification listeners
```

### useCallNavigation
```javascript
import { useCallNavigation } from '../hooks/useCallNavigation';

const { 
  navigateToIncomingCall, 
  navigateToCallScreen,
  handleCallCanceled 
} = useCallNavigation();
```

## 🚀 Benefits sau refactor

1. **Cleaner Code**: File `_layout.jsx` ngắn gọn và dễ đọc hơn
2. **Better Testing**: Có thể test từng hook riêng biệt
3. **Easier Debugging**: Logic được tách biệt rõ ràng
4. **Scalability**: Dễ dàng thêm features mới
5. **Type Safety**: Sử dụng constants thay vì magic strings

## 📝 Next Steps

1. **Testing**: Viết unit tests cho các hooks
2. **TypeScript**: Convert sang TypeScript để tăng type safety
3. **Error Handling**: Thêm error boundaries và error handling
4. **Performance**: Thêm React.memo cho các components cần thiết
5. **Documentation**: Viết JSDoc cho tất cả functions và hooks
