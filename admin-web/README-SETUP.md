# Quick Setup Instructions

## 🚀 Tạo Admin User (Chọn 1 trong 2 cách)

### Cách 1: Firebase Console (KHUYẾN NGHỊ - Nhanh nhất)

1. Mở: https://console.firebase.google.com/project/dating-app-1bb49/authentication/users
2. Click nút **"Add user"**
3. Nhập:
   - **Email**: `admin@chappat.com`
   - **Password**: `Admin@123`
4. Click **"Add user"**

### Cách 2: Test với Email/Password bất kỳ

Nếu bạn muốn test nhanh, có thể tạo user với bất kỳ email nào:
1. Vào Firebase Console > Authentication > Users > Add user
2. Nhập email và password tùy ý
3. Login vào admin web bằng email/password đó

## ✅ Kiểm tra Firestore Rules

Vào https://console.firebase.google.com/project/dating-app-1bb49/firestore/rules

Đảm bảo có rules sau (hoặc cho phép read flagged_content):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /flagged_content/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;  
    }
  }
}
```

## 🧪 Test Admin Web

1. Đảm bảo server đang chạy: `npm run dev`
2. Mở: http://localhost:3001
3. Login với email/password đã tạo
4. Navigate to "Flagged Content"
5. Mở Browser Console (F12) để xem logs

## 🔍 Debug

Nếu không thấy data, check console logs:
- ✅ "Database instance: Connected"
- ✅ "Flagged items loaded: X items"
- ❌ Nếu có error về permissions: check Firestore Rules
- ❌ Nếu có error về authentication: check user đã tạo đúng chưa

## 📸 Test Flagged Content

Để test xem có data không:
1. Mở app mobile
2. Gửi ảnh NSFW trong chat (sẽ tự động log vào flagged_content)
3. Refresh admin web page
4. Kiểm tra "Flagged Content" tab

---

**Default Credentials** (sau khi tạo):
- Email: admin@chappat.com  
- Password: Admin@123
