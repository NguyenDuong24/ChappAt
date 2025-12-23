import { getAuth } from 'firebase/auth';

// Server URL
const API_BASE_URL = 'https://saigondating-server.onrender.com/api';

// Fetch VideoSDK token from server
const getToken = async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      console.warn('User not authenticated for VideoSDK token');
      throw new Error("User not authenticated");
    }

    const idToken = await user.getIdToken();
    const response = await fetch(`${API_BASE_URL}/videosdk/token`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to get token');
    }
    return data.token;
  } catch (error) {
    console.error("Error fetching VideoSDK token:", error);
    throw error;
  }
};

// API call to create meeting following VideoSDK guide
const createMeeting = async ({ token }) => {
  try {
    const res = await fetch(`https://api.videosdk.live/v2/rooms`, {
      method: "POST",
      headers: {
        authorization: `${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    return data.roomId;
  } catch (error) {
    console.error("Error creating meeting:", error);
    throw error;
  }
};

// Screen constants
const SCREEN_NAMES = {
  Join: "JoinScreen",
  Meeting: "MeetingScreen",
  Call: "CallScreen",
};

export { getToken, createMeeting, SCREEN_NAMES };