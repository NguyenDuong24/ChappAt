# 🛡️ Hướng Dẫn Chặn Ảnh Nhạy Cảm - NSFW Detection

## ✅ Đã Hoàn Thành

### 1. **Tích hợp TensorFlow.js + NSFWJS**
- ✅ Tự động tải model NSFW khi app khởi động (background)
- ✅ Phân loại ảnh local (file://, content://) bằng AI
- ✅ Hỗ trợ nhiều backend: rn-webgl (nhanh) hoặc cpu (fallback)
- ✅ Timeout và retry logic để xử lý mạng chậm

### 2. **Logic Chặn Thông Minh**
- ✅ **Có AI**: Chặn porn/hentai ≥60%, sexy ≥80%
- ✅ **Không AI**: Dùng heuristics (tên file, MIME, kích thước)
- ✅ **Fail-safe**: Nếu model chưa tải được, vẫn cho phép ảnh bình thường qua (chỉ chặn khi có dấu hiệu rõ ràng)

### 3. **Console Logs Chi Tiết**
- 🔍 Tracking từng bước: load model → decode ảnh → phân loại
- 📊 Hiển thị scores: porn, hentai, sexy, neutral, drawing
- ⚠️ Cảnh báo rõ ràng khi model chưa sẵn sàng

### 4. **Helper Functions**
- `getNSFWStatus()`: Kiểm tra trạng thái model
- `preloadNSFWModel()`: Tải model chủ động
- `retryLoadNSFWModel()`: Force retry nếu lần đầu fail
- `isNSFWDetectionAvailable()`: Check xem AI có sẵn không

## 📱 Cách Sử Dụng

### Tự Động (Đã tích hợp sẵn)
```typescript
// Trong chat screen khi chọn ảnh:
const result = await contentModerationService.moderateImage(imageUri);

if (result.isInappropriate) {
  Alert.alert('🔞 Ảnh bị chặn', result.reason);
  return; // Không cho upload
}

// Upload ảnh như bình thường
```

### Test Thủ Công
1. Mở screen test: `app/TestNSFWScreen.tsx`
2. Nhấn "📥 Load Model" để tải model (lần đầu mất 5-30s)
3. Nhấn "📸 Pick Image & Test" để chọn ảnh kiểm tra
4. Xem kết quả: ✅ SAFE hoặc 🔞 BLOCKED

## 🔧 Cấu Hình

### Ngưỡng Chặn (trong `moderateLocalImage`)
```typescript
// Chặn porn/hentai
if (porn >= 0.6) { /* block */ }
if (hentai >= 0.6) { /* block */ }

// Chặn sexy/gợi cảm
if (sexy >= 0.8) { /* block */ }
if (sexy >= 0.65) { /* warn */ }

// Ngưỡng tổng
const thresholdLocal = nsfwClassified ? 0.7 : 0.85;
```

### Custom Model URL (nếu muốn self-host)
```typescript
contentModerationService.setNSFWModelUrl('https://your.cdn/model.json');
await contentModerationService.preloadNSFWModel();
```

## 🐛 Xử Lý Lỗi

### Model Không Tải Được
**Nguyên nhân:**
- Mạng chậm/không ổn định
- TensorFlow backend chưa init đúng
- Thiếu quyền đọc ảnh trên Android 13+

**Giải pháp:**
```typescript
// Check status
const status = contentModerationService.getNSFWStatus();
console.log(status); // { loaded, initializing, backend }

// Retry nếu failed
if (!status.loaded && !status.initializing) {
  await contentModerationService.retryLoadNSFWModel();
}
```

### Ảnh Bị Chặn Nhầm (False Positive)
**Điều chỉnh ngưỡng:**
- Tăng ngưỡng porn/hentai: `>= 0.6` → `>= 0.7`
- Tăng ngưỡng sexy: `>= 0.8` → `>= 0.9`
- Tăng threshold tổng: `0.7` → `0.8`

### Ảnh Nhạy Cảm Lọt Qua (False Negative)
**Điều chỉnh ngưỡng:**
- Giảm ngưỡng porn/hentai: `>= 0.6` → `>= 0.5`
- Giảm ngưỡng sexy: `>= 0.8` → `>= 0.7`
- Giảm threshold tổng: `0.7` → `0.6`

## 📊 Logs Mẫu

### Model Load Thành Công
```
TFJS/NSFWJS modules loaded
Starting NSFW model initialization...
Current TF backend: cpu
Set backend to cpu
Loading NSFW model...
✅ NSFW model loaded successfully
```

### Phân Loại Ảnh
```
🔍 Starting NSFW classification for: content://media/external/images...
📋 Copied content:// to cache: /data/.../nsfw-1234567890.jpg
📖 Read base64, length: 245678
🔢 Converted to bytes, length: 184258
🖼️ Decoded image tensor: [224,224,3]
🤖 Running NSFW model classification...
✅ NSFW predictions: [
  { className: 'Neutral', probability: 0.85 },
  { className: 'Sexy', probability: 0.12 },
  { className: 'Porn', probability: 0.02 },
  { className: 'Hentai', probability: 0.01 }
]
NSFW scores: { porn: 0.02, hentai: 0.01, sexy: 0.12, neutral: 0.85, drawing: 0 }
✅ Mô hình AI cho rằng ảnh an toàn (85%)
```

### Ảnh Bị Chặn
```
NSFW scores: { porn: 0.92, hentai: 0.05, sexy: 0.02, neutral: 0.01, drawing: 0 }
🔞 Mô hình AI phát hiện nội dung Porn (92%)
```

## ⚙️ Tối Ưu Hiệu Năng

### Preload Sớm (Khuyến nghị)
```typescript
// Trong App.tsx hoặc _layout.tsx
useEffect(() => {
  contentModerationService.preloadNSFWModel();
}, []);
```

### Cache Model (Tự động)
- NSFWJS model (~3MB) được cache sau lần tải đầu
- Lần sau sẽ load từ cache, nhanh hơn nhiều

### Timeout Hợp Lý
- Model load: 30s (có thể tăng nếu mạng chậm)
- Phân loại ảnh: 10s timeout
- Nếu timeout, fallback sang heuristics

## 📋 Checklist Triển Khai

- [x] Cài đặt dependencies (tfjs, tfjs-react-native, nsfwjs)
- [x] Thêm quyền READ_MEDIA_IMAGES (Android 13+)
- [x] Fix manifest merge conflict (FCM notification color)
- [x] Rebuild dev client với native modules
- [x] Test với ảnh thật từ điện thoại
- [ ] Điều chỉnh ngưỡng phù hợp với use case
- [ ] Deploy lên production và monitor

## 🎯 Kết Quả Mong Đợi

- ✅ **Porn/Hentai rõ ràng**: Chặn 95%+
- ✅ **Gợi cảm (sexy)**: Chặn 80%+ (tùy ngưỡng)
- ✅ **Ảnh bình thường**: Cho qua 98%+
- ⚠️ **Model chưa tải**: Vẫn cho phép ảnh thông thường, chỉ chặn tên file/MIME đáng ngờ

## 🚀 Next Steps

1. Test trên thiết bị thật với nhiều loại ảnh
2. Thu thập feedback từ user về false positive/negative
3. Fine-tune ngưỡng dựa trên data thực tế
4. Cân nhắc self-host model nếu CDN chậm
5. Thêm report system cho ảnh bị chặn nhầm

---

**Lưu ý:** Không có hệ thống AI nào hoàn hảo 100%. Luôn cần kết hợp report từ user và review thủ công.
