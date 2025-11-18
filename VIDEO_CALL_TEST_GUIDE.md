# 📹 Hướng Dẫn Test Video Call

## ✅ Đã Sửa Các Lỗi

### 1. **Lỗi "Cannot read property 'close' of null"**
- ✅ Thêm state `streamURL` riêng cho mỗi component
- ✅ Sử dụng `useEffect` để quản lý lifecycle của MediaStream
- ✅ Cleanup streamURL khi stream disable
- ✅ Thêm null checks cho `webcamStream.track`

### 2. **Audio không hoạt động**
- ✅ Loại bỏ logic Expo Audio phức tạp
- ✅ Sử dụng `InCallManager` của VideoSDK
- ✅ VideoSDK tự động handle remote audio qua WebRTC
- ✅ Set audio mode đúng cho video/audio calls

### 3. **Video disabled trên Android**
- ✅ Đã enable video rendering trên Android
- ✅ Thêm proper error handling với try-catch
- ✅ Thêm VideoErrorBoundary để catch errors

## 🚀 Cách Test

### Bước 1: Rebuild App
```powershell
cd ChappAt
npx expo run:android
```

### Bước 2: Test Video Call
1. Mở app trên 2 thiết bị (hoặc 1 thiết bị + 1 emulator)
2. Thiết bị 1: Tap "Create New Meeting"
3. Copy Meeting ID hiển thị
4. Thiết bị 2: Paste Meeting ID và tap "Join Meeting"
5. Kiểm tra:
   - ✅ Video hiển thị trên cả 2 thiết bị
   - ✅ Audio nghe được qua loa/earpiece
   - ✅ Toggle camera on/off hoạt động
   - ✅ Toggle mic on/off hoạt động
   - ✅ Local video (PIP) có thể kéo di chuyển
   - ✅ End call hoạt động

### Bước 3: Test Audio Call
1. Trong params, set `callType: 'audio'`
2. Kiểm tra:
   - ✅ Không hiển thị video
   - ✅ Audio nghe được rõ ràng
   - ✅ Mic toggle hoạt động

## 🔧 Các Tính Năng Chính

### Video Features
- ✅ Full-screen remote video
- ✅ Draggable Picture-in-Picture local video
- ✅ Mirror effect cho local video
- ✅ Status indicators (mic/camera on/off)
- ✅ Multiple participants indicator

### Audio Features
- ✅ InCallManager tự động routing audio
- ✅ Earpiece cho audio calls
- ✅ Speaker cho video calls
- ✅ Calling sound khi connecting
- ✅ Join sound khi connected

### Error Handling
- ✅ VideoErrorBoundary catch video errors
- ✅ Null checks cho streams
- ✅ Try-catch cho MediaStream creation
- ✅ Proper cleanup on unmount

## 🐛 Troubleshooting

### Lỗi: Video không hiển thị
**Giải pháp:**
1. Check permissions trong Settings > Apps > ChappAt > Permissions
2. Enable Camera và Microphone
3. Restart app

### Lỗi: Không nghe thấy audio
**Giải pháp:**
1. Check volume device
2. Kiểm tra mic/speaker không bị mute
3. Test với earpiece/headphone
4. Check logs: `npx react-native log-android`

### Lỗi: App crash khi join meeting
**Giải pháp:**
1. Check internet connection
2. Verify Meeting ID đúng format
3. Check logs để xem error cụ thể
4. Clear app cache và rebuild

## 📱 Test Checklist

### Basic Tests
- [ ] Create new meeting
- [ ] Join existing meeting
- [ ] Video hiển thị đúng
- [ ] Audio nghe rõ ràng
- [ ] Toggle camera
- [ ] Toggle mic
- [ ] End call

### Advanced Tests
- [ ] Kéo di chuyển local video (PIP)
- [ ] Rotate device
- [ ] Switch between apps (background/foreground)
- [ ] Incoming phone call handling
- [ ] Network disconnect/reconnect
- [ ] Multiple participants (3+)

### Performance Tests
- [ ] CPU usage (should be < 50%)
- [ ] Battery consumption
- [ ] Network bandwidth
- [ ] Video quality
- [ ] Audio quality
- [ ] Latency (should be < 300ms)

## 📊 Logs Để Kiểm Tra

Mở Metro bundler hoặc `adb logcat` và tìm:
```
✅ Meeting joined successfully
👤 Participant joined: [name]
🎤 Current mic state: [true/false]
📷 Current camera state: [true/false]
Local stream enabled: [stream info]
Remote stream enabled: [stream info]
👋 Left meeting
```

## 🎯 Next Steps

1. Test trên nhiều thiết bị Android khác nhau
2. Test với network conditions khác nhau (3G/4G/WiFi)
3. Test với nhiều participants
4. Optimize performance nếu cần
5. Add more features (screen share, recording, etc.)

## 📝 Notes

- InCallManager tự động handle audio routing
- VideoSDK handle remote audio qua WebRTC (không cần Expo Audio)
- MediaStream phải được create trong useEffect
- Cleanup quan trọng để tránh memory leaks
- multiStream: false để performance tốt hơn
