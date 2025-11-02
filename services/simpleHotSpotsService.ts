import { 
  collection, 
  doc,
  getDocs,
  getDoc,
  addDoc, 
  updateDoc,
  deleteDoc,
  query, 
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { 
  HotSpot, 
  UserHotSpotInteraction,
  HotSpotFilters,
  HotSpotSearchParams,
  HotSpotsResponse,
} from '@/types/hotSpots';

/**
 * Simplified Hot Spots Service
 * Uses minimal Firebase queries to avoid all index errors
 * All filtering and sorting done client-side
 */
class SimpleHotSpotsService {
  private hotSpotsCollection = collection(db, 'hotSpots');
  private interactionsCollection = collection(db, 'hotSpotInteractions');

  async getHotSpots(searchParams: HotSpotSearchParams): Promise<HotSpotsResponse> {
    try {
      const { filters, limit: queryLimit = 20, offset = 0 } = searchParams;
      
      // Ultra simple query - no where, no orderBy - just get all active hotspots
      const hotSpotsQuery = query(
        this.hotSpotsCollection,
        limit(200) // Get more data to filter client-side
      );

      const snapshot = await getDocs(hotSpotsQuery);
      let allHotSpots = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as HotSpot));

      // Filter by isActive first (client-side)
      let filteredHotSpots = allHotSpots.filter(hotSpot => hotSpot.isActive);

      // Apply all other filters client-side
      if (filters.type && filters.type !== 'all') {
        filteredHotSpots = filteredHotSpots.filter(hotSpot => hotSpot.type === filters.type);
      }

      if (filters.category) {
        filteredHotSpots = filteredHotSpots.filter(hotSpot => hotSpot.category === filters.category);
      }

      if (filters.featured) {
        filteredHotSpots = filteredHotSpots.filter(hotSpot => hotSpot.isFeatured);
      }

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

  async getFeaturedHotSpots(limitCount: number = 10): Promise<HotSpot[]> {
    try {
      // Get all hot spots first with simple query
      const response = await this.getHotSpots({
        filters: { featured: true },
        limit: limitCount,
        offset: 0
      });

      return response.hotSpots;
    } catch (error) {
      console.error('Error fetching featured hot spots:', error);
      return [];
    }
  }

  async getHotSpotById(hotSpotId: string): Promise<HotSpot | null> {
    try {
      const snapshot = await getDoc(doc(this.hotSpotsCollection, hotSpotId));
      
      if (snapshot.exists()) {
        return {
          id: snapshot.id,
          ...snapshot.data()
        } as HotSpot;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching hot spot:', error);
      return null;
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
      return [];
    }
  }

  // ============ USER INTERACTIONS ============

  async joinHotSpot(hotSpotId: string, userId: string): Promise<void> {
    try {
      const hotSpotRef = doc(this.hotSpotsCollection, hotSpotId);
      const interactionRef = doc(this.interactionsCollection, `${userId}_${hotSpotId}`);

      // Update hot spot stats
      await updateDoc(hotSpotRef, {
        'stats.joined': increment(1),
        lastUpdated: serverTimestamp()
      });

      // Create/update user interaction
      const interaction = {
        userId,
        hotSpotId,
        type: 'joined',
        timestamp: serverTimestamp(),
        lastUpdated: serverTimestamp()
      };

      await updateDoc(interactionRef, interaction);
    } catch (error) {
      console.error('Error joining hot spot:', error);
      throw error;
    }
  }

  async leaveHotSpot(hotSpotId: string, userId: string): Promise<void> {
    try {
      const hotSpotRef = doc(this.hotSpotsCollection, hotSpotId);
      const interactionRef = doc(this.interactionsCollection, `${userId}_${hotSpotId}`);

      // Update hot spot stats
      await updateDoc(hotSpotRef, {
        'stats.joined': increment(-1),
        lastUpdated: serverTimestamp()
      });

      // Update user interaction
      await updateDoc(interactionRef, {
        type: 'left',
        timestamp: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });
    } catch (error) {
      console.error('Error leaving hot spot:', error);
      throw error;
    }
  }

  async toggleInterest(hotSpotId: string, userId: string): Promise<boolean> {
    try {
      const interactionRef = doc(this.interactionsCollection, `${userId}_${hotSpotId}`);
      const snapshot = await getDoc(interactionRef);
      
      const isInterested = snapshot.exists() ? snapshot.data()?.type === 'interested' : false;
      const newInterestState = !isInterested;

      // Update hot spot stats
      const hotSpotRef = doc(this.hotSpotsCollection, hotSpotId);
      await updateDoc(hotSpotRef, {
        'stats.interested': increment(newInterestState ? 1 : -1),
        lastUpdated: serverTimestamp()
      });

      // Update user interaction
      const interaction = {
        userId,
        hotSpotId,
        type: newInterestState ? 'interested' : 'not_interested',
        timestamp: serverTimestamp(),
        lastUpdated: serverTimestamp()
      };

      await updateDoc(interactionRef, interaction);
      
      return newInterestState;
    } catch (error) {
      console.error('Error toggling interest:', error);
      throw error;
    }
  }

  async checkIn(hotSpotId: string, userId: string): Promise<void> {
    try {
      const hotSpotRef = doc(this.hotSpotsCollection, hotSpotId);
      const interactionRef = doc(this.interactionsCollection, `${userId}_${hotSpotId}`);

      // Update hot spot stats
      await updateDoc(hotSpotRef, {
        'stats.checkedIn': increment(1),
        lastUpdated: serverTimestamp()
      });

      // Update user interaction
      await updateDoc(interactionRef, {
        checkedIn: true,
        checkInAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });
    } catch (error) {
      console.error('Error checking in:', error);
      throw error;
    }
  }

  async removeInteraction(hotSpotId: string, userId: string): Promise<void> {
    try {
      const interactionRef = doc(this.interactionsCollection, `${userId}_${hotSpotId}`);
      await deleteDoc(interactionRef);
    } catch (error) {
      console.error('Error removing interaction:', error);
      throw error;
    }
  }

  // ============ GET USER INTERACTIONS ============

  async getUserInteractions(userId: string): Promise<UserHotSpotInteraction[]> {
    try {
      const q = query(
        this.interactionsCollection,
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserHotSpotInteraction));
    } catch (error) {
      console.error('Error fetching user interactions:', error);
      return [];
    }
  }

  async getUserInteractionsForHotSpot(userId: string, hotSpotId: string): Promise<UserHotSpotInteraction[]> {
    try {
      const q = query(
        this.interactionsCollection,
        where('userId', '==', userId),
        where('hotSpotId', '==', hotSpotId)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserHotSpotInteraction));
    } catch (error) {
      console.error('Error fetching user interactions for hot spot:', error);
      return [];
    }
  }

  // ============ INTERACT WITH HOT SPOT ============

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
          break;
        case 'checked_in':
          updateData['stats.checkedIn'] = increment(1);
          break;
      }

      await updateDoc(hotSpotRef, updateData);

      return docRef.id;
    } catch (error) {
      console.error('Error interacting with hot spot:', error);
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

  // ============ SAMPLE DATA ============

  async createSampleHotSpot(): Promise<string> {
    try {
      const sampleHotSpot: Omit<HotSpot, 'id'> = {
        title: 'Sự kiện Test Simple',
        description: 'Đây là sự kiện test sử dụng simple service',
        type: 'event',
        category: 'entertainment',
        location: {
          address: 'Hà Nội, Việt Nam',
          city: 'Hà Nội',
          coordinates: { latitude: 21.0285, longitude: 105.8542 }
        },
        eventInfo: {
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          organizer: 'Admin',
          currentParticipants: 0
        },
        images: [],
        tags: ['test', 'simple', 'entertainment'],
        stats: {
          joined: 0,
          interested: 0,
          checkedIn: 0,
          rating: 0,
          reviewCount: 0
        },
        isActive: true,
        isFeatured: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'admin',
        thumbnail: ''
      };

      const docRef = await addDoc(this.hotSpotsCollection, sampleHotSpot);
      return docRef.id;
    } catch (error) {
      console.error('Error creating sample hot spot:', error);
      throw error;
    }
  }

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
}

export const simpleHotSpotsService = new SimpleHotSpotsService();
export default simpleHotSpotsService;
