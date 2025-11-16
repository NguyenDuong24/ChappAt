const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authenticateUser = require('../middleware/auth');
const { checkRateLimit, adjustCoins, logCoinTransaction, getUserCoins } = require('../utils/coinHelpers');

const router = express.Router();

// Rate limiter for wallet endpoints
const walletLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many wallet requests, please slow down.' }
});

/**
 * GET /api/wallet/balance
 * Get user's current coin balance
 */
router.get('/balance', authenticateUser, async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const coins = await getUserCoins(uid);
    
    res.json({ 
      success: true, 
      coins,
      uid 
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/wallet/topup
 * Add coins to user's wallet
 */
router.post('/topup', 
  walletLimiter,
  authenticateUser,
  [
    body('amount').isInt({ min: 1, max: 1000 }).withMessage('Amount must be between 1 and 1000'),
    body('metadata').optional().isObject()
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
      const { amount, metadata = {} } = req.body;

      // Check rate limit
      await checkRateLimit(uid, 'topup', 10); // Max 10 topups/day

      // Adjust coins
      await adjustCoins(uid, amount);

      // Log transaction
      const txId = await logCoinTransaction(uid, 'topup', amount, metadata);

      // Get new balance
      const newBalance = await getUserCoins(uid);

      res.json({ 
        success: true, 
        message: 'Topup successful',
        amount,
        newBalance,
        transactionId: txId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/wallet/spend
 * Spend coins from user's wallet
 */
router.post('/spend', 
  walletLimiter,
  authenticateUser,
  [
    body('amount').isInt({ min: 1, max: 5000 }).withMessage('Amount must be between 1 and 5000'),
    body('metadata').optional().isObject()
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
      const { amount, metadata = {} } = req.body;

      // Check rate limit
      await checkRateLimit(uid, 'spend', 50); // Max 50 spends/day

      // Adjust coins
      await adjustCoins(uid, -amount);

      // Log transaction
      const txId = await logCoinTransaction(uid, 'spend', -amount, metadata);

      // Get new balance
      const newBalance = await getUserCoins(uid);

      res.json({ 
        success: true, 
        message: 'Spend successful',
        amount,
        newBalance,
        transactionId: txId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/wallet/transactions
 * Get user's transaction history
 */
router.get('/transactions', 
  authenticateUser,
  async (req, res, next) => {
    try {
      const uid = req.user.uid;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const { db } = require('../index');
      const txRef = db.collection('users').doc(uid).collection('coinTransactions')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset);

      const snapshot = await txRef.get();
      const transactions = [];

      snapshot.forEach(doc => {
        transactions.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        });
      });

      res.json({ 
        success: true, 
        transactions,
        count: transactions.length,
        limit,
        offset
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
