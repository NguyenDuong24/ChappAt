import React, { createContext, useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { db } from '../firebaseConfig';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@/context/authContext';
import { getDistance, getRhumbLineBearing, getBounds } from 'geolib';

export const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [lastQueryTime, setLastQueryTime] = useState(0);
  const [cachedNearbyUsers, setCachedNearbyUsers] = useState([]);

  const { user, isAuthenticated } = useAuth();

  const CACHE_DURATION = 5 * 60 * 1000;
  const QUERY_DISTANCE = 1000;

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    return getDistance(
      { latitude: lat1, longitude: lon1 },
      { latitude: lat2, longitude: lon2 }
    );
  };

  const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const bearing = getRhumbLineBearing(
      { latitude: lat1, longitude: lon1 },
      { latitude: lat2, longitude: lon2 }
    );
    const directions = ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'];
    return directions[Math.round(bearing / 45) % 8];
  };

  const isPermissionError = (error) => {
    const errorStr = String(error?.message || error?.code || error);
    return errorStr.includes('permission-denied') || errorStr.includes('Missing or insufficient permissions');
  };

  const saveLocationToFirebase = async (loc) => {
    if (!user?.uid || isAuthenticated === false) {
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        location: {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        },
        lastUpdated: new Date(),
      });
    } catch (error) {
      if (!isPermissionError(error)) {
        console.error('Error saving location:', error);
      }
    }
  };

  const startWatchingLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Quyền truy cập vị trí bị từ chối');
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });

      setLocation(currentLocation);

      if (currentLocation.coords.latitude && currentLocation.coords.longitude) {
        saveLocationToFirebase(currentLocation);

        try {
          const geocode = await Location.reverseGeocodeAsync(currentLocation.coords);
          if (geocode.length > 0) {
            const { street, city, district, subregion, region, country } = geocode[0];
            const formattedAddress = [street, district || subregion || city, region, country].filter(Boolean).join(', ');
            setAddress(formattedAddress);
          } else {
            setAddress('Không thể xác định địa chỉ');
          }
        } catch (geocodeError) {
          setAddress('Không thể xác định địa chỉ');
        }
      }

      const subscription = await Location.watchPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 30000,
        distanceInterval: 10,
      }, (loc) => {
        setLocation(loc);
        if (loc.coords.latitude && loc.coords.longitude) {
          saveLocationToFirebase(loc);
          Location.reverseGeocodeAsync(loc.coords).then(geocode => {
            if (geocode.length > 0) {
              const { street, city, district, subregion, region, country } = geocode[0];
              const formattedAddress = [street, district || subregion || city, region, country].filter(Boolean).join(', ');
              setAddress(formattedAddress);
            }
          }).catch(() => { });
        }
      });

      setLoading(false);
      return subscription;
    } catch (error) {
      setErrorMsg('Không thể lấy vị trí: ' + error.message);
      setLoading(false);
    }
  };

  const queryNearbyUsers = async () => {
    if (!location || !user?.uid || isAuthenticated === false) return;

    const now = Date.now();
    if (now - lastQueryTime < CACHE_DURATION && cachedNearbyUsers.length > 0) {
      setNearbyUsers(cachedNearbyUsers);
      return;
    }

    try {
      const center = { latitude: location.coords.latitude, longitude: location.coords.longitude };
      const bounds = getBounds(center, QUERY_DISTANCE);

      const usersQuery = query(
        collection(db, 'users'),
        where('location.latitude', '>=', bounds[0].latitude),
        where('location.latitude', '<=', bounds[1].latitude)
      );

      const snapshot = await getDocs(usersQuery);
      const nearby = [];

      snapshot.forEach(docItem => {
        const data = docItem.data();
        if (docItem.id !== user.uid && data.location?.latitude && data.location?.longitude) {
          if (data.location.longitude >= bounds[0].longitude && data.location.longitude <= bounds[1].longitude) {
            const dist = calculateDistance(center.latitude, center.longitude, data.location.latitude, data.location.longitude);
            if (dist <= 100) {
              const direction = calculateBearing(center.latitude, center.longitude, data.location.latitude, data.location.longitude);
              nearby.push({ userId: docItem.id, distance: dist.toFixed(0), direction, ...data });
            }
          }
        }
      });

      setNearbyUsers(nearby);
      setCachedNearbyUsers(nearby);
      setLastQueryTime(now);
    } catch (error) {
      if (!isPermissionError(error)) {
        console.error('Error querying nearby users:', error);
      }
    }
  };

  useEffect(() => {
    let subscription;
    let queryInterval;

    if (user?.uid && isAuthenticated === true) {
      (async () => {
        subscription = await startWatchingLocation();
        queryInterval = setInterval(() => {
          if (user?.uid && isAuthenticated === true) {
            queryNearbyUsers();
          }
        }, 5 * 60 * 1000);
      })();
    } else {
      setLoading(false);
    }

    return () => {
      subscription?.remove();
      if (queryInterval) clearInterval(queryInterval);
    };
  }, [user?.uid, isAuthenticated]);

  return (
    <LocationContext.Provider value={{ location, errorMsg, loading, address, nearbyUsers, queryNearbyUsers }}>
      {children}
    </LocationContext.Provider>
  );
};