import React, { createContext, useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { db } from '../firebaseConfig'; // Import db từ firebaseConfig
import { doc, setDoc, updateDoc } from 'firebase/firestore'; // Các phương thức Firestore cần thiết
import { useAuth } from '@/context/authContext';

export const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
    const [location, setLocation] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [address, setAddress] = useState(null);
    const [loading, setLoading] = useState(true);

    const { user } = useAuth();

    const getLocation = async () => {
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                setLoading(false);
                return;
            }

            let loc = await Location.getCurrentPositionAsync({});
            setLocation(loc);

            if (loc.coords.latitude && loc.coords.longitude) {
                // Geocoding: Lấy địa chỉ từ tọa độ
                const geocode = await Location.reverseGeocodeAsync({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                });

                console.log('address', geocode.length);

                if (geocode.length > 0) {
                    const { street, city, district, subregion, region, country } = geocode[0];
                    setAddress(`${street || ''}, ${district || subregion || city || ''}, ${region || ''}, ${country || ''}`);
                } else {
                    setAddress('No location available');
                }

                if (user) {
                    saveLocationToFirebase(loc);
                }
            } else {
                setErrorMsg('Invalid location data');
            }
        } catch (error) {
            setErrorMsg(error.message);
        } finally {
            setLoading(false);
        }
    };

    const saveLocationToFirebase = async (loc) => {
        const userId = user?.uid; // Lấy ID người dùng từ AuthContext
        if (!userId) {
            console.error("User ID is missing");
            return;
        }

        const userLocationRef = doc(db, 'users', userId); // Lấy tham chiếu tới document của người dùng trong Firestore

        try {
            // Cập nhật hoặc thêm vị trí vào Firestore
            await updateDoc(userLocationRef, {
                location: loc.coords,
                lastUpdated: new Date(),
            });

            console.log('Location saved to Firebase:', loc.coords);
        } catch (error) {
            console.error('Error saving location to Firebase:', error);
        }
    };

    useEffect(() => {
        getLocation();

        // Set interval để cập nhật vị trí sau một thời gian
        const locationInterval = setInterval(() => {
            getLocation();
        }, 60000); // Lấy lại vị trí mỗi 60 giây

        return () => clearInterval(locationInterval); // Dọn dẹp interval khi component unmount
    }, [user]); // Đảm bảo cập nhật vị trí khi user thay đổi

    return (
        <LocationContext.Provider value={{ location, errorMsg, loading, address }}>
            {children}
        </LocationContext.Provider>
    );
};
