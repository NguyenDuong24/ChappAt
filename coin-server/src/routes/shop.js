const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authenticateUser = require('../middleware/auth');
const { getUserCoins, logCoinTransaction } = require('../utils/coinHelpers');
const admin = require('firebase-admin');

const router = express.Router();

// Rate limiter for shop endpoints
const shopLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many shop requests, please slow down.' }
});

/**
 * GET /api/shop/items
 * Get all available shop items
 */
router.get('/items', async (req, res, next) => {
  try {
    const { db } = require('../index');
    const itemsRef = db.collection('shopItems')
      .where('active', '==', true)
      .orderBy('price', 'asc');

    const snapshot = await itemsRef.get();
    const items = [];

    snapshot.forEach(doc => {
      items.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({ 
      success: true, 
      items,
      count: items.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/shop/items/:itemId
 * Get a specific shop item
 */
router.get('/items/:itemId', async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { db } = require('../index');
    const itemRef = db.collection('shopItems').doc(itemId);
    const itemSnap = await itemRef.get();

    if (!itemSnap.exists) {
      return res.status(404).json({ 
        error: 'Item not found', 
        code: 'ITEM_NOT_FOUND' 
      });
    }

    res.json({ 
      success: true, 
      item: {
        id: itemSnap.id,
        ...itemSnap.data()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/shop/purchase
 * Purchase an item from the shop
 */
router.post('/purchase', 
  shopLimiter,
  authenticateUser,
  [
    body('itemId').isString().notEmpty().withMessage('Item ID is required')
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
      const { itemId } = req.body;

      const { db } = require('../index');
      const itemRef = db.collection('shopItems').doc(itemId);
      const userRef = db.collection('users').doc(uid);

      let result = {};

      await db.runTransaction(async (tx) => {
        const [itemSnap, userSnap] = await Promise.all([
          tx.get(itemRef), 
          tx.get(userRef)
        ]);

        if (!itemSnap.exists) {
          const error = new Error('Item not found');
          error.code = 'ITEM_NOT_FOUND';
          error.status = 404;
          throw error;
        }

        const itemData = itemSnap.data();
        
        // Check if item is active
        if (itemData.active === false) {
          const error = new Error('Item is not available');
          error.code = 'ITEM_INACTIVE';
          error.status = 400;
          throw error;
        }

        const price = Number(itemData.price || 0);
        
        if (!Number.isFinite(price) || price <= 0) {
          const error = new Error('Invalid item price');
          error.code = 'INVALID_PRICE';
          error.status = 400;
          throw error;
        }

        const coins = Number((userSnap.exists ? userSnap.get('coins') : 0) || 0);
        
        if (coins < price) {
          const error = new Error('Insufficient funds');
          error.code = 'INSUFFICIENT_FUNDS';
          error.status = 400;
          throw error;
        }

        // Deduct coins
        tx.set(userRef, { coins: coins - price }, { merge: true });

        // Log transaction
        tx.set(userRef.collection('coinTransactions').doc(), {
          userId: uid,
          type: 'purchase',
          amount: -price,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          metadata: { itemId }
        });

        // Grant item to user
        tx.set(userRef.collection('items').doc(itemId), {
          itemId,
          grantedAt: admin.firestore.FieldValue.serverTimestamp(),
          meta: { 
            price,
            name: itemData.name,
            description: itemData.description
          }
        }, { merge: true });

        result = {
          itemId,
          itemName: itemData.name,
          price,
          newBalance: coins - price
        };
      });

      res.json({ 
        success: true, 
        message: 'Purchase successful',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/shop/my-items
 * Get user's purchased items
 */
router.get('/my-items', 
  authenticateUser,
  async (req, res, next) => {
    try {
      const uid = req.user.uid;
      const { db } = require('../index');
      
      const itemsRef = db.collection('users').doc(uid).collection('items')
        .orderBy('grantedAt', 'desc');

      const snapshot = await itemsRef.get();
      const items = [];

      snapshot.forEach(doc => {
        items.push({
          id: doc.id,
          ...doc.data(),
          grantedAt: doc.data().grantedAt?.toDate()
        });
      });

      res.json({ 
        success: true, 
        items,
        count: items.length
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
