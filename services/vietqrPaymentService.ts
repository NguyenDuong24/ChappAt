/**
 * VietQR Payment Service
 * Xử lý thanh toán VietQR cho nạp coin và nâng cấp Pro
 */

import { Linking, Platform } from 'react-native';
import { getAuth } from 'firebase/auth';

// Cấu hình URL server
const API_BASE_URL = 'https://saigondating-server.onrender.com/api';

// Các gói coin có sẵn
export const COIN_PACKAGES = [
    { id: 'coin_10', coins: 10, price: 1000, name: '10 Coin', bonus: 0 },
    { id: 'coin_50', coins: 50, price: 2000, name: '50 Coin', bonus: 5, discount: 10 },
    { id: 'coin_100', coins: 100, price: 3000, name: '100 Coin', bonus: 20, discount: 20 },
    { id: 'coin_500', coins: 500, price: 5000, name: '500 Coin', bonus: 150, discount: 30 },
];

// Gói Pro
export const PRO_PACKAGE = {
    id: 'pro_monthly',
    name: 'Pro 1 Tháng',
    price: 99000,
    duration: 30, // days
    features: [
        'Tăng giới hạn tin nhắn lên 500/ngày',
        'Badge Pro độc quyền',
        'Ưu tiên hiển thị trong tìm kiếm',
        'Xem ai đã thích bạn',
        'Không quảng cáo',
    ],
};

export interface CoinPackage {
    id: string;
    coins: number;
    price: number;
    name: string;
    bonus?: number;
    discount?: number;
}

export interface PaymentResult {
    success: boolean;
    orderId: string;
    amount: number;
    description: string;
    qrImageUrl: string; // URL to QR image from vietqr.io
    qrString: string;   // Raw QR string for local generation
    bankCode: number;
    accountNumber: string;
    accountName: string;
    instructions: {
        method1: string;
        method2: string;
    };
    message?: string;
}

export interface PaymentStatus {
    orderId: string;
    status: 'pending' | 'completed' | 'failed';
    amount?: number;
    coinAmount?: number;
    product?: string;
    message?: string;
    verificationMethod?: 'sms_banking' | 'manual' | 'polling' | null;
}

/**
 * Get Firebase ID Token for authentication
 */
async function getAuthToken(): Promise<string> {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
        throw new Error('User not authenticated');
    }

    return await user.getIdToken(false);
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await getAuthToken();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseText = await response.text();
        let data: any;
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
            console.error('[VIETQR] JSON parse error:', responseText);
            throw new Error('Invalid response format from server');
        }

        if (!response.ok) {
            throw new Error(data.error || `API error: ${response.status}`);
        }

        return data as T;
    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        throw error;
    }
}

/**
 * VietQR Payment Service
 */
export const vietqrPaymentService = {
    /**
     * Create coin purchase payment (VietQR)
     */
    async createCoinPurchase(coinPackage: CoinPackage): Promise<PaymentResult> {
        console.log('🎯 Creating VietQR coin purchase:', coinPackage);

        const result = await apiRequest<PaymentResult>('/vietqr/create-payment', {
            method: 'POST',
            body: JSON.stringify({
                product: 'coin',
                coinPackage,
                productType: 'VIP',
            }),
        });

        console.log('✅ VietQR payment created:', result);
        return result;
    },

    /**
     * Create Pro upgrade payment (VietQR)
     */
    async createProUpgrade(): Promise<PaymentResult> {
        console.log('⭐ Creating VietQR Pro upgrade payment');

        const result = await apiRequest<PaymentResult>('/vietqr/create-payment', {
            method: 'POST',
            body: JSON.stringify({
                product: 'pro_upgrade',
                productType: 'PRO',
            }),
        });

        console.log('✅ VietQR Pro payment created:', result);
        return result;
    },

    /**
     * Verify payment completion
     * User confirms they've transferred the money with the given description
     */
    async verifyPayment(orderId: string, description: string, amount: number): Promise<PaymentStatus> {
        console.log('🔍 Verifying VietQR payment:', { orderId, description, amount });

        const result = await apiRequest<PaymentStatus>('/vietqr/verify-payment', {
            method: 'POST',
            body: JSON.stringify({
                orderId,
                description,
                amount,
            }),
        });

        console.log('✅ Payment verified:', result);
        return result;
    },

    /**
     * Check payment status
     */
    async checkPaymentStatus(orderId: string): Promise<PaymentStatus> {
        console.log('🔍 Checking VietQR payment status:', orderId);

        const result = await apiRequest<PaymentStatus>(`/vietqr/order-status/${orderId}`, {
            method: 'GET',
        });

        return result;
    },

    /**
     * Get current Pro status
     */
    async getProStatus(): Promise<any> {
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) throw new Error('Not authenticated');

            const token = await user.getIdToken();
            const response = await fetch(`${API_BASE_URL}/user/pro-status`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            return response.ok ? await response.json() : null;
        } catch (error) {
            console.error('[VIETQR] Error getting pro status:', error);
            return null;
        }
    },

    /**
     * Report an issue with payment
     */
    async reportIssue(orderId: string, amount: number, description: string): Promise<any> {
        return await apiRequest('/vietqr/report-issue', {
            method: 'POST',
            body: JSON.stringify({
                orderId,
                amount,
                description,
                issueType: 'payment_not_received',
                message: 'User reported: Payment transferred but not received automaticaly',
            }),
        });
    },
};

/**
 * Helper function to format payment description for display
 */
export function formatPaymentDescription(description: string): string {
    return description.replace(/_/g, ' ');
}

/**
 * Helper function to get error message from API response
 */
export function getPaymentErrorMessage(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.error) return error.error;
    return 'Có lỗi xảy ra. Vui lòng thử lại.';
}

/**
 * Start real-time listener for payment status via Firestore
 * Detects when SMS Banking app confirms payment
 */
export function startRealTimePaymentListener(
    orderId: string,
    uid: string,
    onStatusChange: (status: PaymentStatus) => void,
    onComplete: (status: PaymentStatus) => void,
    onError: (error: string) => void,
    maxDuration: number = 10 * 60 * 1000 // 10 minutes
) {
    try {
        // Import Firestore
        const { getFirestore, doc, onSnapshot } = require('firebase/firestore');
        const db = getFirestore();

        let unsubscribe: any = null;
        let completed = false;
        let timeoutId: any = null;

        // Set up real-time listener
        const orderRef = doc(db, `users/${uid}/orders/${orderId}`);
        unsubscribe = onSnapshot(orderRef, (snapshot: any) => {
            if (!completed && snapshot.exists()) {
                const orderData = snapshot.data();
                console.log('[VIETQR Real-time] Order updated:', orderData);

                const status: PaymentStatus = {
                    orderId,
                    status: orderData.status,
                    amount: orderData.amount,
                    coinAmount: orderData.coins,
                    product: orderData.product,
                    message: orderData.message,
                    verificationMethod: orderData.verificationMethod,
                };

                onStatusChange(status);

                // Check if payment completed
                if (orderData.status === 'completed') {
                    completed = true;
                    if (unsubscribe) unsubscribe();
                    if (timeoutId) clearTimeout(timeoutId);

                    if (orderData.verificationMethod === 'sms_banking') {
                        console.log('[VIETQR Real-time] ✅ SMS Banking confirmed!');
                    }
                    onComplete(status);
                }
            }
        }, (error: any) => {
            console.error('[VIETQR Real-time] Listener error:', error);
            if (!completed) {
                onError(`Real-time listener error: ${error.message}`);
            }
        });

        // Timeout after maxDuration
        timeoutId = setTimeout(() => {
            if (!completed) {
                completed = true;
                if (unsubscribe) unsubscribe();
                onError(`Hết thời gian chờ thanh toán (${maxDuration / 60 / 1000} phút)`);
            }
        }, maxDuration);

        // Return controller to stop listener
        return {
            stop: () => {
                completed = true;
                if (unsubscribe) unsubscribe();
                if (timeoutId) clearTimeout(timeoutId);
            },
        };
    } catch (error: any) {
        console.error('[VIETQR Real-time] Setup error:', error);
        onError('Setup listener failed');
        return { stop: () => { } };
    }
}

/**
 * Start polling for payment status - call this from VietQRPaymentModal
 * Returns polling controller with stop method
 */
export function startPaymentPolling(
    orderId: string,
    onStatusChange: (status: PaymentStatus) => void,
    onComplete: (status: PaymentStatus) => void,
    onError: (error: string) => void,
    pollInterval: number = 3000, // 3 seconds
    maxDuration: number = 10 * 60 * 1000 // 10 minutes
) {
    let pollCount = 0;
    let completed = false;

    const pollInterval_id = setInterval(async () => {
        if (completed) {
            clearInterval(pollInterval_id);
            return;
        }

        try {
            const status = await vietqrPaymentService.checkPaymentStatus(orderId);

            console.log('[VIETQR Polling] Status:', status);
            onStatusChange(status);

            // Check if payment completed
            if (status.status === 'completed') {
                completed = true;
                clearInterval(pollInterval_id);
                onComplete(status);
            }

            pollCount++;
        } catch (error: any) {
            console.error('[VIETQR Polling] Error:', error);
            onStatusChange({
                orderId,
                status: 'pending',
                message: `Check ${pollCount + 1}...`,
            } as PaymentStatus);
        }
    }, pollInterval);

    // Timeout after maxDuration
    const timeout = setTimeout(() => {
        if (!completed) {
            completed = true;
            clearInterval(pollInterval_id);
            onError(`Hết thời gian chờ thanh toán (${maxDuration / 60 / 1000} phút)`);
        }
    }, maxDuration);

    // Return controller to stop polling manually
    return {
        stop: () => {
            completed = true;
            clearInterval(pollInterval_id);
            clearTimeout(timeout);
        },
    };
}

export default vietqrPaymentService;
