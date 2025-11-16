const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authenticateUser = require('../middleware/auth');
const { checkRateLimit, getUserCoins, logCoinTransaction } = require('../utils/coinHelpers');
const admin = require('firebase-admin');
const { db } = require('../utils/db');

const router = express.Router();

// Rate limiter for gift endpoints
const giftLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'Too many gift requests, please slow down.' }
});

/**
 * POST /api/gifts/send
 * Send a gift to another user
 */
router.post('/send', 
  giftLimiter,
  authenticateUser,
  [
    body('receiverUid').isString().notEmpty().withMessage('Receiver UID is required'),
    body('roomId').isString().notEmpty().withMessage('Room ID is required'),
    body('giftId').isString().notEmpty().withMessage('Gift ID is required'),
    body('senderName').optional().isString()
  ],
  async (req, res, next) => {
    console.log('\n🎁 ========== SEND GIFT REQUEST ==========');
    console.log('📅 Time:', new Date().toISOString());
    console.log('👤 User:', req.user?.uid || 'NOT AUTHENTICATED');
    console.log('📦 Body:', req.body);
    console.log('🔑 Headers:', {
      authorization: req.headers.authorization ? 'Bearer ' + req.headers.authorization.substring(7, 20) + '...' : 'MISSING',
      contentType: req.headers['content-type'],
    });
    
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('❌ Validation failed:', errors.array());
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const senderUid = req.user.uid;
      const { receiverUid, roomId, giftId, senderName = 'Bạn' } = req.body;

      console.log('✅ Validation passed');
      console.log('📊 Request params:', {
        senderUid,
        receiverUid,
        roomId,
        giftId,
        senderName,
      });

      // Check if sending to self
      if (receiverUid === senderUid) {
        console.error('❌ Cannot send gift to self');
        return res.status(400).json({ 
          error: 'Cannot gift self', 
          code: 'CANNOT_GIFT_SELF' 
        });
      }

      // Check rate limit
      console.log('⏱️ Checking rate limit...');
      await checkRateLimit(senderUid, 'giftsSend', 20); // Max 20 gifts/day
      console.log('✅ Rate limit OK');

      console.log('💾 Setting up Firestore references...');
      const giftRef = db.collection('gifts').doc(giftId);
      const userRef = db.collection('users').doc(senderUid);
      const receiverRef = db.collection('users').doc(receiverUid);
      const messageRef = db.collection('rooms').doc(roomId).collection('messages').doc();
      const receiptRef = receiverRef.collection('giftsReceived').doc();
      const txRef = userRef.collection('coinTransactions').doc();

      let result = {};
      console.log('🔄 Starting Firestore transaction...');

      await db.runTransaction(async (tx) => {
        console.log('📖 Fetching gift and user data...');
        const [giftSnap, userSnap] = await Promise.all([
          tx.get(giftRef), 
          tx.get(userRef)
        ]);

        console.log('📊 Gift exists:', giftSnap.exists);
        console.log('📊 User exists:', userSnap.exists);

        let gift = null;
        
        // Get gift data or use fallback
        if (!giftSnap.exists) {
          console.log('⚠️ Gift not in database, using fallback...');
          const fallback = [
            { id: 'banh-mi-thit', name: 'Bánh mì thịt', price: 20, icon: '🥖' },
            { id: 'tra-sua', name: 'Trà sữa', price: 15, icon: '🧋' },
            { id: 'hoa-hong', name: 'Hoa hồng', price: 10, icon: '🌹' },
            { id: 'cafe-sua', name: 'Cà phê sữa', price: 12, icon: '☕️' },
          ].find(g => g.id === giftId);
          
          if (!fallback) {
            console.error('❌ Gift not found in database or fallback');
            const error = new Error('Gift not found');
            error.code = 'GIFT_NOT_FOUND';
            error.status = 404;
            throw error;
          }
          gift = fallback;
          console.log('✅ Using fallback gift:', gift);
        } else {
          const d = giftSnap.data();
          console.log('📦 Gift data from database:', d);
          
          if (d.active === false) {
            console.error('❌ Gift is inactive');
            const error = new Error('Gift is inactive');
            error.code = 'GIFT_INACTIVE';
            error.status = 400;
            throw error;
          }
          gift = { 
            id: giftSnap.id, 
            name: d.name || giftSnap.id, 
            price: Number(d.price || 0), 
            icon: d.icon 
          };
          console.log('✅ Gift loaded:', gift);
          
          if (!Number.isFinite(gift.price) || gift.price <= 0) {
            console.error('❌ Invalid gift price:', gift.price);
            const error = new Error('Invalid gift price');
            error.code = 'INVALID_GIFT_PRICE';
            error.status = 400;
            throw error;
          }
        }

        // Check sender has enough coins
        const coins = Number((userSnap.exists ? userSnap.get('coins') : 0) || 0);
        console.log('💰 Sender coins:', coins, '| Gift price:', gift.price);
        
        if (coins < gift.price) {
          console.error('❌ Insufficient funds:', { coins, needed: gift.price });
          const error = new Error('Insufficient funds');
          error.code = 'INSUFFICIENT_FUNDS';
          error.status = 400;
          throw error;
        }
        
        console.log('✅ Sufficient funds available');

        // Deduct coins from sender
        console.log('💸 Deducting coins from sender...');
        tx.set(userRef, { coins: coins - gift.price }, { merge: true });
        
        // Log transaction
        console.log('📝 Creating transaction log...');
        tx.set(txRef, { 
          userId: senderUid, 
          type: 'spend', 
          amount: -gift.price, 
          createdAt: admin.firestore.FieldValue.serverTimestamp(), 
          metadata: { 
            kind: 'gift', 
            giftId: gift.id, 
            to: receiverUid, 
            roomId 
          } 
        });

        // Create gift message in room
        console.log('💬 Creating gift message in room...');
        tx.set(messageRef, { 
          uid: senderUid, 
          toUid: receiverUid, 
          type: 'gift', 
          text: `🎁 ${senderName} đã tặng quà: ${gift.icon || ''} ${gift.name} (🥖 ${gift.price})`, 
          gift: { 
            id: gift.id, 
            name: gift.name, 
            price: gift.price, 
            icon: gift.icon || '🎁' 
          }, 
          createdAt: admin.firestore.FieldValue.serverTimestamp(), 
          status: 'sent', 
          readBy: [] 
        });

        // Create gift receipt for receiver
        console.log('🧾 Creating gift receipt for receiver...');
        tx.set(receiptRef, { 
          fromUid: senderUid, 
          fromName: senderName, 
          roomId, 
          gift: { 
            id: gift.id, 
            name: gift.name, 
            price: gift.price, 
            icon: gift.icon || '🎁' 
          }, 
          createdAt: admin.firestore.FieldValue.serverTimestamp(), 
          status: 'unread' 
        });

        // Update receiver stats
        console.log('📊 Updating receiver stats...');
        tx.set(receiverRef, { 
          giftReceivedCount: admin.firestore.FieldValue.increment(1), 
          giftReceivedValue: admin.firestore.FieldValue.increment(gift.price) 
        }, { merge: true });

        result = {
          gift,
          messageId: messageRef.id,
          receiptId: receiptRef.id,
          newBalance: coins - gift.price
        };
        console.log('✅ Transaction prepared successfully:', result);
      });

      console.log('✅ Transaction committed successfully');
      console.log('📤 Sending response...');
      
      res.json({ 
        success: true, 
        message: 'Gift sent successfully',
        ...result
      });
      
      console.log('✅ ========== SEND GIFT SUCCESS ==========\n');
    } catch (error) {
      console.error('❌ ========== SEND GIFT ERROR ==========');
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        stack: error.stack,
      });
      console.error('============================================\n');
      next(error);
    }
  }
);

/**
 * POST /api/gifts/redeem
 * Redeem a received gift for coins
 */
router.post('/redeem', 
  giftLimiter,
  authenticateUser,
  [
    body('receiptId').isString().notEmpty().withMessage('Receipt ID is required'),
    body('rate').optional().isFloat({ min: 0, max: 1 }).withMessage('Rate must be between 0 and 1')
  ],
  async (req, res, next) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const uid = req.user.uid;
      const { receiptId, rate = 1 } = req.body;

      // Check rate limit
      await checkRateLimit(uid, 'giftsRedeem', 10); // Max 10 redeems/day

      const receiptRef = db.collection('users').doc(uid).collection('giftsReceived').doc(receiptId);
      const userRef = db.collection('users').doc(uid);
      const txRef = userRef.collection('coinTransactions').doc();

      let redeemValue = 0;

      await db.runTransaction(async (tx) => {
        const receiptSnap = await tx.get(receiptRef);
        
        if (!receiptSnap.exists) {
          const error = new Error('Receipt not found');
          error.code = 'RECEIPT_NOT_FOUND';
          error.status = 404;
          throw error;
        }

        const rec = receiptSnap.data();
        if (rec.redeemed) {
          const error = new Error('Already redeemed');
          error.code = 'ALREADY_REDEEMED';
          error.status = 400;
          throw error;
        }

        const price = Number(rec?.gift?.price || 0);
        redeemValue = Math.max(0, Math.round(price * Math.max(0, Math.min(1, rate))));
        
        if (!Number.isFinite(redeemValue) || redeemValue <= 0) {
          const error = new Error('Invalid redeem value');
          error.code = 'INVALID_REDEEM_VALUE';
          error.status = 400;
          throw error;
        }

        const userSnap = await tx.get(userRef);
        const coins = Number((userSnap.exists ? userSnap.get('coins') : 0) || 0) + redeemValue;
        
        // Update user coins
        tx.set(userRef, { 
          coins, 
          giftRedeemedValue: admin.firestore.FieldValue.increment(redeemValue) 
        }, { merge: true });
        
        // Log transaction
        tx.set(txRef, { 
          userId: uid, 
          type: 'redeem', 
          amount: redeemValue, 
          createdAt: admin.firestore.FieldValue.serverTimestamp(), 
          metadata: { 
            kind: 'gift_redeem', 
            receiptId 
          } 
        });
        
        // Mark receipt as redeemed
        tx.update(receiptRef, { 
          redeemed: true, 
          redeemedAt: admin.firestore.FieldValue.serverTimestamp(), 
          redeemValue, 
          status: 'read' 
        });
      });

      res.json({ 
        success: true, 
        message: 'Gift redeemed successfully',
        redeemValue,
        newBalance: await getUserCoins(uid)
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/gifts/received
 * Get user's received gifts
 */
router.get('/received', 
  authenticateUser,
  async (req, res, next) => {
    try {
      const uid = req.user.uid;
      const limit = parseInt(req.query.limit) || 50;
      const status = req.query.status; // 'unread', 'read', or undefined for all

      let query = db.collection('users').doc(uid).collection('giftsReceived')
        .orderBy('createdAt', 'desc')
        .limit(limit);

      if (status) {
        query = query.where('status', '==', status);
      }

      const snapshot = await query.get();
      const gifts = [];

      snapshot.forEach(doc => {
        gifts.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          redeemedAt: doc.data().redeemedAt?.toDate()
        });
      });

      res.json({ 
        success: true, 
        gifts,
        count: gifts.length
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
