# 🔍 Video Call Debug Commands

## Quick Debug Commands

### Check logs
```powershell
# Android logs
npx react-native log-android

# Or use adb
adb logcat | grep -i "videosdk\|incallmanager\|rtc"
```

### Clean build nếu cần
```powershell
cd android
./gradlew clean
cd ..
npx expo run:android
```

### Check VideoSDK service
```powershell
# Test connection to VideoSDK API
curl https://api.videosdk.live/v2/meetings -H "Authorization: $YOUR_TOKEN"
```

## Common Issues & Fixes

### 1. "Cannot read property 'close' of null"
✅ **FIXED** - Added streamURL state management

### 2. Video không hiển thị trên Android
✅ **FIXED** - Removed Platform.OS !== 'android' check

### 3. Audio không nghe được
✅ **FIXED** - Using InCallManager + VideoSDK native audio

### 4. MediaStream errors
✅ **FIXED** - Added try-catch + null checks

## Test Commands

```typescript
// Test trong React Native
console.log('Stream URL:', streamURL);
console.log('Webcam On:', webcamOn);
console.log('Mic On:', micOn);
console.log('Participants:', participantsArrId);
```

## Performance Monitoring

```typescript
// Add in MeetingView
useEffect(() => {
  const interval = setInterval(() => {
    console.log('📊 Stats:', {
      participants: participantsArrId.length,
      micOn: localMicOn,
      webcamOn: localWebcamOn,
      isConnecting,
    });
  }, 5000);
  return () => clearInterval(interval);
}, [participantsArrId, localMicOn, localWebcamOn, isConnecting]);
```
