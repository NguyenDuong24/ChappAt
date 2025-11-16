# LẤY FIREBASE SERVICE ACCOUNT KEY

## Bước 1: Truy cập Firebase Console
1. Mở trình duyệt và vào: https://console.firebase.google.com/
2. Đăng nhập với tài khoản Google đã tạo project Firebase
3. Chọn project: **dating-app-1bb49**

## Bước 2: Vào Service Accounts
1. Ở góc trên bên trái, click vào icon **bánh răng ⚙️** (Settings)
2. Chọn **Project settings** (Cài đặt dự án)
3. Chuyển sang tab **Service accounts** (Tài khoản dịch vụ)

## Bước 3: Generate Private Key
1. Trong phần **Firebase Admin SDK**, tìm nút **Generate new private key** (Tạo khóa riêng tư mới)
2. Click vào nút đó
3. Một popup cảnh báo sẽ hiện ra: "This key provides full access..."
4. Click **Generate key** (Tạo khóa)
5. File JSON sẽ tự động được tải xuống

## Bước 4: Di chuyển file vào project
1. File vừa tải về có tên giống như: `dating-app-1bb49-firebase-adminsdk-xxxxx-xxxxxxxxxx.json`
2. **ĐỔI TÊN** file thành: `firebase-service-account.json`
3. **DI CHUYỂN** file vào thư mục: `C:\Users\Admin\Desktop\Chat\ChappAt\coin-server\`

Cấu trúc cuối cùng sẽ như thế này:
```
ChappAt/
├── coin-server/
│   ├── firebase-service-account.json  ← File này
│   ├── src/
│   ├── package.json
│   ├── .env
│   └── ...
```

## Bước 5: Kiểm tra
Sau khi đã đặt file đúng vị trí, hãy chạy server:

```powershell
cd coin-server
npm run dev
```

Nếu thấy thông báo:
```
🚀 Coin Server running on port 3000
📍 Environment: development
```

➡️ **THÀNH CÔNG!** Server đã chạy!

## ⚠️ LƯU Ý BẢO MẬT
- **KHÔNG BAO GIỜ** commit file `firebase-service-account.json` lên GitHub/GitLab
- File này chứa quyền admin đầy đủ của Firebase project
- Nếu bị lộ, hãy xóa ngay và tạo key mới
- File đã được thêm vào `.gitignore` để tránh commit nhầm

## ❓ Gặp vấn đề?

### Không tìm thấy "Service accounts" tab?
➡️ Đảm bảo bạn đã chọn đúng project và có quyền Owner/Editor

### Nút "Generate new private key" bị disabled?
➡️ Bạn cần có quyền Editor/Owner trong project. Liên hệ admin của project.

### File không tải xuống?
➡️ Kiểm tra trình duyệt có chặn popup không. Cho phép download từ Firebase Console.

---

Sau khi hoàn thành, quay lại file `COIN_SERVER_SETUP_GUIDE.md` để tiếp tục!
