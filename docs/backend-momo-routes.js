/**
 * MoMo Payment Routes for saigondating-server
 * 
 * Copy this file to: saigondating-server/src/routes/momoRoutes.js
 * 
 * Then add to src/index.js:
 * const momoRoutes = require('./routes/momoRoutes');
 * app.use('/api/momo', momoRoutes);
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db, admin } = require('../config/firebase');

// ==============================================================
// MoMo API Configuration
// ==============================================================
// Đổi các giá trị này với credentials thực từ MoMo Business
const MOMO_CONFIG = {
    partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMOBKUN20180529',
    accessKey: process.env.MOMO_ACCESS_KEY || 'klm05TvNBzhg7h7j',
    secretKey: process.env.MOMO_SECRET_KEY || 'at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa',

    // Sandbox URLs (đổi sang production khi go-live)
    endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create',

    // Callback URLs
    redirectUrl: process.env.MOMO_REDIRECT_URL || 'chappat://payment-result',
    ipnUrl: process.env.MOMO_IPN_URL || 'https://saigondating-server.onrender.com/api/momo/callback',

    requestType: 'captureWallet',
};

// ==============================================================
// Helper Functions
// ==============================================================

/**
 * Tạo HMAC SHA256 signature cho MoMo
 */
function createSignature(rawData) {
    return crypto
        .createHmac('sha256', MOMO_CONFIG.secretKey)
        .update(rawData)
        .digest('hex');
}

/**
 * Xác thực signature từ MoMo callback
 */
function verifySignature(data, signature) {
    const rawData = `accessKey=${MOMO_CONFIG.accessKey}&amount=${data.amount}&extraData=${data.extraData}&message=${data.message}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&orderType=${data.orderType}&partnerCode=${data.partnerCode}&payType=${data.payType}&requestId=${data.requestId}&responseTime=${data.responseTime}&resultCode=${data.resultCode}&transId=${data.transId}`;
    const expectedSignature = createSignature(rawData);
    return expectedSignature === signature;
}

/**
 * Gọi MoMo API để tạo thanh toán
 */
async function createMoMoPayment(orderInfo) {
    const {
        orderId,
        requestId,
        amount,
        orderDescription,
        extraData,
    } = orderInfo;

    // Tạo raw signature
    const rawSignature = `accessKey=${MOMO_CONFIG.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${MOMO_CONFIG.ipnUrl}&orderId=${orderId}&orderInfo=${orderDescription}&partnerCode=${MOMO_CONFIG.partnerCode}&redirectUrl=${MOMO_CONFIG.redirectUrl}&requestId=${requestId}&requestType=${MOMO_CONFIG.requestType}`;

    const signature = createSignature(rawSignature);

    const requestBody = {
        partnerCode: MOMO_CONFIG.partnerCode,
        partnerName: 'ChappAt',
        storeId: 'ChappAtStore',
        requestId: requestId,
        amount: amount,
        orderId: orderId,
        orderInfo: orderDescription,
        redirectUrl: MOMO_CONFIG.redirectUrl,
        ipnUrl: MOMO_CONFIG.ipnUrl,
        lang: 'vi',
        extraData: extraData,
        requestType: MOMO_CONFIG.requestType,
        signature: signature,
    };

    console.log('📤 MoMo Request:', {
        orderId,
        amount,
        endpoint: MOMO_CONFIG.endpoint,
    });

    const response = await fetch(MOMO_CONFIG.endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    console.log('📥 MoMo Response:', {
        resultCode: data.resultCode,
        message: data.message,
    });

    return data;
}

// ==============================================================
// Routes
// ==============================================================

/**
 * POST /api/momo/create-payment
 * Tạo thanh toán MoMo mới
 */
router.post('/create-payment', async (req, res) => {
    try {
        const { uid } = req.user; // From auth middleware
        const {
            amount,
            orderInfo,
            purchaseType, // 'coin' hoặc 'pro'
            coinAmount,   // Số coin (nếu purchaseType = 'coin')
            packageId,
            duration,     // Số ngày pro (nếu purchaseType = 'pro')
        } = req.body;

        // Validate
        if (!amount || amount < 1000) {
            return res.status(400).json({
                success: false,
                error: 'Số tiền không hợp lệ (tối thiểu 1,000đ)',
                code: 'INVALID_AMOUNT',
            });
        }

        if (!['coin', 'pro'].includes(purchaseType)) {
            return res.status(400).json({
                success: false,
                error: 'Loại thanh toán không hợp lệ',
                code: 'INVALID_PURCHASE_TYPE',
            });
        }

        // Tạo order ID unique
        const orderId = `CHAPPAT_${uid.substring(0, 8)}_${Date.now()}`;
        const requestId = `REQ_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Extra data để lưu thông tin thanh toán
        const extraData = Buffer.from(JSON.stringify({
            uid,
            purchaseType,
            coinAmount: coinAmount || 0,
            duration: duration || 0,
            packageId: packageId || null,
        })).toString('base64');

        // Gọi MoMo API
        const momoResponse = await createMoMoPayment({
            orderId,
            requestId,
            amount,
            orderDescription: orderInfo || `Thanh toán ChappAt - ${orderId}`,
            extraData,
        });

        if (momoResponse.resultCode !== 0) {
            console.error('❌ MoMo Error:', momoResponse);
            return res.status(400).json({
                success: false,
                error: momoResponse.message || 'Lỗi tạo thanh toán MoMo',
                code: 'MOMO_ERROR',
            });
        }

        // Lưu pending transaction vào Firestore
        await db.collection('momoTransactions').doc(orderId).set({
            orderId,
            requestId,
            userId: uid,
            amount,
            purchaseType,
            coinAmount: coinAmount || 0,
            duration: duration || 0,
            packageId: packageId || null,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            momoPayUrl: momoResponse.payUrl,
            momoDeeplink: momoResponse.deeplink,
            momoQrCodeUrl: momoResponse.qrCodeUrl,
        });

        console.log('✅ Payment created:', { orderId, amount, purchaseType });

        res.json({
            success: true,
            orderId,
            payUrl: momoResponse.payUrl,
            deeplink: momoResponse.deeplink,
            qrCodeUrl: momoResponse.qrCodeUrl,
        });

    } catch (error) {
        console.error('❌ Create payment error:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi server',
            code: 'SERVER_ERROR',
        });
    }
});

/**
 * POST /api/momo/callback
 * Webhook từ MoMo (IPN - Instant Payment Notification)
 */
router.post('/callback', async (req, res) => {
    try {
        const data = req.body;

        console.log('📥 MoMo Callback received:', {
            orderId: data.orderId,
            resultCode: data.resultCode,
            transId: data.transId,
        });

        // Xác thực signature
        if (!verifySignature(data, data.signature)) {
            console.error('❌ Invalid signature');
            return res.status(400).json({ success: false, error: 'Invalid signature' });
        }

        const orderId = data.orderId;
        const transactionRef = db.collection('momoTransactions').doc(orderId);
        const transactionDoc = await transactionRef.get();

        if (!transactionDoc.exists) {
            console.error('❌ Transaction not found:', orderId);
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }

        const transaction = transactionDoc.data();

        // Kiểm tra đã xử lý chưa
        if (transaction.status !== 'pending') {
            console.log('⚠️ Transaction already processed:', orderId);
            return res.json({ success: true, message: 'Already processed' });
        }

        // resultCode = 0 là thành công
        if (data.resultCode === 0) {
            // Cập nhật transaction status
            await transactionRef.update({
                status: 'success',
                momoTransId: data.transId,
                completedAt: admin.firestore.FieldValue.serverTimestamp(),
                momoResponse: data,
            });

            // Thực hiện action dựa trên purchase type
            if (transaction.purchaseType === 'coin') {
                // Cộng coin cho user
                const userRef = db.collection('users').doc(transaction.userId);
                await db.runTransaction(async (t) => {
                    const userDoc = await t.get(userRef);
                    const currentCoins = userDoc.data()?.coins || 0;
                    t.update(userRef, {
                        coins: currentCoins + transaction.coinAmount,
                    });
                });

                // Lưu vào coin transactions
                await db.collection('users').doc(transaction.userId)
                    .collection('coinTransactions').add({
                        type: 'momo_topup',
                        amount: transaction.coinAmount,
                        momoOrderId: orderId,
                        momoTransId: data.transId,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    });

                console.log(`✅ Added ${transaction.coinAmount} coins to user ${transaction.userId}`);

            } else if (transaction.purchaseType === 'pro') {
                // Nâng cấp Pro
                const userRef = db.collection('users').doc(transaction.userId);
                const now = new Date();
                const proExpiresAt = new Date(now.getTime() + transaction.duration * 24 * 60 * 60 * 1000);

                await userRef.update({
                    isPro: true,
                    proExpiresAt: admin.firestore.Timestamp.fromDate(proExpiresAt),
                    proActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                console.log(`✅ Upgraded user ${transaction.userId} to Pro until ${proExpiresAt}`);
            }

            // TODO: Gửi push notification cho user

        } else {
            // Thanh toán thất bại
            await transactionRef.update({
                status: 'failed',
                failedAt: admin.firestore.FieldValue.serverTimestamp(),
                momoResponse: data,
                failReason: data.message,
            });

            console.log('❌ Payment failed:', orderId, data.message);
        }

        // MoMo yêu cầu trả về 204 No Content
        res.status(204).send();

    } catch (error) {
        console.error('❌ Callback error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

/**
 * POST /api/momo/check-status
 * Kiểm tra trạng thái thanh toán
 */
router.post('/check-status', async (req, res) => {
    try {
        const { uid } = req.user;
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                error: 'Order ID is required',
                code: 'MISSING_ORDER_ID',
            });
        }

        const transactionDoc = await db.collection('momoTransactions').doc(orderId).get();

        if (!transactionDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found',
                code: 'TRANSACTION_NOT_FOUND',
            });
        }

        const transaction = transactionDoc.data();

        // Verify ownership
        if (transaction.userId !== uid) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized',
                code: 'UNAUTHORIZED',
            });
        }

        res.json({
            success: true,
            orderId: transaction.orderId,
            status: transaction.status,
            amount: transaction.amount,
            coinAmount: transaction.coinAmount,
            purchaseType: transaction.purchaseType,
            message: transaction.status === 'success'
                ? 'Thanh toán thành công'
                : transaction.status === 'failed'
                    ? transaction.failReason || 'Thanh toán thất bại'
                    : 'Đang chờ thanh toán',
        });

    } catch (error) {
        console.error('❌ Check status error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            code: 'SERVER_ERROR',
        });
    }
});

module.exports = router;
