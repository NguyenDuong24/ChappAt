import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { coinServerApi } from '../../src/services/coinServerApi';

const DEFAULT_ANDROID_AD_UNIT_ID = '';
const DEFAULT_IOS_AD_UNIT_ID = '';

const InterstitialAdManager = () => {
    const [loaded, setLoaded] = useState(false);
    const loadedRef = useRef(false);
    const interstitialRef = useRef<InterstitialAd | null>(null);
    const adUnsubscribesRef = useRef<(() => void)[]>([]);
    const appState = useRef(AppState.currentState);
    const isMountedRef = useRef(true);
    
    // Config states
    const configRef = useRef({
        enabled: false,
        showRate: 0.25, // default 1/4
        minSecondsBetween: 180,
        unitId: Platform.OS === 'ios' ? DEFAULT_IOS_AD_UNIT_ID : DEFAULT_ANDROID_AD_UNIT_ID,
    });
    
    const lastShowTimeRef = useRef(0);

    useEffect(() => {
        isMountedRef.current = true;

        // Fetch config once on mount
        const fetchConfig = async () => {
            try {
                const res = await coinServerApi.getAppConfig();
                if (res?.ads) {
                    configRef.current = {
                        enabled: res.ads.interstitialEnabled !== false,
                        showRate: res.ads.interstitialShowRate ?? 0.25,
                        minSecondsBetween: res.ads.minSecondsBetweenInterstitials ?? 180,
                        unitId: Platform.OS === 'ios'
                            ? (res.ads.iosInterstitialAdUnitId || DEFAULT_IOS_AD_UNIT_ID)
                            : (res.ads.androidInterstitialAdUnitId || DEFAULT_ANDROID_AD_UNIT_ID),
                    };
                    console.log('AdManager configured:', configRef.current);
                }
            } catch (err) {
                console.warn('AdManager config fetch failed, using defaults', err);
            }
            
            // Only load ad if enabled
            if (isMountedRef.current && configRef.current.enabled && configRef.current.unitId) {
                loadAd();
            }
        };

        fetchConfig();

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            isMountedRef.current = false;
            subscription.remove();
            adUnsubscribesRef.current.forEach(unsubscribe => unsubscribe());
            adUnsubscribesRef.current = [];
            interstitialRef.current = null;
        };
    }, []);

    const loadAd = () => {
        if (!isMountedRef.current || !configRef.current.enabled || !configRef.current.unitId || interstitialRef.current) return;
        adUnsubscribesRef.current.forEach(unsubscribe => unsubscribe());
        adUnsubscribesRef.current = [];
        
        console.log('Loading Interstitial Ad with unit:', configRef.current.unitId);
        const interstitial = InterstitialAd.createForAdRequest(configRef.current.unitId, {
            requestNonPersonalizedAdsOnly: true,
        });

        adUnsubscribesRef.current.push(interstitial.addAdEventListener(AdEventType.LOADED, () => {
            if (!isMountedRef.current) return;
            setLoaded(true);
            loadedRef.current = true;
        }));

        adUnsubscribesRef.current.push(interstitial.addAdEventListener(AdEventType.CLOSED, () => {
            if (!isMountedRef.current) return;
            setLoaded(false);
            loadedRef.current = false;
            interstitialRef.current = null;
            // Preload next ad
            loadAd();
        }));

        adUnsubscribesRef.current.push(interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
            if (!isMountedRef.current) return;
            console.warn('Interstitial Ad Error:', error);
            setLoaded(false);
            loadedRef.current = false;
            interstitialRef.current = null;
        }));

        try {
            interstitial.load();
            interstitialRef.current = interstitial;
        } catch (e) {
            console.warn('Ad load catch:', e);
        }
    };

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (
            appState.current.match(/inactive|background/) &&
            nextAppState === 'active'
        ) {
            checkAndShowAd();
        }
        appState.current = nextAppState;
    };

    const checkAndShowAd = () => {
        const conf = configRef.current;
        if (!conf.enabled) return;

        const now = Date.now() / 1000;
        const secondsSinceLastShow = now - lastShowTimeRef.current;
        
        if (secondsSinceLastShow < conf.minSecondsBetween) {
            console.log(`Ad skipped: Too soon (${secondsSinceLastShow.toFixed(1)}s < ${conf.minSecondsBetween}s)`);
            return;
        }

        const randomValue = Math.random();
        const shouldShow = randomValue < conf.showRate;
        const isLoaded = loadedRef.current;

        console.log(`Ad Check: rand=${randomValue.toFixed(2)}, rate=${conf.showRate}, show=${shouldShow}, loaded=${isLoaded}`);

        if (shouldShow) {
            if (isLoaded && interstitialRef.current) {
                try {
                    lastShowTimeRef.current = now;
                    interstitialRef.current.show();
                } catch (error) {
                    console.error('Failed to show interstitial ad:', error);
                }
            } else {
                if (!interstitialRef.current) {
                    loadAd();
                }
            }
        }
    };

    return null;
};

export default InterstitialAdManager;

