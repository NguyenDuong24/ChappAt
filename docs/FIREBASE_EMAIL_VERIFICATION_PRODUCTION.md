# Firebase Email Verification Production Setup

## App configuration

Set these Expo env vars before building the production app:

```env
EXPO_PUBLIC_EMAIL_VERIFY_CONTINUE_URL=https://your-app.com/auth/email-verified
EXPO_PUBLIC_ANDROID_PACKAGE_NAME=saigondating.com.vn
EXPO_PUBLIC_IOS_BUNDLE_ID=saigondating.com.vn
```

`EXPO_PUBLIC_EMAIL_VERIFY_CONTINUE_URL` must be an HTTPS URL and its domain must be added in Firebase Console:

Authentication > Settings > Authorized domains

## Firebase email template

Firebase Console controls the actual email subject and body:

Authentication > Templates > Email address verification

Recommended production subject:

```text
Xác thực tài khoản ChappAt của bạn
```

Recommended production body:

```text
Xin chào,

Cảm ơn bạn đã đăng ký ChappAt.

Vui lòng bấm liên kết bên dưới để xác thực email và hoàn tất tạo tài khoản:

%LINK%

Nếu bạn không tạo tài khoản ChappAt, bạn có thể bỏ qua email này.

Trân trọng,
Đội ngũ ChappAt
```

## Production checks

- Sender name is `ChappAt`.
- Reply-to/support email is monitored.
- The continue URL domain is allowlisted in Firebase Auth.
- Test signup on a release build, then tap the email link and return to the app.
- Check Inbox, Spam, Promotions, and the sender reputation after the first test sends.
