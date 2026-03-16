# VietQR Enhancement Implementation Checklist

**Version:** 2.0 with Idempotency & Cleanup  
**Date:** February 27, 2026  
**Status:** Ready for Development

---

## 📋 Pre-Implementation

- [ ] Review `VIETQR_ENHANCEMENTS_SUMMARY.md` (high-level overview)
- [ ] Read `VIETQR_IMPLEMENTATION_CODE.md` (actual code examples)
- [ ] Understand idempotent design (prevent duplicate coin credits)
- [ ] Understand expiresAt purpose (auto-cleanup)
- [ ] Setup local Firebase Firestore emulator for testing

---

## 🔧 Backend Implementation Tasks

### Task 1: Update `POST /api/vietqr/create-payment`

**File:** `src/routes/vietqr.js`

**Add to order creation:**
- [ ] Generate `transactionCode = VQR_{timestamp}_{uid}`
- [ ] Calculate `expiresAt = now + 10 minutes`
- [ ] Initialize `processedTxnIds = []`
- [ ] Initialize `attemptCount = 0`
- [ ] Update response to include `transactionCode` & `expiresAt`

**Code Reference:** See `VIETQR_IMPLEMENTATION_CODE.md` section 1️⃣

**Test Cases:**
```javascript
// Test: transactionCode is unique per order
API POST /create-payment
Response should have transactionCode like: "VQR_1709033445_user123"

// Test: expiresAt is 10 minutes in future
API POST /create-payment
Response.expiresAt should be ~600 seconds from now
```

---

### Task 2: Update `GET /api/vietqr/order-status/:orderId`

**File:** `src/routes/vietqr.js`

**Add expiresAt checking:**
- [ ] Check if `now > order.expiresAt`
- [ ] If expired, mark order status as 'expired'
- [ ] Return expired status to app (app stops polling)
- [ ] Return current status if not expired

**Code Reference:** See `VIETQR_IMPLEMENTATION_CODE.md` section 2️⃣

**Test Cases:**
```javascript
// Test: Pending order not yet expired
API GET /order-status/ORD123 (5 min after creation)
Response: { status: 'pending', completed: false }

// Test: Order after expiration
API GET /order-status/ORD123 (11 min after creation)
Response: { status: 'expired', completed: false }
```

---

### Task 3: Update `POST /api/vietqr/verify-payment`

**File:** `src/routes/vietqr.js`

**Add idempotent checking:**
- [ ] Generate unique `txnId` (before processing)
- [ ] Check if `txnId in order.processedTxnIds`
- [ ] If already processed, return success but skip coin credit
- [ ] If new, credit coins and add `txnId` to `processedTxnIds`
- [ ] Always create transaction log (for audit)

**Code Reference:** See `VIETQR_IMPLEMENTATION_CODE.md` section 3️⃣

**Test Cases:**
```javascript
// Test: First verification succeeds
API POST /verify-payment
Request: { orderId: "ORD123", description: "...", amount: 2000 }
Response: { success: true, coins: 100 }
Firestore: order.processedTxnIds has 1 entry

// Test: Second verification (duplicate) returns success but doesn't re-credit
API POST /verify-payment (same request)
Response: { success: true, coins: 100 } (idempotent)
Firestore: user.wallet.coins only increased by 100 (not 200)
           order.processedTxnIds still has 1 entry
```

---

### Task 4: Create Cron Endpoint `POST /api/vietqr/check-pending`

**File:** `src/routes/vietqr.js`

**Create new endpoint:**
- [ ] Add `cronAuth` middleware (Bearer ~[CRON_SECRET])
- [ ] Implement endpoint that:
  - [ ] Loops through all users & orders
  - [ ] Checks if `now > order.expiresAt + 30 min`
  - [ ] Deletes expired orders from Firestore
  - [ ] Keeps transaction logs intact
  - [ ] Returns stats (processed, cleanedUp)
- [ ] Update response schema in documentation

**Code Reference:** See `VIETQR_IMPLEMENTATION_CODE.md` section 4️⃣

**Test Cases:**
```javascript
// Test: Without valid CRON_SECRET
API POST /check-pending (no auth)
Response: 401 Unauthorized

// Test: With valid CRON_SECRET
API POST /check-pending
Headers: { Authorization: "Bearer [CRON_SECRET]" }
Response: { 
  success: true,
  processed: 5,
  cleanedUp: 3,
  details: { ... }
}

// Test: Expired orders deleted, transactions preserved
- Create order with old timestamp (10+ min ago)
- Run cron job
- Check: order doc deleted, transaction logs still exist
```

---

## 🛠️ Configuration Updates

### Task 5: Update Environment Variables

**File:** `saigondating-server/.env` (or `.env.example`)

**Add/Update:**
```bash
# Existing
VIETQR_ACCOUNT=1018395984
VIETQR_ACCOUNT_NAME=Nguyen Thai Duong

# New or Update
CRON_SECRET=[generate 32-char random hex]
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Checklist:**
- [ ] Add `CRON_SECRET` to `.env.example`
- [ ] Add `CRON_SECRET` to actual `.env` deployment
- [ ] Document in setup instructions (already done in guide)

---

## 🚀 Deployment Steps

### Task 6: Local Testing

**Before pushing to production:**

1. [ ] Start Firebase Firestore emulator
2. [ ] Run backend server locally
3. [ ] Run all test cases from each task above
4. [ ] Verify Firestore looks correct
5. [ ] Check server logs for errors

**Commands:**
```bash
# Start Firestore emulator
firebase emulators:start

# In another terminal, run server
npm start

# Run tests
npm test
```

---

### Task 7: Database Migration (if needed)

**For existing orders in production:**

- [ ] Create script to add missing fields to old orders
- [ ] Set `transactionCode = ORC_hashOfOrderId` (or similar)
- [ ] Set `expiresAt = createdAt + 10 min` (for old orders)
- [ ] Set `processedTxnIds = ['MIGRATED']` (mark as processed)
- [ ] Run migration script carefully on small batch first

**Note:** If no existing orders (fresh deploy), skip this task.

---

### Task 8: Deploy to Staging

```bash
# Commit changes
git add .
git commit -m "feat: add idempotency, expiresAt, and cron cleanup

- Add transactionCode for unique payment tracking
- Add expiresAt timestamp for auto-expiration
- Add processedTxnIds array for idempotent checks
- Add POST /check-pending cron endpoint for cleanup
- Add cronAuth middleware for securing cron jobs

Fixes: Prevent duplicate coin credits, auto-cleanup Firestore"

# Push to staging
git push staging

# OR Deploy to production if no staging
git push main
```

---

### Task 9: Setup Cron Job

**Using EasyCron.com (or similar service):**

1. [ ] Go to easycron.com
2. [ ] Create new cron job
3. [ ] Set URL: `https://your-server.onrender.com/api/vietqr/check-pending`
4. [ ] Method: POST
5. [ ] Add header: `Authorization: Bearer [CRON_SECRET]`
6. [ ] Cron expression: `*/30 * * * * *` (every 30 seconds)
7. [ ] Timeout: 10 seconds
8. [ ] Save and test (should return 200 with cleanup stats)

**Verification:**
- [ ] Check server logs show "📊 Cron Job Stats"
- [ ] Check Firestore storage size decreases over time
- [ ] Check old orders are deleted after 10+ minutes

---

## ✅ Validation & Testing

### Task 10: Full System Test

**Scenario 1: Auto-Polling Success**
- [ ] User opens VietQR modal
- [ ] App starts auto-polling (3s interval)
- [ ] Simulate payment in Firestore (update order.status = 'completed')
- [ ] Verify: Coins credited once, status changes to success
- [ ] Verify: Transaction log created
- [ ] Verify: `processedTxnIds` has one entry

**Scenario 2: Idempotent Protection**
- [ ] Duplicate the previous test (same payment)
- [ ] Verify: Order already processed, coins not re-credited
- [ ] Verify: Response still shows success (idempotent)
- [ ] Verify: User wallet has 100 coins (not 200)

**Scenario 3: Manual Verification**
- [ ] Create order, wait 2 minutes
- [ ] User manually verifies with payment description
- [ ] Verify: Coins credited
- [ ] Verify: Transaction marked as 'manual'
- [ ] Verify: `processedTxnIds` updated

**Scenario 4: Expiration**
- [ ] Create order, wait 10+ minutes
- [ ] Check `GET /order-status/:orderId`
- [ ] Verify: Returns status='expired'
- [ ] Verify: App stops polling

**Scenario 5: Cron Cleanup**
- [ ] Create order with old timestamp (30+ min old)
- [ ] Run `POST /check-pending` endpoint
- [ ] Verify: Expired order deleted from Firestore
- [ ] Verify: Transaction logs still exist
- [ ] Verify: Response shows cleanedUp count

---

## 📊 Monitoring & Metrics

### Task 11: Setup Monitoring

**Track these metrics:**
- [ ] Firestore collection size over time (should decrease)
- [ ] Cron job success rate (should be ~100%)
- [ ] Duplicate transaction detection rate (should be rare)
- [ ] Average polling time to detection (should be 3-20s)
- [ ] Manual verification success rate (should be 100% for valid txn)

**Firestore Queries (Firebase Console):**

```javascript
// Total pending orders
db.collection('users')
  .collectionGroup('orders')
  .where('status', '==', 'pending')
  .get()
  .then(snap => console.log(snap.size))

// Completed orders (last 24h)
db.collection('users')
  .collectionGroup('orders')
  .where('status', '==', 'completed')
  .orderBy('verifiedAt', 'desc')
  .get()

// Expired orders waiting for cleanup
db.collection('users')
  .collectionGroup('orders')
  .where('status', '==', 'expired')
  .get()
```

---

## 🔍 Troubleshooting

### Issue: Orders not being deleted by cron job

**Check:**
- [ ] CRON_SECRET matches between .env and EasyCron
- [ ] Cron job runs every 30 seconds (check logs)
- [ ] Orders are actually expired (`now > expiresAt + 30min`)
- [ ] Server has write permissions to Firestore

**Solution:**
```javascript
// Add detailed logging to check-pending endpoint
console.log(`🔍 Cron: Found ${total} orders`);
console.log(`🔍 Expired (not yet cleanup): ${expired}`);
console.log(`🔍 Deleted in this run: ${cleanedUp}`);
```

---

### Issue: Coins credited twice for same payment

**Check:**
- [ ] `processedTxnIds` is being updated correctly
- [ ] Check `order.processedTxnIds` in Firestore
- [ ] Verify duplicate detection logic runs before coin credit

**Solution:**
```javascript
// Add logging
if (order.processedTxnIds.includes(txnId)) {
  console.log(`⚠️ DUPLICATE: ${orderId} already processed`);
  return { success: true, alreadyProcessed: true };
}
```

---

### Issue: Cron job throwing errors

**Check:**
- [ ] Auth header format: `Authorization: Bearer [token]`
- [ ] Token matches CRON_SECRET exactly
- [ ] Server can read all users collection
- [ ] No permission errors in logs

**Debug:**
```javascript
// Add try-catch logging
console.log(`✅ Cron auth passed`);
console.log(`📊 Processing ${usersCount} users`);
// Then catch errors with detailed logs
```

---

## 📝 Documentation Updates

### Task 12: Update Documentation

**Files already updated:**
- ✅ `VIETQR_DETAILED_FLOW_GUIDE.md`
- ✅ `VIETQR_IMPLEMENTATION_CODE.md`
- ✅ `VIETQR_ENHANCEMENTS_SUMMARY.md`
- ✅ `VIETQR_IMPLEMENTATION_CHECKLIST.md` (this file)

**Additional docs to create (optional):**
- [ ] `VIETQR_MONITORING_GUIDE.md` (metrics, alerts)
- [ ] `VIETQR_TROUBLESHOOTING_GUIDE.md` (common issues)
- [ ] `VIETQR_MIGRATION_GUIDE.md` (for existing deployments)

---

## ✨ Completion Criteria

This checklist is **COMPLETE** when:

1. ✅ All 4 tasks implemented (create, verify, cleanup endpoints)
2. ✅ Cron job deployed and running
3. ✅ All test scenarios pass
4. ✅ No duplicate coin credits observed
5. ✅ Expired orders auto-cleanup works
6. ✅ Firestore storage stabilizes/decreases
7. ✅ Production monitoring shows healthy metrics

---

## 📞 Quick Reference

**Key Files:**
- Backend: `src/routes/vietqr.js`
- Config: `.env` (add CRON_SECRET)
- Docs: `VIETQR_IMPLEMENTATION_CODE.md`

**Key Functions:**
- `generateTransactionCode()` - Create unique ID
- `checkExpiration()` - Verify order time
- `checkIdempotency()` - Prevent duplicates
- `cleanupExpired()` - Delete old orders

**Key Timestamps:**
- Creation: `createdAt`
- Expiration: `expiresAt` (createdAt + 10 min)
- Cleanup start: `expiresAt + 30 min`
- Cleanup complete: Next cron run

---

## 🎉 Post-Implementation

After completing all tasks:

1. [ ] Update VIETQR_SUMMARY.md with completion date
2. [ ] Archive this checklist with completion date
3. [ ] Celebrate! 🎊 System is now production-ready
4. [ ] Monitor for 7 days (watch metrics)
5. [ ] Document any issues encountered
6. [ ] Create runbook for future maintenance

---

**Status:** Ready for implementation  
**Last Updated:** February 27, 2026  
**Next Steps:** Assign tasks to backend developer

