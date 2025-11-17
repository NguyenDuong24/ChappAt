import { getAuth } from 'firebase/auth';

// Cấu hình URL server
const API_BASE_URL = 'https://saigondating-server.onrender.com/api';  // Use Render production URL

/**
 * Get Firebase ID Token for authentication
 */
async function getAuthToken() {
  console.log('🔐 Getting Firebase auth token...');
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) {
    console.error('❌ No authenticated user found');
    throw new Error('User not authenticated');
  }
  
  console.log('👤 User found:', {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
  });
  
  try {
    const token = await user.getIdToken(false); // false = use cached token if valid
    console.log('✅ Token obtained successfully, length:', token.length);
    return token;
  } catch (error) {
    console.error('❌ Error getting auth token:', error);
    throw error;
  }
}

/**
 * Make authenticated API request
 */
async function apiRequest(endpoint, options = {}) {
  console.log('🔵 [API REQUEST START]', {
    endpoint,
    fullUrl: `${API_BASE_URL}${endpoint}`,
    method: options.method || 'GET',
    hasBody: !!options.body,
  });

  try {
    console.log('🔑 Getting auth token...');
    const token = await getAuthToken();
    console.log('✅ Auth token received:', token.substring(0, 20) + '...');
    
    const requestUrl = `${API_BASE_URL}${endpoint}`;
    const requestOptions = {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    console.log('📡 Sending request to:', requestUrl);
    console.log('📦 Request options:', {
      method: requestOptions.method,
      headers: Object.keys(requestOptions.headers),
      bodyLength: requestOptions.body?.length || 0,
    });

    const response = await fetch(requestUrl, requestOptions);
    
    console.log('📥 Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    });

    const data = await response.json();
    console.log('📄 Response data:', data);

    if (!response.ok) {
      console.error('❌ Request failed:', {
        status: response.status,
        error: data.error,
        code: data.code,
        details: data.details,
      });
      throw {
        status: response.status,
        message: data.error || 'Request failed',
        code: data.code,
        details: data.details,
      };
    }

    console.log('✅ [API REQUEST SUCCESS]');
    return data;
  } catch (error) {
    console.error('❌ [API REQUEST FAILED]', {
      endpoint,
      error: error,
      errorType: error.constructor.name,
      message: error.message,
      stack: error.stack?.split('\n')[0],
    });
    throw error;
  }
}

/**
 * Coin Server API Service
 */
export const coinServerApi = {
  // ============== WALLET ==============
  
  /**
   * Get user's coin balance
   * @returns {Promise<{success: boolean, coins: number, uid: string}>}
   */
  async getBalance() {
    return await apiRequest('/wallet/balance', {
      method: 'GET',
    });
  },

  /**
   * Top up coins
   * @param {number} amount - Amount to add (1-1000)
   * @param {object} metadata - Optional metadata
   * @returns {Promise<{success: boolean, amount: number, newBalance: number, transactionId: string}>}
   */
  async topup(amount, metadata = {}) {
    return await apiRequest('/wallet/topup', {
      method: 'POST',
      body: JSON.stringify({ amount, metadata }),
    });
  },

  /**
   * Spend coins
   * @param {number} amount - Amount to spend (1-5000)
   * @param {object} metadata - Optional metadata
   * @returns {Promise<{success: boolean, amount: number, newBalance: number, transactionId: string}>}
   */
  async spend(amount, metadata = {}) {
    return await apiRequest('/wallet/spend', {
      method: 'POST',
      body: JSON.stringify({ amount, metadata }),
    });
  },

  /**
   * Get transaction history
   * @param {number} limit - Number of transactions to fetch
   * @param {number} offset - Offset for pagination
   * @returns {Promise<{success: boolean, transactions: Array, count: number}>}
   */
  async getTransactions(limit = 50, offset = 0) {
    return await apiRequest(`/wallet/transactions?limit=${limit}&offset=${offset}`, {
      method: 'GET',
    });
  },

  /**
   * Reward user with coins for watching an ad
   * @param {string} adId - Ad ID for verification
   * @param {object} metadata - Optional metadata
   * @returns {Promise<{success: boolean, amount: number, newBalance: number, transactionId: string}>}
   */
  async reward(adId, metadata = {}) {
    return await apiRequest('/wallet/reward', {
      method: 'POST',
      body: JSON.stringify({ adId, metadata }),
    });
  },

  // ============== GIFTS ==============

  /**
   * Send a gift to another user
   * @param {string} receiverUid - Receiver's user ID
   * @param {string} roomId - Chat room ID
   * @param {string} giftId - Gift ID
   * @param {string} senderName - Sender's display name
   * @returns {Promise<{success: boolean, gift: object, messageId: string, receiptId: string, newBalance: number}>}
   */
  async sendGift(receiverUid, roomId, giftId, senderName) {
    console.log('🎁 [SEND GIFT] Called with params:', {
      receiverUid,
      roomId,
      giftId,
      senderName,
    });
    
    const requestBody = { receiverUid, roomId, giftId, senderName };
    console.log('📦 Request body:', requestBody);
    console.log('📦 Request body JSON:', JSON.stringify(requestBody));
    
    try {
      const result = await apiRequest('/gifts/send', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
      console.log('✅ [SEND GIFT] Success:', result);
      return result;
    } catch (error) {
      console.error('❌ [SEND GIFT] Failed:', error);
      throw error;
    }
  },

  /**
   * Redeem a received gift for coins
   * @param {string} receiptId - Gift receipt ID
   * @param {number} rate - Redemption rate (0-1), default 1 = 100%
   * @returns {Promise<{success: boolean, redeemValue: number, newBalance: number}>}
   */
  async redeemGift(receiptId, rate = 1) {
    return await apiRequest('/gifts/redeem', {
      method: 'POST',
      body: JSON.stringify({ receiptId, rate }),
    });
  },

  /**
   * Get received gifts
   * @param {number} limit - Number of gifts to fetch
   * @param {string} status - Filter by status ('unread', 'read', or undefined for all)
   * @returns {Promise<{success: boolean, gifts: Array, count: number}>}
   */
  async getReceivedGifts(limit = 50, status = undefined) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (status) params.append('status', status);
    
    return await apiRequest(`/gifts/received?${params.toString()}`, {
      method: 'GET',
    });
  },

  /**
   * Get gift catalog
   * @returns {Promise<{success: boolean, gifts: Array, count: number}>}
   */
  async getGiftCatalog() {
    return await apiRequest('/gifts/catalog', {
      method: 'GET',
    });
  },

  // ============== SHOP ==============

  /**
   * Get all shop items
   * @returns {Promise<{success: boolean, items: Array, count: number}>}
   */
  async getShopItems() {
    return await apiRequest('/shop/items', {
      method: 'GET',
    });
  },

  /**
   * Get a specific shop item
   * @param {string} itemId - Item ID
   * @returns {Promise<{success: boolean, item: object}>}
   */
  async getShopItem(itemId) {
    return await apiRequest(`/shop/items/${itemId}`, {
      method: 'GET',
    });
  },

  /**
   * Purchase an item from the shop
   * @param {string} itemId - Item ID to purchase
   * @returns {Promise<{success: boolean, itemId: string, itemName: string, price: number, newBalance: number}>}
   */
  async purchaseItem(itemId) {
    return await apiRequest('/shop/purchase', {
      method: 'POST',
      body: JSON.stringify({ itemId }),
    });
  },

  /**
   * Get user's purchased items
   * @returns {Promise<{success: boolean, items: Array, count: number}>}
   */
  async getMyItems() {
    return await apiRequest('/shop/my-items', {
      method: 'GET',
    });
  },
};

/**
 * Helper function to handle API errors
 * @param {Error} error 
 * @returns {string} User-friendly error message
 */
export function getErrorMessage(error) {
  if (typeof error === 'string') return error;
  
  if (error.code) {
    switch (error.code) {
      case 'AUTH_REQUIRED':
      case 'AUTH_FAILED':
      case 'TOKEN_EXPIRED':
        return 'Vui lòng đăng nhập lại';
      case 'INSUFFICIENT_FUNDS':
        return 'Không đủ coin';
      case 'RATE_LIMIT_EXCEEDED':
        return 'Bạn đã thực hiện quá nhiều lần, vui lòng thử lại sau';
      case 'COIN_LIMIT_EXCEEDED':
        return 'Đã đạt giới hạn coin tối đa';
      case 'GIFT_NOT_FOUND':
        return 'Quà không tồn tại';
      case 'ITEM_NOT_FOUND':
        return 'Sản phẩm không tồn tại';
      case 'CANNOT_GIFT_SELF':
        return 'Không thể tự tặng quà cho mình';
      case 'ALREADY_REDEEMED':
        return 'Quà đã được đổi rồi';
      case 'GIFT_INACTIVE':
      case 'ITEM_INACTIVE':
        return 'Sản phẩm không còn khả dụng';
      default:
        return error.message || 'Đã có lỗi xảy ra';
    }
  }
  
  return error.message || 'Đã có lỗi xảy ra';
}

export default coinServerApi;
