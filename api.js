import { getAuth } from 'firebase/auth';

const API_BASE_URL = (
  process.env.EXPO_PUBLIC_SAIGON_SERVER_API_URL ||
  'https://saigonmatch.com.vn/api'
).replace(/\/$/, '');

// Kept for backward compatibility with old call sites. Room creation no longer
// uses a public VideoSDK token from EXPO_PUBLIC_*.
export const token = null;

function createRequestId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

async function getAuthToken() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.getIdToken(false);
}

async function videosdkRequest(endpoint, options = {}) {
  const idToken = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${idToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const responseText = await response.text();
  let data = {};
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = { success: response.ok, rawResponse: responseText };
  }

  if (!response.ok) {
    // Always log full details so developers can diagnose issues
    console.log(`[api] videosdkRequest FAILED: ${response.status} ${endpoint}`, {
      code: data?.code,
      error: data?.error,
      details: data?.details,
      videosdkBody: data?.details?.videosdkBody,
      rawResponse: typeof data?.rawResponse === 'string' ? data.rawResponse.slice(0, 300) : undefined,
    });

    const isVideoSdkConfigError = data?.code === 'VIDEOSDK_KEYS_MISSING' ||
      (typeof data?.error === 'string' && data.error.includes('VideoSDK keys are not configured'));

    let message;
    if (isVideoSdkConfigError) {
      message = 'Máy chủ chưa cấu hình VideoSDK. Vui lòng thêm VIDEOSDK_API_KEY và VIDEOSDK_SECRET_KEY vào backend rồi redeploy.';
    } else if (data?.code === 'VIDEOSDK_UPSTREAM_ERROR') {
      // Forward the VideoSDK-specific info for better client-side error message
      message = data?.error || `Video call request failed (${response.status})`;
    } else {
      message = data?.error || `Video call request failed (${response.status})`;
    }

    const error = new Error(message);
    error.status = response.status;
    error.code = data?.code;
    error.details = data?.details;
    throw error;
  }

  return data;
}

// Helper to get a scoped join token from the server.
export const getToken = async (roomId) => {
  if (!roomId || typeof roomId !== 'string') {
    throw new Error('roomId is required for a scoped VideoSDK token');
  }

  const data = await videosdkRequest(`/videosdk/token?roomId=${encodeURIComponent(roomId)}`);
  return data.token;
};

// API call to create a VideoSDK meeting on the server.
export const createMeeting = async ({ receiverId, callType, metadata, idempotencyKey } = {}) => {
  try {
    const data = await createCallRoom({
      receiverId,
      callType,
      metadata,
      idempotencyKey,
    });
    return data.roomId || data.meetingId;
  } catch (error) {
    console.error("Error creating meeting:", error);
    throw error;
  }
};

export const createCallRoom = async ({ receiverId, callType, metadata, idempotencyKey } = {}) => {
  return videosdkRequest('/videosdk/rooms', {
    method: 'POST',
    headers: {
      'X-Idempotency-Key': idempotencyKey || createRequestId(),
    },
    body: JSON.stringify({
      receiverId,
      callType,
      metadata,
    }),
  });
};

export const SCREEN_NAMES = {
  Home: "homescreen",
  Meeting: "meetingscreen",
};
