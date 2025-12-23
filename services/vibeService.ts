import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  Timestamp
} from 'firebase/firestore';
import { auth, db } from '@/firebaseConfig';
import { Vibe, UserVibe, VibeStats, PREDEFINED_VIBES } from '@/types/vibe';

export class VibeService {
  private static instance: VibeService;

  static getInstance(): VibeService {
    if (!VibeService.instance) {
      VibeService.instance = new VibeService();
    }
    return VibeService.instance;
  }

  // Test method to check if service is working
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 VibeService: Testing connection...');

      // Try to read from userVibes collection
      const q = query(collection(db, 'userVibes'), limit(1));
      const snapshot = await getDocs(q);

      console.log('✅ VibeService: Connection test successful, found', snapshot.size, 'documents');
      return true;
    } catch (error) {
      console.error('❌ VibeService: Connection test failed:', error);
      return false;
    }
  }

  // Set user's current vibe
  async setUserVibe(
    userId: string,
    vibeId: string,
    customMessage?: string,
    location?: { latitude: number; longitude: number; address?: string }
  ): Promise<string> {
    try {
      console.log('🔧 VibeService: Setting vibe for user:', { userId, vibeId, customMessage });

      // Deactivate current active vibe
      await this.deactivateUserVibes(userId);
      console.log('✅ VibeService: Deactivated previous vibes');

      const vibe = PREDEFINED_VIBES.find(v => v.id === vibeId);
      if (!vibe) {
        throw new Error('Vibe not found');
      }

      // Create new vibe
      const vibeData = {
        userId,
        vibeId,
        vibe,
        customMessage: customMessage || '',
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)), // 24 hours
        location: location || null,
        isActive: true,
      };

      console.log('📝 VibeService: Creating vibe document with data:', vibeData);
      const docRef = await addDoc(collection(db, 'userVibes'), vibeData);
      console.log('✅ VibeService: Created vibe document with ID:', docRef.id);

      // Update user's current vibe in users collection
      const userVibeData = {
        currentVibe: {
          id: docRef.id,
          vibeId,
          vibe,
          customMessage: customMessage || '',
          createdAt: serverTimestamp(),
        }
      };
      console.log('📝 VibeService: Updating user document with:', userVibeData);
      await updateDoc(doc(db, 'users', userId), userVibeData);
      console.log('✅ VibeService: Updated user document');

      // Update vibe stats
      await this.updateVibeStats(vibeId);
      console.log('✅ VibeService: Updated vibe stats');

      return docRef.id;
    } catch (error) {
      console.error('❌ VibeService: Error setting user vibe:', error);
      throw error;
    }
  }

  // Get user's current active vibe
  async getUserCurrentVibe(userId: string): Promise<UserVibe | null> {
    try {
      // Simple query first - get all user vibes and filter client-side temporarily
      const q = query(
        collection(db, 'userVibes'),
        where('userId', '==', userId),
        where('isActive', '==', true),
        limit(10) // Get recent vibes and sort client-side
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const nowMs = Date.now();
      const validVibes: UserVibe[] = [];

      for (const doc of snapshot.docs) {
        const data = { id: doc.id, ...doc.data() } as UserVibe;
        const exp = (data as any)?.expiresAt as Timestamp | undefined;
        const expMs = exp?.toMillis?.() ?? Number.POSITIVE_INFINITY;

        if (expMs <= nowMs) {
          // Only cleanup if it's the current user's vibe
          if (auth.currentUser && auth.currentUser.uid === userId) {
            console.log('🗑️ VibeService: Found expired vibe during fetch, cleaning up:', data.id);
            // Fire and forget cleanup
            this.removeUserVibe(userId, data.id).catch(e => console.error('Failed to auto-cleanup vibe', e));
          }
        } else {
          validVibes.push(data);
        }
      }

      // Sort by createdAt descending
      validVibes.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      return validVibes[0] || null;
    } catch (error) {
      console.error('Error getting user current vibe:', error);
      return null;
    }
  }

  // Get nearby users with vibes
  async getNearbyVibes(
    userLocation: { latitude: number; longitude: number },
    radiusKm: number = 10
  ): Promise<UserVibe[]> {
    try {
      // Simplified query - get active vibes and filter location client-side
      const q = query(
        collection(db, 'userVibes'),
        where('isActive', '==', true),
        limit(100) // Get more and filter client-side
      );

      const snapshot = await getDocs(q);
      const vibes: UserVibe[] = [];
      const nowMs = Date.now();

      snapshot.forEach(doc => {
        const data = doc.data() as any;
        // Skip expired locally
        const exp = data?.expiresAt as Timestamp | undefined;
        const expMs = exp?.toMillis?.() ?? Number.POSITIVE_INFINITY;
        if (expMs <= nowMs) return;

        // Check if has location and is within radius
        if (data.location &&
          data.location.latitude &&
          data.location.longitude &&
          this.calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            data.location.latitude,
            data.location.longitude
          ) <= radiusKm) {
          vibes.push({
            id: doc.id,
            ...data
          } as UserVibe);
        }
      });

      // Sort by creation time descending
      vibes.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      return vibes.slice(0, 50); // Return top 50
    } catch (error) {
      console.error('Error getting nearby vibes:', error);
      return [];
    }
  }

  // Get vibes by category
  async getVibesByCategory(category: string, limitCount: number = 20): Promise<UserVibe[]> {
    try {
      // Simplified query - get all active vibes and filter by category client-side
      const q = query(
        collection(db, 'userVibes'),
        where('isActive', '==', true),
        limit(100)
      );

      const snapshot = await getDocs(q);
      const vibes: UserVibe[] = [];
      const nowMs = Date.now();

      snapshot.forEach(doc => {
        const data = doc.data() as any;

        // Skip expired locally
        const exp = data?.expiresAt as Timestamp | undefined;
        const expMs = exp?.toMillis?.() ?? Number.POSITIVE_INFINITY;
        if (expMs <= nowMs) return;

        // Filter by category client-side
        if (data.vibe && data.vibe.category === category) {
          vibes.push({
            id: doc.id,
            ...data
          } as UserVibe);
        }
      });

      // Sort by creation time descending
      vibes.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      return vibes.slice(0, limitCount);
    } catch (error) {
      console.error('Error getting vibes by category:', error);
      return [];
    }
  }

  // Get user's vibe history
  async getUserVibeHistory(userId: string, limitCount: number = 20): Promise<UserVibe[]> {
    try {
      // Simple query - just by userId, sort client-side
      const q = query(
        collection(db, 'userVibes'),
        where('userId', '==', userId),
        limit(50) // Get more and sort client-side
      );

      const snapshot = await getDocs(q);
      const vibes: UserVibe[] = [];

      snapshot.forEach(doc => {
        vibes.push({
          id: doc.id,
          ...doc.data()
        } as UserVibe);
      });

      // Sort by creation time descending
      vibes.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      return vibes.slice(0, limitCount);
    } catch (error) {
      console.error('Error getting user vibe history:', error);
      return [];
    }
  }

  // Remove user's current vibe
  async removeUserVibe(userId: string, vibeId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'userVibes', vibeId), {
        isActive: false
      });

      // Remove from user's current vibe
      await updateDoc(doc(db, 'users', userId), {
        currentVibe: null
      });
    } catch (error) {
      console.error('Error removing user vibe:', error);
      throw error;
    }
  }

  // Listen to user's vibe changes
  subscribeToUserVibe(userId: string, callback: (vibe: UserVibe | null) => void): () => void {
    console.log('🔔 VibeService: Starting subscription for user:', userId);

    // Simple subscription - get user's active vibes and handle client-side
    const q = query(
      collection(db, 'userVibes'),
      where('userId', '==', userId),
      where('isActive', '==', true),
      limit(5)
    );

    return onSnapshot(q, (snapshot) => {
      console.log('🔔 VibeService: Subscription callback triggered, docs count:', snapshot.size);

      if (snapshot.empty) {
        console.log('🔔 VibeService: No active vibes found, calling callback with null');
        callback(null);
      } else {
        // Get all docs and find the most recent
        const nowMs = Date.now();
        const validVibes: UserVibe[] = [];

        snapshot.docs.forEach(doc => {
          const data = { id: doc.id, ...doc.data() } as UserVibe;
          const exp = (data as any)?.expiresAt as Timestamp | undefined;
          const expMs = exp?.toMillis?.() ?? Number.POSITIVE_INFINITY;

          if (expMs <= nowMs) {
            // Only cleanup if it's the current user's vibe
            if (auth.currentUser && auth.currentUser.uid === userId) {
              console.log('🗑️ VibeService: Found expired vibe during subscription, cleaning up:', data.id);
              // Fire and forget cleanup
              this.removeUserVibe(userId, data.id).catch(e => console.error('Failed to auto-cleanup vibe', e));
            }
          } else {
            console.log('🔔 VibeService: Found active vibe:', data);
            validVibes.push(data);
          }
        });

        // Sort by creation time descending
        validVibes.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });

        const latestVibe = validVibes[0] || null;
        console.log('🔔 VibeService: Calling callback with latest vibe:', latestVibe);
        callback(latestVibe);
      }
    });
  }

  // Listen to nearby vibes
  subscribeToNearbyVibes(
    userLocation: { latitude: number; longitude: number },
    callback: (vibes: UserVibe[]) => void
  ): () => void {
    // Simple subscription - get active vibes and filter client-side
    const q = query(
      collection(db, 'userVibes'),
      where('isActive', '==', true),
      limit(100)
    );

    return onSnapshot(q, (snapshot) => {
      const vibes: UserVibe[] = [];
      const nowMs = Date.now();

      snapshot.forEach(doc => {
        const data = doc.data() as any;

        // Skip expired locally
        const exp = data?.expiresAt as Timestamp | undefined;
        const expMs = exp?.toMillis?.() ?? Number.POSITIVE_INFINITY;
        if (expMs <= nowMs) return;

        if (data.location &&
          data.location.latitude &&
          data.location.longitude &&
          this.calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            data.location.latitude,
            data.location.longitude
          ) <= 10) {
          vibes.push({
            id: doc.id,
            ...data
          } as UserVibe);
        }
      });

      // Sort by creation time descending
      vibes.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      callback(vibes.slice(0, 50));
    });
  }

  // Get vibe statistics
  async getVibeStats(): Promise<VibeStats> {
    try {
      const q = query(
        collection(db, 'userVibes'),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(q);
      const vibeCount: { [key: string]: number } = {};
      const recentActivity: UserVibe[] = [];
      const nowMs = Date.now();

      snapshot.forEach(doc => {
        const data = doc.data() as UserVibe as any;

        // Skip expired locally
        const exp = data?.expiresAt as Timestamp | undefined;
        const expMs = exp?.toMillis?.() ?? Number.POSITIVE_INFINITY;
        if (expMs <= nowMs) return;

        const vibeId = (data as any).vibeId as string;

        vibeCount[vibeId] = (vibeCount[vibeId] || 0) + 1;

        if (recentActivity.length < 10) {
          recentActivity.push({
            ...(data as any),
            id: doc.id
          } as UserVibe);
        }
      });

      // Sort by popularity
      const popularVibes = Object.entries(vibeCount)
        .map(([vibeId, count]) => ({
          vibe: PREDEFINED_VIBES.find(v => v.id === vibeId)!,
          count
        }))
        .filter(item => item.vibe)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalVibes: Object.values(vibeCount).reduce((a, b) => a + b, 0),
        popularVibes,
        recentActivity: recentActivity.sort((a, b) =>
          (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
        )
      };
    } catch (error) {
      console.error('Error getting vibe stats:', error);
      return {
        totalVibes: 0,
        popularVibes: [],
        recentActivity: []
      };
    }
  }

  // Record a quick reaction or reply on a vibe
  async addVibeReaction(
    vibeId: string,
    fromUserId: string,
    { emoji, text }: { emoji?: string; text?: string }
  ): Promise<string> {
    const reactionsRef = collection(db, 'userVibes', vibeId, 'reactions');
    const payload: any = {
      fromUserId,
      createdAt: serverTimestamp(),
    };
    if (emoji) payload.emoji = emoji;
    if (text) payload.text = text;
    const docRef = await addDoc(reactionsRef, payload);
    return docRef.id;
  }

  // Mark a vibe as seen by a viewer (server-side sync)
  async markVibeSeen(vibeId: string, viewerId: string): Promise<void> {
    const seenRef = doc(db, 'userVibes', vibeId, 'seenBy', viewerId);
    await setDoc(seenRef, { seenAt: serverTimestamp() }, { merge: true });
  }

  // Private helper methods
  private async deactivateUserVibes(userId: string): Promise<void> {
    console.log('🔧 VibeService: Deactivating previous vibes for user:', userId);

    const q = query(
      collection(db, 'userVibes'),
      where('userId', '==', userId),
      where('isActive', '==', true)
    );

    const snapshot = await getDocs(q);
    console.log('🔧 VibeService: Found', snapshot.size, 'active vibes to deactivate');

    const batch: Promise<void>[] = [];

    snapshot.forEach(doc => {
      console.log('🔧 VibeService: Deactivating vibe:', doc.id);
      batch.push(updateDoc(doc.ref, { isActive: false }));
    });

    await Promise.all(batch);
    console.log('✅ VibeService: Deactivated all previous vibes');
  }

  private async updateVibeStats(vibeId: string): Promise<void> {
    try {
      console.log('📊 VibeService: Updating vibe stats for:', vibeId);
      const statsRef = doc(db, 'vibeStats', vibeId);
      const statsDoc = await getDoc(statsRef);

      if (statsDoc.exists()) {
        console.log('📊 VibeService: Updating existing stats document');
        await updateDoc(statsRef, {
          count: increment(1),
          lastUsed: serverTimestamp()
        });
      } else {
        console.log('📊 VibeService: Creating new stats document');
        await setDoc(statsRef, {
          vibeId,
          count: 1,
          lastUsed: serverTimestamp()
        });
      }
      console.log('✅ VibeService: Vibe stats updated successfully');
    } catch (error) {
      console.error('❌ VibeService: Error updating vibe stats:', error);
      // Don't throw error - stats update failure shouldn't break vibe setting
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in kilometers
    return d;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

export const vibeService = VibeService.getInstance();
