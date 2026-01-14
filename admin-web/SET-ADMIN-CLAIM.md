# Hướng dẫn Set Admin Claim qua Firebase Console

## Bước 1: Đăng nhập Firebase Console
Truy cập: https://console.firebase.google.com/project/dating-app-1bb49/authentication/users

## Bước 2: Tìm user admin
- Trong danh sách users, tìm email: `admin@chappat.com`
- Nếu chưa có, tạo mới:
  - Click "Add user"
  - Email: admin@chappat.com
  - Password: Admin@123
  - Click "Add user"

## Bước 3: Set Custom Claim
⚠️ **LƯU Ý:** Firebase Console KHÔNG có UI để set custom claims trực tiếp!

Bạn có 2 lựa chọn:

### Option A: Deploy Cloud Function (KHUYẾN NGHỊ)
1. Tạo file `functions/index.js`:
```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.setAdminClaim = functions.https.onCall(async (data, context) => {
  const email = data.email;
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { admin: true });
  return { success: true, message: `Admin claim set for ${email}` };
});
```

2. Deploy: `firebase deploy --only functions`

3. Call function từ browser console (sau khi login admin web):
```javascript
const setAdmin = firebase.functions().httpsCallable('setAdminClaim');
setAdmin({ email: 'admin@chappat.com' }).then(result => console.log(result));
```

### Option B: Chạy script local với service account
1. Download Firebase service account key:
   - Vào: https://console.firebase.google.com/project/dating-app-1bb49/settings/serviceaccounts/adminsdk
   - Click "Generate new private key"
   - Save file as `firebase-admin-key.json` trong folder `admin-web`

2. Tạo file `set-admin-local.js`:
```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-admin-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setAdminClaim(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log('✅ Admin claim set for', email);
  } catch (error) {
    console.error('Error:', error);
  }
}

setAdminClaim('admin@chappat.com');
```

3. Chạy:
```bash
cd admin-web
npm install firebase-admin
node set-admin-local.js
```

## Bước 4: Verify
Sau khi set claim:
1. Logout khỏi admin web
2. Login lại
3. Mở Console (F12) và chạy:
```javascript
firebase.auth().currentUser.getIdTokenResult().then(r => console.log(r.claims))
```
4. Kiểm tra có `admin: true` không

## Bước 5: Test Admin Web
- Vào http://localhost:3001/dashboard/wallet
- Sẽ thấy stats hiển thị thay vì loading mãi
