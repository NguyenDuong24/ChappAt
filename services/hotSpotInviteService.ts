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
  increment,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { HotSpotInvite, MeetupSession, CheckInReward } from '@/types/hotSpotInvites';
import { getDistance } from 'geolib';

const INVITE_EXPIRY_HOURS = 24;
const MEETUP_RADIUS_METERS = 200;
const MEETUP_TIME_WINDOW_MINUTES = 30;
const AUTO_CHECKIN_USER_DISTANCE_METERS = 50;
const MEETUP_DIAMOND_REWARD = 15;

class HotSpotInviteService {
  // Send invite to join Hot Spot
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
      // Prevent inviting self
      if (senderId === receiverId) {
        throw new Error('Cannot invite yourself');
      }

      // Check if pending invite already exists
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

      // Create notification
      await this.createInviteNotification(receiverId, senderId, senderName, hotSpotTitle, docRef.id);

      return docRef.id;
    } catch (error) {
      console.error('Error sending invite:', error);
      throw error;
    }
  }

  // Check invite exists
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

  // Accept invite
  async acceptInvite(inviteId: string, userId: string): Promise<string> {
    try {
      const inviteRef = doc(db, 'hotSpotInvites', inviteId);
      const inviteSnap = await getDoc(inviteRef);

      if (!inviteSnap.exists()) {
        throw new Error('Invite does not exist');
      }

      const invite = inviteSnap.data() as HotSpotInvite;

      if (invite.receiverId !== userId) {
        throw new Error('You do not have permission to accept this invite');
      }

      if (invite.status !== 'pending') {
        throw new Error('Invite has already been processed');
      }

      // Create chat room
      const chatRoomId = await this.createHotSpotChatRoom(invite);

      // Update invite
      await updateDoc(inviteRef, {
        status: 'accepted',
        chatRoomId,
        updatedAt: serverTimestamp(),
      });

      // Notify sender
      await this.createAcceptNotification(invite.senderId, userId, invite.hotSpotTitle);

      return chatRoomId;
    } catch (error) {
      console.error('Error accepting invite:', error);
      throw error;
    }
  }

  // Decline invite
  async declineInvite(inviteId: string, userId: string): Promise<void> {
    try {
      const inviteRef = doc(db, 'hotSpotInvites', inviteId);
      const inviteSnap = await getDoc(inviteRef);

      if (!inviteSnap.exists()) {
        throw new Error('Invite does not exist');
      }

      const invite = inviteSnap.data() as HotSpotInvite;

      if (invite.receiverId !== userId) {
        throw new Error('You do not have permission to decline this invite');
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

  // Confirm going together in chat
  async confirmGoingTogether(inviteId: string, userId: string): Promise<void> {
    try {
      const inviteRef = doc(db, 'hotSpotInvites', inviteId);
      const inviteSnap = await getDoc(inviteRef);

      if (!inviteSnap.exists()) {
        throw new Error('Invite does not exist');
      }

      const invite = inviteSnap.data() as HotSpotInvite;

      if (invite.senderId !== userId && invite.receiverId !== userId) {
        throw new Error('You do not have permission to confirm');
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

      // If both confirmed, create meetup session
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

  // Create meetup session
  async createMeetupSession(invite: HotSpotInvite): Promise<string> {
    try {
      const existingQ = query(
        collection(db, 'meetupSessions'),
        where('inviteId', '==', invite.id)
      );
      const existingSnap = await getDocs(existingQ);
      if (!existingSnap.empty) {
        return existingSnap.docs[0].id;
      }

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

  // Update location and check proximity
  async updateUserLocation(
    sessionId: string,
    userId: string,
    latitude: number,
    longitude: number,
    hotSpotLocation: { latitude: number; longitude: number }
  ): Promise<{ canCheckIn: boolean; autoCheckInEligible: boolean; distanceToHotSpot: number; distanceToUser: number | null }> {
    try {
      const sessionRef = doc(db, 'meetupSessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists()) {
        throw new Error('Session does not exist');
      }

      const session = sessionSnap.data() as MeetupSession;

      // Calculate distance to Hot Spot
      const distanceToHotSpot = getDistance(
        { latitude, longitude },
        { latitude: hotSpotLocation.latitude, longitude: hotSpotLocation.longitude }
      );

      const isWithinRadius = distanceToHotSpot <= MEETUP_RADIUS_METERS;

      // Update current user location
      const updateData: any = {
        [`checkInData.${userId}.location`]: { latitude, longitude },
        [`checkInData.${userId}.isWithinRadius`]: isWithinRadius,
        updatedAt: serverTimestamp(),
      };

      if (isWithinRadius && !session.checkInData?.[userId]?.checkInTime) {
        updateData[`checkInData.${userId}.checkInTime`] = serverTimestamp();
      }

      await updateDoc(sessionRef, updateData);

      // Fetch latest data and compare with other participant
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

      // Auto check-in conditions:
      // 1. Both are within Hot Spot radius
      // 2. Users are within 50m of each other
      const bothInRadius = session.participants.every(
        (participantId) => updatedSession.checkInData[participantId]?.isWithinRadius
      );

      const nearEachOther = distanceToUser !== null && distanceToUser <= AUTO_CHECKIN_USER_DISTANCE_METERS;

      const canCheckIn = bothInRadius && nearEachOther;
      const autoCheckInEligible = canCheckIn && this.isWithinMeetupTimeWindow(updatedSession);

      return {
        canCheckIn,
        autoCheckInEligible,
        distanceToHotSpot,
        distanceToUser
      };
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  }

  // Complete meetup and reward users
  async completeMeetup(sessionId: string): Promise<CheckInReward> {
    try {
      const sessionRef = doc(db, 'meetupSessions', sessionId);
      const reward: CheckInReward = {
        points: 50,
        badge: 'meetup_master',
        message: `Meetup completed. You received +${MEETUP_DIAMOND_REWARD} diamonds.`,
        items: ['special_gift_voucher'],
      };

      const sessionData = await runTransaction(db, async (transaction) => {
        const sessionSnap = await transaction.get(sessionRef);
        if (!sessionSnap.exists()) {
          throw new Error('Session does not exist');
        }

        const session = { id: sessionSnap.id, ...(sessionSnap.data() as any) } as MeetupSession;
        if (session.status === 'completed') {
          throw new Error('Meetup already completed');
        }

        transaction.update(sessionRef, {
          status: 'completed',
          completedAt: serverTimestamp(),
          rewards: {
            ...reward,
            diamonds: MEETUP_DIAMOND_REWARD,
          },
        });

        const inviteRef = doc(db, 'hotSpotInvites', session.inviteId);
        transaction.set(inviteRef, {
          status: 'completed',
          meetupDetails: {
            bothCheckedIn: true,
            meetupTime: serverTimestamp(),
          },
          updatedAt: serverTimestamp(),
        }, { merge: true });

        return session;
      });

      const batch = writeBatch(db);
      for (const uid of sessionData.participants) {
        const userRef = doc(db, 'users', uid);
        const walletRef = doc(db, 'users', uid, 'wallet', 'balance');
        const historyRef = doc(collection(db, 'hotSpotMeetupHistory'));

        batch.set(walletRef, {
          coins: increment(MEETUP_DIAMOND_REWARD),
          updatedAt: serverTimestamp(),
        }, { merge: true });

        batch.set(userRef, {
          coins: increment(MEETUP_DIAMOND_REWARD),
          totalMeetups: increment(1),
          updatedAt: serverTimestamp(),
        }, { merge: true });

        batch.set(historyRef, {
          userId: uid,
          sessionId,
          inviteId: sessionData.inviteId,
          hotSpotId: sessionData.hotSpotId,
          rewardType: 'meetup_auto_checkin',
          diamonds: MEETUP_DIAMOND_REWARD,
          points: reward.points,
          createdAt: serverTimestamp(),
        });
      }
      await batch.commit();

      await Promise.all(
        sessionData.participants.map((uid) => this.createRewardNotification(uid, reward))
      );

      return reward;
    } catch (error) {
      console.error('Error completing meetup:', error);
      throw error;
    }
  }

  // Get pending invites
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

  // Get active meetup session
  async getActiveMeetupSession(userId: string, inviteId: string): Promise<MeetupSession | null> {
    try {
      const q = query(
        collection(db, 'meetupSessions'),
        where('participants', 'array-contains', userId),
        where('inviteId', '==', inviteId),
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

  private toMs(ts: any): number {
    try {
      if (!ts) return 0;
      if (typeof ts?.toMillis === 'function') return ts.toMillis();
      if (typeof ts?.seconds === 'number') return ts.seconds * 1000;
      if (typeof ts === 'number') return ts;
      if (typeof ts === 'string') return Date.parse(ts) || 0;
      if (typeof ts?.toDate === 'function') return ts.toDate().getTime();
    } catch { }
    return 0;
  }

  private isWithinMeetupTimeWindow(session: MeetupSession): boolean {
    const participants = session?.participants || [];
    if (participants.length < 2) return false;

    const p1 = session.checkInData?.[participants[0]];
    const p2 = session.checkInData?.[participants[1]];
    if (!p1?.checkInTime || !p2?.checkInTime) return false;

    const t1 = this.toMs(p1.checkInTime);
    const t2 = this.toMs(p2.checkInTime);
    if (!t1 || !t2) return false;

    return Math.abs(t1 - t2) <= MEETUP_TIME_WINDOW_MINUTES * 60 * 1000;
  }

  // Helper: create chat room for Hot Spot
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

  // Helper: create notification
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
        title: 'Hot Spot invite',
        message: `${senderName} invited you to join ${hotSpotTitle}`,
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
        title: 'Invite accepted',
        message: `Your friend accepted the invite to ${hotSpotTitle}`,
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
        title: 'Reward received',
        message: `${reward.message} You received +${MEETUP_DIAMOND_REWARD} diamonds.`,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }
}

export default new HotSpotInviteService();



