import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { HotSpotInvite, MeetupSession, CheckInReward } from '@/types/hotSpotInvites';
import { getDistance } from 'geolib';

const INVITE_EXPIRY_HOURS = 24;
const MEETUP_RADIUS_METERS = 200;
const MEETUP_TIME_WINDOW_MINUTES = 30;

class HotSpotInviteService {
  // Gửi lời mời đi cùng
  async sendInvite(
    senderId: string,
    senderName: string,
    senderAvatar: string | undefined,
    receiverId: string,
    hotSpotId: string,
    hotSpotTitle: string,
    hotSpotLocation: any
  ): Promise<string> {
    try {
      // Kiểm tra không thể tự mời chính mình
      if (senderId === receiverId) {
        throw new Error('Không thể tự mời chính mình');
      }

      // Kiểm tra xem đã có lời mời pending chưa
      const existingInviteId = await this.checkExistingInvite(senderId, receiverId, hotSpotId);
      if (existingInviteId) {
        // Return existing invite ID instead of throwing error (idempotent behavior)
        return existingInviteId;
      }

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + INVITE_EXPIRY_HOURS);

      const inviteData: Omit<HotSpotInvite, 'id'> = {
        hotSpotId,
        hotSpotTitle,
        hotSpotLocation,
        senderId,
        senderName,
        senderAvatar,
        receiverId,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
      };

      const docRef = await addDoc(collection(db, 'hotSpotInvites'), inviteData);

      // Tạo notification
      await this.createInviteNotification(receiverId, senderId, senderName, hotSpotTitle, docRef.id);

      return docRef.id;
    } catch (error) {
      console.error('Error sending invite:', error);
      throw error;
    }
  }

  // Kiểm tra lời mời đã tồn tại
  async checkExistingInvite(senderId: string, receiverId: string, hotSpotId: string): Promise<string | null> {
    const q = query(
      collection(db, 'hotSpotInvites'),
      where('senderId', '==', senderId),
      where('receiverId', '==', receiverId),
      where('hotSpotId', '==', hotSpotId),
      where('status', '==', 'pending')
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].id; // Return the invite ID
    }
    return null;
  }

  // Chấp nhận lời mời
  async acceptInvite(inviteId: string, userId: string): Promise<string> {
    try {
      const inviteRef = doc(db, 'hotSpotInvites', inviteId);
      const inviteSnap = await getDoc(inviteRef);

      if (!inviteSnap.exists()) {
        throw new Error('Lời mời không tồn tại');
      }

      const invite = inviteSnap.data() as HotSpotInvite;

      if (invite.receiverId !== userId) {
        throw new Error('Bạn không có quyền chấp nhận lời mời này');
      }

      if (invite.status !== 'pending') {
        throw new Error('Lời mời đã được xử lý');
      }

      // Tạo chat room
      const chatRoomId = await this.createHotSpotChatRoom(invite);

      // Cập nhật invite
      await updateDoc(inviteRef, {
        status: 'accepted',
        chatRoomId,
        updatedAt: serverTimestamp(),
      });

      // Tạo notification cho sender
      await this.createAcceptNotification(invite.senderId, userId, invite.hotSpotTitle);

      return chatRoomId;
    } catch (error) {
      console.error('Error accepting invite:', error);
      throw error;
    }
  }

  // Từ chối lời mời
  async declineInvite(inviteId: string, userId: string): Promise<void> {
    try {
      const inviteRef = doc(db, 'hotSpotInvites', inviteId);
      const inviteSnap = await getDoc(inviteRef);

      if (!inviteSnap.exists()) {
        throw new Error('Lời mời không tồn tại');
      }

      const invite = inviteSnap.data() as HotSpotInvite;

      if (invite.receiverId !== userId) {
        throw new Error('Bạn không có quyền từ chối lời mời này');
      }

      await updateDoc(inviteRef, {
        status: 'declined',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error declining invite:', error);
      throw error;
    }
  }

  // Xác nhận đi cùng trong chat
  async confirmGoingTogether(inviteId: string, userId: string): Promise<void> {
    try {
      const inviteRef = doc(db, 'hotSpotInvites', inviteId);
      const inviteSnap = await getDoc(inviteRef);

      if (!inviteSnap.exists()) {
        throw new Error('Lời mời không tồn tại');
      }

      const invite = inviteSnap.data() as HotSpotInvite;

      if (invite.senderId !== userId && invite.receiverId !== userId) {
        throw new Error('Bạn không có quyền xác nhận');
      }

      const isSender = invite.senderId === userId;
      const meetupDetails = invite.meetupDetails || {
        senderConfirmed: false,
        receiverConfirmed: false,
        bothCheckedIn: false,
      };

      if (isSender) {
        meetupDetails.senderConfirmed = true;
      } else {
        meetupDetails.receiverConfirmed = true;
      }

      // Nếu cả hai đã xác nhận, tạo meetup session
      if (meetupDetails.senderConfirmed && meetupDetails.receiverConfirmed) {
        meetupDetails.confirmedAt = serverTimestamp();
        await this.createMeetupSession(invite);

        await updateDoc(inviteRef, {
          status: 'confirmed_going',
          meetupDetails,
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(inviteRef, {
          meetupDetails,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error confirming going together:', error);
      throw error;
    }
  }

  // Tạo meetup session
  async createMeetupSession(invite: HotSpotInvite): Promise<string> {
    try {
      const sessionData: Omit<MeetupSession, 'id'> = {
        hotSpotId: invite.hotSpotId,
        inviteId: invite.id,
        participants: [invite.senderId, invite.receiverId],
        status: 'both_confirmed',
        checkInData: {
          [invite.senderId]: {
            isWithinRadius: false,
          },
          [invite.receiverId]: {
            isWithinRadius: false,
          },
        },
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'meetupSessions'), sessionData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating meetup session:', error);
      throw error;
    }
  }

  // Cập nhật vị trí và kiểm tra proximity
  async updateUserLocation(
    sessionId: string,
    userId: string,
    latitude: number,
    longitude: number,
    hotSpotLocation: { latitude: number; longitude: number }
  ): Promise<{ canCheckIn: boolean; distanceToHotSpot: number; distanceToUser: number | null }> {
    try {
      const sessionRef = doc(db, 'meetupSessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists()) {
        throw new Error('Session không tồn tại');
      }

      const session = sessionSnap.data() as MeetupSession;

      // Tính khoảng cách đến HotSpot
      const distanceToHotSpot = getDistance(
        { latitude, longitude },
        { latitude: hotSpotLocation.latitude, longitude: hotSpotLocation.longitude }
      );

      const isWithinRadius = distanceToHotSpot <= MEETUP_RADIUS_METERS;

      // Cập nhật location data của current user
      const updateData: any = {
        [`checkInData.${userId}.location`]: { latitude, longitude },
        [`checkInData.${userId}.isWithinRadius`]: isWithinRadius,
        updatedAt: serverTimestamp(),
      };

      if (isWithinRadius) {
        updateData[`checkInData.${userId}.checkInTime`] = serverTimestamp();
      }

      await updateDoc(sessionRef, updateData);

      // Lấy data mới nhất để so sánh với person còn lại
      const updatedSessionSnap = await getDoc(sessionRef);
      const updatedSession = updatedSessionSnap.data() as MeetupSession;

      const otherUserId = session.participants.find(id => id !== userId);
      const otherUserLocation = otherUserId ? updatedSession.checkInData[otherUserId]?.location : null;

      let distanceToUser = null;
      if (otherUserLocation) {
        distanceToUser = getDistance(
          { latitude, longitude },
          { latitude: otherUserLocation.latitude, longitude: otherUserLocation.longitude }
        );
      }

      // Kiểm tra điều kiện check-in:
      // 1. Cả hai cùng có mặt trong bán kính HotSpot
      // 2. Cả hai cách nhau dưới 50m
      const bothInRadius = session.participants.every(
        (participantId) => updatedSession.checkInData[participantId]?.isWithinRadius
      );

      const nearEachOther = distanceToUser !== null && distanceToUser <= 50;

      const canCheckIn = bothInRadius && nearEachOther;

      return {
        canCheckIn,
        distanceToHotSpot,
        distanceToUser
      };
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  }

  // Hoàn thành meetup và trao thưởng
  async completeMeetup(sessionId: string): Promise<CheckInReward> {
    try {
      const sessionRef = doc(db, 'meetupSessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists()) {
        throw new Error('Session không tồn tại');
      }

      const session = sessionSnap.data() as MeetupSession;

      if (session.status === 'completed') {
        throw new Error('Meetup đã hoàn thành');
      }

      // Tính thưởng
      const reward: CheckInReward = {
        points: 50,
        badge: 'meetup_master',
        message: '🎉 Chúc mừng! Bạn đã gặp mặt thành công!',
        items: ['special_gift_voucher'],
      };

      // Cập nhật session
      await updateDoc(sessionRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        rewards: reward,
      });

      // Cập nhật invite
      const inviteRef = doc(db, 'hotSpotInvites', session.inviteId);
      await updateDoc(inviteRef, {
        status: 'completed',
        'meetupDetails.bothCheckedIn': true,
        'meetupDetails.meetupTime': serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Trao thưởng cho cả hai người
      const batch = writeBatch(db);
      for (const userId of session.participants) {
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, {
          points: (await getDoc(userRef)).data()?.points || 0 + reward.points,
          totalMeetups: ((await getDoc(userRef)).data()?.totalMeetups || 0) + 1,
        });

        // Tạo notification
        await this.createRewardNotification(userId, reward);
      }

      await batch.commit();

      return reward;
    } catch (error) {
      console.error('Error completing meetup:', error);
      throw error;
    }
  }

  // Lấy danh sách lời mời pending
  async getPendingInvites(userId: string): Promise<HotSpotInvite[]> {
    try {
      const q = query(
        collection(db, 'hotSpotInvites'),
        where('receiverId', '==', userId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as HotSpotInvite));
    } catch (error) {
      console.error('Error getting pending invites:', error);
      return [];
    }
  }

  // Lấy meetup session đang active
  async getActiveMeetupSession(userId: string, hotSpotId: string): Promise<MeetupSession | null> {
    try {
      const q = query(
        collection(db, 'meetupSessions'),
        where('participants', 'array-contains', userId),
        where('hotSpotId', '==', hotSpotId),
        where('status', 'in', ['both_confirmed', 'checking_proximity'])
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as MeetupSession;
    } catch (error) {
      console.error('Error getting active meetup session:', error);
      return null;
    }
  }

  // Helper: Tạo chat room cho HotSpot
  private async createHotSpotChatRoom(invite: HotSpotInvite): Promise<string> {
    const chatRoomData = {
      type: 'hotspot',
      hotSpotId: invite.hotSpotId,
      hotSpotTitle: invite.hotSpotTitle,
      participants: [invite.senderId, invite.receiverId],
      createdAt: serverTimestamp(),
      lastMessage: '',
      lastMessageTime: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'hotSpotChats'), chatRoomData);
    return docRef.id;
  }

  // Helper: Tạo notification
  private async createInviteNotification(
    receiverId: string,
    senderId: string,
    senderName: string,
    hotSpotTitle: string,
    inviteId: string
  ): Promise<void> {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: receiverId,
        type: 'hotspot_invite',
        title: '🔥 Lời mời đi cùng',
        message: `${senderName} rủ bạn đi cùng đến ${hotSpotTitle}`,
        senderId,
        inviteId,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  private async createAcceptNotification(
    receiverId: string,
    senderId: string,
    hotSpotTitle: string
  ): Promise<void> {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: receiverId,
        type: 'hotspot_invite_accepted',
        title: '✅ Lời mời được chấp nhận',
        message: `Bạn bè đã chấp nhận đi cùng đến ${hotSpotTitle}`,
        senderId,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  private async createRewardNotification(userId: string, reward: CheckInReward): Promise<void> {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        type: 'meetup_reward',
        title: '🎁 Phần thưởng',
        message: `${reward.message} Bạn nhận được ${reward.points} điểm!`,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }
}

export default new HotSpotInviteService();
