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
export const calculateAge = (timestamp: { seconds: number; nanoseconds: number }) => {
  if (!timestamp || !timestamp.seconds) {
    return null; // Return null if timestamp is not valid
  }

  const birthDate = new Date(timestamp.seconds * 1000);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const convertTimestampToDate = (timestamp) => {
  if (!timestamp || !timestamp.seconds) {
      return null; // Return null if timestamp is not valid
  }

  // Chuyển đổi timestamp thành đối tượng Date
  const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
  
  // Trả về chuỗi theo định dạng ISO 8601
  return date.toISOString(); // Ví dụ: "2024-10-30T05:52:21.000Z"
};


  