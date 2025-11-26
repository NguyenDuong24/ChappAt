# FIX App Stuck on Expo Screen

## VẤN ĐỀ
App stuck ở màn hình Expo logo (^) mỗi lần reload - không load vào app.

## NGUY NHÂN 
Thiếu 2 providers quan trọng:
1. `UserProvider` - cần wrap toàn bộ app
2. `VideoCallProvider` - cần wrap NotificationProvider

## GIẢI PHÁP - EDIT THỦ CÔNG

### File: `app/_layout.jsx`

**BƯỚC 1**: Thêm import UserProvider (nếu chưa có)

Tìm dòng 18:
```jsx
import { UserProvider } from '@/context/UserContext';
```

Nếu không có, thêm vào sau dòng 17.

---

**BƯỚC 2**: Tìm dòng 245 (return statement trong RootLayout)

Hiện tại:
```jsx
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Đặt AuthContextProvider bên ngoài để NotificationProvider có thể dùng useAuth */}
      <AuthContextProvider>
        <AudioProvider>
          <NotificationProvider>
```

**THAY BẰNG:**
```jsx
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UserProvider>
        {/* Đặt AuthContextProvider bên ngoài để NotificationProvider có thể dùng useAuth */}
        <AuthContextProvider>
          <AudioProvider>
            <VideoCallProvider>
              <NotificationProvider>
```

---

**BƯỚC 3**: Tìm dòng 263 (closing tags)

Hiện tại:
```jsx
            </NotificationProvider>
          </AudioProvider>
        </AuthContextProvider>
      </GestureHandlerRootView>
    );
  }
```

**THAY BẰNG:**
```jsx
              </NotificationProvider>
            </VideoCallProvider>
          </AudioProvider>
        </AuthContextProvider>
      </UserProvider>
    </GestureHandlerRootView>
  );
}
```

---

## KẾT QUẢ CUỐI CÙNG

Provider stack đúng:
```
GestureHandlerRootView
  └─ UserProvider ← Thêm mới
      └─ AuthContextProvider
          └─ AudioProvider
              └─ VideoCallProvider ← Thêm mới
                  └─ NotificationProvider
                      └─ StateCommonProvider
                          └─ ThemeProvider
                              └─ AppStateProvider
                                  └─ LogoStateProvider
                                      └─ LocationProvider
                                          └─ PaperProvider
                                              └─ MainLayout
```

## SAU KHI EDIT

1. Save file
2. App sẽ tự reload
3. Bạn sẽ thấy màn hình Login hoặc Home (tùy auth state)

## NẾU VẪN LỖI

Check terminal output xem có error message gì và cho tôi biết.
