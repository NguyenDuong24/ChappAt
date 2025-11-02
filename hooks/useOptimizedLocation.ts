import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/authContext';
import globalOptimizationService from '@/services/globalOptimizationService';
import * as Location from 'expo-location';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

interface NearbyUser {
  userId: string;
  distance: number;
  direction: string;
  displayName?: string;
  profileUrl?: string;
}

interface UseOptimizedLocationProps {
  enableLocationTracking?: boolean;
  enableNearbyQuery?: boolean;
  nearbyRadius?: number;
  updateInterval?: number;
}

export const useOptimizedLocation = ({
  enableLocationTracking = true,
  enableNearbyQuery = true,
  nearbyRadius = 1000,
  updateInterval = 5 * 60 * 1000 // 5 phút
}: UseOptimizedLocationProps = {}) => {
  const { user } = useAuth();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  // Request location permission and get current location
  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        return false;
      }
      return true;
    } catch (err) {
      setError('Failed to request location permission');
      return false;
    }
  }, []);

  // Get current location (optimized)
  const getCurrentLocation = useCallback(async (): Promise<LocationData | null> => {
    if (!enableLocationTracking) return null;

    try {
      setLoading(true);
      setError(null);

      const hasPermission = await requestLocationPermission();
      if (!hasPermission) return null;

      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced // Changed from High to Balanced for better battery
      });

      const locationData: LocationData = {
        latitude: locationResult.coords.latitude,
        longitude: locationResult.coords.longitude,
        accuracy: locationResult.coords.accuracy || undefined,
        timestamp: Date.now()
      };

      setLocation(locationData);
      setLastUpdate(Date.now());

      // Save to Firebase (with rate limiting)
      if (user?.uid) {
        await saveLocationToFirebase(locationData);
      }

      return locationData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get location';
      setError(errorMessage);
      console.error('Location error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [enableLocationTracking, user?.uid, requestLocationPermission]);

  // Save location to Firebase (rate limited)
  const saveLocationToFirebase = useCallback(async (locationData: LocationData) => {
    if (!user?.uid) return;

    try {
      // Ensure user is authenticated
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      if (!auth.currentUser) {
        console.warn('User not authenticated, skipping location save');
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        location: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error saving location to Firebase:', error);
    }
  }, [user?.uid]);

  // Query nearby users (optimized)
  const queryNearbyUsers = useCallback(async (currentLocation?: LocationData): Promise<NearbyUser[]> => {
    if (!enableNearbyQuery || !user?.uid) return [];

    const locationToUse = currentLocation || location;
    if (!locationToUse) return [];

    try {
      const nearby = await globalOptimizationService.queryOptimizedNearbyUsers(
        {
          latitude: locationToUse.latitude,
          longitude: locationToUse.longitude
        },
        user.uid,
        nearbyRadius
      );

      setNearbyUsers(nearby);
      return nearby;
    } catch (error) {
      console.error('Error querying nearby users:', error);
      return [];
    }
  }, [enableNearbyQuery, user?.uid, location, nearbyRadius]);

  // Update location and query nearby users
  const updateLocationAndNearby = useCallback(async () => {
    if (!user?.uid) return;

    // Rate limiting: don't update too frequently
    const now = Date.now();
    if (now - lastUpdate < updateInterval) {
      console.log('🚫 Rate limited: skipping location update');
      return;
    }

    console.log('📍 Updating location and nearby users...');
    
    const currentLocation = await getCurrentLocation();
    if (currentLocation && enableNearbyQuery) {
      await queryNearbyUsers(currentLocation);
    }
  }, [user?.uid, lastUpdate, updateInterval, getCurrentLocation, queryNearbyUsers, enableNearbyQuery]);

  // Setup location watching (optimized)
  useEffect(() => {
    if (!user?.uid || !enableLocationTracking) return;

    let locationSubscription: Location.LocationSubscription | null = null;
    let nearbyQueryInterval: NodeJS.Timeout | null = null;

    const setupLocationWatching = async () => {
      try {
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) return;

        // Get initial location
        await updateLocationAndNearby();

        // Setup location watching with optimized settings
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 30000, // 30 seconds
            distanceInterval: 50, // 50 meters
          },
          async (newLocation) => {
            const locationData: LocationData = {
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
              accuracy: newLocation.coords.accuracy || undefined,
              timestamp: Date.now()
            };

            setLocation(locationData);
            
            // Rate limited Firebase save
            const now = Date.now();
            if (now - lastUpdate > 60000) { // Save to Firebase max once per minute
              await saveLocationToFirebase(locationData);
              setLastUpdate(now);
            }
          }
        );

        // Setup nearby users query interval (less frequent)
        if (enableNearbyQuery) {
          nearbyQueryInterval = setInterval(async () => {
            if (location) {
              await queryNearbyUsers();
            }
          }, updateInterval);
        }

      } catch (error) {
        console.error('Error setting up location watching:', error);
        setError('Failed to setup location tracking');
      }
    };

    setupLocationWatching();

    // Cleanup
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
      if (nearbyQueryInterval) {
        clearInterval(nearbyQueryInterval);
      }
    };
  }, [user?.uid, enableLocationTracking, enableNearbyQuery, updateInterval]);

  // Manual refresh
  const refreshLocation = useCallback(async () => {
    await updateLocationAndNearby();
  }, [updateLocationAndNearby]);

  // Manual nearby query
  const refreshNearbyUsers = useCallback(async () => {
    if (location) {
      await queryNearbyUsers();
    }
  }, [location, queryNearbyUsers]);

  return {
    location,
    nearbyUsers,
    loading,
    error,
    refreshLocation,
    refreshNearbyUsers,
    updateLocationAndNearby,
    lastUpdate: new Date(lastUpdate)
  };
};
