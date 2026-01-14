/**
 * API Service for Admin Web
 * Central HTTP client for communicating with saigondating-server
 */

import { auth } from '../firebaseConfig';

// Configurable base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Get Firebase ID token for authenticated requests
 */
async function getAuthToken(): Promise<string> {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('Not authenticated');
    }

    try {
        const token = await user.getIdToken();
        return token;
    } catch (error) {
        console.error('Error getting auth token:', error);
        throw error;
    }
}

/**
 * Make authenticated HTTP request
 */
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    try {
        const token = await getAuthToken();

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw {
                status: response.status,
                code: data.code,
                message: data.error || data.message || 'Request failed',
                details: data.details,
            };
        }

        return data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// ============== ADMIN WALLET API ==============

export interface WalletStats {
    totalCoins: number;
    totalBanhMi: number;
    userCount: number;
    transactions: {
        daily: number;
        weekly: number;
    };
    timestamp: string;
}

export interface Transaction {
    id: string;
    userId: string;
    type: string;
    amount: number;
    currencyType: 'coins' | 'banhMi';
    timestamp: string;
    [key: string]: any;
}

export interface TransactionFilters {
    limit?: number;
    userId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
}

export async function getWalletStats(): Promise<WalletStats> {
    const response = await apiRequest<{ success: boolean; stats: WalletStats }>('/admin/wallet/stats');
    return response.stats;
}

export async function getTransactions(filters: TransactionFilters = {}): Promise<Transaction[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            params.append(key, String(value));
        }
    });

    const response = await apiRequest<{ success: boolean; transactions: Transaction[] }>(
        `/admin/transactions?${params.toString()}`
    );
    return response.transactions;
}

export async function adjustUserBalance(
    userId: string,
    amount: number,
    currencyType: 'coins' | 'banhMi',
    reason?: string
): Promise<void> {
    await apiRequest('/admin/wallet/adjust', {
        method: 'POST',
        body: JSON.stringify({ userId, amount, currencyType, reason }),
    });
}

// ============== ADMIN USER API ==============

export async function banUser(userId: string, reason?: string): Promise<void> {
    await apiRequest(`/admin/users/${userId}/ban`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    });
}

export async function unbanUser(userId: string): Promise<void> {
    await apiRequest(`/admin/users/${userId}/unban`, {
        method: 'POST',
    });
}

// ============== AD SETTINGS ==============

export interface AdSettings {
    rewardAmount: number;
    dailyLimit: number;
    enabled: boolean;
    updatedAt?: string;
}

export async function getAdSettings(): Promise<AdSettings> {
    const response = await apiRequest<{ success: boolean; settings: AdSettings }>('/admin/settings/ads');
    return response.settings;
}

export async function updateAdSettings(settings: AdSettings): Promise<void> {
    await apiRequest('/admin/settings/ads', {
        method: 'PUT',
        body: JSON.stringify(settings),
    });
}

// ============== SHOP MANAGEMENT ==============

export interface ShopItem {
    id: string;
    name: string;
    price: number;
    currencyType: 'coins' | 'banhMi';
    emoji: string;
    description: string;
    category?: string;
    active: boolean;
    createdAt?: string;
    frameType?: string;
}

export async function getShopItems(): Promise<ShopItem[]> {
    const response = await apiRequest<{ success: boolean; items: ShopItem[] }>('/admin/shop/items');
    return response.items;
}

export async function createShopItem(item: ShopItem): Promise<void> {
    await apiRequest('/admin/shop/items', {
        method: 'POST',
        body: JSON.stringify(item),
    });
}

export async function updateShopItem(id: string, item: Partial<ShopItem>): Promise<void> {
    await apiRequest(`/admin/shop/items/${id}`, {
        method: 'PUT',
        body: JSON.stringify(item),
    });
}

export async function deleteShopItem(id: string): Promise<void> {
    await apiRequest(`/admin/shop/items/${id}`, {
        method: 'DELETE',
    });
}

// ============== GIFT MANAGEMENT ==============

export interface GiftItem {
    id: string;
    name: string;
    price: number;
    currencyType: 'coins' | 'banhMi';
    icon: string;
    active: boolean;
    createdAt?: string;
}

export async function getGifts(): Promise<GiftItem[]> {
    const response = await apiRequest<{ success: boolean; gifts: GiftItem[] }>('/admin/gifts');
    return response.gifts;
}

export async function createGift(gift: GiftItem): Promise<void> {
    await apiRequest('/admin/gifts', {
        method: 'POST',
        body: JSON.stringify(gift),
    });
}

export async function updateGift(id: string, gift: Partial<GiftItem>): Promise<void> {
    await apiRequest(`/admin/gifts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(gift),
    });
}

export async function deleteGift(id: string): Promise<void> {
    await apiRequest(`/admin/gifts/${id}`, {
        method: 'DELETE',
    });
}

// Error handler helper
export function getErrorMessage(error: any): string {
    if (typeof error === 'string') return error;

    if (error.code) {
        switch (error.code) {
            case 'AUTH_REQUIRED':
            case 'TOKEN_EXPIRED':
                return 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.';
            case 'ADMIN_REQUIRED':
                return 'Bạn không có quyền truy cập tính năng này.';
            case 'SERVER_ERROR':
                return 'Lỗi server. Vui lòng thử lại sau.';
            default:
                return error.message || 'Đã có lỗi xảy ra';
        }
    }

    if (error.status === 403) {
        return 'Bạn không có quyền admin';
    }

    if (error.status === 401) {
        return 'Vui lòng đăng nhập lại';
    }

    return error.message || 'Đã có lỗi xảy ra';
}
