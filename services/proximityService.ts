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
      const nearbyUsers: NearbyUser[] = [];

      const currentTime = Date.now();

      querySnapshot.forEach((docSnap) => {
        if (docSnap.id === userId) return; // Skip self

        const userData = docSnap.data();
        if (!userData.location) return;

        // Check if location data is recent enough
        if (!includeOffline && userData.lastLocationUpdate) {
          const lastUpdate = userData.lastLocationUpdate.toMillis
            ? userData.lastLocationUpdate.toMillis()
            : new Date(userData.lastLocationUpdate).getTime();

          if (currentTime - lastUpdate > maxAge) {
            console.log(`⏱️ User ${docSnap.id} location is too old, skipping`);
            return;
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

          nearbyUsers.push({
            id: docSnap.id,
            name: userData.name || userData.username || 'Unknown',
            photoURL: userData.photoURL || userData.profileImage || 'https://via.placeholder.com/150',
            distance: Math.round(distance),
            bearing,
            location: {
              latitude: userLat,
              longitude: userLon,
            },
            bio: userData.bio,
            age: userData.age,
            lastLocationUpdate: userData.lastLocationUpdate?.toDate?.()?.toISOString?.() || userData.lastLocationUpdate,
          });
        }
      });

      // Sort by distance
      nearbyUsers.sort((a, b) => a.distance - b.distance);

      console.log(`✅ Found ${nearbyUsers.length} nearby users within ${radius}m`);
      return nearbyUsers;
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

    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        if (userData.location) {
          onUpdate({
            id: docSnap.id,
            name: userData.name || userData.username || 'Unknown',
            photoURL: userData.photoURL || userData.profileImage || 'https://via.placeholder.com/150',
            distance: 0, // Will be calculated by caller
            bearing: 0, // Will be calculated by caller
            location: {
              latitude: userData.location.latitude,
              longitude: userData.location.longitude,
            },
            bio: userData.bio,
            age: userData.age,
            lastLocationUpdate: userData.lastLocationUpdate?.toDate?.()?.toISOString?.() || userData.lastLocationUpdate,
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
   * Get address from coordinates (safe version)
   */
  async getAddressFromCoordinates(
    latitude: number,
    longitude: number
  ): Promise<string | null> {
    try {
      const addresses = await safeReverseGeocodeAsync({ latitude, longitude });
      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        const parts = [
          address.street,
          address.city,
          address.region,
          address.country
        ].filter(Boolean);

        return parts.length > 0 ? parts.join(', ') : null;
      }
      return null;
    } catch (error) {
      console.error('Error getting address from coordinates:', error);
      return null;
    }
  }
}

// Export singleton instance
export const proximityService = new ProximityService();

export default proximityService;
