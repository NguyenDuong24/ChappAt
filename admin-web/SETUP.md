# Admin Web - Setup Instructions

## Prerequisites
1. Admin user must be created in Firebase Authentication
2. Admin custom claim must be set on that user
3. Server must be running with admin routes enabled

## Setup Steps

### 1. Create Admin User

First, create an admin user in Firebase Console:
- Navigate to: https://console.firebase.google.com/project/dating-app-1bb49/authentication/users
- Click "Add user"
- Email: `admin@chappat.com`
- Password: `Admin@123`
- Click "Add user"

### 2. Set Admin Custom Claim

In the `saigondating-server` directory, run:

```bash
cd saigondating-server
node set-admin-claim.js admin@chappat.com
```

You should see:
```
✅ Admin claim set successfully for admin@chappat.com
⚠️  Note: The user must sign out and sign in again for the claim to take effect.
```

### 3. Configure Environment

Create `.env` file in `admin-web` directory:

```env
VITE_API_URL=http://localhost:3000/api
```

For production:
```env
VITE_API_URL=https://saigondating-server.onrender.com/api
```

### 4. Install Dependencies

```bash
cd admin-web
npm install
```

### 5. Start Development Server

```bash
npm run dev
```

The admin web will be available at: http://localhost:5173 (or whatever port Vite assigns)

### 6. Login

- Navigate to http://localhost:5173
- Login with:
  - Email: `admin@chappat.com`
  - Password: `Admin@123`
- You should be redirected to the dashboard
- Click on "💰 Wallet" in the sidebar to view wallet statistics

## Testing Admin Features

### Test Wallet Overview
1. Navigate to "💰 Wallet"
2. Should see:
   - Total coins
   - Total bánh mì
   - Active users
   - Daily/weekly transaction counts
3. Stats should auto-refresh every 30 seconds

### Test Admin Authorization
1. Try accessing `/api/admin/wallet/stats` directly in browser (should fail with 401)
2. Login to admin web
3. Open browser DevTools > Network tab
4. Navigate to Wallet page
5. Verify requests include `Authorization: Bearer <token>` header

## Troubleshooting

### "Admin privileges required" error
- Ensure admin custom claim is set: `node set-admin-claim.js admin@chappat.com`
- Sign out and sign in again
- Check token claims in browser console:
  ```javascript
  firebase.auth().currentUser.getIdTokenResult().then(r => console.log(r.claims))
  ```

### "Authentication required" error
- Ensure you're logged in
- Check Firebase Authentication in browser console
- Clear localStorage and try again

### API connection errors
- Ensure server is running: `cd saigondating-server && npm run dev`
- Check `VITE_API_URL` in `.env` matches server URL
- Verify CORS is enabled on server

### Stats not loading
- Check server logs for errors
- Verify Firebase service account credentials are set in server `.env`
- Test endpoint directly: `curl http://localhost:3000/api/admin/wallet/stats -H "Authorization: Bearer <token>"`

## Next Steps

After wallet overview is working, you can:
1. Add transaction history page
2. Add user wallet detail modal
3. Implement manual balance adjustment
4. Add gift/shop management pages
