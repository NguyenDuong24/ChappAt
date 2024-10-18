export const getRoomId = (userId1, userId2) =>{
    const sortedIds = [userId1,userId2].sort();
    const roomId = sortedIds.join('-');
    return roomId;
}

export function formatTime(timestamp) {
    if (!timestamp || !timestamp.seconds) {
      return '';
    }
  
    const messageDate = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    const currentDate = new Date();
  
    const isToday = messageDate.getDate() === currentDate.getDate() &&
                    messageDate.getMonth() === currentDate.getMonth() &&
                    messageDate.getFullYear() === currentDate.getFullYear();
  
    if (isToday) {
      const hours = messageDate.getHours().toString().padStart(2, '0');
      const minutes = messageDate.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } else {
      const day = messageDate.getDate().toString().padStart(2, '0');
      const month = (messageDate.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-based
      return `${day}/${month}`;
    }
  }
  