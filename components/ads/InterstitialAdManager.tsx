import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

// Use TestIds.INTERSTITIAL for development, replace with your production ID
const AD_UNIT_ID = __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-9844251118980104/xxxxxxxxxx'; // Replace with actual prod ID if available

const InterstitialAdManager = () => {
    const [loaded, setLoaded] = useState(false);
    const loadedRef = useRef(false); // Use ref for synchronous access in callbacks
    const interstitialRef = useRef<InterstitialAd | null>(null);
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        console.log('InterstitialAdManager mounted');
        // Initialize the ad
        loadAd();

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            console.log('InterstitialAdManager unmounted');
            subscription.remove();
            interstitialRef.current = null;
        };
    }, []);

    const loadAd = () => {
        console.log('Loading Interstitial Ad...');
        const interstitial = InterstitialAd.createForAdRequest(AD_UNIT_ID, {
            requestNonPersonalizedAdsOnly: true,
        });

        interstitial.addAdEventListener(AdEventType.LOADED, () => {
            console.log('Interstitial Ad LOADED');
            setLoaded(true);
            loadedRef.current = true;
        });

        interstitial.addAdEventListener(AdEventType.CLOSED, () => {
            console.log('Interstitial Ad CLOSED');
            setLoaded(false);
            loadedRef.current = false;
            // Load the next ad
            loadAd();
        });

        interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
            console.warn('Interstitial Ad Error:', error);
            setLoaded(false);
            loadedRef.current = false;
        });

        interstitial.load();
        interstitialRef.current = interstitial;
    };

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
        console.log(`AppState changed: ${appState.current} -> ${nextAppState}`);
        if (
            appState.current.match(/inactive|background/) &&
            nextAppState === 'active'
        ) {
            // App has come to the foreground
            console.log('App came to foreground, checking ad trigger...');
            checkAndShowAd();
        }

        appState.current = nextAppState;
    };

    const checkAndShowAd = () => {
        // 33% chance to show ad
        const randomValue = Math.random();
        const shouldShow = randomValue < 0.33;
        const isLoaded = loadedRef.current;

        console.log(`Ad Check: random=${randomValue.toFixed(2)}, threshold=0.33, shouldShow=${shouldShow}, loaded=${isLoaded}`);

        if (shouldShow) {
            if (isLoaded && interstitialRef.current) {
                try {
                    console.log('Showing Interstitial Ad now');
                    interstitialRef.current.show();
                } catch (error) {
                    console.error('Failed to show interstitial ad:', error);
                }
            } else {
                console.log('Ad should show but is NOT LOADED yet. Reloading...');
                // If it's not loaded, try to load it again for next time
                if (!interstitialRef.current) {
                    loadAd();
                }
            }
        }
    };

    return null; // This component doesn't render anything visible
};

export default InterstitialAdManager;
