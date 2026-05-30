# Network Error Troubleshooting Guide

## Problem: "Network request failed" when calling Coin Server API

### Common Causes & Solutions

## ✅ FIXED: IP Address Configuration

### Problem
The app was trying to connect to `localhost:3000`, which doesn't work on physical devices or emulators.

### Solution
Updated `src/services/coinServerApi.js` to use the machine's IP address:

```javascript
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.100.9:3000/api'  // ✅ Use your machine's IP
  : 'https://your-production-server.com/api';
```

### How to Find Your IP Address
```powershell
ipconfig | findstr /i "ipv4"
```

---

## 🔍 Diagnostic Steps (With Enhanced Logging)

### 1. Check Server is Running
```powershell
netstat -ano | findstr :3000
```
Should show: `LISTENING` on port 3000

### 2. Test Health Endpoint
```powershell
curl http://192.168.100.9:3000/health
```
Should return: `{"status":"ok","timestamp":"..."}`

### 3. Check Firewall
Allow Node.js through Windows Firewall:
- Control Panel → Windows Defender Firewall → Allow an app
- Find Node.js and enable for both Private and Public networks

### 4. Verify Network Connectivity
- **Physical Device**: Device must be on the same WiFi network as your PC
- **Emulator**: Should work with machine IP
- **Expo Go**: Must be on same network

---

## 📊 Enhanced Logging Guide

### Client-Side Logs (React Native App)

When you send a gift, you'll now see detailed logs:

```
🎁 [SEND GIFT] Called with params: {...}
📦 Request body: {...}
🔐 Getting Firebase auth token...
👤 User found: {...}
✅ Token obtained successfully
🔵 [API REQUEST START] {...}
📡 Sending request to: http://192.168.100.9:3000/api/gifts/send
📥 Response received: {...}
📄 Response data: {...}
✅ [API REQUEST SUCCESS]
```

### Server-Side Logs (Coin Server)

The server will log every step:

```
📨 POST /api/gifts/send
⏰ Time: 2025-11-16T...
🌐 Origin: ...

🔐 ========== AUTH MIDDLEWARE ==========
🔑 Auth header: Present
🎫 Token length: 1234
🔓 Verifying token with Firebase Admin...
✅ Token verified successfully
👤 User: { uid: '...', email: '...' }
✅ ========== AUTH SUCCESS ==========

🎁 ========== SEND GIFT REQUEST ==========
📊 Request params: {...}
⏱️ Checking rate limit...
✅ Rate limit OK
💾 Setting up Firestore references...
🔄 Starting Firestore transaction...
📖 Fetching gift and user data...
✅ Gift loaded: {...}
💰 Sender coins: 100 | Gift price: 15
✅ Sufficient funds available
💸 Deducting coins from sender...
📝 Creating transaction log...
💬 Creating gift message in room...
🧾 Creating gift receipt for receiver...
📊 Updating receiver stats...
✅ Transaction committed successfully
📤 Sending response...
✅ ========== SEND GIFT SUCCESS ==========
```

---

## 🐛 Common Error Patterns

### Error: "Network request failed"
**Causes:**
1. ❌ Wrong API URL (using localhost instead of IP)
2. ❌ Server not running
3. ❌ Firewall blocking connection
4. ❌ Different WiFi networks
5. ❌ Typo in IP address

**Solution:** Check server logs and client logs to see where it fails

### Error: "AUTH_REQUIRED"
**Logs will show:**
```
❌ Missing or invalid Authorization header
```
**Solution:** Check if user is logged in, token might be expired

### Error: "INSUFFICIENT_FUNDS"
**Logs will show:**
```
💰 Sender coins: 5 | Gift price: 15
❌ Insufficient funds
```
**Solution:** Top up coins first

### Error: "GIFT_NOT_FOUND"
**Logs will show:**
```
⚠️ Gift not in database, using fallback...
❌ Gift not found in database or fallback
```
**Solution:** Check giftId is valid (should be one of: 'banh-mi-thit', 'tra-sua', 'hoa-hong', 'cafe-sua')

---

## 🚀 Quick Start Checklist

- [ ] Coin server is running on port 3000
- [ ] Updated API_BASE_URL with correct IP address (192.168.100.9)
- [ ] Device/emulator on same WiFi network
- [ ] Firewall allows Node.js connections
- [ ] User is logged in to the app
- [ ] User has sufficient coins

---

## 📱 Testing the API

### Method 1: From Client App
1. Open the app
2. Try to send a gift
3. Check console logs for detailed trace
4. Check server terminal for request logs

### Method 2: Using PowerShell (Manual Test)
```powershell
# Get a test token first (from app logs)
$token = "YOUR_FIREBASE_ID_TOKEN"

# Test send gift
$body = @{
    receiverUid = "receiver_user_id"
    roomId = "room_id"
    giftId = "tra-sua"
    senderName = "Test User"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://192.168.100.9:3000/api/gifts/send" `
    -Method POST `
    -Headers @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    } `
    -Body $body
```

---

## 🔧 Advanced Debugging

### Enable More Verbose Logging

**Client (coinServerApi.js):**
Already enabled! All requests are logged with full details.

**Server (index.js):**
Already enabled! Every request, auth check, and transaction step is logged.

### Check Network Requests (React Native Debugger)
1. Open React Native Debugger
2. Go to Network tab
3. See all fetch requests and responses

### Monitor Firestore (Firebase Console)
Check if transactions are being created in Firestore even if response fails.

---

## 💡 Tips

1. **Always check both client AND server logs** - The error might be on either side
2. **Check timestamps** - Make sure logs match the time of your action
3. **Test health endpoint first** - If this fails, don't proceed
4. **Restart server after code changes** - Server needs restart to pick up new logs
5. **Use emoji filters** - Search for specific emojis in logs (🎁, ❌, ✅, etc.)

---

## 📞 Still Having Issues?

If you see the error after following all steps:

1. Copy the FULL client-side error log
2. Copy the FULL server-side log (or confirm server shows no request)
3. Verify:
   - API_BASE_URL value
   - Server IP and port
   - User authentication status
   - Network connectivity

The detailed logs will pinpoint exactly where the request fails!
