import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

// Lắng nghe trạng thái cuộc gọi
export const listenForIncomingCall = (userId, onCallReceived) => {
  const callDocRef = doc(db, "calls", userId);
  return onSnapshot(callDocRef, (snapshot) => {
    if (snapshot.exists()) {
      const callData = snapshot.data();
      if (callData.status === "ringing") {
        onCallReceived(callData);
      }
    }
  });
};

// Cập nhật trạng thái cuộc gọi
export const updateCallStatus = async (userId, status) => {
  const callDocRef = doc(db, "calls", userId);
  await updateDoc(callDocRef, { status });
};

// Tạo hoặc khởi động cuộc gọi
export const createCall = async (callerId, receiverId, meetingId) => {
  const callDocRef = doc(db, "calls", receiverId);
  await setDoc(callDocRef, {
    callerId,
    meetingId,
    status: "ringing",
  });
};
