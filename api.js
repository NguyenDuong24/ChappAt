// Token from environment variables
export const token = process.env.EXPO_PUBLIC_VIDEOSDK_TOKEN;

// Helper to get token (for compatibility with Context)
export const getToken = async () => {
  return token;
};

// API call to create meeting
export const createMeeting = async ({ token }) => {
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
      const errorText = await res.text();
      throw new Error(`HTTP error! status: ${res.status}, body: ${errorText}`);
    }

    const data = await res.json();
    return data.roomId;
  } catch (error) {
    console.error("Error creating meeting:", error);
    throw error;
  }
};

export const SCREEN_NAMES = {
  Home: "homescreen",
  Meeting: "meetingscreen",
};