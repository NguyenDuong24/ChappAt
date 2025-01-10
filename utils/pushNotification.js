export const sendCallNotification = async (deviceToken, data) => {
    const message = {
      to: deviceToken,
      notification: {
        title: "Incoming Call",
        body: `${data.callerName} is calling you.`,
      },
      data,
    };
  
    await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        Authorization: `key=YOUR_SERVER_KEY`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
  };
  