# 🎯 Quick Debug Reference Card

## Server Status Check
```powershell
# Is server running?
netstat -ano | findstr :3000

# Test health
curl http://192.168.100.9:3000/health

# Start server
cd coin-server
npm start

# Stop server
taskkill /PID [PID_NUMBER] /F
```

## Log Patterns to Look For

### ✅ SUCCESS
```
Client:
🎁 [SEND GIFT] Called with params
✅ Token obtained successfully
📡 Sending request to: http://192.168.100.9:3000/api/gifts/send
✅ [API REQUEST SUCCESS]

Server:
🔐 ========== AUTH MIDDLEWARE ==========
✅ Token verified successfully
🎁 ========== SEND GIFT REQUEST ==========
✅ Transaction committed successfully
✅ ========== SEND GIFT SUCCESS ==========
```

### ❌ NETWORK ERROR (Server Not Accessible)
```
Client:
❌ [API REQUEST FAILED]
[TypeError: Network request failed]

Server:
(No logs - request never reached server)
```
**Fix:** Check IP address, server running, firewall, WiFi

### ❌ AUTH ERROR
```
Client:
❌ [API REQUEST FAILED]
code: 'AUTH_REQUIRED'

Server:
🔐 ========== AUTH MIDDLEWARE ==========
❌ Missing or invalid Authorization header
```
**Fix:** Check if user is logged in

### ❌ INSUFFICIENT FUNDS
```
Server:
💰 Sender coins: 5 | Gift price: 15
❌ Insufficient funds
```
**Fix:** Top up coins

## Current Configuration

```javascript
// src/services/coinServerApi.js
const API_BASE_URL = 'http://192.168.100.9:3000/api'
```

**Your IP:** `192.168.100.9`
**Port:** `3000`
**Network:** Must be on same WiFi

## Emoji Search Guide

Search logs for specific steps:
- `🎁` - Gift operations
- `🔐` - Authentication
- `💰` - Balance checks
- `📡` - Network requests
- `✅` - Success markers
- `❌` - Error markers
- `📊` - Data/stats
- `🔄` - Transactions

## Test Sequence

1. ✅ Server running? → `netstat -ano | findstr :3000`
2. ✅ Health OK? → `curl http://192.168.100.9:3000/health`
3. ✅ User logged in? → Check app auth state
4. ✅ On same WiFi? → Check device network
5. ✅ Try send gift → Check both client & server logs

## Emergency Reset

```powershell
# Stop server
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force

# Start fresh
cd c:\Users\Admin\Desktop\Chat\ChappAt\coin-server
npm start

# Verify
curl http://192.168.100.9:3000/health
```
