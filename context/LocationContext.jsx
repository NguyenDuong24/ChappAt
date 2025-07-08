import React, { createContext, useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { db } from '../firebaseConfig';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
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
                const geocode = await Location.reverseGeocodeAsync({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                });

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
        const userId = user?.uid;
        if (!userId) {
            console.error("User ID is missing");
            return;
        }

        const userLocationRef = doc(db, 'users', userId);

        try {
            await updateDoc(userLocationRef, {
                location: loc.coords,
                lastUpdated: new Date(),
            });
        } catch (error) {
            console.error('Error saving location to Firebase:', error);
        }
    };

    useEffect(() => {
        getLocation();

        const locationInterval = setInterval(() => {
            getLocation();
        }, 6000000);

        return () => clearInterval(locationInterval);
    }, [user]);

    return (
        <LocationContext.Provider value={{ location, errorMsg, loading, address }}>
            {children}
        </LocationContext.Provider>
    );
};
