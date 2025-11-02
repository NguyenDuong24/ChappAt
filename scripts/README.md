# 🔥 HotSpots Data Import Script

Script này giúp import dữ liệu mẫu cho tính năng HotSpots vào Firebase Firestore.

## 📋 Yêu cầu

- Node.js (v14 trở lên)
- Quyền truy cập Firebase project
- Internet connection

## 🚀 Cách sử dụng

### Bước 1: Di chuyển vào thư mục scripts
```bash
cd scripts
```

### Bước 2: Cài đặt dependencies
```bash
npm install
```

### Bước 3: Chạy script import
```bash
# Import data mới (giữ lại data cũ nếu có)
npm run import

# Hoặc xóa data cũ trước khi import
npm run import:clear
```

## 📊 Dữ liệu mẫu bao gồm

Script sẽ import **12 HotSpots** với các thông tin sau:

### 🎪 Sự kiện (Events)
- **EDM Festival 2025** - Lễ hội âm nhạc EDM hoành tráng
- **Triển lãm Nghệ thuật Đương đại** - Triển lãm nghệ thuật hiện đại
- **Tech Meetup AI & Blockchain** - Hội thảo công nghệ
- **Giải Bóng đá Mini Cup** - Giải đấu thể thao
- **Coffee Workshop Latte Art** - Workshop pha chế coffee
- **Sunrise Yoga Session** - Tập yoga buổi sáng
- **Street Art Walking Tour** - Tour khám phá street art
- **Blockchain Trading Workshop** - Workshop đầu tư crypto

### 🏢 Địa điểm (Places)
- **Food Court Cao cấp Saigon** - Khu ẩm thực luxury
- **Saigon Rooftop Bar** - Bar tầng thượng view đẹp
- **Elite Gaming Lounge** - Phòng game VIP
- **Michelin Star Restaurant** - Nhà hàng đẳng cấp

### 📂 Phân loại theo danh mục
- 🎵 **Music**: 1 item
- 🍴 **Food**: 3 items  
- 🎨 **Art**: 2 items
- 💻 **Technology**: 3 items
- 🍸 **Nightlife**: 1 item
- ⚽ **Sports**: 2 items

## 📱 Sau khi import

1. Mở app ChappAt
2. Vào tab **Explore**
3. Nhấn vào icon **HotSpots** ở header
4. Xem dữ liệu mẫu đã được import

## 🔧 Cấu trúc dữ liệu

Mỗi HotSpot bao gồm:
```javascript
{
  title: string,              // Tiêu đề
  description: string,        // Mô tả chi tiết
  category: string,          // Danh mục (music, food, art, etc.)
  type: 'event' | 'place',   // Loại (sự kiện hoặc địa điểm)
  imageUrl: string,          // Hình ảnh (Unsplash)
  location: string,          // Địa chỉ
  participants: number,      // Số người tham gia
  maxParticipants?: number,  // Giới hạn người tham gia
  startTime: string,         // Thời gian bắt đầu (ISO)
  endTime?: string,          // Thời gian kết thúc (ISO)
  price?: number,            // Giá vé (VND)
  rating: number,            // Đánh giá (1-5)
  tags: string[],            // Thẻ tag
  isPopular?: boolean,       // Có phổ biến không
  isNew?: boolean,           // Có mới không
  createdAt: string,         // Thời gian tạo
  updatedAt: string          // Thời gian cập nhật
}
```

## 🎨 Hình ảnh

Tất cả hình ảnh được lấy từ [Unsplash](https://unsplash.com) với chất lượng cao (800px, 80% quality).

## 🔥 Lưu ý

- Script sử dụng Firebase Web SDK v10
- Dữ liệu được lưu vào collection `hotSpots`
- Thời gian trong dữ liệu mẫu là tương đối (2025)
- Giá tiền tính bằng VND

## 🆘 Troubleshooting

### Lỗi Firebase permission
Đảm bảo Firebase project đã được cấu hình đúng và có quyền write vào Firestore.

### Lỗi network
Kiểm tra kết nối internet và firewall.

### Lỗi Node.js version
Sử dụng Node.js version 14 trở lên.

## 📞 Hỗ trợ

Nếu gặp vấn đề, hãy kiểm tra:
1. Firebase config trong `firebaseConfig.js`
2. Firestore rules cho phép write
3. Internet connection
4. Node.js version

---

**Chúc bạn có trải nghiệm tốt với tính năng HotSpots! 🔥**
