const { db } = require('./db');
const admin = require('firebase-admin');

/**
 * Rate limiting per user per action per day
 */
async function checkRateLimit(uid, action, maxPerDay) {
  const today = new Date().toISOString().split('T')[0];
  const limitRef = db.collection('rateLimits').doc(`${uid}_${action}_${today}`);
  
  const snap = await limitRef.get();
  const count = (snap.exists ? snap.data().count : 0) + 1;
  
  if (count > maxPerDay) {
    const error = new Error('Rate limit exceeded');
    error.code = 'RATE_LIMIT_EXCEEDED';
    error.status = 429;
    throw error;
  }
  
  await limitRef.set({ 
    count, 
    lastUpdated: admin.firestore.FieldValue.serverTimestamp() 
  }, { merge: true });
  
  return count;
}

/**
 * Adjust coins atomically with max limit
 */
async function adjustCoins(uid, delta, maxCoins = 10000) {
  const userRef = db.collection('users').doc(uid);
  
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const currentCoins = snap.exists ? Number(snap.get('coins') || 0) : 0;
    const newCoins = currentCoins + delta;
    
    if (newCoins < 0) {
      const error = new Error('Insufficient funds');
      error.code = 'INSUFFICIENT_FUNDS';
      error.status = 400;
      throw error;
    }
    
    if (newCoins > maxCoins) {
      const error = new Error('Coin limit exceeded');
      error.code = 'COIN_LIMIT_EXCEEDED';
      error.status = 400;
      throw error;
    }
    
    tx.set(userRef, { coins: newCoins }, { merge: true });
  });
}

/**
 * Log a coin transaction
 */
async function logCoinTransaction(uid, type, amount, metadata = {}) {
  const txRef = db.collection('users').doc(uid).collection('coinTransactions').doc();
  
  await txRef.set({
    userId: uid,
    type,
    amount,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    metadata
  });
  
  return txRef.id;
}

/**
 * Get user's coin balance
 */
async function getUserCoins(uid) {
  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  
  if (!snap.exists) {
    return 0;
  }
  
  return Number(snap.get('coins') || 0);
}

module.exports = {
  checkRateLimit,
  adjustCoins,
  logCoinTransaction,
  getUserCoins
};
