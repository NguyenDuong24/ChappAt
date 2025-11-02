import React, { createContext, useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { db } from '../firebaseConfig';
import { doc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@/context/authContext';
import { getDistance, getRhumbLineBearing, getBounds } from 'geolib';

export const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nearbyUsers, setNearbyUsers] = useState([]);  // Lưu danh sách người dùng gần

  const { user } = useAuth();

  // Hàm tính khoảng cách sử dụng geolib (thay thế Haversine tự implement)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    return getDistance(
      { latitude: lat1, longitude: lon1 },
      { latitude: lat2, longitude: lon2 }
    );
  };

  // Hàm tính hướng sử dụng geolib (thay thế bearing tự implement)
  const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const bearing = getRhumbLineBearing(
      { latitude: lat1, longitude: lon1 },
      { latitude: lat2, longitude: lon2 }
    );
    const directions = ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'];
    return directions[Math.round(bearing / 45) % 8];
  };

  const startWatchingLocation = async () => {
    try {
      console.log('🌍 Requesting location permission...');
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ Location permission denied');
        setErrorMsg('Quyền truy cập vị trí bị từ chối');
        setLoading(false);
        return;
      }

      console.log('✅ Location permission granted, getting current position...');
      // Lấy vị trí hiện tại trước
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000, // 10 seconds timeout
      });
      
      console.log('📍 Got current location:', currentLocation.coords);
      setLocation(currentLocation);
      
      if (currentLocation.coords.latitude && currentLocation.coords.longitude) {
        // Lưu vị trí vào Firebase
        saveLocationToFirebase(currentLocation);

        // Reverse geocoding
        try {
          console.log('🔍 Reverse geocoding...');
          const geocode = await Location.reverseGeocodeAsync(currentLocation.coords);
          if (geocode.length > 0) {
            const { street, city, district, subregion, region, country } = geocode[0];
            const formattedAddress = [
              street,
              district || subregion || city,
              region,
              country
            ].filter(Boolean).join(', ');
            console.log('📍 Address found:', formattedAddress);
            setAddress(formattedAddress);
          } else {
            console.log('⚠️ No geocode results');
            setAddress('Không thể xác định địa chỉ');
          }
        } catch (geocodeError) {
          console.error('Geocoding error:', geocodeError);
          setAddress('Không thể xác định địa chỉ');
        }
      }

      // Sau đó bắt đầu watch vị trí
      const subscription = await Location.watchPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 30000,
        distanceInterval: 10,
      }, (loc) => {
        setLocation(loc);
        if (loc.coords.latitude && loc.coords.longitude) {
          // Lưu vị trí vào Firebase
          saveLocationToFirebase(loc);

          // Reverse geocode
          Location.reverseGeocodeAsync(loc.coords).then(geocode => {
            if (geocode.length > 0) {
              const { street, city, district, subregion, region, country } = geocode[0];
              const formattedAddress = [
                street,
                district || subregion || city,
                region,
                country
              ].filter(Boolean).join(', ');
              setAddress(formattedAddress);
            }
          }).catch(error => {
            console.error('Geocoding error:', error);
          });
        }
      });

      console.log('✅ Location setup complete');
      setLoading(false);
      return subscription;
    } catch (error) {
      console.error('❌ Location error:', error);
      setErrorMsg('Không thể lấy vị trí: ' + error.message);
      setLoading(false);
    }
  };

  const saveLocationToFirebase = async (loc) => {
    if (!user?.uid) return;
    const userRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userRef, {
        location: {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        },
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };

  // Cache để tránh query liên tục
  const [lastQueryTime, setLastQueryTime] = useState(0);
  const [cachedNearbyUsers, setCachedNearbyUsers] = useState([]);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 phút cache
  const QUERY_DISTANCE = 1000; // Tăng lên 1km để giảm số lần query

  // Query người dùng gần - OPTIMIZED VERSION với geolib
  const queryNearbyUsers = async () => {
    if (!location || !user?.uid) return;
    
    // Kiểm tra cache trước khi query
    const now = Date.now();
    if (now - lastQueryTime < CACHE_DURATION && cachedNearbyUsers.length > 0) {
      console.log('🚀 Using cached nearby users');
      setNearbyUsers(cachedNearbyUsers);
      return;
    }
    
    try {
      // Sử dụng getBounds từ geolib để tính bounding box chính xác hơn
      const center = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      const bounds = getBounds(center, QUERY_DISTANCE);
      
      // Query với geographic bounds chính xác từ geolib
      const usersQuery = query(
        collection(db, 'users'),
        where('location.latitude', '>=', bounds[0].latitude),
        where('location.latitude', '<=', bounds[1].latitude)
      );
      
      const snapshot = await getDocs(usersQuery);
      const nearby = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (doc.id !== user.uid && data.location && data.location.latitude && data.location.longitude) {
          // Additional check for longitude (Firestore doesn't support multiple range queries)
          if (data.location.longitude >= bounds[0].longitude && data.location.longitude <= bounds[1].longitude) {
            const dist = calculateDistance(
              center.latitude, center.longitude,
              data.location.latitude, data.location.longitude
            );
            
            // Chỉ lấy user trong bán kính 100m cho display
            if (dist <= 100) {
              const direction = calculateBearing(
                center.latitude, center.longitude,
                data.location.latitude, data.location.longitude
              );
              nearby.push({
                userId: doc.id,
                distance: dist.toFixed(0),
                direction,
                ...data
              });
            }
          }
        }
      });
      
      setNearbyUsers(nearby);
      setCachedNearbyUsers(nearby);
      setLastQueryTime(now);
      
      console.log(`✅ Found ${nearby.length} nearby users (queried ${snapshot.docs.length} docs)`);
    } catch (error) {
      console.error('Error querying nearby users:', error);
    }
  };

  // Gửi thông báo cho người dùng khác (tạm thời comment để tránh lỗi)
  const sendNotificationToUser = async (targetUserId, dist, direction) => {
    // TODO: Implement FCM notifications
    console.log(`User ${targetUserId} is ${dist}m away to the ${direction}`);
  };

  useEffect(() => {
    let subscription;
    let queryInterval;

    if (user?.uid) {
      (async () => {
        console.log('🚀 Starting location services for user:', user.uid);
        subscription = await startWatchingLocation();
        
        // Query nearby định kỳ (mỗi 5 phút để giảm request)
        queryInterval = setInterval(() => {
          console.log('🔍 Querying nearby users...');
          queryNearbyUsers();
        }, 5 * 60 * 1000); // 5 phút thay vì 2 phút
      })();
    } else {
      console.log('⚠️ No user found, skipping location services');
      setLoading(false);
    }

    return () => {
      console.log('🧹 Cleaning up location services');
      subscription?.remove();
      if (queryInterval) clearInterval(queryInterval);
    };
  }, [user?.uid]); // Only depend on user.uid, not location

  return (
    <LocationContext.Provider value={{ location, errorMsg, loading, address, nearbyUsers, queryNearbyUsers }}>
      {children}
    </LocationContext.Provider>
  );
};