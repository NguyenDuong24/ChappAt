# Google Play Billing — Cấu hình & Triển khai

## Tổng quan

App **SaiGon Match** sử dụng `react-native-iap` v15.2.0 để tích hợp Google Play Billing.

**Platform routing:**
| Platform | Payment Provider | Phí |
|----------|-----------------|-----|
| Android (CHPlay) | Google Play Billing | 15% |
| iOS (App Store) | Apple IAP | 15-30% |
| Web | VietQR / Bank Transfer | 0-2% |

---

## 1. Thiết lập Google Play Console

### 1.1 Tạo sản phẩm (In-app Products)

Vào **Google Play Console → Ứng dụng của bạn → Kiếm tiền → Sản phẩm trong ứng dụng → Sản phẩm được quản lý**

Tạo 4 sản phẩm **Managed product** (consumable):

| Product ID | Tên | Giá (VND) | Mô tả |
|------------|-----|-----------|-------|
| `com.saigonmatch.coin_10` | 10 Coin | 1,000 ₫ | Gói 10 coin cơ bản |
| `com.saigonmatch.coin_50` | 50 Coin | 2,000 ₫ | Gói 50 coin + 5 bonus (-10%) |
| `com.saigonmatch.coin_100` | 100 Coin | 3,000 ₫ | Gói 100 coin + 20 bonus (-20%) |
| `com.saigonmatch.coin_500` | 500 Coin | 5,000 ₫ | Gói 500 coin + 150 bonus (-30%) |

> ⚠️ **Product ID phải khớp CHÍNH XÁC** với `IAP_PRODUCT_IDS` trong `services/inAppPurchaseService.ts`

### 1.2 Tạo subscription (nếu có VIP)

Vào **Sản phẩm trong ứng dụng → Đăng ký**:

| Product ID | Tên | Giá (VND) | Chu kỳ |
|------------|-----|-----------|--------|
| `com.saigonmatch.pro_monthly` | Pro 1 Tháng | 99,000 ₫ | 1 tháng |

### 1.3 Cấu hình License Key

1. Vào **Kiếm tiền → Thiết lập kiếm tiền**
2. Sao chép **License Key** (base64)
3. Thêm vào `.env`:
```
EXPO_PUBLIC_GOOGLE_PLAY_LICENSE_KEY=your_base64_license_key
```

---

## 2. Build & Test

### 2.1 Rebuild app (cần cho native module mới)

```bash
npx expo prebuild --clean
npx expo run:android
```

### 2.2 Test với Google Play Test Cards

Khi app ở trạng thái **Closed Testing** hoặc **Internal Testing**:

| Loại test card | Kết quả |
|----------------|---------|
| `android.test.purchased` | Thanh toán thành công |
| `android.test.canceled` | Người dùng hủy |
| `android.test.refunded` | Đã hoàn tiền |
| `android.test.item_unavailable` | Sản phẩm không khả dụng |

> **Lưu ý:** Test cards chỉ hoạt động với tài khoản được thêm vào **License Testing** trong Play Console.

### 2.3 Kiểm tra log

```bash
npx react-native log-android
# Tìm log có tag [IAP]
```

---

## 3. Server-side Verification (Backend)

Backend cần endpoint để verify receipt từ Google Play:

```
POST https://saigonmatch.com.vn/api/iap/verify
Headers: Authorization: Bearer <firebase_token>
Body: {
  "productId": "com.saigonmatch.coin_100",
  "transactionId": "GPA.1234-5678-9012-34567",
  "receipt": "{...}",
  "platform": "android"
}
```

Backend cần gọi **Google Play Developer API** để validate:

```javascript
// Server-side (Node.js)
const { google } = require('googleapis');
const playDeveloper = google.androidpublisher('v3');

async function verifyPurchase(productId, purchaseToken) {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'service-account.json',
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });

  const res = await playDeveloper.purchases.products.get({
    auth,
    packageName: 'saigonmatch.com.vn',
    productId,
    token: purchaseToken,
  });

  return res.data.purchaseState === 0; // 0 = purchased
}
```

> 📄 **Service Account JSON**: Tạo trong Google Cloud Console → APIs & Services → Credentials → Service Account → P12/JSON key

---

## 4. Cấu trúc code

```
services/
├── inAppPurchaseService.ts    ← Wrapper react-native-iap (Google Play + Apple)
├── unifiedPaymentService.ts   ← Router: IAP (native) vs VietQR (web)
├── vietqrPaymentService.ts    ← VietQR (giữ nguyên cho web)
components/payment/
├── CoinPurchaseSection.tsx    ← UI mua coin (Android→IAP, Web→VietQR)
├── VietQRPaymentModal.tsx     ← Modal VietQR (chỉ hiện trên web)
app/(screens)/wallet/
├── CoinWalletScreen.tsx       ← Ví coin (xử lý cả 2 luồng)
├── PaymentSuccessScreen.tsx   ← Màn thành công (IAP + VietQR)
app/_layout.jsx                ← Khởi tạo IAP khi app start
app.json                       ← Plugin react-native-iap
```

---

## 5. Luồng thanh toán mới

### Android / Google Play Billing:
```
User chọn gói coin → Google Play bottom sheet hiện lên
  → Thành công: receipt gửi server verify → cộng coin → PaymentSuccessScreen
  → Hủy: không làm gì
  → Lỗi: Alert thông báo
```

### Web / VietQR:
```
User chọn gói coin → API tạo mã QR → VietQRPaymentModal
  → User chuyển khoản → SMS Banking / polling → cộng coin
```

---

## 6. Checklist trước khi lên CHPlay

- [ ] Tạo tất cả Product ID trong Google Play Console
- [ ] Cấu hình giá (VND) cho từng sản phẩm
- [ ] Thêm tester vào License Testing
- [ ] Rebuild app với `npx expo prebuild --clean`
- [ ] Test trên thiết bị thật với test cards
- [ ] Verify server-side hoạt động
- [ ] Upload APK/AAB lên Internal Testing track
- [ ] Test toàn bộ luồng mua
- [ ] Gỡ VietQR khỏi Android build (nếu chưa làm, app vẫn bị reject)
