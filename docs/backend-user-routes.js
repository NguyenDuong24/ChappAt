/**
 * User Pro Status Routes
 * 
 * Copy this file to: saigondating-server/src/routes/userRoutes.js
 * (hoặc thêm vào file routes hiện có)
 * 
 * Then add to src/index.js:
 * const userRoutes = require('./routes/userRoutes');
 * app.use('/api/user', userRoutes);
 */

const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/firebase');

/**
 * GET /api/user/pro-status
 * Lấy trạng thái Pro của user
 */
router.get('/pro-status', async (req, res) => {
    try {
        const { uid } = req.user;

        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND',
            });
        }

        const userData = userDoc.data();
        let isPro = userData.isPro || false;
        let proExpiresAt = userData.proExpiresAt ? userData.proExpiresAt.toDate() : null;

        // Kiểm tra xem Pro đã hết hạn chưa
        if (isPro && proExpiresAt && new Date() > proExpiresAt) {
            // Pro đã hết hạn, cập nhật user
            await db.collection('users').doc(uid).update({
                isPro: false,
            });
            isPro = false;
        }

        res.json({
            success: true,
            isPro,
            proExpiresAt: proExpiresAt ? proExpiresAt.toISOString() : null,
        });

    } catch (error) {
        console.error('❌ Get pro status error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            code: 'SERVER_ERROR',
        });
    }
});

/**
 * GET /api/user/message-limit
 * Lấy giới hạn tin nhắn của user (dựa trên Pro status)
 */
router.get('/message-limit', async (req, res) => {
    try {
        const { uid } = req.user;

        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND',
            });
        }

        const userData = userDoc.data();
        let isPro = userData.isPro || false;
        const proExpiresAt = userData.proExpiresAt ? userData.proExpiresAt.toDate() : null;

        // Kiểm tra xem Pro đã hết hạn chưa
        if (isPro && proExpiresAt && new Date() > proExpiresAt) {
            isPro = false;
        }

        // Giới hạn tin nhắn
        const messageLimit = isPro ? 500 : 50; // Pro: 500/ngày, Free: 50/ngày

        // Đếm tin nhắn đã gửi hôm nay
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Lấy số tin nhắn đã gửi từ user document
        const messagesSentToday = userData.messagesSentToday || 0;
        const lastMessageDate = userData.lastMessageDate ? userData.lastMessageDate.toDate() : null;

        // Reset nếu ngày mới
        let actualMessagesSent = messagesSentToday;
        if (!lastMessageDate || lastMessageDate < today) {
            actualMessagesSent = 0;
        }

        res.json({
            success: true,
            isPro,
            messageLimit,
            messagesSentToday: actualMessagesSent,
            remaining: Math.max(0, messageLimit - actualMessagesSent),
        });

    } catch (error) {
        console.error('❌ Get message limit error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            code: 'SERVER_ERROR',
        });
    }
});

module.exports = router;
