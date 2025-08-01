## Tính năng Chat mới đã được thêm

### 🕒 Hiển thị thời gian tin nhắn
- **Thời gian ngắn gọn**: Hiển thị trực tiếp trong mỗi tin nhắn (HH:MM cho hôm nay, DD/MM cho ngày khác)
- **Thời gian chi tiết**: Tap vào tin nhắn để xem thời gian chi tiết với định dạng tiếng Việt (Hôm nay, Hôm qua, Thứ hai, v.v.)

### ✅ Trạng thái tin nhắn
- **Đã gửi** (✓): Tin nhắn đã được gửi đi
- **Đã nhận** (✓✓): Tin nhắn đã được delivered đến thiết bị người nhận
- **Đã xem** (✓✓ màu xanh): Tin nhắn đã được người nhận đọc

### 🔴 Đếm tin nhắn chưa đọc
- Hiển thị badge đỏ với số lượng tin nhắn chưa đọc trong danh sách chat
- Tự động cập nhật khi có tin nhắn mới hoặc khi đánh dấu đã đọc

### 🎨 Giao diện được cải thiện
- Thời gian và trạng thái hiển thị gọn gàng trong bubble tin nhắn
- Hỗ trợ cả chế độ Dark/Light theme
- Icon trạng thái rõ ràng và dễ hiểu

### 📱 Tự động đánh dấu đã đọc
- Tin nhắn tự động được đánh dấu là "delivered" khi người dùng vào phòng chat
- Tin nhắn tự động được đánh dấu là "read" khi người dùng xem chat
- Cập nhật realtime thông qua Firebase Firestore

### 🚀 Cách sử dụng
1. Gửi tin nhắn sẽ hiển thị trạng thái "Đã gửi"
2. Khi người nhận vào phòng chat, trạng thái chuyển thành "Đã nhận"
3. Khi người nhận xem tin nhắn, trạng thái chuyển thành "Đã xem"
4. Tap vào tin nhắn để xem thời gian chi tiết và trạng thái

### 🔧 Cải tiến kỹ thuật
- Sử dụng Firebase Firestore để lưu trữ trạng thái tin nhắn
- Tối ưu hiệu suất với onSnapshot listeners
- Tương thích với TypeScript
- Responsive design cho mọi kích thước màn hình
