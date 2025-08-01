# Hệ thống Âm thanh - Audio System

## Tổng quan

Hệ thống âm thanh hoàn chỉnh cho ứng dụng chat với các tính năng:
- Âm thanh cuộc gọi (đến/đi/kết thúc/chấp nhận)
- Âm thanh tin nhắn (gửi/nhận)
- Âm thanh thông báo
- Âm thanh hệ thống (thành công/lỗi/typing)
- Cài đặt âm lượng cho từng loại
- Lưu trữ cài đặt người dùng

## Cấu trúc File

```
context/
  AudioContext.jsx           # Context quản lý âm thanh
hooks/
  useSound.js               # Hook sử dụng âm thanh
components/
  chat/
    ChatSoundManager.jsx    # Quản lý âm thanh cho chat
    ChatExample.jsx         # Demo sử dụng
  common/
    NotificationSoundManager.jsx # Quản lý âm thanh thông báo
  settings/
    SoundSettingsScreen.jsx # Màn hình cài đặt âm thanh
utils/
  soundSettings.js          # Utility quản lý cài đặt
assets/
  sounds/                   # Thư mục chứa file âm thanh
```

## Cài đặt

### 1. Cài đặt dependencies
```bash
npx expo install expo-av
npx expo install @react-native-async-storage/async-storage
```

### 2. Thêm AudioProvider vào app
```jsx
// app/_layout.jsx
import { AudioProvider } from '../context/AudioContext';

export default function RootLayout() {
  return (
    <AudioProvider>
      {/* Your app content */}
    </AudioProvider>
  );
}
```

## Sử dụng

### 1. Sử dụng hook useSound
```jsx
import { useSound } from '../hooks/useSound';

const MyComponent = () => {
  const {
    playMessageReceivedSound,
    playMessageSentSound,
    playIncomingCallSound,
    stopCallSounds
  } = useSound();

  const handleSendMessage = () => {
    // Logic gửi tin nhắn
    playMessageSentSound();
  };

  const handleReceiveMessage = () => {
    // Logic nhận tin nhắn
    playMessageReceivedSound();
  };
};
```

### 2. Sử dụng ChatSoundManager
```jsx
import ChatSoundManager from '../components/chat/ChatSoundManager';

const ChatScreen = () => {
  const [lastSentMessage, setLastSentMessage] = useState(null);
  const [lastReceivedMessage, setLastReceivedMessage] = useState(null);

  return (
    <View>
      <ChatSoundManager
        onMessageSent={lastSentMessage}
        onMessageReceived={lastReceivedMessage}
        onTyping={isTyping}
      />
      {/* Chat UI */}
    </View>
  );
};
```

### 3. Sử dụng NotificationSoundManager
```jsx
import NotificationSoundManager from '../components/common/NotificationSoundManager';

const App = () => {
  const [notification, setNotification] = useState(null);

  return (
    <View>
      <NotificationSoundManager
        notification={notification}
        type="success" // 'success', 'error', 'message', 'default'
      />
      {/* App content */}
    </View>
  );
};
```

## API Reference

### useSound Hook

#### Methods
- `playIncomingCallSound()` - Phát âm thanh cuộc gọi đến (lặp lại)
- `playOutgoingCallSound()` - Phát âm thanh cuộc gọi đi (lặp lại)
- `playMessageReceivedSound()` - Phát âm thanh tin nhắn nhận
- `playMessageSentSound()` - Phát âm thanh tin nhắn gửi
- `playNotificationSound()` - Phát âm thanh thông báo
- `playCallEndSound()` - Phát âm thanh kết thúc cuộc gọi
- `playCallAcceptedSound()` - Phát âm thanh chấp nhận cuộc gọi
- `playTypingSound()` - Phát âm thanh typing
- `playSuccessSound()` - Phát âm thanh thành công
- `playErrorSound()` - Phát âm thanh lỗi
- `stopCallSounds()` - Dừng tất cả âm thanh cuộc gọi
- `stopAllSounds()` - Dừng tất cả âm thanh

### SoundSettings Utility

#### Methods
- `getSettings()` - Lấy cài đặt âm thanh hiện tại
- `saveSettings(settings)` - Lưu cài đặt âm thanh
- `updateSetting(key, value)` - Cập nhật một cài đặt cụ thể
- `isSoundEnabled()` - Kiểm tra âm thanh có được bật không
- `toggleSound()` - Bật/tắt âm thanh
- `getVolume(category)` - Lấy âm lượng theo danh mục
- `setVolume(category, volume)` - Đặt âm lượng theo danh mục

#### Categories
- `calls` - Âm thanh cuộc gọi
- `messages` - Âm thanh tin nhắn
- `notifications` - Âm thanh thông báo
- `system` - Âm thanh hệ thống

## Customization

### 1. Thêm âm thanh mới
```jsx
// Trong AudioContext.jsx
const soundAssets = {
  // Existing sounds...
  newSound: { uri: 'path/to/your/sound.mp3' }
};

// Trong useSound.js
const playNewSound = useCallback(() => {
  return playSoundWithSettings('newSound', 'category', { volume: 0.8 });
}, [playSoundWithSettings]);
```

### 2. Tùy chỉnh âm lượng mặc định
```jsx
// Trong soundSettings.js
defaultSettings: {
  enabled: true,
  volume: {
    calls: 1.0,        // Âm lượng cuộc gọi
    messages: 0.7,     // Âm lượng tin nhắn
    notifications: 0.8, // Âm lượng thông báo
    system: 0.6,       // Âm lượng hệ thống
  },
  // ...
}
```

## Troubleshooting

### 1. Âm thanh không phát
- Kiểm tra quyền audio trong cài đặt app
- Đảm bảo device không ở chế độ im lặng
- Kiểm tra cài đặt âm thanh trong app

### 2. File âm thanh không tìm thấy
- Đảm bảo file âm thanh tồn tại trong thư mục assets/sounds
- Sử dụng URL từ internet làm fallback
- Kiểm tra format file (MP3, WAV được hỗ trợ)

### 3. Performance issues
- Sử dụng preload để tải âm thanh trước
- Cleanup âm thanh khi component unmount
- Giới hạn số lượng âm thanh phát đồng thời

## Notes

- Hệ thống sử dụng expo-av để đảm bảo tương thích cross-platform
- Cài đặt được lưu trong AsyncStorage và persist giữa các session
- Âm thanh cuộc gọi sẽ tự động lặp lại cho đến khi được dừng
- Volume được điều chỉnh theo cài đặt người dùng và category
