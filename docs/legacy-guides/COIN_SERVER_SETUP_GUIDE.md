# HƯỚNG DẪN CÀI ĐẶT VÀ SỬ DỤNG COIN SERVER

## 📋 TỔNG QUAN

Bạn đã có một server Node.js/Express hoàn chỉnh để quản lý hệ thống coin (tiền ảo) cho app ChappAt. Server này thay thế cho Firebase Cloud Functions, không cần billing account.

### Cấu trúc dự án:
```
ChappAt/
├── coin-server/              # Server quản lý coin (mới)
│   ├── src/
│   │   ├── index.js         # Entry point
│   │   ├── middleware/      # Authentication
│   │   ├── routes/          # API endpoints
│   │   └── utils/           # Helper functions
│   ├── package.json
│   ├── .env
│   └── README.md
├── src/
│   └── services/
│       └── coinServerApi.js # Client API service (mới)
└── app/
    └── CoinWalletScreen.tsx # Demo UI (mới)
```

## 🚀 BƯỚC 1: CÀI ĐẶT SERVER

### 1.1. Cài đặt dependencies
```powershell
cd coin-server
npm install
```

### 1.2. Lấy Firebase Service Account Key
1. Vào Firebase Console: https://console.firebase.google.com/
2. Chọn project `dating-app-1bb49`
3. Vào **Project Settings** (icon bánh răng) > **Service Accounts**
4. Click **Generate New Private Key**
5. Lưu file JSON vào `coin-server/firebase-service-account.json`

⚠️ **LƯU Ý**: File này chứa thông tin nhạy cảm, không được commit lên Git!

### 1.3. Kiểm tra file .env
File `.env` đã được tạo sẵn với nội dung:
```
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=*
```

### 1.4. Chạy server
```powershell
# Development mode (với nodemon để auto-reload)
npm run dev

# Hoặc production mode
npm start
```

Server sẽ chạy tại: http://localhost:3000

## 🧪 BƯỚC 2: TEST SERVER

### 2.1. Kiểm tra health check
Mở browser hoặc dùng curl:
```powershell
curl http://localhost:3000/health
```

Kết quả mong đợi:
```json
{
  "status": "ok",
  "timestamp": "2025-11-16T..."
}
```

### 2.2. Test với Postman/Insomnia

**Lấy Firebase ID Token**:
Trước tiên, bạn cần lấy token từ Firebase Auth. Có 2 cách:

**Cách 1: Từ app React Native**
Thêm code vào một component có sẵn (tạm thời):
```javascript
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const user = auth.currentUser;
if (user) {
  const token = await user.getIdToken();
  console.log('TOKEN:', token); // Copy token này
}
```

**Cách 2: Từ Firebase Console**
1. Vào https://firebase.google.com/docs/auth/admin/verify-id-tokens
2. Dùng Firebase Authentication REST API để đăng nhập và lấy token

**Test API với token**:
```bash
# Get balance
curl -X GET http://localhost:3000/api/wallet/balance \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Topup
curl -X POST http://localhost:3000/api/wallet/topup \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}'
```

## 📱 BƯỚC 3: TÍCH HỢP VÀO REACT NATIVE APP

### 3.1. File đã được tạo sẵn
- `src/services/coinServerApi.js` - Service để gọi API
- `app/CoinWalletScreen.tsx` - Demo UI

### 3.2. Sử dụng trong app

**Ví dụ 1: Lấy số dư coin**
```javascript
import { coinServerApi, getErrorMessage } from '../src/services/coinServerApi';

async function getMyBalance() {
  try {
    const result = await coinServerApi.getBalance();
    console.log('Số dư:', result.coins);
    return result.coins;
  } catch (error) {
    console.error('Lỗi:', getErrorMessage(error));
  }
}
```

**Ví dụ 2: Gửi quà**
```javascript
import { coinServerApi } from '../src/services/coinServerApi';

async function sendGiftToFriend() {
  try {
    const result = await coinServerApi.sendGift(
      'receiverUid123',     // UID người nhận
      'roomId456',          // ID phòng chat
      'hoa-hong',           // ID quà (hoa hồng = 10 coin)
      'Nguyễn Văn A'        // Tên người gửi
    );
    
    console.log('Gửi quà thành công!', result);
    // result.newBalance = số dư mới
    // result.gift = thông tin quà
  } catch (error) {
    console.error('Lỗi gửi quà:', error);
  }
}
```

**Ví dụ 3: Mua item từ shop**
```javascript
async function buyPremiumBadge() {
  try {
    const result = await coinServerApi.purchaseItem('premium_badge');
    console.log('Mua thành công!', result);
  } catch (error) {
    if (error.code === 'INSUFFICIENT_FUNDS') {
      alert('Không đủ coin!');
    }
  }
}
```

### 3.3. Thêm vào navigation
Nếu muốn thêm CoinWalletScreen vào navigation:

```javascript
// Trong file navigation của bạn (ví dụ: app/(tabs)/_layout.tsx)
import CoinWalletScreen from '../CoinWalletScreen';

// Thêm vào stack/tab navigator
<Tab.Screen 
  name="wallet" 
  component={CoinWalletScreen}
  options={{
    title: 'Ví Coin',
    tabBarIcon: ({ color }) => <Text>💰</Text>
  }}
/>
```

## 🔐 BƯỚC 4: BẢO MẬT FIRESTORE (QUAN TRỌNG!)

Vì server đang xử lý coin, bạn PHẢI chặn client trực tiếp sửa coin trong Firestore.

Cập nhật `firestore.rules`:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{userId} {
      // Cho phép đọc profile của chính mình
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // CHỈ cho phép cập nhật các field KHÔNG PHẢI coin
      allow update: if request.auth != null 
        && request.auth.uid == userId
        && !('coins' in request.resource.data.diff(resource.data));
      
      // KHÔNG cho phép thay đổi coin trực tiếp
      // Coin chỉ được thay đổi qua server
      
      // Cho phép tạo user mới (khi đăng ký)
      allow create: if request.auth != null && request.auth.uid == userId;
      
      // Subcollections
      match /coinTransactions/{txId} {
        // Chỉ đọc, không được tạo/sửa/xóa từ client
        allow read: if request.auth != null && request.auth.uid == userId;
        allow write: if false; // CHỈ server được ghi
      }
      
      match /giftsReceived/{giftId} {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow write: if false; // CHỈ server được ghi
      }
      
      match /items/{itemId} {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow write: if false; // CHỈ server được ghi
      }
    }
    
    // Gifts collection (catalog)
    match /gifts/{giftId} {
      allow read: if request.auth != null;
      allow write: if false; // Chỉ admin
    }
    
    // Shop items
    match /shopItems/{itemId} {
      allow read: if request.auth != null;
      allow write: if false; // Chỉ admin
    }
    
    // Rate limits (chỉ server đọc/ghi)
    match /rateLimits/{limitId} {
      allow read, write: if false;
    }
    
    // Rooms và messages (giữ nguyên rules cũ của bạn)
    match /rooms/{roomId} {
      allow read, write: if request.auth != null;
      
      match /messages/{messageId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

Deploy rules:
```powershell
firebase deploy --only firestore:rules
```

## 🌐 BƯỚC 5: DEPLOY SERVER LÊN PRODUCTION

### Option 1: Heroku (Miễn phí - có giới hạn)

```powershell
# Cài Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
heroku login

# Tạo app
cd coin-server
git init
heroku create chappat-coin-server

# Set env vars
heroku config:set NODE_ENV=production
heroku config:set ALLOWED_ORIGINS=https://yourapp.com

# Upload firebase service account (bằng cách add vào config)
# Cách tốt hơn: Dùng heroku config:set với base64 encoded JSON

# Deploy
git add .
git commit -m "Initial commit"
git push heroku main

# Kiểm tra logs
heroku logs --tail
```

URL production: https://chappat-coin-server.herokuapp.com

### Option 2: Vercel (Miễn phí - serverless)

```powershell
# Cài Vercel CLI
npm i -g vercel

cd coin-server

# Deploy
vercel --prod
```

**Lưu ý**: Với Vercel, cần tạo file `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/index.js"
    }
  ]
}
```

### Option 3: Railway (Dễ nhất, có free tier)

1. Vào https://railway.app/
2. Đăng nhập bằng GitHub
3. Click "New Project" > "Deploy from GitHub repo"
4. Chọn repo coin-server
5. Set environment variables
6. Deploy tự động!

### Cập nhật URL trong app

Sau khi deploy, cập nhật `src/services/coinServerApi.js`:
```javascript
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api'
  : 'https://chappat-coin-server.herokuapp.com/api'; // URL production của bạn
```

## 📊 GIÁM SÁT VÀ BẢO TRÌ

### Xem logs server
```powershell
# Local
npm run dev  # logs sẽ hiện trong terminal

# Heroku
heroku logs --tail

# Railway/Vercel
# Xem trong dashboard web
```

### Kiểm tra usage
- Xem số request trong dashboard của hosting
- Monitor Firebase Firestore reads/writes
- Theo dõi memory/CPU usage

### Backup dữ liệu
Định kỳ export Firestore:
```powershell
firebase firestore:export gs://your-bucket-name/backups/$(date +%Y%m%d)
```

## ❓ TROUBLESHOOTING

### Lỗi: "Cannot find module firebase-service-account.json"
➡️ Bạn chưa tạo file service account. Xem lại bước 1.2

### Lỗi: "Authentication failed"
➡️ Token đã hết hạn (expire sau 1h). Gọi `user.getIdToken(true)` để refresh

### Lỗi: "CORS policy blocked"
➡️ Thêm origin của app vào ALLOWED_ORIGINS trong .env

### Lỗi: "INSUFFICIENT_FUNDS" nhưng user có coin
➡️ Kiểm tra coin có phải là number không (không phải string)
➡️ Kiểm tra Firestore rules có chặn không

### Server không start trên production
➡️ Kiểm tra PORT env variable
➡️ Kiểm tra firebase-service-account.json đã upload chưa

## 🎯 NEXT STEPS

1. ✅ **Đã hoàn thành**:
   - Server hoàn chỉnh với authentication
   - Rate limiting và validation
   - API endpoints đầy đủ
   - Client service
   - Demo UI

2. **Nên làm thêm**:
   - Thêm admin dashboard để quản lý coin
   - Implement payment gateway thực (Stripe, PayPal) cho topup
   - Thêm analytics và monitoring (Sentry, LogRocket)
   - Tạo webhook để notify app khi có giao dịch
   - Implement referral system (giới thiệu bạn bè nhận coin)

3. **Tùy chọn nâng cao**:
   - Thêm daily login rewards
   - Implement coin leaderboard
   - Tạo gift animation khi gửi quà
   - Thêm coin expiry system

## 📞 HỖ TRỢ

Nếu gặp vấn đề:
1. Kiểm tra logs server
2. Kiểm tra Firestore rules
3. Test API bằng Postman trước
4. Kiểm tra Firebase token còn hạn không

Chúc bạn thành công! 🎉
