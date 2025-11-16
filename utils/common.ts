export const formatTime = (timestamp: any) => {
  if (!timestamp) return '';
  let date;
  try {
    date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  } catch {
    date = new Date(timestamp);
  }
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
  return date.toLocaleDateString('vi-VN');
};

// NEW: detailed time formatter (parity with utils/common.js)
export const formatDetailedTime = (timestamp: any): string => {
  if (!timestamp) return '';
  let date: Date;
  try {
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (typeof timestamp.seconds === 'number') {
      date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1_000_000);
    } else {
      date = new Date(timestamp);
    }
  } catch {
    date = new Date(timestamp);
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const daysDiff = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hh}:${mm}`;

  if (daysDiff === 0) return `Hôm nay ${timeStr}`;
  if (daysDiff === 1) return `Hôm qua ${timeStr}`;
  if (daysDiff < 7) {
    const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    return `${days[date.getDay()]} ${timeStr}`;
  }
  const dd = date.getDate().toString().padStart(2, '0');
  const mm2 = (date.getMonth() + 1).toString().padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm2}/${yyyy} ${timeStr}`;
};

export const truncateText = (text: string, maxLength: number) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileType = (filename: string) => {
  if (!filename) return 'unknown';
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return 'unknown';
  
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const videoTypes = ['mp4', 'mov', 'avi', 'webm'];
  const audioTypes = ['mp3', 'wav', 'ogg', 'm4a'];
  const documentTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'];
  
  if (imageTypes.includes(ext)) return 'image';
  if (videoTypes.includes(ext)) return 'video';
  if (audioTypes.includes(ext)) return 'audio';
  if (documentTypes.includes(ext)) return 'document';
  return 'other';
};

export const getRoomId = (userId1: string, userId2: string) => {
    const sortedIds = [userId1, userId2].sort();
    const roomId = sortedIds.join('-');
    return roomId;
};

export const convertTimestampToDate = (timestamp: any): string | null => {
  if (!timestamp) return null;
  if (timestamp.toDate) {
    return timestamp.toDate().toISOString();
  }
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000).toISOString();
  }
  // fallback for ISO string or Date
  try {
    return new Date(timestamp).toISOString();
  } catch {
    return null;
  }
};
