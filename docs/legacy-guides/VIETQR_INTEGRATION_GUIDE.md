# VietQR Payment Integration Guide

## Tổng Quan

Ứng dụng ChappAt đã chuyển từ **MoMo** sang **VietQR** để thanh toán. VietQR là phương thức thanh toán qua mã QR chuẩn của Ngân hàng Nhân dân Việt Nam, hỗ trợ chuyển khoản qua mọi ứng dụng ngân hàng.

## Thay Đổi Chính

### 1. Backend Server (`saigondating-server`)

#### Routes Mới
- ✅ `POST /api/vietqr/create-payment` - Tạo thanh toán VietQR
- ✅ `POST /api/vietqr/verify-payment` - Xác nhận thanh toán
- ✅ `GET /api/vietqr/order-status/:orderId` - Kiểm tra trạng thái đơn hàng

#### Routes Cũ (MoMo - Deprecated)
- ❌ `POST /api/momo/create-payment` (Giữ để backward compatibility)
- ❌ `POST /api/momo/check-status`
- ❌ `POST /api/momo/webhook`

#### Cấu Hình Môi Trường (.env)
```env
# VietQR Payment Configuration
VIETQR_ACCOUNT=1018395984
VIETQR_ACCOUNT_NAME=Nguyen Thai Duong
VIETQR_TEMPLATE=compact2

# Pro Upgrade Price (VND)
PRO_UPGRADE_PRICE=99000
```

### 2. Frontend (ChappAt App)

#### Services
- ✅ `services/vietqrPaymentService.ts` - VietQR payment service (thay thế momoPaymentService)
- ❌ `services/momoPaymentService.ts` - Deprecated (còn để backup)

#### Components
- ✅ `components/payment/VietQRPaymentModal.tsx` - Modal hiển thị QR code và hướng dẫn
- ✅ `components/payment/CoinPurchaseSection.tsx` - Cập nhật sử dụng VietQR

#### Screens
- ✅ `app/(screens)/subscription/ProUpgradeScreen.tsx` - Cập nhật sử dụng VietQR
- ✅ `app/(screens)/wallet/CoinWalletScreen.tsx` - Cập nhật metadata source

## Quy Trình Thanh Toán VietQR

### Flow trên App

```
User chọn gói coin/Pro
    ↓
App gọi /api/vietqr/create-payment
    ↓
Server tạo order (pending), tạo VietQR code
    ↓
App hiển thị QR code modal
    ↓
User quét QR hoặc copy nội dung chuyển khoản thủ công
    ↓
User chuyển khoản vào tài khoản
    ↓
User nhập nội dung xác nhận (VIP_ORD123456)
    ↓
App gọi /api/vietqr/verify-payment
    ↓
Server verify nội dung, cập nhật coin/pro status
    ↓
App hiển thị success
```

### Nội Dung Chuyển Khoản Format

**Format:** `{PRODUCT_TYPE}_{ORDER_ID}`

**Ví dụ:**
- Nạp coin 50: `VIP_ORD1H5G2M1K` 
- Nâng cấp Pro: `PRO_ORD1H5G2M1K`

## VietQR Configuration

### Thông Tin Tài Khoản
- **Ngân hàng:** Vietcombank (Bank Code: 970436)
- **Số tài khoản:** 1018395984
- **Chủ tài khoản:** Nguyen Thai Duong

### Tính Năng

#### 1. Tạo Thanh Toán
```typescript
const result = await vietqrPaymentService.createCoinPurchase(coinPackage);
// Returns:
// {
//   orderId: "ORD1H5G2M1K",
//   amount: 99000,
//   description: "VIP_ORD1H5G2M1K",
//   qrImageUrl: "https://img.vietqr.io/image/...",
//   accountNumber: "1018395984",
//   accountName: "Nguyen Thai Duong",
//   instructions: { method1, method2 }
// }
```

#### 2. Xác Nhận Thanh Toán
```typescript
const result = await vietqrPaymentService.verifyPayment(
  orderId,
  descriptionFromUser, // User nhập lại nội dung
  amount
);
// Returns:
// {
//   success: true,
//   status: 'completed',
//   coinsAdded: 50,      // Nếu coin purchase
//   proExpiresAt: Date,  // Nếu pro upgrade
// }
```

#### 3. Kiểm Tra Trạng Thái Đơn Hàng
```typescript
const status = await vietqrPaymentService.checkPaymentStatus(orderId);
// Returns:
// {
//   orderId: "ORD1H5G2M1K",
//   status: 'pending' | 'completed' | 'failed',
//   amount: 99000,
//   product: 'coin' | 'pro_upgrade'
// }
```

## Cơ Sở Dữ Liệu (Firestore)

### Collection: `users/{uid}/orders`
```javascript
{
  orderId: "ORD1H5G2M1K",
  product: "coin", // or "pro_upgrade"
  coinPackage: { amount: 50, price: 2000 }, // for coin
  productType: "VIP", // or "PRO"
  amount: 2000,
  status: "pending", // → "completed"
  createdAt: Timestamp,
  completedAt: Timestamp,
  description: "VIP_ORD1H5G2M1K",
  verificationDescription: "VIP_ORD1H5G2M1K" // user's input
}
```

### Collection: `users/{uid}/wallet/transactions`
```javascript
{
  id: "tx_123",
  type: "topup_vietqr", // or other types
  amount: 50, // coins
  price: 2000, // VND
  currencyType: "coin",
  createdAt: Timestamp,
  orderId: "ORD1H5G2M1K",
  status: "completed",
  metadata: {
    source: "vietqr",
    description: "VIP_ORD1H5G2M1K"
  }
}
```

## Setup & Deployment

### 1. Server Setup
```bash
cd saigondating-server

# Cập nhật .env
cp .env.example .env
# Edit: VIETQR_ACCOUNT, VIETQR_ACCOUNT_NAME, PRO_UPGRADE_PRICE

# Install & run
npm install
npm start
```

### 2. Frontend Setup
```bash
cd ChappAt

# No additional dependencies needed
# VietQR QR codes được tạo từ vietqr.io external API

# Build & run
expo start
```

## Keyrings & Security

### Private Information
- ✅ `VIETQR_ACCOUNT` - Số tài khoản (stored in .env, not in code)
- ✅ `VIETQR_ACCOUNT_NAME` - Exported (safe, public)
- ❌ Never hardcode bank credentials in code

### Order Verification
- ✅ Verify nội dung chuyển khoản format
- ✅ Check order exists và belongs to user
- ✅ Verify amount matches
- ✅ Check order status (pending → completed only)
- ❌ No automatic polling needed

## Testing

### Manual Test Flow
1. Start app, go to Coin Wallet
2. Select coin package (10, 50, 100, 500)
3. App shows VietQR payment modal
4. Copy hoặc quét QR code
5. Chuyển khoản vào tài khoản (hoặc test with dummy content)
6. Nhập nội dung xác nhận (VD: `VIP_ORD1234567890`)
7. Click "Xác nhận thanh toán"
8. Server verify → add coins/pro status
9. Show success modal

### Test Data
```
Order ID: ORD1TEST990
VIP Package: VIP_ORD1TEST990
Pro Package: PRO_ORD1TEST990
```

## Migration từ MoMo → VietQR

### Thay Đổi Cho Developers
- [ ] Import từ `vietqrPaymentService` thay vì `momoPaymentService`
- [ ] Update components từ `MoMoPaymentModal` → `VietQRPaymentModal`
- [ ] Cập nhật .env với VietQR config
- [ ] Test thanh toán end-to-end

### Backward Compatibility
- MoMo routes vẫn tồn tại nhưng không được sử dụng
- Cũ transaction records (source: 'momo') vẫn hiển thị trong wallet history
- Nếu cần remove hoàn toàn, xóa `src/routes/momo.js` sau khi confirm không còn dùng

## Troubleshooting

### QR Code không hiển thị
- Check internet connection
- VietQR image URL từ `vietqr.io` có thể bị block (use local QR generation if needed)
- Thử dùng qrcode.react library để generate QR locally

### Xác nhận thanh toán thất bại
- Form validation: nội dung phải đúng format
- Order ID mismatch: user nhập sai nội dung
- Order not pending: đã hoàn tất trước đó (security check)
- Amount mismatch: số tiền không khớp

### Server error
- Kiểm tra Firebase credentials
- Verify User authentication (Bearer token)
- Check Firestore rules: `users/{uid}` collection readable/writable by user

## Future Improvements

1. **Multiple Payment Methods**
   - Add Stripe, PayPal, Momo again as fallback
   - Middleware để select payment gateway

2. **Webhook Integration**
   - Tích hợp với webhook từ ngân hàng để xác nhận tự động
   - Tracking transaction status real-time

3. **Admin Dashboard**
   - View all orders, pending, completed
   - Manual order completion/cancellation
   - Revenue reports

4. **User Experience**
   - Timer countdown cho confirmation
   - History chi tiết hơn của thanh toán
   - Notification khi thanh toán success

## Liên Hệ & Support

Nếu có vấn đề liên quan VietQR integration:
- Kiểm tra Firestore rules
- Verify .env variables
- Check network request logs
- Review error messages from API
