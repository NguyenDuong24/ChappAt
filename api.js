export const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlrZXkiOiI2MGI3ZDBjNC0yNjRkLTQ1MTMtOGJkOC0zZjFkMjcwODNkNmUiLCJwZXJtaXNzaW9ucyI6WyJhbGxvd19qb2luIl0sImlhdCI6MTc1MDQ5NzUyMiwiZXhwIjoxOTA4Mjg1NTIyfQ.btW8APdZpxZ7sfbsmVssxSRgTWZQOqonPbMKeiyP-N0";
// API call to create meeting
export const createMeeting = async ({ token }) => {
  const res = await fetch(`https://api.videosdk.live/v2/rooms`, {
    method: "POST",
    headers: {
      authorization: `${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const { roomId } = await res.json();
  return roomId;
};

export const SCREEN_NAMES = {
  Home: "homescreen",
  Meeting: "meetingscreen",
};