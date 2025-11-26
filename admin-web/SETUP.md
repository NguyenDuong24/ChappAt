# Admin Web Setup Guide

## Bước 1: Tạo Admin User

Có 2 cách để tạo admin user:

### Cách 1: Dùng Firebase Console (Khuyến nghị - Đơn giản nhất)

1. Mở [Firebase Console](https://console.firebase.google.com/)
2. Chọn project: **dating-app-1bb49**
3. Vào **Authentication** > **Users**
4. Click **Add User**
5. Nhập:
   - Email: `admin@chappat.com`
   - Password: `Admin@123` (hoặc password bạn muốn)
6. Click **Add User**

### Cách 2: Dùng Script (Cần Service Account Key)

1. Download Service Account Key:
   - Vào Firebase Console > Project Settings > Service Accounts
   - Click "Generate new private key"
   - Lưu file JSON vào thư mục admin-web
   
2. Cài firebase-admin:
   ```bash
   npm install firebase-admin
   ```

3. Chỉnh sửa `create-admin.js` để trỏ đến service account key file

4. Chạy script:
   ```bash
   node create-admin.js
   ```

## Bước 2: Kiểm tra Firestore Rules

Đảm bảo Firestore rules cho phép đọc collection `flagged_content`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admin users (authenticated) có thể đọc flagged_content
    match /flagged_content/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## Bước 3: Login vào Admin Web

1. Chạy admin web:
   ```bash
   npm run dev
   ```

2. Mở browser: http://localhost:3001

3. Login với:
   - Email: `admin@chappat.com`
   - Password: `Admin@123` (hoặc password bạn đã tạo)

## Bước 4: Kiểm tra Flagged Content

Sau khi login, navigate đến **Flagged Content** page để xem danh sách nội dung bị flag.

## Troubleshooting

### Không thấy data trong Flagged Content?

1. Mở Browser Console (F12) và check logs
2. Xem có message "Flagged items loaded: []" không
3. Kiểm tra Firebase Console > Firestore > flagged_content collection có data không
4. Kiểm tra Firestore Rules có cho phép read không

### Login bị lỗi "invalid-credential"?

1. Kiểm tra email/password đã đúng chưa
2. Kiểm tra user đã được tạo trong Firebase Authentication chưa
3. Thử reset password trong Firebase Console nếu cần

### Không load được ảnh?

1. Kiểm tra Storage Rules
2. Kiểm tra imageUrl trong Firestore có valid không
3. Kiểm tra CORS settings của Firebase Storage

## Default Admin Credentials

```
Email: admin@chappat.com
Password: Admin@123
```

**⚠️ Lưu ý: Đổi password sau khi login lần đầu!**
