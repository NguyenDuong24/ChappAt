# TEST BUTTON LỌC KẾT QUẢ

## Cách kiểm tra button có hiển thị không:

### 1. Mở filter panel:
- Bấm nút filter (🎛️) ở góc trái header
- Panel filter sẽ trượt xuống

### 2. Tìm button "🔍 LỌC KẾT QUẢ":
- Button màu xanh (#667eea) 
- Có icon filter và text "🔍 LỌC KẾT QUẢ"
- Nằm bên phải button "Xóa bộ lọc"
- Có shadow và elevation để nổi bật

### 3. Test button:
- Chọn giới tính (Nam/Nữ/Tất cả)
- Nhập tuổi (từ - đến)
- Bấm "🔍 LỌC KẾT QUẢ"
- Xem console logs: "🔥 APPLY FILTER BUTTON CLICKED!"

### 4. Nếu vẫn không thấy button:

**Option A - Check trong developer tools:**
```javascript
// Mở console và chạy:
console.log('Filter panel visible:', document.querySelector('[data-testid="filter-panel"]'));
```

**Option B - Kiểm tra conditional rendering:**
- Button chỉ hiển thị khi `filterVisible === true`
- Đảm bảo bấm nút filter để mở panel

**Option C - Force render:**
- Scroll xuống trong filter panel
- Button có thể bị che khuất

### 5. Debug steps:
1. Mở app → Home screen
2. Bấm nút filter (🎛️) ở header
3. Panel xuất hiện với:
   - Header: "Bộ lọc tìm kiếm"
   - Giới tính: Nam/Nữ/Tất cả chips
   - Độ tuổi: Input từ-đến
   - **2 buttons ở cuối: "Xóa bộ lọc" và "🔍 LỌC KẾT QUẢ"**

### 6. Expected behavior:
- Button có màu xanh đậm (#667eea)
- Có shadow và elevation
- Khi bấm: console log "🔥 APPLY FILTER BUTTON CLICKED!"
- Panel đóng lại và filter được apply

## Nếu vẫn không thấy:
1. Restart app
2. Check theme colors
3. Scroll down trong filter panel
4. Báo lại tình huống cụ thể
