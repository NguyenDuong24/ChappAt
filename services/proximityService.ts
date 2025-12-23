import * as Location from 'expo-location';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  GeoPoint,
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getDistance, getGreatCircleBearing } from 'geolib';
import { safeReverseGeocodeAsync } from '../utils/geocodingUtils';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebaseConfig';

export interface NearbyUser {
  id: string;
  name: string;
  photoURL: string;
  distance: number;
  bearing: number;
  location: {
    latitude: number;
    longitude: number;
  };
  bio?: string;
  age?: number;
  lastLocationUpdate?: string;
}

export interface ProximityOptions {
  radius: number; // meters
  userId: string;
  includeOffline?: boolean; // Include users who haven't updated location recently
  maxAge?: number; // Maximum age of location data in milliseconds (default: 5 minutes)
}

class ProximityService {
  private locationSubscription: Location.LocationSubscription | null = null;
  private userSubscriptions: Map<string, () => void> = new Map();

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Location permission denied');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  /**
   * Get current location
   */
  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return location;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Update user's location in Firestore
   */
  async updateUserLocation(userId: string, location: Location.LocationObject): Promise<void> {
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        location: new GeoPoint(location.coords.latitude, location.coords.longitude),
        lastLocationUpdate: Timestamp.now(),
      });
      console.log('✅ Location updated for user:', userId);
    } catch (error) {
      console.error('Error updating user location:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two coordinates in meters
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    return getDistance(
      { latitude: lat1, longitude: lon1 },
      { latitude: lat2, longitude: lon2 }
    );
  }

  /**
   * Calculate bearing (direction) from point A to point B
   */
  calculateBearing(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    return getGreatCircleBearing(
      { latitude: lat1, longitude: lon1 },
      { latitude: lat2, longitude: lon2 }
    );
  }

  /**
   * Find nearby users within radius
   */
  async findNearbyUsers(
    myLocation: Location.LocationObject,
    options: ProximityOptions
  ): Promise<NearbyUser[]> {
    try {
      const { radius, userId, includeOffline = false, maxAge = 5 * 60 * 1000 } = options;

      // Query all users with location data
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('location', '!=', null));

      const querySnapshot = await getDocs(q);
      const nearbyUsersPromises = querySnapshot.docs.map(async (docSnap) => {
        if (docSnap.id === userId) return null; // Skip self

        const userData = docSnap.data();
        if (!userData.location) return null;

        // Check if location data is recent enough
        if (!includeOffline && userData.lastLocationUpdate) {
          const lastUpdate = this.convertTimestampToMillis(userData.lastLocationUpdate);

          if (lastUpdate && Date.now() - lastUpdate > maxAge) {
            console.log(`⏱️ User ${docSnap.id} location is too old, skipping`);
            return null;
          }
        }

        const userLat = userData.location.latitude;
        const userLon = userData.location.longitude;

        // Calculate distance
        const distance = this.calculateDistance(
          myLocation.coords.latitude,
          myLocation.coords.longitude,
          userLat,
          userLon
        );

        // Only include users within radius
        if (distance <= radius) {
          // Calculate bearing
          const bearing = this.calculateBearing(
            myLocation.coords.latitude,
            myLocation.coords.longitude,
            userLat,
            userLon
          );

          const photoURL = await this.resolvePhotoUrl(userData);

          return {
            id: docSnap.id,
            name: userData.name || userData.username || 'Unknown',
            photoURL,
            distance: Math.round(distance),
            bearing,
            location: {
              latitude: userLat,
              longitude: userLon,
            },
            bio: typeof userData?.bio === 'string' ? userData.bio : undefined,
            age: typeof userData?.age === 'number' ? userData.age : undefined,
            lastLocationUpdate: this.convertTimestampToString(userData.lastLocationUpdate),
          } as NearbyUser;
        }
        return null;
      });

      const nearbyUsersResolved = (await Promise.all(nearbyUsersPromises)).filter(Boolean) as NearbyUser[];

      // Sort by distance
      nearbyUsersResolved.sort((a, b) => a.distance - b.distance);

      console.log(`✅ Found ${nearbyUsersResolved.length} nearby users within ${radius}m`);
      return nearbyUsersResolved;
    } catch (error) {
      console.error('Error finding nearby users:', error);
      throw error;
    }
  }

  /**
   * Start watching location and auto-update in Firestore
   */
  async startLocationTracking(
    userId: string,
    interval: number = 10000,
    onLocationUpdate?: (location: Location.LocationObject) => void
  ): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }

      // Start watching location
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: interval,
          distanceInterval: 10, // Update every 10 meters
        },
        async (location) => {
          console.log('📍 Location updated:', location.coords);
          
          // Update in Firestore
          await this.updateUserLocation(userId, location);

          // Callback
          if (onLocationUpdate) {
            onLocationUpdate(location);
          }
        }
      );

      console.log('✅ Location tracking started');
    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw error;
    }
  }

  /**
   * Stop location tracking
   */
  stopLocationTracking(): void {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
      console.log('✅ Location tracking stopped');
    }
  }

  /**
   * Subscribe to real-time updates of a specific user's location
   */
  subscribeToUserLocation(
    userId: string,
    onUpdate: (user: NearbyUser | null) => void
  ): () => void {
    const userDocRef = doc(db, 'users', userId);

    const unsubscribe = onSnapshot(userDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        if (userData.location) {
          const photoUrl = await this.resolvePhotoUrl(userData);

          onUpdate({
            id: docSnap.id,
            name: userData.name || userData.username || 'Unknown',
            photoURL: photoUrl,
            distance: 0, // Will be calculated by caller
            bearing: 0, // Will be calculated by caller
            location: {
              latitude: userData.location.latitude,
              longitude: userData.location.longitude,
            },
            bio: typeof userData.bio === 'string' ? userData.bio : undefined,
            age: typeof userData.age === 'number' ? userData.age : undefined,
            lastLocationUpdate: this.convertTimestampToString(userData.lastLocationUpdate),
          });
        } else {
          onUpdate(null);
        }
      } else {
        onUpdate(null);
      }
    });

    this.userSubscriptions.set(userId, unsubscribe);
    return unsubscribe;
  }

  /**
   * Unsubscribe from user location updates
   */
  unsubscribeFromUserLocation(userId: string): void {
    const unsubscribe = this.userSubscriptions.get(userId);
    if (unsubscribe) {
      unsubscribe();
      this.userSubscriptions.delete(userId);
    }
  }

  /**
   * Unsubscribe from all user location updates
   */
  unsubscribeAll(): void {
    this.userSubscriptions.forEach((unsubscribe) => unsubscribe());
    this.userSubscriptions.clear();
  }

  /**
   * Format distance for display
   */
  formatDistance(distanceInMeters: number): string {
    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)}m`;
    } else {
      return `${(distanceInMeters / 1000).toFixed(1)}km`;
    }
  }

  /**
   * Get cardinal direction from bearing
   */
  getCardinalDirection(bearing: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  }

  /**
   * Clear user's location from Firestore (for privacy)
   */
  async clearUserLocation(userId: string): Promise<void> {
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        location: null,
        lastLocationUpdate: null,
      });
      console.log('✅ User location cleared');
    } catch (error) {
      console.error('Error clearing user location:', error);
      throw error;
    }
  }

  /**
   * Clean up all subscriptions and tracking
   */
  cleanup(): void {
    this.stopLocationTracking();
    this.unsubscribeAll();
    console.log('✅ Proximity service cleaned up');
  }

  /**
   * Get address from coordinates (safe version with fallback)
   */
  async getAddressFromCoordinates(
    latitude: number,
    longitude: number
  ): Promise<string> {
    // Return coordinate string as fallback
    const coordString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    
    try {
      const addresses = await safeReverseGeocodeAsync({ latitude, longitude });
      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        const parts = [
          address.street,
          address.district,
          address.city,
          address.region,
        ].filter(Boolean);

        return parts.length > 0 ? parts.join(', ') : coordString;
      }
      return coordString;
    } catch (error) {
      // Silent fail - errors already logged in safeReverseGeocodeAsync
      return coordString;
    }
  }

  /**
   * Resolve user photo URL asynchronously, supporting firebase storage refs (gs://) and storage paths
   */
  private async resolvePhotoUrl(userData: any): Promise<string> {
    const fallback = 'https://via.placeholder.com/150';
    const url = userData?.profileUrl || userData?.photoURL || userData?.profileImage || userData?.avatar || null;
    if (!url) return fallback;

    if (typeof url !== 'string') return fallback;

    // If already an http(s) URL return as-is
    if (/^https?:\/\//i.test(url)) return url;

    // If GS path like gs://bucket/path/to/file
    if (/^gs:\/\//i.test(url)) {
      const path = url.replace(/^gs:\/\/[\w.-]+\//i, '');
      try {
        const ref = storageRef(storage, path);
        const downloadUrl = await getDownloadURL(ref);
        return downloadUrl;
      } catch (error) {
        console.warn('Failed to get download URL from gs:// path', error);
        return fallback;
      }
    }

    // If path is like '/avatars/user.jpg' or 'avatars/user.jpg'
    const normalizedPath = url.startsWith('/') ? url.slice(1) : url;
    try {
      const ref = storageRef(storage, normalizedPath);
      const downloadUrl = await getDownloadURL(ref);
      return downloadUrl;
    } catch (error) {
      console.warn('Failed to get download URL for storage path:', normalizedPath, error);
      return fallback;
    }
  }

  /**
   * Convert Firestore Timestamp to ISO string safely
   */
  private convertTimestampToString(timestamp: any): string | undefined {
    if (!timestamp) return undefined;
    
    // If it's already a string, return it
    if (typeof timestamp === 'string') return timestamp;
    
    // If it has toDate method (Firestore Timestamp), use it
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      try {
        return timestamp.toDate().toISOString();
      } catch (error) {
        console.warn('Failed to convert Timestamp to Date:', error);
      }
    }
    
    // If it has seconds/nanoseconds (Firestore Timestamp object)
    if (timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
      try {
        const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
        return date.toISOString();
      } catch (error) {
        console.warn('Failed to convert timestamp object to Date:', error);
      }
    }
    
    // Fallback: try to convert to string
    try {
      return new Date(timestamp).toISOString();
    } catch (error) {
      console.warn('Failed to convert timestamp to string:', error);
      return undefined;
    }
  }

  /**
   * Convert Firestore Timestamp to milliseconds safely
   */
  private convertTimestampToMillis(timestamp: any): number | undefined {
    if (!timestamp) return undefined;
    
    // If it has toMillis method (Firestore Timestamp), use it
    if (timestamp.toMillis && typeof timestamp.toMillis === 'function') {
      try {
        return timestamp.toMillis();
      } catch (error) {
        console.warn('Failed to get millis from Timestamp:', error);
      }
    }
    
    // If it has seconds/nanoseconds (Firestore Timestamp object)
    if (timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
      try {
        return timestamp.seconds * 1000 + Math.floor(timestamp.nanoseconds / 1000000);
      } catch (error) {
        console.warn('Failed to convert timestamp object to millis:', error);
      }
    }
    
    // Try to convert as date
    try {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.getTime();
      }
    } catch (error) {
      console.warn('Failed to convert timestamp to millis:', error);
    }
    
    return undefined;
  }
}

// Export singleton instance
export const proximityService = new ProximityService();

export default proximityService;
