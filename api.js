// VideoSDK Configuration - Update this token from your VideoSDK Dashboard
export const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlrZXkiOiI2MGI3ZDBjNC0yNjRkLTQ1MTMtOGJkOC0zZjFkMjcwODNkNmUiLCJwZXJtaXNzaW9ucyI6WyJhbGxvd19qb2luIl0sImlhdCI6MTc1MDQ5NzUyMiwiZXhwIjoxOTA4Mjg1NTIyfQ.btW8APdZpxZ7sfbsmVssxSRgTWZQOqonPbMKeiyP-N0";

// API call to create meeting following VideoSDK guide
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
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    
    return data.roomId;
  } catch (error) {
    throw error;
  }
};

// Screen constants
export const SCREEN_NAMES = {
  Join: "JoinScreen",
  Meeting: "MeetingScreen",
  Call: "CallScreen",
};