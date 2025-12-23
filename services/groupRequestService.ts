import { db } from '@/firebaseConfig';
import {
    doc,
    setDoc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    deleteDoc,
    serverTimestamp,
    updateDoc,
    arrayUnion
} from 'firebase/firestore';
import { GroupRole } from '@/types/groupPermissions';

export interface JoinRequest {
    uid: string;
    displayName: string;
    photoURL: string;
    requestedAt: any;
    status: 'pending' | 'approved' | 'rejected';
}

export const groupRequestService = {
    // Gửi yêu cầu tham gia nhóm
    sendJoinRequest: async (groupId: string, user: any) => {
        try {
            const requestRef = doc(db, 'groups', groupId, 'joinRequests', user.uid);

            // Kiểm tra xem đã có request chưa
            const requestDoc = await getDoc(requestRef);
            if (requestDoc.exists()) {
                return { success: false, message: 'Bạn đã gửi yêu cầu tham gia nhóm này rồi.' };
            }

            await setDoc(requestRef, {
                uid: user.uid,
                displayName: user.displayName || user.username || 'Người dùng',
                photoURL: user.photoURL || user.profileUrl || '',
                requestedAt: serverTimestamp(),
                status: 'pending'
            });

            return { success: true, message: 'Đã gửi yêu cầu tham gia nhóm.' };
        } catch (error) {
            console.error('Error sending join request:', error);
            return { success: false, message: 'Lỗi khi gửi yêu cầu.' };
        }
    },

    // Kiểm tra trạng thái yêu cầu của user
    checkRequestStatus: async (groupId: string, userId: string) => {
        try {
            const requestRef = doc(db, 'groups', groupId, 'joinRequests', userId);
            const requestDoc = await getDoc(requestRef);

            if (requestDoc.exists()) {
                return { exists: true, data: requestDoc.data() as JoinRequest };
            }
            return { exists: false, data: null };
        } catch (error) {
            console.error('Error checking request status:', error);
            return { exists: false, data: null };
        }
    },

    // Lấy danh sách yêu cầu đang chờ (cho admin)
    getPendingRequests: async (groupId: string) => {
        try {
            const requestsRef = collection(db, 'groups', groupId, 'joinRequests');
            const q = query(requestsRef, where('status', '==', 'pending'));
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                ...doc.data()
            })) as JoinRequest[];
        } catch (error) {
            console.error('Error getting pending requests:', error);
            return [];
        }
    },

    // Duyệt yêu cầu
    approveRequest: async (groupId: string, userId: string, adminId: string) => {
        try {
            // 1. Thêm user vào members của nhóm
            const groupRef = doc(db, 'groups', groupId);

            // Lấy data hiện tại để update memberRoles
            const groupDoc = await getDoc(groupRef);
            if (!groupDoc.exists()) return { success: false, message: 'Nhóm không tồn tại' };

            const memberRoles = groupDoc.data().memberRoles || {};
            memberRoles[userId] = GroupRole.NEWBIE; // Mặc định là newbie

            await updateDoc(groupRef, {
                members: arrayUnion(userId),
                memberRoles: memberRoles,
                updatedAt: serverTimestamp()
            });

            // 2. Xóa request (hoặc update status thành approved)
            // Ở đây ta xóa luôn để gọn data, hoặc có thể giữ lại làm lịch sử
            const requestRef = doc(db, 'groups', groupId, 'joinRequests', userId);
            await deleteDoc(requestRef);

            return { success: true, message: 'Đã duyệt thành viên vào nhóm.' };
        } catch (error) {
            console.error('Error approving request:', error);
            return { success: false, message: 'Lỗi khi duyệt yêu cầu.' };
        }
    },

    // Từ chối yêu cầu
    rejectRequest: async (groupId: string, userId: string) => {
        try {
            const requestRef = doc(db, 'groups', groupId, 'joinRequests', userId);
            await deleteDoc(requestRef);
            return { success: true, message: 'Đã từ chối yêu cầu.' };
        } catch (error) {
            console.error('Error rejecting request:', error);
            return { success: false, message: 'Lỗi khi từ chối yêu cầu.' };
        }
    }
};
