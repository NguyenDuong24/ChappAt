import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { 
  HotSpot, 
  UserHotSpotInteraction, 
  HotSpotInvitation, 
  EventPass, 
  HotSpotChat,
  HotSpotFilters,
  HotSpotSearchParams,
  HotSpotsResponse,
  UserHotSpotStats
} from '@/types/hotSpots';

class HotSpotsService {
  // Collections
  private hotSpotsCollection = collection(db, 'hotSpots');
  private interactionsCollection = collection(db, 'hotSpotInteractions');
  private invitationsCollection = collection(db, 'hotSpotInvitations');
  private eventPassesCollection = collection(db, 'eventPasses');
  private hotSpotChatsCollection = collection(db, 'hotSpotChats');

  // ============ HOT SPOTS CRUD ============

  async getHotSpots(searchParams: HotSpotSearchParams): Promise<HotSpotsResponse> {
    try {
      const { filters, limit: queryLimit = 20, offset = 0 } = searchParams;
      
      // Simplest query possible - only where clause, no orderBy to avoid index issues
      let hotSpotsQuery = query(
        this.hotSpotsCollection,
        where('isActive', '==', true),
        limit(100) // Get more data to filter and sort client-side
      );

      const snapshot = await getDocs(hotSpotsQuery);
      let allHotSpots = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as HotSpot));

      // Apply client-side filtering to avoid complex Firebase indexes
      let filteredHotSpots = allHotSpots;

      // Filter by type
      if (filters.type && filters.type !== 'all') {
        filteredHotSpots = filteredHotSpots.filter(hotSpot => hotSpot.type === filters.type);
      }

      // Filter by category
      if (filters.category) {
        filteredHotSpots = filteredHotSpots.filter(hotSpot => hotSpot.category === filters.category);
      }

      // Filter by featured
      if (filters.featured) {
        filteredHotSpots = filteredHotSpots.filter(hotSpot => hotSpot.isFeatured);
      }

      // Filter by search query
      if (filters.searchQuery) {
        const searchTerm = filters.searchQuery.toLowerCase();
        filteredHotSpots = filteredHotSpots.filter(hotSpot =>
          hotSpot.title.toLowerCase().includes(searchTerm) ||
          hotSpot.description.toLowerCase().includes(searchTerm) ||
          hotSpot.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
      }

      // Apply client-side sorting
      switch (filters.sortBy) {
        case 'popular':
          filteredHotSpots.sort((a, b) => b.stats.joined - a.stats.joined);
          break;
        case 'rating':
          filteredHotSpots.sort((a, b) => b.stats.rating - a.stats.rating);
          break;
        case 'newest':
        default:
          // Sort by createdAt desc (client-side since we removed orderBy from query)
          filteredHotSpots.sort((a, b) => {
            const aDate = new Date(a.createdAt);
            const bDate = new Date(b.createdAt);
            return bDate.getTime() - aDate.getTime();
          });
          break;
      }

      // Apply pagination
      const startIndex = offset;
      const endIndex = startIndex + queryLimit;
      const hotSpots = filteredHotSpots.slice(startIndex, endIndex);

      return {
        hotSpots,
        total: filteredHotSpots.length,
        hasMore: endIndex < filteredHotSpots.length
      };
    } catch (error) {
      console.error('Error fetching hot spots:', error);
      throw error;
    }
  }

  async getHotSpotById(hotSpotId: string): Promise<HotSpot | null> {
    try {
      const docRef = doc(this.hotSpotsCollection, hotSpotId);
      const snapshot = await getDoc(docRef);
      
      if (snapshot.exists()) {
        return {
          id: snapshot.id,
          ...snapshot.data()
        } as HotSpot;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching hot spot:', error);
      throw error;
    }
  }

  async getFeaturedHotSpots(limitCount: number = 10): Promise<HotSpot[]> {
    try {
      // Simplified query to avoid index issues
      const q = query(
        this.hotSpotsCollection,
        where('isActive', '==', true),
        where('isFeatured', '==', true),
        limit(limitCount * 2) // Get more to sort client-side
      );

      const snapshot = await getDocs(q);
      const hotSpots = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as HotSpot));

      // Sort by popularity client-side and limit results
      return hotSpots
        .sort((a, b) => b.stats.joined - a.stats.joined)
        .slice(0, limitCount);
    } catch (error) {
      console.error('Error fetching featured hot spots:', error);
      throw error;
    }
  }

  async getNearbyHotSpots(
    latitude: number, 
    longitude: number, 
    radiusKm: number = 10
  ): Promise<HotSpot[]> {
    try {
      // Note: Firestore doesn't support geo queries natively
      // This is a simplified implementation
      // In production, consider using GeoFirestore or similar
      
      const snapshot = await getDocs(
        query(
          this.hotSpotsCollection,
          where('isActive', '==', true),
          orderBy('stats.joined', 'desc')
        )
      );

      const hotSpots = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as HotSpot));

      // Filter by distance (simplified calculation)
      return hotSpots.filter(hotSpot => {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          hotSpot.location.coordinates.latitude,
          hotSpot.location.coordinates.longitude
        );
        return distance <= radiusKm;
      });
    } catch (error) {
      console.error('Error fetching nearby hot spots:', error);
      throw error;
    }
  }

  // ============ USER INTERACTIONS ============

  async interactWithHotSpot(
    userId: string,
    hotSpotId: string,
    interactionType: 'interested' | 'joined' | 'checked_in',
    additionalData?: any
  ): Promise<string> {
    try {
      // Create interaction record
      const interactionData: Omit<UserHotSpotInteraction, 'id'> = {
        userId,
        hotSpotId,
        type: interactionType,
        timestamp: new Date().toISOString(),
        ...additionalData
      };

      const docRef = await addDoc(this.interactionsCollection, interactionData);

      // Update hot spot stats
      const hotSpotRef = doc(this.hotSpotsCollection, hotSpotId);
      const updateData: any = {};

      switch (interactionType) {
        case 'interested':
          updateData['stats.interested'] = increment(1);
          break;
        case 'joined':
          updateData['stats.joined'] = increment(1);
          // Also create event pass
          await this.createEventPass(userId, hotSpotId, 'participant');
          break;
        case 'checked_in':
          updateData['stats.checkedIn'] = increment(1);
          // Create or update event pass
          await this.createEventPass(userId, hotSpotId, 'checked_in');
          break;
      }

      await updateDoc(hotSpotRef, updateData);

      return docRef.id;
    } catch (error) {
      console.error('Error creating interaction:', error);
      throw error;
    }
  }

  async removeInteraction(
    userId: string,
    hotSpotId: string,
    interactionType: 'interested' | 'joined' | 'checked_in'
  ): Promise<void> {
    try {
      // Find and remove interaction
      const q = query(
        this.interactionsCollection,
        where('userId', '==', userId),
        where('hotSpotId', '==', hotSpotId),
        where('type', '==', interactionType)
      );

      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        await deleteDoc(snapshot.docs[0].ref);

        // Update hot spot stats
        const hotSpotRef = doc(this.hotSpotsCollection, hotSpotId);
        const updateData: any = {};

        switch (interactionType) {
          case 'interested':
            updateData['stats.interested'] = increment(-1);
            break;
          case 'joined':
            updateData['stats.joined'] = increment(-1);
            break;
          case 'checked_in':
            updateData['stats.checkedIn'] = increment(-1);
            break;
        }

        await updateDoc(hotSpotRef, updateData);
      }
    } catch (error) {
      console.error('Error removing interaction:', error);
      throw error;
    }
  }

  async getUserInteractions(userId: string, hotSpotId?: string): Promise<UserHotSpotInteraction[]> {
    try {
      let q = query(
        this.interactionsCollection,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );

      if (hotSpotId) {
        q = query(q, where('hotSpotId', '==', hotSpotId));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserHotSpotInteraction));
    } catch (error) {
      console.error('Error fetching user interactions:', error);
      throw error;
    }
  }

  // ============ INVITATIONS ============

  async sendInvitation(
    fromUserId: string,
    toUserId: string,
    hotSpotId: string,
    message: string = ''
  ): Promise<string> {
    try {
      // Get hot spot info
      const hotSpot = await this.getHotSpotById(hotSpotId);
      if (!hotSpot) throw new Error('Hot spot not found');

      // Get sender info (you might want to get this from user service)
      const senderDoc = await getDoc(doc(db, 'users', fromUserId));
      const senderData = senderDoc.exists() ? senderDoc.data() : {};

      const invitationData: Omit<HotSpotInvitation, 'id'> = {
        hotSpotId,
        fromUserId,
        toUserId,
        message,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        hotSpotTitle: hotSpot.title,
        fromUserName: senderData.displayName || senderData.username || 'Unknown User',
        fromUserAvatar: senderData.profileUrl
      };

      const docRef = await addDoc(this.invitationsCollection, invitationData);

      // Send notification to the invitee
      // You can integrate with your notification system here
      
      return docRef.id;
    } catch (error) {
      console.error('Error sending invitation:', error);
      throw error;
    }
  }

  async respondToInvitation(
    invitationId: string,
    userId: string,
    response: 'accepted' | 'declined'
  ): Promise<void> {
    try {
      const invitationRef = doc(this.invitationsCollection, invitationId);
      await updateDoc(invitationRef, {
        status: response,
        respondedAt: new Date().toISOString()
      });

      if (response === 'accepted') {
        // Get invitation details
        const invitationDoc = await getDoc(invitationRef);
        if (invitationDoc.exists()) {
          const invitation = invitationDoc.data() as HotSpotInvitation;
          
          // Create chat between the two users
          await this.createHotSpotChat(
            [invitation.fromUserId, invitation.toUserId],
            invitation.hotSpotId,
            invitationId
          );

          // Auto-join both users to the hot spot
          await this.interactWithHotSpot(invitation.fromUserId, invitation.hotSpotId, 'joined');
          await this.interactWithHotSpot(invitation.toUserId, invitation.hotSpotId, 'joined');
        }
      }
    } catch (error) {
      console.error('Error responding to invitation:', error);
      throw error;
    }
  }

  async getUserInvitations(
    userId: string,
    type: 'sent' | 'received' = 'received'
  ): Promise<HotSpotInvitation[]> {
    try {
      const field = type === 'sent' ? 'fromUserId' : 'toUserId';
      const q = query(
        this.invitationsCollection,
        where(field, '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as HotSpotInvitation));
    } catch (error) {
      console.error('Error fetching invitations:', error);
      throw error;
    }
  }

  // ============ EVENT PASSES ============

  async createEventPass(
    userId: string,
    hotSpotId: string,
    badgeType: 'participant' | 'checked_in' | 'organizer' | 'vip'
  ): Promise<string> {
    try {
      // Check if pass already exists
      const existingQ = query(
        this.eventPassesCollection,
        where('userId', '==', userId),
        where('hotSpotId', '==', hotSpotId)
      );

      const existingSnapshot = await getDocs(existingQ);
      
      if (!existingSnapshot.empty) {
        // Update existing pass
        const existingDoc = existingSnapshot.docs[0];
        await updateDoc(existingDoc.ref, {
          badgeType,
          earnedAt: new Date().toISOString()
        });
        return existingDoc.id;
      }

      // Get hot spot info
      const hotSpot = await this.getHotSpotById(hotSpotId);
      if (!hotSpot) throw new Error('Hot spot not found');

      const eventPassData: Omit<EventPass, 'id'> = {
        userId,
        hotSpotId,
        hotSpotTitle: hotSpot.title,
        hotSpotType: hotSpot.type,
        hotSpotCategory: hotSpot.category,
        hotSpotThumbnail: hotSpot.thumbnail,
        badgeType,
        earnedAt: new Date().toISOString(),
        isVerified: badgeType === 'checked_in', // Auto-verify check-ins
        verificationData: {}
      };

      const docRef = await addDoc(this.eventPassesCollection, eventPassData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating event pass:', error);
      throw error;
    }
  }

  async getUserEventPasses(userId: string): Promise<EventPass[]> {
    try {
      const q = query(
        this.eventPassesCollection,
        where('userId', '==', userId),
        orderBy('earnedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EventPass));
    } catch (error) {
      console.error('Error fetching event passes:', error);
      throw error;
    }
  }

  // ============ CHAT ============

  async createHotSpotChat(
    participants: string[],
    hotSpotId: string,
    relatedInvitationId?: string
  ): Promise<string> {
    try {
      const chatData: Omit<HotSpotChat, 'id'> = {
        hotSpotId,
        participants,
        createdAt: new Date().toISOString(),
        chatType: relatedInvitationId ? 'invitation_accepted' : 'group_meetup',
        relatedInvitationId
      };

      const docRef = await addDoc(this.hotSpotChatsCollection, chatData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating hot spot chat:', error);
      throw error;
    }
  }

  async getUserHotSpotChats(userId: string): Promise<HotSpotChat[]> {
    try {
      const q = query(
        this.hotSpotChatsCollection,
        where('participants', 'array-contains', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as HotSpotChat));
    } catch (error) {
      console.error('Error fetching hot spot chats:', error);
      throw error;
    }
  }

  // ============ STATS ============

  async getUserHotSpotStats(userId: string): Promise<UserHotSpotStats> {
    try {
      const [interactions, eventPasses] = await Promise.all([
        this.getUserInteractions(userId),
        this.getUserEventPasses(userId)
      ]);

      const stats = interactions.reduce(
        (acc, interaction) => {
          switch (interaction.type) {
            case 'interested':
              acc.totalInterested++;
              break;
            case 'joined':
              acc.totalJoined++;
              break;
            case 'checked_in':
              acc.totalCheckedIn++;
              break;
          }
          return acc;
        },
        { totalInterested: 0, totalJoined: 0, totalCheckedIn: 0 }
      );

      // Calculate favorite categories
      const categoryCount: { [key: string]: number } = {};
      eventPasses.forEach(pass => {
        categoryCount[pass.hotSpotCategory] = (categoryCount[pass.hotSpotCategory] || 0) + 1;
      });

      const favoriteCategories = Object.entries(categoryCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([category]) => category);

      return {
        ...stats,
        eventPasses,
        favoriteCategories,
        recentActivity: interactions.slice(0, 10)
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  }

  // ============ UTILITIES ============

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Real-time listeners
  subscribeToHotSpots(
    filters: HotSpotFilters,
    callback: (hotSpots: HotSpot[]) => void
  ): () => void {
    let q = query(
      this.hotSpotsCollection,
      where('isActive', '==', true)
    );

    if (filters.type && filters.type !== 'all') {
      q = query(q, where('type', '==', filters.type));
    }

    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const hotSpots = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as HotSpot));
      callback(hotSpots);
    });

    return unsubscribe;
  }

  subscribeToUserInvitations(
    userId: string,
    callback: (invitations: HotSpotInvitation[]) => void
  ): () => void {
    const q = query(
      this.invitationsCollection,
      where('toUserId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const invitations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as HotSpotInvitation));
      callback(invitations);
    });

    return unsubscribe;
  }
}

export default new HotSpotsService();
