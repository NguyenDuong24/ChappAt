# Coin Management Server for ChappAt

Server Node.js/Express hoàn chỉnh để quản lý hệ thống coin (tiền ảo) cho ứng dụng chat ChappAt.

## Tính Năng

### 🔐 Bảo Mật
- Xác thực Firebase Auth với ID Token
- Rate limiting toàn cục và per-endpoint
- Helmet.js cho security headers
- CORS configuration
- Validation đầu vào với express-validator

### 💰 Quản Lý Wallet
- **GET** `/api/wallet/balance` - Xem số dư coin
- **POST** `/api/wallet/topup` - Nạp coin (max 1000/lần, 10 lần/ngày)
- **POST** `/api/wallet/spend` - Tiêu coin (max 5000/lần, 50 lần/ngày)
- **GET** `/api/wallet/transactions` - Xem lịch sử giao dịch

### 🎁 Quản Lý Gifts
- **POST** `/api/gifts/send` - Gửi quà cho người dùng khác (20 lần/ngày)
- **POST** `/api/gifts/redeem` - Đổi quà thành coin (10 lần/ngày)
- **GET** `/api/gifts/received` - Xem quà đã nhận

### 🛍️ Quản Lý Shop
- **GET** `/api/shop/items` - Xem danh sách item trong shop
- **GET** `/api/shop/items/:itemId` - Xem chi tiết một item
- **POST** `/api/shop/purchase` - Mua item bằng coin
- **GET** `/api/shop/my-items` - Xem item đã mua

## Cài Đặt

### Bước 1: Cài dependencies
```bash
cd coin-server
npm install
```

### Bước 2: Cấu hình Firebase Admin SDK
1. Vào Firebase Console > Project Settings > Service Accounts
2. Click "Generate New Private Key"
3. Lưu file JSON vào `coin-server/firebase-service-account.json`

### Bước 3: Cấu hình môi trường
Copy file `.env.example` thành `.env` và điều chỉnh nếu cần:
```bash
cp .env.example .env
```

### Bước 4: Chạy server
```bash
# Development mode với nodemon
npm run dev

# Production mode
npm start
```

Server sẽ chạy tại `http://localhost:3000`

## Cấu Trúc Thư Mục

```
coin-server/
├── src/
│   ├── index.js                    # Entry point
│   ├── middleware/
│   │   └── auth.js                 # Firebase authentication middleware
│   ├── routes/
│   │   ├── wallet.js               # Wallet endpoints
│   │   ├── gifts.js                # Gifts endpoints
│   │   └── shop.js                 # Shop endpoints
│   └── utils/
│       └── coinHelpers.js          # Helper functions
├── package.json
├── .env
├── .env.example
├── firebase-service-account.json   # (Bạn cần tạo file này)
└── README.md
```

## API Documentation

### Authentication
Tất cả endpoint (trừ GET shop items và health check) yêu cầu Bearer token trong header:
```
Authorization: Bearer <firebase-id-token>
```

### Ví Dụ Request

#### 1. Lấy số dư coin
```bash
curl -X GET http://localhost:3000/api/wallet/balance \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

Response:
```json
{
  "success": true,
  "coins": 1000,
  "uid": "user123"
}
```

#### 2. Nạp coin
```bash
curl -X POST http://localhost:3000/api/wallet/topup \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "metadata": {
      "source": "admin_bonus"
    }
  }'
```

Response:
```json
{
  "success": true,
  "message": "Topup successful",
  "amount": 100,
  "newBalance": 1100,
  "transactionId": "tx123"
}
```

#### 3. Gửi quà
```bash
curl -X POST http://localhost:3000/api/gifts/send \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "receiverUid": "receiver123",
    "roomId": "room456",
    "giftId": "hoa-hong",
    "senderName": "John"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Gift sent successfully",
  "gift": {
    "id": "hoa-hong",
    "name": "Hoa hồng",
    "price": 10,
    "icon": "🌹"
  },
  "messageId": "msg789",
  "receiptId": "receipt101",
  "newBalance": 1090
}
```

#### 4. Mua item từ shop
```bash
curl -X POST http://localhost:3000/api/shop/purchase \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": "premium_badge"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Purchase successful",
  "itemId": "premium_badge",
  "itemName": "Premium Badge",
  "price": 50,
  "newBalance": 1040
}
```

### Error Responses
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": []
}
```

Common error codes:
- `AUTH_REQUIRED` - Missing authentication
- `INSUFFICIENT_FUNDS` - Không đủ coin
- `RATE_LIMIT_EXCEEDED` - Vượt quá giới hạn
- `COIN_LIMIT_EXCEEDED` - Vượt quá giới hạn coin tối đa (10,000)
- `GIFT_NOT_FOUND` - Quà không tồn tại
- `ITEM_NOT_FOUND` - Item không tồn tại

## Rate Limits

### Global Rate Limit
- 100 requests / 15 phút mỗi IP

### Endpoint-Specific Limits
- Wallet endpoints: 10 requests / phút
- Gift endpoints: 5 requests / phút
- Shop endpoints: 10 requests / phút

### Per-User Daily Limits
- Topup: 10 lần/ngày
- Spend: 50 lần/ngày
- Send gifts: 20 lần/ngày
- Redeem gifts: 10 lần/ngày

## Coin Limits
- Số coin tối đa mỗi user: 10,000
- Topup tối đa mỗi lần: 1,000
- Spend tối đa mỗi lần: 5,000

## Tích Hợp Với React Native App

Tạo file service trong app để gọi API:

```javascript
// src/services/coinServerApi.js
import { getAuth } from 'firebase/auth';

const API_BASE_URL = 'http://localhost:3000/api'; // Hoặc URL production của bạn

async function getAuthToken() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return await user.getIdToken();
}

export const coinServerApi = {
  // Get balance
  async getBalance() {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/wallet/balance`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return await response.json();
  },

  // Topup coins
  async topup(amount, metadata = {}) {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/wallet/topup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ amount, metadata })
    });
    return await response.json();
  },

  // Send gift
  async sendGift(receiverUid, roomId, giftId, senderName) {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/gifts/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ receiverUid, roomId, giftId, senderName })
    });
    return await response.json();
  },

  // Purchase item
  async purchaseItem(itemId) {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/shop/purchase`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ itemId })
    });
    return await response.json();
  }
};
```

## Deploy Lên Production

### Option 1: Heroku
```bash
# Login to Heroku
heroku login

# Create app
heroku create chappat-coin-server

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set ALLOWED_ORIGINS=https://yourapp.com

# Deploy
git push heroku main
```

### Option 2: Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Option 3: Google Cloud Run (nếu đã có billing)
```bash
# Build and deploy
gcloud run deploy coin-server \
  --source . \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated
```

## Bảo Mật Trong Production

1. **Thay đổi ALLOWED_ORIGINS**: Chỉ cho phép domain của app
2. **HTTPS**: Luôn dùng HTTPS trong production
3. **Environment Variables**: Không commit file `.env` và `firebase-service-account.json`
4. **Firestore Rules**: Vẫn cần có rules chặt chẽ làm lớp bảo vệ thứ hai
5. **Monitoring**: Setup logging và monitoring (Sentry, LogRocket, etc.)

## Troubleshooting

### Server không khởi động được
- Kiểm tra file `firebase-service-account.json` có tồn tại không
- Kiểm tra port 3000 có bị chiếm không

### Authentication failed
- Kiểm tra Firebase token có hợp lệ không
- Token có thể expire sau 1 giờ, cần refresh

### Rate limit exceeded
- Đợi hết thời gian limit window
- Hoặc tăng limit trong code nếu cần

## License
MIT
