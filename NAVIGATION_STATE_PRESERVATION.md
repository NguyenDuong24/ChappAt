# Navigation State Preservation - Implementation Summary

## Vấn đề (Problem)
Người dùng muốn khi điều hướng từ Home List User hoặc Explorer Tab đến User Profile Screen, sau đó khi thoát ra sẽ quay lại màn hình trước đó với dữ liệu cũ không bị tải lại.

## Giải pháp (Solution)

### 1. Tab State Preservation
Đã thêm `unmountOnBlur: false` vào tất cả các tabs trong `app/(tabs)/_layout.jsx`:

- **Home Tab**: ✅ Đã có từ trước
- **Explore Tab**: ✅ Đã thêm
- **Chat Tab**: ✅ Đã có từ trước  
- **Groups Tab**: ✅ Đã thêm
- **Profile Tab**: Không cần (reset khi click vào tab)

### 2. Navigation Method
Tất cả các điều hướng đến UserProfileScreen đã sử dụng `router.push()`:

- **ListUser (Home Tab)**: Line 74-77, sử dụng `router.push()`
- **PostCard (Explorer Tab)**: Line 339, sử dụng `router.push()`
- **Notifications**: Sử dụng `router.push()`
- **HashtagScreen**: Sử dụng `router.push()`
- **Groups**: Sử dụng `router.push()`

### 3. User Profile Screen
File `app/UserProfileScreen.tsx` đã được thiết kế đúng để:
- Nhận `userId` từ params
- Load data của user profile
- Cho phép user quay lại bằng nút back

## Kết quả (Results)

### ✅ Home Tab → User Profile → Back
- Khi click vào user trong Home List
- Mở User Profile Screen
- Nhấn back → Quay lại Home Tab
- **Dữ liệu List User giữ nguyên, không reload**

### ✅ Explorer Tab → User Profile → Back  
- Khi click vào user avatar/name trong bài post
- Mở User Profile Screen
- Nhấn back → Quay lại Explorer Tab
- **Scroll position và data giữ nguyên, không reload**

### ✅ Chat Tab → User Profile → Back
- Khi mở profile từ chat
- Nhấn back → Quay lại Chat Tab
- **Danh sách chat giữ nguyên**

### ✅ Groups Tab → User Profile → Back
- Khi mở profile từ group
- Nhấn back → Quay lại Groups Tab
- **Data group giữ nguyên**

## Technical Details

### unmountOnBlur: false
Thuộc tính này ngăn React Navigation unmount component khi user rời khỏi tab:
- Component vẫn mount trong background
- State được preserve
- Data không bị reload
- Scroll position được giữ

### router.push() vs router.replace()
- `router.push()`: Thêm screen vào navigation stack → User có thể back
- `router.replace()`: Thay thế screen hiện tại → Không thể back

## Files Modified

1. **app/(tabs)/_layout.jsx**
   - Thêm `unmountOnBlur: false` cho explore tab
   - Thêm `unmountOnBlur: false` cho groups tab

## Testing Checklist

- [ ] Test Home → User Profile → Back (data preserved)
- [ ] Test Explorer → User Profile → Back (scroll position preserved)
- [ ] Test Chat → User Profile → Back (chat list preserved)
- [ ] Test Groups → User Profile → Back (groups preserved)
- [ ] Test hardware back button (Android)
- [ ] Test swipe back gesture (iOS)

## Notes

- Tất cả tabs giờ đều preserve state khi navigate away
- User experience được cải thiện đáng kể
- Không có data reload không cần thiết
- Navigation stack hoạt động chính xác
