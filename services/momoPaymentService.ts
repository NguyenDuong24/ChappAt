/**
 * MoMo Payment Service
 * Xử lý thanh toán MoMo cho nạp coin và nâng cấp Pro
 */

import { Linking, Platform } from 'react-native';
import { getAuth } from 'firebase/auth';

// Cấu hình URL server
const API_BASE_URL = 'https://saigonmatch.com.vn/api';

// Các gói coin có sẵn (giá test nhỏ - tối thiểu 1000đ theo MoMo)
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
    payUrl?: string;
    deeplink?: string;
    qrCodeUrl?: string;
    message?: string;
}

export interface PaymentStatus {
    orderId: string;
    status: 'pending' | 'success' | 'failed' | 'cancelled';
    amount?: number;
    coinAmount?: number;
    message?: string;
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
            data = { error: responseText || 'Invalid JSON response' };
        }

        if (!response.ok) {
            throw {
                status: response.status,
                message: data.error || 'Request failed',
                code: data.code,
                detail: data.detail,
                momoResultCode: data.momoResultCode,
            };
        }

        return data;
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Kết nối quá hạn, vui lòng kiểm tra mạng');
        }
        throw error;
    }
}

/**
 * MoMo Payment Service
 */
export const momoPaymentService = {
    /**
     * Tạo thanh toán mua coin
     */
    async createCoinPurchase(coinPackage: CoinPackage): Promise<PaymentResult> {
        console.log('💰 Creating coin purchase:', coinPackage);

        const result = await apiRequest<PaymentResult>('/momo/create-payment', {
            method: 'POST',
            body: JSON.stringify({
                amount: coinPackage.price,
                orderInfo: `Nap ${coinPackage.coins} Coin SaiGon Match`,
                purchaseType: 'coin',
                coinAmount: coinPackage.coins + (coinPackage.bonus || 0),
                packageId: coinPackage.id,
            }),
        });

        return result;
    },

    /**
     * Tạo thanh toán nâng cấp Pro
     */
    async createProUpgrade(): Promise<PaymentResult> {
        console.log('⭐ Creating Pro upgrade payment');

        const result = await apiRequest<PaymentResult>('/momo/create-payment', {
            method: 'POST',
            body: JSON.stringify({
                amount: PRO_PACKAGE.price,
                orderInfo: 'Nang cap Pro SaiGon Match - 1 Thang',
                purchaseType: 'pro',
                duration: PRO_PACKAGE.duration,
                packageId: PRO_PACKAGE.id,
            }),
        });

        return result;
    },

    /**
     * Kiểm tra trạng thái thanh toán
     */
    async checkPaymentStatus(orderId: string): Promise<PaymentStatus> {
        console.log('🔍 Checking payment status:', orderId);

        const result = await apiRequest<PaymentStatus>('/momo/check-status', {
            method: 'POST',
            body: JSON.stringify({ orderId }),
        });

        return result;
    },

    /**
     * Mở thanh toán MoMo
     * Ưu tiên: Deep link → Pay URL
     */
    async openPayment(paymentResult: PaymentResult): Promise<boolean> {
        const { deeplink, payUrl } = paymentResult;

        // Tạm thời tắt deeplink để force mở webview (tránh lỗi mở nhầm app MoMo Production)
        // if (deeplink) {
        //     try {
        //         await Linking.openURL(deeplink);
        //         return true;
        //     } catch (error) {
        //         console.warn('Failed to open deeplink:', error);
        //         // Continue to fallback
        //     }
        // }

        // Fallback to web payment
        if (payUrl) {
            await Linking.openURL(payUrl);
            return true;
        }

        throw new Error('Không có phương thức thanh toán khả dụng');
    },

    /**
     * Lấy thông tin Pro status của user
     */
    async getProStatus(): Promise<{
        isPro: boolean;
        proExpiresAt: Date | null;
        daysRemaining: number;
    }> {
        const result = await apiRequest<{
            isPro: boolean;
            proExpiresAt: string | null;
        }>('/user/pro-status', {
            method: 'GET',
        });

        const proExpiresAt = result.proExpiresAt ? new Date(result.proExpiresAt) : null;
        const daysRemaining = proExpiresAt
            ? Math.max(0, Math.ceil((proExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : 0;

        return {
            isPro: result.isPro,
            proExpiresAt,
            daysRemaining,
        };
    },
};

/**
 * Format giá tiền VND
 */
export function formatVND(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(amount);
}

/**
 * Helper function to handle payment errors
 */
export function getPaymentErrorMessage(error: any): string {
    if (typeof error === 'string') return error;

    let message = error.message || 'Đã có lỗi xảy ra';

    if (error.code) {
        switch (error.code) {
            case 'PAYMENT_PENDING':
                return 'Giao dịch đang chờ xử lý';
            case 'PAYMENT_FAILED':
                return 'Thanh toán thất bại';
            case 'PAYMENT_CANCELLED':
                return 'Thanh toán đã bị hủy';
            case 'MOMO_ERROR':
                message = 'Lỗi kết nối MoMo, vui lòng thử lại';
                if (error.momoResultCode !== undefined) {
                    message += ` [Code: ${error.momoResultCode}]`;
                }
                if (error.detail?.message) {
                    message += ` (${error.detail.message})`;
                }
                return message;
            case 'ALREADY_PRO':
                return 'Bạn đã là thành viên Pro';
            default:
                break;
        }
    }

    if (error.status === 404) return 'Không tìm thấy máy chủ (404)';
    if (error.status === 500) return 'Lỗi máy chủ (500)';

    return message;
}

export default momoPaymentService;
