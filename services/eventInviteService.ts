import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  getDocs,
  getDoc,
  serverTimestamp,
  Timestamp,
  setDoc,
  increment
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { EventInvite, EventInterest, EventMatch, UserProfile } from '@/types/eventInvites';
import { getRoomId } from '@/utils/common';

class EventInviteService {
  // GIAI ĐOẠN 1: Quan tâm sự kiện
  async markInterested(eventId: string, userId: string): Promise<void> {
    try {
      // Check if already interested
      const existingQuery = query(
        collection(db, 'eventInterests'),
        where('eventId', '==', eventId),
        where('userId', '==', userId)
      );
      const existingDocs = await getDocs(existingQuery);
      
      if (existingDocs.empty) {
        await addDoc(collection(db, 'eventInterests'), {
          eventId,
          userId,
          createdAt: serverTimestamp(),
          isHidden: false
        });
        
        // Update hotspot stats
        const hotSpotRef = doc(db, 'hotSpots', eventId);
        await updateDoc(hotSpotRef, {
          'stats.interested': increment(1),
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error marking interested:', error);
      throw error;
    }
  }

  async removeInterest(eventId: string, userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'eventInterests'),
        where('eventId', '==', eventId),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        
        // Update hotspot stats
        const hotSpotRef = doc(db, 'hotSpots', eventId);
        await updateDoc(hotSpotRef, {
          'stats.interested': increment(-1),
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error removing interest:', error);
      throw error;
    }
  }

  // Lấy danh sách người quan tâm (không bị ẩn)
  async getInterestedUsers(eventId: string): Promise<UserProfile[]> {
    try {
      const q = query(
        collection(db, 'eventInterests'),
        where('eventId', '==', eventId),
        where('isHidden', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      const interests = querySnapshot.docs
        .map(doc => doc.data())
        .sort((a, b) => {
          const aTime = (a.createdAt as any)?.toMillis?.() || (a.createdAt as any)?.getTime?.() || 0;
          const bTime = (b.createdAt as any)?.toMillis?.() || (b.createdAt as any)?.getTime?.() || 0;
          return bTime - aTime;
        });
      
      const userIds = interests.map(interest => interest.userId);
      
      // Fetch user profiles (normalized)
      const userProfiles: UserProfile[] = [];
      for (const userId of userIds) {
        const userDocSnap = await getDoc(doc(db, 'users', userId));
        if (userDocSnap.exists()) {
          const d: any = userDocSnap.data();
          userProfiles.push({
            id: userId,
            name: d?.displayName || d?.name || d?.username || 'Người dùng',
            avatar: d?.avatar || d?.photoURL || d?.profileUrl || '',
            age: typeof d?.age === 'number' ? d.age : undefined,
            bio: typeof d?.bio === 'string' ? d.bio : undefined,
            // pass through other fields if your UserProfile allows
          } as UserProfile);
        }
      }
      
      return userProfiles;
    } catch (error) {
      console.error('Error getting interested users:', error);
      return [];
    }
  }

  // GIAI ĐOẠN 2: Gửi lời mời đi cùng
  async sendInvite(eventId: string, inviterId: string, inviteeId: string): Promise<string> {
    try {
      // Check if invite already exists - use 2 where clauses to avoid composite index
      const existingQuery = query(
        collection(db, 'eventInvites'),
        where('inviteeId', '==', inviteeId),
        where('eventId', '==', eventId)
      );
      const existingDocs = await getDocs(existingQuery);
      
      // Filter by inviterId and status in code
      const validStatuses = ['pending', 'accepted', 'confirmed'];
      const existingInvite = existingDocs.docs.find(doc => {
        const data = doc.data();
        return data.inviterId === inviterId && validStatuses.includes(data.status);
      });
      
      if (existingInvite) {
        // Idempotent behavior: return existing invite id instead of throwing
        return existingInvite.id;
      }

      // Create invite
      const inviteData = {
        eventId,
        inviterId,
        inviteeId,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)) // 24h from now
      };

      const docRef = await addDoc(collection(db, 'eventInvites'), inviteData);
      
      // Send notification to invitee (creates a notification document)
      await this.sendInviteNotification(inviterId, inviteeId, eventId, docRef.id);
      
      return docRef.id;
    } catch (error) {
      console.error('Error sending invite:', error);
      throw error;
    }
  }

  // GIAI ĐOẠN 3: Xử lý lời mời
  async respondToInvite(inviteId: string, response: 'accepted' | 'declined'): Promise<string | null> {
    try {
      const inviteRef = doc(db, 'eventInvites', inviteId);
      const inviteDoc = await getDoc(inviteRef);
      
      if (!inviteDoc.exists()) {
        throw new Error('Lời mời không tồn tại');
      }

      const inviteData = inviteDoc.data() as EventInvite;
      
      if (response === 'accepted') {
        // Create chat room
        const chatRoomId = await this.createEventChatRoom(
          inviteData.inviterId, 
          inviteData.inviteeId, 
          inviteData.eventId
        );

        // Update invite
        await updateDoc(inviteRef, {
          status: 'accepted',
          chatRoomId,
          updatedAt: serverTimestamp()
        });

        // Notify inviter that their invite was accepted
        try {
          const [inviteeDoc, eventTitle] = await Promise.all([
            getDoc(doc(db, 'users', inviteData.inviteeId)),
            this.resolveEventTitle(inviteData.eventId),
          ]);
          const invitee = inviteeDoc.exists() ? inviteeDoc.data() as any : {};
          const senderName = invitee?.displayName || invitee?.name || invitee?.username;
          const senderAvatar = invitee?.photoURL || invitee?.avatar || invitee?.profileUrl;

          await this.createNotification({
            receiverId: inviteData.inviterId,
            senderId: inviteData.inviteeId,
            senderName,
            senderAvatar,
            type: 'accepted_invite',
            title: '✅ Lời mời đã được chấp nhận',
            message: `${senderName || 'Người dùng'} đã chấp nhận lời mời đi cùng sự kiện ${eventTitle}!`,
            data: { eventId: inviteData.eventId, inviteId, chatId: chatRoomId, peerId: inviteData.inviteeId, action: 'open_chat' }
          });
        } catch (e) {
          console.warn('Failed to send acceptance notification', e);
        }

        return chatRoomId;
      } else {
        // Update invite to declined
        await updateDoc(inviteRef, {
          status: 'declined',
          updatedAt: serverTimestamp()
        });

        // Optional: Notify inviter about decline
        try {
          const [inviteeDoc, eventTitle] = await Promise.all([
            getDoc(doc(db, 'users', inviteData.inviteeId)),
            this.resolveEventTitle(inviteData.eventId),
          ]);
          const invitee = inviteeDoc.exists() ? inviteeDoc.data() as any : {};
          const senderName = invitee?.displayName || invitee?.name || invitee?.username;
          const senderAvatar = invitee?.photoURL || invitee?.avatar || invitee?.profileUrl;

          await this.createNotification({
            receiverId: inviteData.inviterId,
            senderId: inviteData.inviteeId,
            senderName,
            senderAvatar,
            type: 'hot_spot',
            title: '❌ Lời mời bị từ chối',
            message: `${senderName || 'Người dùng'} đã từ chối lời mời đi cùng sự kiện ${eventTitle}.`,
            data: { eventId: inviteData.eventId, inviteId, action: 'invite_declined' }
          });
        } catch (e) {
          console.warn('Failed to send decline notification', e);
        }
        return null;
      }
    } catch (error) {
      console.error('Error responding to invite:', error);
      throw error;
    }
  }

  // GIAI ĐOẠN 4: Xác nhận đi cùng
  async confirmGoing(inviteId: string, userId: string): Promise<boolean> {
    try {
      const inviteRef = doc(db, 'eventInvites', inviteId);
      const inviteDoc = await getDoc(inviteRef);
      
      if (!inviteDoc.exists()) {
        throw new Error('Lời mời không tồn tại');
      }

      const inviteData = inviteDoc.data() as EventInvite;
      
      // Update invite with confirmation
      const updateData: any = {
        updatedAt: serverTimestamp()
      };

      if ((inviteData as any).inviterId === userId) {
        updateData.inviterConfirmed = true;
      } else if ((inviteData as any).inviteeId === userId) {
        updateData.inviteeConfirmed = true;
      }

      // Check if both confirmed
      const currentInviterConfirmed = (inviteData as any).inviterConfirmed || (userId === (inviteData as any).inviterId);
      const currentInviteeConfirmed = (inviteData as any).inviteeConfirmed || (userId === (inviteData as any).inviteeId);
      
      if (currentInviterConfirmed && currentInviteeConfirmed) {
        updateData.status = 'confirmed';
        updateData.mutualConfirmed = true;
        
        // GIAI ĐOẠN 5: Ẩn khỏi danh sách quan tâm
        await this.hideUsersFromInterestList(inviteData.eventId, [inviteData.inviterId, inviteData.inviteeId]);
        
        // Create match record
        await this.createEventMatch(inviteData);

        // Create notification for both users that match is confirmed
        await Promise.all([
          this.createNotification({
            receiverId: inviteData.inviterId,
            senderId: inviteData.inviteeId,
            type: 'hot_spot',
            title: '💜 Đã có cặp',
            message: 'Cả hai đã xác nhận sẽ đi cùng sự kiện! Hãy trò chuyện và lên kèo nhé!',
            data: { eventId: inviteData.eventId, inviteId, chatId: (inviteData as any).chatRoomId }
          }),
          this.createNotification({
            receiverId: inviteData.inviteeId,
            senderId: inviteData.inviterId,
            type: 'hot_spot',
            title: '💜 Đã có cặp',
            message: 'Cả hai đã xác nhận sẽ đi cùng sự kiện! Hãy trò chuyện và lên kèo nhé!',
            data: { eventId: inviteData.eventId, inviteId, chatId: (inviteData as any).chatRoomId }
          }),
        ]);
      }

      await updateDoc(inviteRef, updateData);
      
      return updateData.mutualConfirmed || false;
    } catch (error) {
      console.error('Error confirming going:', error);
      throw error;
    }
  }

  // Helper methods
  private async createEventChatRoom(user1Id: string, user2Id: string, eventId: string): Promise<string> {
    try {
      // Create a HotSpot-specific chat room in 'hotSpotChats' collection
      const rId = getRoomId(user1Id, user2Id);
      
      // Create in hotSpotChats collection for HotSpot-specific chat
      await setDoc(
        doc(db, 'hotSpotChats', rId),
        {
          chatRoomId: rId,
          participants: [user1Id, user2Id],
          eventId,
          type: 'hotspot_match',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: '🎉 Hai bạn đã match tại Hot Spot, cùng trò chuyện và lên kèo nhé!',
          lastMessageTime: serverTimestamp(),
          unreadCounts: { [user1Id]: 0, [user2Id]: 0 },
        },
        { merge: true }
      );
      
      // Also create a system message in the chat
      const messagesRef = collection(db, 'hotSpotChats', rId, 'messages');
      await addDoc(messagesRef, {
        text: '🎉 Hai bạn đã match tại Hot Spot này! Cùng trò chuyện và lên kèo đi cùng nhé!',
        senderId: 'system',
        senderName: 'Hệ thống',
        timestamp: serverTimestamp(),
        type: 'system',
      });
      
      return rId;
    } catch (error) {
      console.error('Error creating hot spot chat room:', error);
      throw error;
    }
  }

  private async hideUsersFromInterestList(eventId: string, userIds: string[]): Promise<void> {
    try {
      for (const userId of userIds) {
        const q = query(
          collection(db, 'eventInterests'),
          where('eventId', '==', eventId),
          where('userId', '==', userId)
        );
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach(async (doc) => {
          await updateDoc(doc.ref, { isHidden: true });
        });
      }
    } catch (error) {
      console.error('Error hiding users from interest list:', error);
      throw error;
    }
  }

  private async createEventMatch(inviteData: EventInvite): Promise<void> {
    try {
      await addDoc(collection(db, 'eventMatches'), {
        eventId: inviteData.eventId,
        user1Id: inviteData.inviterId,
        user2Id: inviteData.inviteeId,
        chatRoomId: (inviteData as any).chatRoomId,
        status: 'matched',
        createdAt: serverTimestamp(),
        confirmedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error creating event match:', error);
      throw error;
    }
  }

  private async sendInviteNotification(inviterId: string, inviteeId: string, eventId: string, inviteId: string): Promise<void> {
    // Create in-app notification document so the Notifications screen shows it
    try {
      // Fetch inviter profile for display
      const inviterDoc = await getDoc(doc(db, 'users', inviterId));
      const inviter = inviterDoc.exists() ? inviterDoc.data() : {} as any;

      // Try to fetch event title from 'hotSpots' then 'events'
      let eventTitle = 'một sự kiện';
      try {
        const hotSpotDoc = await getDoc(doc(db, 'hotSpots', eventId));
        if (hotSpotDoc.exists()) {
          const d = hotSpotDoc.data() as any;
          eventTitle = d?.title || d?.name || eventTitle;
        } else {
          const eventDoc = await getDoc(doc(db, 'events', eventId));
          if (eventDoc.exists()) {
            const d = eventDoc.data() as any;
            eventTitle = d?.title || d?.name || eventTitle;
          }
        }
      } catch {}

      const message = `💌 ${inviter?.displayName || inviter?.name || 'Một người dùng'} mời bạn đi cùng sự kiện ${eventTitle}!`;

      await this.createNotification({
        receiverId: inviteeId,
        senderId: inviterId,
        senderName: inviter?.displayName || inviter?.name,
        senderAvatar: inviter?.photoURL || inviter?.avatar,
        type: 'hot_spot', // Use existing mapping on NotificationsScreen
        title: 'Lời mời đi cùng 💌',
        message,
        data: { eventId, inviteId, action: 'view_invites' }
      });

      // Optional: Here you could trigger a Cloud Function/Server to send Expo Push
      // using receiver's currentExpoPushToken from users collection.
    } catch (error) {
      console.error('Error creating invite notification:', error);
    }
  }

  private async createNotification(n: {
    receiverId: string;
    senderId?: string;
    senderName?: string;
    senderAvatar?: string;
    type: string;
    title: string;
    message: string;
    data?: any;
  }) {
    try {
      // Build payload without undefined fields to satisfy Firestore
      const payload: any = {
        receiverId: n.receiverId,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data ?? {},
        isRead: false,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
      };
      if (n.senderId) payload.senderId = n.senderId;
      if (typeof n.senderName === 'string') payload.senderName = n.senderName;
      if (typeof n.senderAvatar === 'string') payload.senderAvatar = n.senderAvatar;

      await addDoc(collection(db, 'notifications'), payload);
    } catch (error) {
      console.error('Error creating notification doc:', error);
    }
  }

  // Get user's invites
  async getUserInvites(userId: string): Promise<EventInvite[]> {
    try {
      const q = query(
        collection(db, 'eventInvites'),
        where('inviteeId', '==', userId),
        where('status', '==', 'pending')
      );
      
      const querySnapshot = await getDocs(q);
      const invites = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EventInvite[];
      
      // Sort by createdAt in descending order (latest first)
      return invites.sort((a, b) => {
        const aTime = (a.createdAt as any)?.toMillis?.() || (a.createdAt as any)?.getTime?.() || 0;
        const bTime = (b.createdAt as any)?.toMillis?.() || (b.createdAt as any)?.getTime?.() || 0;
        return bTime - aTime;
      });
    } catch (error) {
      console.error('Error getting user invites:', error);
      return [];
    }
  }

  // Check if user has match for event
  async getUserEventMatch(eventId: string, userId: string): Promise<EventMatch | null> {
    try {
      const q = query(
        collection(db, 'eventMatches'),
        where('eventId', '==', eventId)
      );
      
      const querySnapshot = await getDocs(q);
      const matches = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((match: any) => 
          match.status === 'matched' && 
          (match.user1Id === userId || match.user2Id === userId)
        );
      
      return matches.length > 0 ? matches[0] as EventMatch : null;
    } catch (error) {
      console.error('Error getting user event match:', error);
      return null;
    }
  }

  private async resolveEventTitle(eventId: string): Promise<string> {
    try {
      const hot = await getDoc(doc(db, 'hotSpots', eventId));
      if (hot.exists()) {
        const d = hot.data() as any;
        return d?.title || d?.name || 'một sự kiện';
      }
      const ev = await getDoc(doc(db, 'events', eventId));
      if (ev.exists()) {
        const d = ev.data() as any;
        return d?.title || d?.name || 'một sự kiện';
      }
    } catch {}
    return 'một sự kiện';
  }

  // Get accepted invites involving the user (received or sent)
  async getAcceptedInvites(userId: string): Promise<EventInvite[]> {
    try {
      const invites: EventInvite[] = [];
      const base = collection(db, 'eventInvites');

      const [recvSnap, sentSnap] = await Promise.all([
        getDocs(query(base, where('inviteeId', '==', userId), where('status', '==', 'accepted'))),
        getDocs(query(base, where('inviterId', '==', userId), where('status', '==', 'accepted'))),
      ]);

      recvSnap.forEach((d) => invites.push({ id: d.id, ...(d.data() as any) }));
      sentSnap.forEach((d) => invites.push({ id: d.id, ...(d.data() as any) }));

      // Remove duplicates by id and sort by createdAt desc
      const map = new Map<string, EventInvite>();
      for (const inv of invites) map.set(inv.id!, inv);

      const getTs = (ts: any): number => {
        try {
          if (!ts) return 0;
          if (typeof ts?.toMillis === 'function') return ts.toMillis();
          if (typeof ts?.seconds === 'number') return ts.seconds * 1000;
          if (typeof ts === 'number') return ts;
          if (typeof ts === 'string') return Date.parse(ts) || 0;
        } catch {}
        return 0;
      };

      return Array.from(map.values()).sort((a: any, b: any) => getTs(b?.createdAt) - getTs(a?.createdAt));
    } catch (e) {
      console.error('Error getting accepted invites:', e);
      return [];
    }
  }
}

export const eventInviteService = new EventInviteService();
