# 🎉 HOÀN THÀNH: HỆ THỐNG COIN SERVER CHO CHAPPAT

## ✅ ĐÃ TẠO XONG

Tôi đã xây dựng hoàn chỉnh một **Node.js/Express Server** để quản lý hệ thống coin (tiền ảo) cho dự án ChappAt của bạn. Server này thay thế Firebase Cloud Functions, không cần billing account!

### 📦 Các file đã được tạo:

#### 🔹 Server (coin-server/)
```
coin-server/
├── src/
│   ├── index.js                    ← Server chính
│   ├── middleware/
│   │   └── auth.js                 ← Xác thực Firebase Auth
│   ├── routes/
│   │   ├── wallet.js               ← API wallet (balance, topup, spend)
│   │   ├── gifts.js                ← API gifts (send, redeem)
│   │   └── shop.js                 ← API shop (purchase, items)
│   └── utils/
│       └── coinHelpers.js          ← Helper functions
├── package.json                    ← Dependencies
├── .env                            ← Configuration
├── .env.example                    ← Template config
├── .gitignore                      ← Git ignore
├── README.md                       ← Hướng dẫn API
└── GET_FIREBASE_KEY.md            ← Hướng dẫn lấy Firebase key
```

#### 🔹 Client Integration
```
ChappAt/
├── src/services/
│   └── coinServerApi.js            ← Service gọi API từ React Native
├── app/
│   └── CoinWalletScreen.tsx        ← Demo UI quản lý coin
├── COIN_SERVER_SETUP_GUIDE.md     ← Hướng dẫn chi tiết setup
└── check-coin-server.ps1           ← Script kiểm tra setup
```

## 🚀 TÍNH NĂNG

### 💰 Wallet Management
- ✅ Xem số dư coin
- ✅ Nạp coin (topup) - max 1000/lần, 10 lần/ngày
- ✅ Tiêu coin (spend) - max 5000/lần, 50 lần/ngày
- ✅ Xem lịch sử giao dịch

### 🎁 Gift System
- ✅ Gửi quà cho người khác - 20 lần/ngày
- ✅ Đổi quà thành coin - 10 lần/ngày
- ✅ Xem quà đã nhận
- ✅ Hỗ trợ fallback gifts (bánh mì, trà sữa, hoa hồng, cà phê)

### 🛍️ Shop System
- ✅ Xem danh sách items
- ✅ Mua items bằng coin
- ✅ Xem items đã mua

### 🔐 Bảo Mật
- ✅ Firebase Authentication với ID Token
- ✅ Rate limiting (global + per-endpoint + per-user)
- ✅ Input validation với express-validator
- ✅ Helmet.js security headers
- ✅ CORS protection
- ✅ Transaction atomic với Firestore transactions
- ✅ Coin limit (max 10,000 per user)

## 📋 CÁC BƯỚC TIẾP THEO

### BƯỚC 1: Lấy Firebase Service Account Key ⚠️ QUAN TRỌNG!

Bạn cần file này để server có thể kết nối với Firebase:

1. Vào: https://console.firebase.google.com/
2. Chọn project: **dating-app-1bb49**
3. Settings ⚙️ > Project settings > Service accounts
4. Click **Generate new private key**
5. Đổi tên file thành: `firebase-service-account.json`
6. Đặt vào: `C:\Users\Admin\Desktop\Chat\ChappAt\coin-server\`

📖 **Xem hướng dẫn chi tiết**: `coin-server\GET_FIREBASE_KEY.md`

### BƯỚC 2: Chạy Server

```powershell
# Di chuyển vào thư mục coin-server
cd C:\Users\Admin\Desktop\Chat\ChappAt\coin-server

# Chạy server (development mode)
npm run dev
```

Server sẽ chạy tại: **http://localhost:3000**

Nếu thành công, bạn sẽ thấy:
```
🚀 Coin Server running on port 3000
📍 Environment: development
```

### BƯỚC 3: Test Server

Mở browser và vào: http://localhost:3000/health

Nếu thấy `{"status":"ok","timestamp":"..."}` → **THÀNH CÔNG!**

### BƯỚC 4: Cập Nhật Firestore Rules

**⚠️ CỰC KỲ QUAN TRỌNG**: Phải chặn client trực tiếp sửa coin!

File: `firestore.rules` (xem chi tiết trong `COIN_SERVER_SETUP_GUIDE.md`)

```
match /users/{userId} {
  // CHỈ cho phép đọc, KHÔNG cho phép sửa coin trực tiếp
  allow read: if request.auth != null && request.auth.uid == userId;
  
  // Không cho phép thay đổi field 'coins'
  allow update: if request.auth != null 
    && request.auth.uid == userId
    && !('coins' in request.resource.data.diff(resource.data));
}
```

Deploy rules:
```powershell
firebase deploy --only firestore:rules
```

### BƯỚC 5: Tích Hợp Vào React Native App

File `src/services/coinServerApi.js` đã sẵn sàng để dùng!

**Ví dụ đơn giản**:
```javascript
import { coinServerApi } from '../src/services/coinServerApi';

// Lấy số dư
const balance = await coinServerApi.getBalance();
console.log('Coins:', balance.coins);

// Nạp coin
await coinServerApi.topup(100);

// Gửi quà
await coinServerApi.sendGift('receiverUid', 'roomId', 'hoa-hong', 'Tên bạn');
```

### BƯỚC 6: Deploy Lên Production (sau khi test OK)

**Lựa chọn hosting**:
- **Heroku** (dễ, có free tier)
- **Railway** (dễ nhất, modern UI)
- **Vercel** (serverless, miễn phí)
- **Google Cloud Run** (nếu muốn dùng GCP)

Xem hướng dẫn chi tiết trong `COIN_SERVER_SETUP_GUIDE.md`

## 📚 TÀI LIỆU THAM KHẢO

1. **COIN_SERVER_SETUP_GUIDE.md** - Hướng dẫn setup chi tiết từng bước
2. **coin-server/README.md** - API documentation và ví dụ
3. **coin-server/GET_FIREBASE_KEY.md** - Hướng dẫn lấy Firebase key
4. **app/CoinWalletScreen.tsx** - Ví dụ UI component

## 🎯 SO SÁNH VỚI CLOUD FUNCTIONS

### Cloud Functions (cách cũ):
- ❌ Cần billing account (thẻ tín dụng)
- ❌ Deploy phức tạp hơn
- ✅ Auto-scale
- ✅ Serverless

### Express Server (cách mới):
- ✅ **KHÔNG cần billing** (chỉ cần free hosting)
- ✅ Deploy đơn giản (Heroku, Railway, Vercel)
- ✅ Dễ debug và test
- ✅ Có thể chạy local
- ✅ Kiểm soát hoàn toàn
- ⚠️ Cần hosting riêng

## 💡 TIPS

1. **Luôn test local trước**: `npm run dev` → test → rồi mới deploy
2. **Backup Firestore định kỳ**: `firebase firestore:export`
3. **Monitor logs**: Xem logs server để catch lỗi sớm
4. **Firestore rules là lớp bảo vệ cuối cùng**: Luôn có rules chặt chẽ
5. **Rate limiting đủ dùng**: Không cần lo DDoS với free tier

## 🐛 TROUBLESHOOTING

| Vấn đề | Giải pháp |
|--------|-----------|
| Server không start | Kiểm tra `firebase-service-account.json` có tồn tại không |
| Authentication failed | Token hết hạn, gọi `user.getIdToken(true)` để refresh |
| CORS error | Thêm origin vào `ALLOWED_ORIGINS` trong `.env` |
| INSUFFICIENT_FUNDS | Kiểm tra coin có phải number không (không phải string) |
| Rate limit exceeded | Đợi hết window time hoặc tăng limit |

## 🎉 KẾT LUẬN

Bạn đã có một **hệ thống quản lý coin hoàn chỉnh** với:
- ✅ Backend server bảo mật
- ✅ Client API service
- ✅ Demo UI
- ✅ Đầy đủ documentation
- ✅ Rate limiting & validation
- ✅ Transaction logging
- ✅ Gift system
- ✅ Shop system

**Không cần billing Firebase** - chỉ cần hosting miễn phí (Heroku, Railway, Vercel)!

---

## 📞 HỖ TRỢ

Nếu cần thêm tính năng hoặc gặp vấn đề:
1. Kiểm tra logs server: `npm run dev` (xem terminal)
2. Test API với Postman/curl trước
3. Đọc lại hướng dẫn trong các file .md
4. Kiểm tra Firestore rules và Firebase token

**Chúc bạn thành công với dự án ChappAt! 🚀**
