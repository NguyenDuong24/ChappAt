import React, { memo, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Modal,
    Animated as RNAnimated,
    Dimensions,
    Alert,
    ActivityIndicator,
    Platform,
    ScrollView,
    FlatList,
    SafeAreaView,
    Easing,
    Linking,
    useWindowDimensions,
    Switch,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import * as Location from 'expo-location';
import { Accelerometer, Magnetometer } from 'expo-sensors';
import { useAuth } from '@/context/authContext';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import proximityService, { NearbyUser } from '@/services/proximityService';
import { useRouter } from 'expo-router';
import encounterService, { NearMatchSettings } from '@/services/encounterService';
import nearbyAlertService, { NearbyEncounterAlert } from '@/services/nearbyAlertService';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/context/ThemeContext';
import { useThemedColors } from '@/hooks/useThemedColors';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const OFFLINE_MAX_AGE_MS = 10 * 60 * 1000;
const ENCOUNTER_DEDUP_WINDOW_MS = 10 * 60 * 1000;
const LOCATION_WATCH_INTERVAL_MS = 30000;
const LOCATION_WATCH_DISTANCE_M = 50;
const NEARBY_REFRESH_INTERVAL_MS = 20000;
const HEADING_TEXT_UPDATE_MS = 350;
const ALERT_COOLDOWN_MS = 5 * 60 * 1000;
const CLUSTER_PIXEL_THRESHOLD = 40; // px Ã¢â‚¬â€œ markers closer than this get grouped

type RadarCluster = {
    users: NearbyUser[];
    cx: number; // center x on radar
    cy: number; // center y on radar
};

type ScanFilter = 'online' | 'offline' | 'all';
type GenderFilter = 'all' | 'male' | 'female';
type AgePreset = 'all' | '18-22' | '23-30' | '31-40' | '41+';

const AGE_PRESET_RANGES: Record<Exclude<AgePreset, 'all'>, { min: number; max: number }> = {
    '18-22': { min: 18, max: 22 },
    '23-30': { min: 23, max: 30 },
    '31-40': { min: 31, max: 40 },
    '41+': { min: 41, max: 120 },
};

// Default avatar placeholder
const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=00ffff&color=000&size=150&name=U';

const ListSeparator = memo(() => <View style={styles.listSeparator} />);

const ProximityRadar = ({ embedded = false }: { embedded?: boolean }) => {
    const { t } = useTranslation();
    const { width, height } = useWindowDimensions();
    const { user } = useAuth();
    const router = useRouter();
    const { palette, isDark } = useTheme();
    const themedColors = useThemedColors();
    const [scanning, setScanning] = useState(false);
    const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
    // Use a separate state for display to throttle updates
    const [displayHeading, setDisplayHeading] = useState(0);
    const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null);
    const [myLocation, setMyLocation] = useState<Location.LocationObject | null>(null);
    const [searchRadius, setSearchRadius] = useState(5000);
    const [scanFilter, setScanFilter] = useState<ScanFilter>('online');
    const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
    const [agePreset, setAgePreset] = useState<AgePreset>('all');
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [showUserList, setShowUserList] = useState(true);
    const [scanError, setScanError] = useState<string | null>(null);
    const [clusterUsers, setClusterUsers] = useState<NearbyUser[] | null>(null); // users in a tapped cluster
    const [liveAlert, setLiveAlert] = useState<NearbyEncounterAlert | null>(null);
    const [nearMatchSettings, setNearMatchSettings] = useState<NearMatchSettings | null>(null);
    const [signalSending, setSignalSending] = useState(false);
    const alertFadeAnim = useRef(new RNAnimated.Value(0)).current;
    const scanRequestIdRef = useRef(0);
    const isFindingNearbyRef = useRef(false);
    const encounterCooldownRef = useRef<Map<string, number>>(new Map());
    const mountedRef = useRef(true);
    const myLocationRef = useRef<Location.LocationObject | null>(null);

    // Animation refs
    const radarRotation = useRef(new RNAnimated.Value(0)).current;
    const pulseAnim = useRef(new RNAnimated.Value(1)).current;
    const headingShared = useSharedValue(0);

    const radarAnimation = useRef<RNAnimated.CompositeAnimation | null>(null);
    const pulseAnimation = useRef<RNAnimated.CompositeAnimation | null>(null);

    // Location subscription ref
    const locationSubscription = useRef<Location.LocationSubscription | null>(null);

    // Smoothing heading
    const headingRef = useRef(0);
    const lastDisplayUpdateRef = useRef(0);
    const lastShakeSignalRef = useRef(0);
    const SMOOTHING_FACTOR = 0.1;

    // Radius options including 50m and 100m
    const radiusOptions = useMemo(() => [50, 100, 500, 1000, 2000, 5000, 10000, 20000], []);

    const displayRange = useMemo(() => Math.max(searchRadius, 50), [searchRadius]);
    const radarSize = useMemo(() => Math.min(width * 0.95, height * 0.5), [width, height]);
    const radarRadius = useMemo(() => radarSize / 2 - 30, [radarSize]);

    const uiColors = useMemo(() => ({
        accent: themedColors.primary || palette.textColor,
        secondary: palette.subtitleColor,
        text: themedColors.text,
        bg: palette.appGradient[0],
        card: palette.cardGradient[0],
        border: palette.menuBorder,
        online: '#22c55e',
        offline: '#f97316',
        danger: '#ef4444',
    }), [palette, themedColors]);

    const isUserOnline = useCallback((nearbyUser: NearbyUser) => {
        const lastUpdateMs = nearbyUser.lastLocationUpdateMs;
        if (!lastUpdateMs) return false;
        return Date.now() - lastUpdateMs <= OFFLINE_MAX_AGE_MS;
    }, []);

    const filteredNearbyUsers = useMemo(() => {
        return nearbyUsers.filter((u) => {
            if (genderFilter === 'male' && u.gender !== 'male') return false;
            if (genderFilter === 'female' && u.gender !== 'female') return false;
            if (agePreset !== 'all') {
                const r = AGE_PRESET_RANGES[agePreset];
                if (typeof u.age !== 'number' || u.age < r.min || u.age > r.max) return false;
            }
            return true;
        });
    }, [nearbyUsers, genderFilter, agePreset]);

    const radarStats = useMemo(() => {
        const online = filteredNearbyUsers.filter(isUserOnline).length;
        const nearest = filteredNearbyUsers[0]?.distance;
        return {
            online,
            offline: Math.max(0, filteredNearbyUsers.length - online),
            nearest: typeof nearest === 'number' ? proximityService.formatDistance(nearest) : t('radar.no_distance'),
        };
    }, [filteredNearbyUsers, isUserOnline, t]);

    const formatBearing = useCallback((bearing?: number | null) => {
        return t('radar.degrees', { value: Math.round(Number.isFinite(Number(bearing)) ? Number(bearing) : 0) });
    }, [t]);

    const formatDirection = useCallback((bearing?: number | null) => {
        const value = Math.round(Number.isFinite(Number(bearing)) ? Number(bearing) : 0);
        const keys = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
        const index = Math.round(value / 45) % 8;
        return t(`radar.directions.${keys[index]}`);
    }, [t]);

    const getDisplayName = useCallback((name?: string | null) => {
        const trimmed = String(name || '').trim();
        return trimmed && trimmed.toLowerCase() !== 'unknown' ? trimmed : t('radar.unknown_user');
    }, [t]);

    // Get avatar URL with fallback
    const getAvatarUrl = useCallback((photoURL: string | undefined, name?: string) => {
        if (photoURL && photoURL.startsWith('http')) {
            return photoURL;
        }
        // Generate avatar from name
        const initial = name?.charAt(0)?.toUpperCase() || 'U';
        return `https://ui-avatars.com/api/?background=00ffff&color=000&size=150&name=${initial}`;
    }, []);

    const showInAppAlert = useCallback((alert: NearbyEncounterAlert) => {
        if (!mountedRef.current) return;
        setLiveAlert(alert);
        RNAnimated.sequence([
            RNAnimated.timing(alertFadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            RNAnimated.delay(5000),
            RNAnimated.timing(alertFadeAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start(() => setLiveAlert(null));
    }, [alertFadeAnim]);

    useEffect(() => {
        if (!user?.uid) return;

        encounterService.getNearMatchSettings(user.uid).then(setNearMatchSettings);
    }, [user?.uid]);

    const updateNearMatchEnabled = useCallback(async (enabled: boolean) => {
        if (!user?.uid) return;

        const nextSettings = await encounterService.updateNearMatchSettings(user.uid, { enabled });
        setNearMatchSettings(nextSettings);
        if (!enabled) setScanning(false);
    }, [user?.uid]);

    const sendNearMatchSignal = useCallback(async (targetUser?: NearbyUser | null) => {
        if (!user?.uid || !targetUser || signalSending) return;

        try {
            setSignalSending(true);
            const result = await encounterService.sendNearMatchSignal(user.uid, targetUser.id);
            Alert.alert(
                result.matched ? t('radar.signal_matched_title') : t('radar.signal_sent_title'),
                result.matched
                    ? t('radar.signal_matched_body', { name: targetUser.name })
                    : t('radar.signal_sent_body', { name: targetUser.name })
            );
        } catch (error) {
            console.error('Error sending near match signal:', error);
            Alert.alert(t('common.error'), t('radar.signal_error'));
        } finally {
            setSignalSending(false);
        }
    }, [signalSending, user?.uid]);

    // Calculate relative angle
    const getRelativeAngle = useCallback((targetBearing: number, deviceHeading: number): number => {
        let relativeAngle = targetBearing - deviceHeading;
        relativeAngle = ((relativeAngle % 360) + 360) % 360;
        return relativeAngle;
    }, []);

    // Find nearby users
    const findNearbyUsers = useCallback(async () => {
        const currentLocation = myLocationRef.current || myLocation;
        if (!currentLocation || !currentLocation.coords || !user?.uid) return;
        if (isFindingNearbyRef.current) return;

        isFindingNearbyRef.current = true;
        const requestId = ++scanRequestIdRef.current;
        try {
            setIsLoading(true);
            setScanError(null);

            const users = await proximityService.findNearbyUsers(currentLocation, {
                radius: searchRadius,
                userId: user.uid,
                includeOffline: scanFilter !== 'online',
                maxAge: OFFLINE_MAX_AGE_MS,
            });
            if (requestId !== scanRequestIdRef.current) return;

            // The service already returns distance and bearing, no need to recalculate
            // but we add defensive checks just in case
            const updatedUsers = users.filter(u => u && u.location).map(u => ({
                ...u,
                bearing: u.bearing ?? 0,
                distance: u.distance ?? 0,
            }));

            const filteredUsers = updatedUsers.filter((nearbyUser) => {
                const online = isUserOnline(nearbyUser);
                if (scanFilter === 'online') return online;
                if (scanFilter === 'offline') return !online;
                return true;
            });

            // Handle Proximity Alerts & History
            const handleAlerts = async () => {
                if (!nearMatchSettings?.enabled) return;

                for (const u of filteredUsers) {
                    const now = Date.now();
                    const lastAlertAt = encounterCooldownRef.current.get(u.id) || 0;
                    if (now - lastAlertAt < ALERT_COOLDOWN_MS) continue;

                    // 1. Record History (Passed by)
                    const alertData = await nearbyAlertService.recordPassedBy(user.uid, u, currentLocation.coords);
                    encounterCooldownRef.current.set(u.id, now);
                    
                    // 2. Trigger Live Alert (Rumble + Push) if very close
                    if (nearMatchSettings.allowNotifications && u.distance <= nearMatchSettings.matchRadiusMeters) {
                        const address = await nearbyAlertService.getReadableAddress(currentLocation.coords);
                        const triggered = await nearbyAlertService.triggerLiveNearbyAlert(u, address);
                        
                        if (triggered && alertData) {
                            showInAppAlert(alertData);
                        }
                    }
                }
            };
            handleAlerts().catch((error) => console.warn('Nearby alert handling failed:', error));

            if (!mountedRef.current || requestId !== scanRequestIdRef.current) return;
            setNearbyUsers(filteredUsers);
            setLastUpdate(new Date());
        } catch (error: any) {
            console.error('Error finding nearby users:', error);
            setScanError(error?.message || t('radar.search_error'));
        } finally {
            isFindingNearbyRef.current = false;
            if (requestId !== scanRequestIdRef.current) return;
            setIsLoading(false);
        }
    }, [myLocation, scanFilter, searchRadius, user?.uid, isUserOnline, nearMatchSettings]);
    // Stop scanning (do not clear nearbyUsers - keep previous list)
    const stopScanning = useCallback(async () => {
        scanRequestIdRef.current += 1;
        isFindingNearbyRef.current = false;
        setScanning(false);

        if (radarAnimation.current) {
            radarAnimation.current.stop();
            radarAnimation.current = null;
        }
        if (pulseAnimation.current) {
            pulseAnimation.current.stop();
            pulseAnimation.current = null;
        }
        radarRotation.setValue(0);
        pulseAnim.setValue(1);

        if (locationSubscription.current) {
            locationSubscription.current.remove();
            locationSubscription.current = null;
        }
        myLocationRef.current = null;
    }, [pulseAnim, radarRotation]);

    // Start scanning
    const startScanning = useCallback(async () => {
        if (!user?.uid) {
            Alert.alert(t('common.error'), t('radar.login_required'));
            return;
        }

        if (!nearMatchSettings?.enabled) {
            Alert.alert(t('radar.near_match_disabled_title'), t('radar.near_match_disabled_body'));
            return;
        }

        const hasPermission = await proximityService.requestPermissions();
        if (!hasPermission) {
            Alert.alert(
                t('proximity.location_permission_title'),
                t('proximity.location_permission_desc'),
                [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('radar.open_settings'), onPress: () => void Linking.openSettings() }
                ]
            );
            return;
        }

        setScanning(true);
        setIsLoading(true);

        try {
            const location = await proximityService.getCurrentLocation();
            if (location) {
                myLocationRef.current = location;
                setMyLocation(location);
                await proximityService.updateUserLocation(user.uid, location);

                locationSubscription.current = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.Balanced,
                        timeInterval: LOCATION_WATCH_INTERVAL_MS,
                        distanceInterval: LOCATION_WATCH_DISTANCE_M,
                    },
                    (newLocation) => {
                        myLocationRef.current = newLocation;
                        setMyLocation(newLocation);
                        proximityService.updateUserLocation(user.uid, newLocation).catch((error) => {
                            console.warn('Failed to update radar location:', error);
                        });
                    }
                );

                await findNearbyUsers();
            } else {
                Alert.alert(t('common.error'), t('proximity.gps_error'));
                await stopScanning();
                setIsLoading(false);
                return;
            }
        } catch (error) {
            console.error('Error starting scan:', error);
            Alert.alert(t('common.error'), t('radar.start_scan'));
            await stopScanning();
        }

        setIsLoading(false);

        radarAnimation.current = RNAnimated.loop(
            RNAnimated.timing(radarRotation, {
                toValue: 1,
                duration: 4000,
                useNativeDriver: true,
                easing: Easing.linear,
            })
        );
        radarAnimation.current.start();

        pulseAnimation.current = RNAnimated.loop(
            RNAnimated.sequence([
                RNAnimated.timing(pulseAnim, {
                    toValue: 1.3,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                RNAnimated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        pulseAnimation.current.start();
    }, [findNearbyUsers, nearMatchSettings?.enabled, pulseAnim, radarRotation, stopScanning, user?.uid]);

    useEffect(() => {
        if (!scanning || !nearMatchSettings?.enabled || !selectedUser) return;

        let accelerometerSubscription: { remove: () => void } | null = null;

        Accelerometer.setUpdateInterval(180);
        accelerometerSubscription = Accelerometer.addListener(({ x, y, z }) => {
            const movement = Math.sqrt(x * x + y * y + z * z);
            const now = Date.now();
            if (movement > 1.8 && now - lastShakeSignalRef.current > 4000) {
                lastShakeSignalRef.current = now;
                sendNearMatchSignal(selectedUser);
            }
        });

        return () => {
            accelerometerSubscription?.remove();
        };
    }, [nearMatchSettings?.enabled, scanning, selectedUser, sendNearMatchSignal]);

    // Magnetometer (only active while scanning to reduce battery usage)
    useEffect(() => {
        let magnetometerSubscription: any;
        if (!scanning) return;

        const startMagnetometer = async () => {
            const isAvailable = await Magnetometer.isAvailableAsync();
            if (!isAvailable) {
                console.warn('Magnetometer is not available on this device');
                return;
            }

            magnetometerSubscription = Magnetometer.addListener((data) => {
                let angleInRadians = Math.atan2(data.y, data.x);
                let angleInDegrees = (angleInRadians * 180) / Math.PI;
                angleInDegrees = ((angleInDegrees + 360) % 360);

                const currentHeading = headingRef.current;
                let diff = angleInDegrees - currentHeading;

                if (diff > 180) diff -= 360;
                if (diff < -180) diff += 360;

                const smoothedHeading = ((currentHeading + diff * SMOOTHING_FACTOR) + 360) % 360;
                headingRef.current = smoothedHeading;

                // Update Reanimated shared value with spring for smoothness
                headingShared.value = withSpring(smoothedHeading, {
                    damping: 20,
                    stiffness: 90,
                    mass: 1,
                });

                // Throttle text update to every 200ms
                const now = Date.now();
                if (now - lastDisplayUpdateRef.current > HEADING_TEXT_UPDATE_MS) {
                    setDisplayHeading(smoothedHeading);
                    lastDisplayUpdateRef.current = now;
                }
            });

            Magnetometer.setUpdateInterval(120);
        };

        startMagnetometer();

        return () => {
            if (magnetometerSubscription) {
                magnetometerSubscription.remove();
            }
        };
    }, [scanning]);

    // Refresh interval
    useEffect(() => {
        let refreshInterval: any;

        if (scanning && myLocation) {
            refreshInterval = setInterval(() => {
                findNearbyUsers();
            }, NEARBY_REFRESH_INTERVAL_MS);
        }

        return () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        };
    }, [scanning, myLocation, findNearbyUsers]);

    useEffect(() => {
        if (scanning && myLocation) {
            findNearbyUsers();
        }
    }, [scanFilter, scanning, myLocation, findNearbyUsers]);

    useFocusEffect(
        useCallback(() => {
            return () => {
                stopScanning();
            };
        }, [stopScanning])
    );

    // Cleanup
    useEffect(() => {
        return () => {
            mountedRef.current = false;
            stopScanning();
            proximityService.cleanup();
        };
    }, [stopScanning]);

    // Ã¢â€â‚¬Ã¢â€â‚¬ Clustering logic Ã¢â€â‚¬Ã¢â€â‚¬
    // Compute pixel position for each user, then group overlapping ones.
    const radarClusters = useMemo(() => {
        // Step 1 Ã¢â‚¬â€œ compute pixel positions
        const items = filteredNearbyUsers.map((u) => {
            const ratio = Math.min(u.distance / displayRange, 1);
            const r = ratio * radarRadius;
            // Keep marker orientation readable by plotting relative to current heading
            const relativeBearing = getRelativeAngle(u.bearing, displayHeading);
            const rad = (relativeBearing * Math.PI) / 180;
            return { user: u, x: r * Math.sin(rad), y: -r * Math.cos(rad) };
        });

        // Step 2 Ã¢â‚¬â€œ greedy clustering
        const used = new Set<number>();
        const clusters: RadarCluster[] = [];

        for (let i = 0; i < items.length; i++) {
            if (used.has(i)) continue;
            const group = [items[i]];
            used.add(i);

            for (let j = i + 1; j < items.length; j++) {
                if (used.has(j)) continue;
                const dx = items[i].x - items[j].x;
                const dy = items[i].y - items[j].y;
                if (Math.sqrt(dx * dx + dy * dy) < CLUSTER_PIXEL_THRESHOLD) {
                    group.push(items[j]);
                    used.add(j);
                }
            }

            // Cluster center = avg of member positions
            const cx = group.reduce((s, g) => s + g.x, 0) / group.length;
            const cy = group.reduce((s, g) => s + g.y, 0) / group.length;
            clusters.push({ users: group.map((g) => g.user), cx, cy });
        }
        return clusters;
    }, [filteredNearbyUsers, displayRange, radarRadius, displayHeading, getRelativeAngle]);

    // Render clusters / single markers
    const radarMarkers = useMemo(() => {
        return radarClusters.map((cluster, idx) => {
            // Ã¢â€â‚¬Ã¢â€â‚¬ Single user Ã¢â€ â€™ normal marker Ã¢â€â‚¬Ã¢â€â‚¬
            if (cluster.users.length === 1) {
                const nearbyUser = cluster.users[0];
                const userOnline = isUserOnline(nearbyUser);
                return (
                    <TouchableOpacity
                        key={nearbyUser.id}
                        style={[
                            styles.userMarker,
                            { transform: [{ translateX: cluster.cx }, { translateY: cluster.cy }] },
                        ]}
                        onPress={() => setSelectedUser(nearbyUser)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Image
                            source={{ uri: getAvatarUrl(nearbyUser.photoURL, nearbyUser.name) }}
                            style={[
                                styles.userAvatar,
                                { borderColor: userOnline ? uiColors.online : uiColors.offline },
                            ]}
                            defaultSource={{ uri: DEFAULT_AVATAR }}
                        />
                        {(nearbyUser.gender === 'male' || nearbyUser.gender === 'female') && (
                            <View
                                style={[
                                    styles.genderCornerBadge,
                                    {
                                        backgroundColor:
                                            nearbyUser.gender === 'male'
                                                ? 'rgba(59,130,246,0.95)'
                                                : 'rgba(236,72,153,0.95)',
                                    },
                                ]}
                            >
                                <Ionicons
                                    name={nearbyUser.gender === 'male' ? 'male' : 'female'}
                                    size={9}
                                    color="#fff"
                                />
                            </View>
                        )}
                        <View
                            style={[
                                styles.statusDot,
                                { backgroundColor: userOnline ? uiColors.online : uiColors.offline },
                            ]}
                        />
                        <View
                            style={[
                                styles.userInfoBadge,
                                {
                                    backgroundColor: isDark
                                        ? 'rgba(0,0,0,0.85)'
                                        : 'rgba(255,255,255,0.9)',
                                },
                            ]}
                        >
                            <Text
                                style={[styles.markerName, { color: uiColors.text }]}
                                numberOfLines={1}
                            >
                                {getDisplayName(nearbyUser.name).split(' ').pop() || t('radar.unknown_user')}
                            </Text>
                            <Text style={[styles.distanceText, { color: uiColors.accent }]}>
                                {proximityService.formatDistance(nearbyUser.distance)}
                            </Text>
                        </View>
                    </TouchableOpacity>
                );
            }

            // Ã¢â€â‚¬Ã¢â€â‚¬ Multiple users Ã¢â€ â€™ cluster bubble Ã¢â€â‚¬Ã¢â€â‚¬
            const onlineCount = cluster.users.filter(isUserOnline).length;
            const previewUsers = cluster.users.slice(0, 3);
            const nearest = cluster.users.reduce((a, b) => (a.distance < b.distance ? a : b));

            return (
                <TouchableOpacity
                    key={`cluster-${idx}`}
                    style={[
                        styles.userMarker,
                        { transform: [{ translateX: cluster.cx }, { translateY: cluster.cy }] },
                    ]}
                    onPress={() => setClusterUsers(cluster.users)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    {/* Stacked avatars */}
                    <View style={styles.clusterAvatarStack}>
                        {previewUsers.map((u, i) => (
                            <Image
                                key={u.id}
                                source={{ uri: getAvatarUrl(u.photoURL, u.name) }}
                                style={[
                                    styles.clusterAvatar,
                                    {
                                        borderColor: isUserOnline(u) ? uiColors.online : uiColors.offline,
                                        marginLeft: i === 0 ? 0 : -12,
                                        zIndex: previewUsers.length - i,
                                    },
                                ]}
                                defaultSource={{ uri: DEFAULT_AVATAR }}
                            />
                        ))}
                    </View>

                    {/* Count badge */}
                    <View style={[styles.clusterCountBadge, { backgroundColor: uiColors.accent }]}>
                        <Text style={styles.clusterCountText}>{cluster.users.length}</Text>
                    </View>

                    {/* Info */}
                    <View
                        style={[
                            styles.userInfoBadge,
                            {
                                backgroundColor: isDark
                                    ? 'rgba(0,0,0,0.85)'
                                    : 'rgba(255,255,255,0.9)',
                            },
                        ]}
                    >
                        <Text style={[styles.markerName, { color: uiColors.text }]} numberOfLines={1}>
                            {t('radar.people_count', { count: cluster.users.length })}
                        </Text>
                        <Text style={[styles.distanceText, { color: uiColors.accent }]}>
                            {proximityService.formatDistance(nearest.distance)}
                        </Text>
                    </View>
                </TouchableOpacity>
            );
        });
    }, [radarClusters, isUserOnline, getAvatarUrl, uiColors, isDark]);

    // Navigate to chat
    const handleMessageUser = () => {
        if (selectedUser) {
            setSelectedUser(null);
            router.push({
                pathname: '/chat/[id]',
                params: { id: selectedUser.id },
            } as any);
        }
    };

    // Navigate to profile
    const handleViewProfile = () => {
        if (selectedUser) {
            setSelectedUser(null);
            router.push({
                pathname: '/(screens)/user/UserProfileScreen',
                params: { userId: selectedUser.id },
            } as any);
        }
    };

    // Navigate to profile from list
    const handleUserPress = useCallback((nearbyUser: NearbyUser) => {
        setSelectedUser(nearbyUser);
    }, []);

    // Quick view profile from list
    const handleQuickViewProfile = useCallback((userId: string) => {
        router.push({
            pathname: '/(screens)/user/UserProfileScreen',
            params: { userId },
        } as any);
    }, [router]);

    const keyExtractor = useCallback((item: NearbyUser) => item.id, []);

    const listEmptyComponent = useMemo(() => (
        <Text style={[styles.filterEmptyListText, { color: uiColors.secondary }]}>{t('radar.no_filter_matches')}</Text>
    ), [uiColors.secondary]);

    // Render user list item
    const renderUserListItem = useCallback(({ item }: { item: NearbyUser }) => {
        const direction = formatDirection(item.bearing);
        const online = isUserOnline(item);

        return (
            <TouchableOpacity
                style={[styles.userListItem, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.75)' }]}
                onPress={() => handleUserPress(item)}
                activeOpacity={0.7}
            >
                <Image
                    source={{ uri: getAvatarUrl(item.photoURL, item.name) }}
                    style={[styles.listUserAvatar, { borderColor: online ? uiColors.online : uiColors.offline }]}
                    defaultSource={{ uri: DEFAULT_AVATAR }}
                />
                <View style={styles.listUserInfo}>
                    <View style={styles.listNameRow}>
                        <View style={styles.listNameInner}>
                            <Text style={[styles.listUserName, { color: uiColors.text }]} numberOfLines={1}>{getDisplayName(item.name)}</Text>
                            {item.gender === 'male' ? (
                                <Ionicons name="male" size={14} color="#3b82f6" />
                            ) : item.gender === 'female' ? (
                                <Ionicons name="female" size={14} color="#ec4899" />
                            ) : null}
                        </View>
                        <View style={[styles.statusPill, { backgroundColor: online ? 'rgba(34, 197, 94, 0.16)' : 'rgba(249, 115, 22, 0.16)' }]}>
                            <View style={[styles.statusPillDot, { backgroundColor: online ? uiColors.online : uiColors.offline }]} />
                            <Text style={[styles.statusPillText, { color: online ? uiColors.online : uiColors.offline }]}>
                                {online ? t('radar.online') : t('radar.offline')}
                            </Text>
                        </View>
                    </View>
                    {typeof item.age === 'number' && <Text style={[styles.listUserAge, { color: uiColors.secondary }]}>{t('radar.years_old', { age: item.age })}</Text>}
                    <View style={styles.listUserStats}>
                        <View style={styles.listStatItem}>
                            <Ionicons name="location" size={12} color={uiColors.accent} />
                            <Text style={[styles.listStatText, { color: uiColors.secondary }]}>
                                {proximityService.formatDistance(item.distance)}
                            </Text>
                        </View>
                        <View style={styles.listStatItem}>
                            <Ionicons name="compass" size={12} color={uiColors.accent} />
                            <Text style={[styles.listStatText, { color: uiColors.secondary }]}>{direction}</Text>
                        </View>
                        <View style={styles.listStatItem}>
                            <Ionicons name="navigate" size={12} color={uiColors.offline} />
                            <Text style={[styles.listStatText, { color: uiColors.secondary }]}>{formatBearing(item.bearing)}</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.listActions}>
                    <TouchableOpacity
                        style={[styles.listActionButton, { borderColor: uiColors.border }]}
                        onPress={() => handleQuickViewProfile(item.id)}
                    >
                        <Ionicons name="person" size={18} color={uiColors.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.listActionButton, { borderColor: uiColors.border }]}
                        onPress={() => {
                            router.push({
                                pathname: '/chat/[id]',
                                params: { id: item.id },
                            } as any);
                        }}
                    >
                        <Ionicons name="chatbubble" size={18} color={uiColors.accent} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    }, [getAvatarUrl, handleQuickViewProfile, handleUserPress, isDark, isUserOnline, router, uiColors]);

    const radarRotate = radarRotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    // Reanimated style for compass rotation
    const animatedCompassStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotate: `${-headingShared.value}deg` }],
        };
    });
    const selectedUserRelativeAngle = selectedUser
        ? getRelativeAngle(selectedUser.bearing || 0, displayHeading || 0)
        : 0;

    return (
        <SafeAreaView style={[styles.container, embedded && styles.embeddedContainer, { backgroundColor: uiColors.bg }]}>
            <LinearGradient
                colors={palette.appGradient as [string, string, ...string[]]}
                style={styles.gradientBackground}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={[styles.header, embedded && styles.embeddedHeader]}>
                        <Text style={[styles.title, { color: uiColors.accent }]}>{t('radar.title')}</Text>
                        <Text style={[styles.subtitle, { color: uiColors.text }]}>
                            {scanning
                                ? (nearbyUsers.length !== filteredNearbyUsers.length
                                    ? t('radar.scanning_summary_filtered', { filtered: filteredNearbyUsers.length, total: nearbyUsers.length, radius: searchRadius >= 1000 ? `${searchRadius / 1000}km` : `${searchRadius}m` })
                                    : t('radar.scanning_summary', { count: filteredNearbyUsers.length, radius: searchRadius >= 1000 ? `${searchRadius / 1000}km` : `${searchRadius}m` }))
                                : nearbyUsers.length > 0
                                    ? (nearbyUsers.length !== filteredNearbyUsers.length
                                        ? t('radar.saved_summary_filtered', { filtered: filteredNearbyUsers.length, total: nearbyUsers.length })
                                        : t('radar.saved_summary', { count: filteredNearbyUsers.length }))
                                    : t('radar.tap_to_scan')}
                        </Text>
                        {lastUpdate && (
                            <Text style={[styles.lastUpdateText, { color: uiColors.secondary }]}>
                                {t('radar.updated_at', { time: lastUpdate instanceof Date ? lastUpdate.toLocaleTimeString('vi-VN') : String(lastUpdate) })}
                            </Text>
                        )}
                        {(scanning || filteredNearbyUsers.length > 0) && (
                            <View style={styles.signalStatsRow}>
                                <View style={[styles.signalStatChip, { borderColor: uiColors.border, backgroundColor: isDark ? 'rgba(34,197,94,0.10)' : 'rgba(34,197,94,0.08)' }]}>
                                    <Ionicons name="radio" size={12} color={uiColors.online} />
                                    <Text style={[styles.signalStatText, { color: uiColors.text }]}>{t('radar.online_count', { count: radarStats.online })}</Text>
                                </View>
                                <View style={[styles.signalStatChip, { borderColor: uiColors.border, backgroundColor: isDark ? 'rgba(14,165,233,0.10)' : 'rgba(14,165,233,0.08)' }]}>
                                    <Ionicons name="navigate" size={12} color={uiColors.accent} />
                                    <Text style={[styles.signalStatText, { color: uiColors.text }]}>{radarStats.nearest}</Text>
                                </View>
                                <View style={[styles.signalStatChip, { borderColor: uiColors.border, backgroundColor: isDark ? 'rgba(249,115,22,0.10)' : 'rgba(249,115,22,0.08)' }]}>
                                    <Ionicons name="moon" size={12} color={uiColors.offline} />
                                    <Text style={[styles.signalStatText, { color: uiColors.text }]}>{t('radar.offline_count', { count: radarStats.offline })}</Text>
                                </View>
                            </View>
                        )}
                    </View>


                    {liveAlert && (
                        <RNAnimated.View style={[styles.liveAlertCard, { opacity: alertFadeAnim, borderColor: uiColors.accent, backgroundColor: isDark ? 'rgba(8,47,73,0.92)' : 'rgba(240,249,255,0.96)' }]}>
                            <Ionicons name="notifications" size={20} color={uiColors.accent} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.liveAlertTitle, { color: uiColors.text }]}>{t('radar.live_alert_title')}</Text>
                                <Text style={[styles.liveAlertText, { color: uiColors.secondary }]}>{liveAlert.message}</Text>
                            </View>
                        </RNAnimated.View>
                    )}



                    {/* Radar Container */}
                    <View style={[styles.radarContainer, { width: radarSize, height: radarSize }]}>
                        {/* Radar Background Rings */}
                        <View style={styles.radarRings}>
                            {[0.25, 0.5, 0.75, 1].map((ratio, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.radarRing,
                                        { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(15, 23, 42, 0.15)' },
                                        {
                                            width: radarSize * ratio,
                                            height: radarSize * ratio,
                                            borderRadius: (radarSize * ratio) / 2,
                                        },
                                    ]}
                                >
                                    <Text style={[styles.ringLabel, { color: uiColors.secondary }]}>
                                        {proximityService.formatDistance(displayRange * ratio)}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* Cross lines */}
                        <View style={styles.crossLines}>
                            <View style={styles.horizontalLine} />
                            <View style={styles.verticalLine} />
                        </View>

                        {/* Radar Sweep Line */}
                        {scanning && (
                            <RNAnimated.View
                                style={[
                                    styles.radarSweep,
                                    { width: radarSize, height: radarSize },
                                    { transform: [{ rotate: radarRotate }] },
                                ]}
                            >
                                <LinearGradient
                                    colors={['transparent', 'rgba(0, 255, 255, 0.3)', 'rgba(0, 255, 255, 0.6)']}
                                    style={[styles.sweepGradient, { width: radarSize / 2 }]}
                                    start={{ x: 0, y: 0.5 }}
                                    end={{ x: 1, y: 0.5 }}
                                />
                            </RNAnimated.View>
                        )}

                        {/* Center Point */}
                        <RNAnimated.View
                            style={[
                                styles.centerPoint,
                                { transform: [{ scale: pulseAnim }] },
                            ]}
                        >
                            <View style={[styles.centerDot, { backgroundColor: uiColors.accent, shadowColor: uiColors.accent }]}>
                                <Ionicons name="person" size={18} color="#fff" />
                            </View>
                        </RNAnimated.View>

                    {/* Users on Radar - Rotatable Container */}
                    {radarClusters.length > 0 && (
                        <Animated.View
                            style={[
                                styles.usersContainer
                            ]}
                        >
                            {radarMarkers}
                        </Animated.View>
                    )}

                        {/* Compass Directions */}
                        <Animated.View pointerEvents="none" style={[
                            styles.compassContainer,
                            { width: radarSize, height: radarSize },
                            animatedCompassStyle
                        ]}>
                            <View style={[styles.compassDirection, { top: 3, left: radarSize / 2 - 11 }]}>
                                <Text style={[styles.compassText, styles.northText]}>N</Text>
                            </View>
                            <View style={[styles.compassDirection, { bottom: 3, left: radarSize / 2 - 11 }]}>
                                <Text style={styles.compassText}>S</Text>
                            </View>
                            <View style={[styles.compassDirection, { right: 3, top: radarSize / 2 - 11 }]}>
                                <Text style={styles.compassText}>E</Text>
                            </View>
                            <View style={[styles.compassDirection, { left: 3, top: radarSize / 2 - 11 }]}>
                                <Text style={styles.compassText}>W</Text>
                            </View>
                        </Animated.View>
                    </View>

                    {/* Heading Display */}
                    <View style={styles.headingContainer}>
                        <Ionicons name="compass-outline" size={20} color={uiColors.accent} />
                        <Text style={[styles.headingText, { color: uiColors.accent }]}>
                            {formatBearing(displayHeading)} {formatDirection(displayHeading)}
                        </Text>
                        {myLocation && myLocation.coords && (
                            <Text style={[styles.coordsText, { color: uiColors.secondary }]}>
                                {Number(myLocation.coords.latitude).toFixed(4)}, {Number(myLocation.coords.longitude).toFixed(4)}
                            </Text>
                        )}
                    </View>

                    {/* Control Buttons */}
                    <View style={styles.controlsContainer}>
                        <View style={[styles.nearMatchCard, { borderColor: uiColors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                            <View style={styles.nearMatchInfo}>
                                <View style={styles.nearMatchTitleRow}>
                                    <Ionicons name="sparkles" size={18} color={uiColors.accent} />
                                    <Text style={[styles.nearMatchTitle, { color: uiColors.text }]}>{t('radar.near_match_title')}</Text>
                                </View>
                                <Text style={[styles.nearMatchSubtitle, { color: uiColors.secondary }]}>{t('radar.near_match_subtitle')}</Text>
                            </View>
                            <Switch
                                value={nearMatchSettings?.enabled ?? false}
                                onValueChange={updateNearMatchEnabled}
                                trackColor={{ false: 'rgba(148,163,184,0.45)', true: uiColors.accent }}
                                thumbColor="#fff"
                            />
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.scanButton,
                                { backgroundColor: scanning ? uiColors.danger : uiColors.accent, shadowColor: scanning ? uiColors.danger : uiColors.accent }
                            ]}
                            onPress={scanning ? stopScanning : startScanning}
                            disabled={isLoading || !nearMatchSettings?.enabled}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : scanning ? (
                                <>
                                    <Ionicons name="stop-circle" size={22} color="#fff" />
                                    <Text style={styles.scanButtonText}>{t('radar.stop_scan')}</Text>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="radio-outline" size={22} color="#fff" />
                                    <Text style={styles.scanButtonText}>{t('radar.start_scan')}</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Radius Selector */}
                        <View style={styles.radiusSelector}>
                            <Text style={[styles.radiusSelectorLabel, { color: uiColors.text }]}>{t('radar.search_radius')}</Text>
                            <View style={styles.radiusButtons}>
                                {radiusOptions.map((radius) => (
                                    <TouchableOpacity
                                        key={radius}
                                        style={[
                                            styles.radiusButton,
                                            { borderColor: uiColors.border },
                                            searchRadius === radius && { backgroundColor: uiColors.accent, borderColor: uiColors.accent },
                                        ]}
                                        onPress={() => {
                                            setSearchRadius(radius);
                                            if (scanning) findNearbyUsers();
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.radiusButtonText,
                                                { color: uiColors.text },
                                                searchRadius === radius && styles.radiusButtonTextActive,
                                            ]}
                                        >
                                            {radius >= 1000 ? `${radius / 1000}km` : `${radius}m`}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.filterRow}>
                            <Text style={[styles.radiusSelectorLabel, { color: uiColors.text }]}>{t('radar.status')}</Text>
                            <View style={styles.filterButtons}>
                                {(['online', 'offline', 'all'] as ScanFilter[]).map((filter) => {
                                    const isActive = scanFilter === filter;
                                    const label = filter === 'online' ? t('radar.online') : filter === 'offline' ? t('radar.offline') : t('radar.all');
                                    return (
                                        <TouchableOpacity
                                            key={filter}
                                            style={[
                                                styles.filterButton,
                                                { borderColor: uiColors.border },
                                                isActive && { backgroundColor: uiColors.accent, borderColor: uiColors.accent },
                                            ]}
                                            onPress={() => setScanFilter(filter)}
                                        >
                                            <Text style={[styles.filterButtonText, { color: isActive ? '#fff' : uiColors.text }]}>{label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={styles.filterSection}>
                            <Text style={[styles.radiusSelectorLabel, { color: uiColors.text }]}>{t('radar.gender')}</Text>
                            <View style={styles.filterChipRow}>
                                {([
                                    { key: 'all' as const, label: t('radar.all') },
                                    { key: 'male' as const, label: t('radar.male') },
                                    { key: 'female' as const, label: t('radar.female') },
                                ]).map(({ key, label }) => {
                                    const active = genderFilter === key;
                                    return (
                                        <TouchableOpacity
                                            key={key}
                                            style={[
                                                styles.filterChip,
                                                { borderColor: uiColors.border },
                                                active && { backgroundColor: uiColors.accent, borderColor: uiColors.accent },
                                            ]}
                                            onPress={() => setGenderFilter(key)}
                                        >
                                            <Text style={[styles.filterChipText, { color: active ? '#fff' : uiColors.text }]}>{label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={styles.filterSection}>
                            <Text style={[styles.radiusSelectorLabel, { color: uiColors.text }]}>{t('radar.age')}</Text>
                            <View style={styles.filterChipRow}>
                                {(['all', '18-22', '23-30', '31-40', '41+'] as AgePreset[]).map((key) => {
                                    const label = key === 'all' ? t('radar.all_ages') : key;
                                    const active = agePreset === key;
                                    return (
                                        <TouchableOpacity
                                            key={key}
                                            style={[
                                                styles.filterChip,
                                                styles.ageChip,
                                                { borderColor: uiColors.border },
                                                active && { backgroundColor: uiColors.accent, borderColor: uiColors.accent },
                                            ]}
                                            onPress={() => setAgePreset(key)}
                                        >
                                            <Text
                                                style={[styles.filterChipText, { color: active ? '#fff' : uiColors.text }]}
                                                numberOfLines={1}
                                            >
                                                {label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>



                        {/* Refresh Button */}
                        {
                            (scanning || nearbyUsers.length > 0) && (
                                <TouchableOpacity
                                    style={styles.refreshButton}
                                    onPress={findNearbyUsers}
                                    disabled={isLoading}
                                >
                                    <Ionicons name="refresh" size={18} color={uiColors.accent} />
                                    <Text style={[styles.refreshButtonText, { color: uiColors.accent }]}>{t('radar.refresh')}</Text>
                                </TouchableOpacity>
                            )
                        }
                    </View >

                    {/* User List Section */}
                    {
                        nearbyUsers.length > 0 && (
                            <View style={[styles.userListSection, { borderColor: uiColors.border, backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255,255,255,0.65)' }]}>
                                <TouchableOpacity
                                    style={[styles.userListHeader, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)' }]}
                                    onPress={() => setShowUserList(!showUserList)}
                                >
                                    <View style={styles.userListHeaderLeft}>
                                        <Ionicons name="people" size={20} color={uiColors.accent} />
                                        <Text style={[styles.userListTitle, { color: uiColors.text }]}>
                                            {t('radar.list_title', { count: filteredNearbyUsers.length })}
                                            {nearbyUsers.length !== filteredNearbyUsers.length ? ` / ${nearbyUsers.length}` : ''})
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name={showUserList ? "chevron-up" : "chevron-down"}
                                        size={20}
                                        color={uiColors.accent}
                                    />
                                </TouchableOpacity>

                                {showUserList && (
                                    <FlatList
                                        data={filteredNearbyUsers}
                                        renderItem={renderUserListItem}
                                        keyExtractor={keyExtractor}
                                        scrollEnabled={false}
                                        style={styles.userList}
                                        ItemSeparatorComponent={ListSeparator}
                                        ListEmptyComponent={listEmptyComponent}
                                        initialNumToRender={8}
                                        maxToRenderPerBatch={6}
                                        windowSize={5}
                                    />
                                )}
                            </View>
                        )
                    }

                    {/* Empty State */}
                    {
                        scanning && nearbyUsers.length === 0 && !isLoading && (
                            <View style={styles.emptyState}>
                                <Ionicons name="search" size={48} color="#666" />
                                <Text style={styles.emptyStateText}>
                                    {t('radar.no_users_in_radius', { radius: searchRadius >= 1000 ? `${searchRadius / 1000}km` : `${searchRadius}m` })}
                                </Text>
                                <Text style={styles.emptyStateSubtext}>
                                    {t('radar.no_users_retry_desc')}
                                </Text>
                            </View>
                        )
                    }

                    {
                        scanning && nearbyUsers.length > 0 && filteredNearbyUsers.length === 0 && !isLoading && (
                            <View style={styles.emptyState}>
                                <Ionicons name="funnel-outline" size={44} color="#888" />
                                <Text style={[styles.emptyStateText, { marginTop: 12 }]}>
                                    {t('radar.filtered_empty_count', { count: nearbyUsers.length })}
                                </Text>
                                <Text style={styles.emptyStateSubtext}>
                                    {t('radar.filtered_empty_desc')}
                                </Text>
                            </View>
                        )
                    }

                    {/* Error State */}
                    {
                        scanError && (
                            <View style={styles.errorState}>
                                <Ionicons name="warning" size={32} color="#ff6b6b" />
                                <Text style={styles.errorStateText}>{scanError}</Text>
                                <TouchableOpacity
                                    style={styles.retryButton}
                                    onPress={findNearbyUsers}
                                >
                                    <Text style={styles.retryButtonText}>{t('radar.relative')}</Text>
                                </TouchableOpacity>
                            </View>
                        )
                    }

                </ScrollView >

                {/* User Details Modal */}
                <Modal
                    visible={selectedUser !== null}
                    animationType="fade"
                    transparent={true}
                    onRequestClose={() => setSelectedUser(null)}
                >
                    <View style={styles.modalContainer}>
                        <View style={[
                            styles.modalContent,
                            {
                                backgroundColor: isDark ? 'rgba(20, 20, 35, 0.97)' : 'rgba(255, 255, 255, 0.97)',
                                borderColor: uiColors.accent,
                            }
                        ]}>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setSelectedUser(null)}
                            >
                                <Ionicons name="close-circle" size={32} color={uiColors.danger} />
                            </TouchableOpacity>

                            {selectedUser && (
                                <>
                                    <TouchableOpacity onPress={handleViewProfile}>
                                        <Image
                                            source={{ uri: getAvatarUrl(selectedUser.photoURL, selectedUser.name) }}
                                            style={[styles.modalAvatar, { borderColor: uiColors.accent }]}
                                            defaultSource={{ uri: DEFAULT_AVATAR }}
                                        />
                                    </TouchableOpacity>
                                    <Text style={[styles.modalName, { color: uiColors.text }]}>{getDisplayName(selectedUser.name)}</Text>
                                    {typeof selectedUser.age === 'number' && (
                                        <Text style={[styles.modalAge, { color: uiColors.secondary }]}>{t('radar.years_old', { age: selectedUser.age })}</Text>
                                    )}
                                    {selectedUser.gender === 'male' || selectedUser.gender === 'female' ? (
                                        <Text style={[styles.modalGender, { color: selectedUser.gender === 'male' ? '#3b82f6' : '#ec4899' }]}>
                                            {selectedUser.gender === 'male' ? `♂ ${t('radar.male')}` : `♀ ${t('radar.female')}`}
                                        </Text>
                                    ) : null}

                                    <View style={[styles.modalStats, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                                        <View style={styles.modalStatItem}>
                                            <Ionicons name="location" size={22} color={uiColors.accent} />
                                            <Text style={[styles.modalStatValue, { color: uiColors.text }]}>
                                                {proximityService.formatDistance(selectedUser.distance)}
                                            </Text>
                                            <Text style={[styles.modalStatLabel, { color: uiColors.secondary }]}>{t('radar.distance')}</Text>
                                        </View>

                                        <View style={styles.modalStatItem}>
                                            <Ionicons name="compass" size={22} color={uiColors.accent} />
                                            <Text style={[styles.modalStatValue, { color: uiColors.text }]}>
                                                {formatBearing(selectedUser.bearing)}
                                            </Text>
                                            <Text style={[styles.modalStatLabel, { color: uiColors.secondary }]}>
                                                {formatDirection(selectedUser.bearing)}
                                            </Text>
                                        </View>

                                        <View style={styles.modalStatItem}>
                                            <Ionicons
                                                name="arrow-up"
                                                size={22}
                                                color={uiColors.accent}
                                                style={{ transform: [{ rotate: `${selectedUserRelativeAngle}deg` }] }}
                                            />
                                            <Text style={[styles.modalStatValue, { color: uiColors.text }]}>
                                                {formatBearing(selectedUserRelativeAngle)}
                                            </Text>
                                            <Text style={[styles.modalStatLabel, { color: uiColors.secondary }]}>{t('radar.relative')}</Text>
                                        </View>
                                    </View>

                                    {typeof selectedUser.bio === 'string' && selectedUser.bio && (
                                        <View style={[styles.modalBioContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}> 
                                            <Text style={[styles.modalBio, { color: uiColors.text }]}>{selectedUser.bio}</Text>
                                        </View>
                                    )}

                                    <TouchableOpacity
                                        style={[styles.signalButton, { backgroundColor: isDark ? 'rgba(34,211,238,0.12)' : 'rgba(14,165,233,0.1)', borderColor: uiColors.accent }]}
                                        onPress={() => sendNearMatchSignal(selectedUser)}
                                        disabled={signalSending || !nearMatchSettings?.enabled}
                                    >
                                        {signalSending ? (
                                            <ActivityIndicator color={uiColors.accent} size="small" />
                                        ) : (
                                            <Ionicons name="phone-portrait-outline" size={18} color={uiColors.accent} />
                                        )}
                                        <Text style={[styles.signalButtonText, { color: uiColors.accent }]}>{t('radar.send_signal')}</Text>
                                    </TouchableOpacity>

                                    <View style={styles.modalActions}>
                                        <TouchableOpacity
                                            style={[styles.messageButton, { backgroundColor: uiColors.accent }]}
                                            onPress={handleMessageUser}
                                        >
                                            <Ionicons name="chatbubble" size={18} color={isDark ? '#000' : '#fff'} />
                                            <Text style={[styles.messageButtonText, { color: isDark ? '#000' : '#fff' }]}>{t('radar.message')}</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.viewProfileButton, { borderColor: uiColors.accent }]}
                                            onPress={handleViewProfile}
                                        >
                                            <Ionicons name="person" size={18} color={uiColors.accent} />
                                            <Text style={[styles.viewProfileButtonText, { color: uiColors.accent }]}>{t('radar.view_profile')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                </Modal>

                {/* Cluster Detail Modal */}
                <Modal
                    visible={clusterUsers !== null && clusterUsers !== undefined}
                    animationType="fade"
                    transparent={true}
                    onRequestClose={() => setClusterUsers(null)}
                >
                    <View style={styles.modalContainer}>
                        <View style={[
                            styles.modalContent,
                            {
                                backgroundColor: isDark ? 'rgba(20, 20, 35, 0.97)' : 'rgba(255, 255, 255, 0.97)',
                                borderColor: uiColors.accent,
                                maxHeight: height * 0.7,
                            }
                        ]}>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setClusterUsers(null)}
                            >
                                <Ionicons name="close-circle" size={32} color={uiColors.danger} />
                            </TouchableOpacity>

                            <Ionicons name="people" size={28} color={uiColors.accent} style={{ marginBottom: 4 }} />
                            <Text style={[styles.modalName, { color: uiColors.text, marginBottom: 12 }]}>
                                {t('radar.cluster_title', { count: clusterUsers?.length || 0 })}
                            </Text>

                            <ScrollView style={styles.clusterScrollList} showsVerticalScrollIndicator={false}>
                                {(clusterUsers || []).map((u) => {
                                    const online = isUserOnline(u);
                                    return (
                                        <TouchableOpacity
                                            key={u.id}
                                            style={[styles.clusterListItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}
                                            onPress={() => {
                                                setClusterUsers(null);
                                                setSelectedUser(u);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Image
                                                source={{ uri: getAvatarUrl(u.photoURL, u.name) }}
                                                style={[styles.clusterListAvatar, { borderColor: online ? uiColors.online : uiColors.offline }]}
                                                defaultSource={{ uri: DEFAULT_AVATAR }}
                                            />
                                            <View style={styles.clusterListInfo}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                                    <Text style={[styles.clusterListName, { color: uiColors.text }]} numberOfLines={1}>
                                                        {getDisplayName(u.name)}
                                                    </Text>
                                                    {u.gender === 'male' ? (
                                                        <Ionicons name="male" size={13} color="#3b82f6" />
                                                    ) : u.gender === 'female' ? (
                                                        <Ionicons name="female" size={13} color="#ec4899" />
                                                    ) : null}
                                                </View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                                                    <View style={[styles.clusterListPill, { backgroundColor: online ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.15)' }]}>
                                                        <View style={[styles.statusPillDot, { backgroundColor: online ? uiColors.online : uiColors.offline }]} />
                                                        <Text style={[styles.statusPillText, { color: online ? uiColors.online : uiColors.offline }]}>
                                                            {online ? t('radar.online') : t('radar.offline')}
                                                        </Text>
                                                    </View>
                                                    <Text style={[styles.clusterListDistance, { color: uiColors.accent }]}>
                                                        {proximityService.formatDistance(u.distance)}
                                                    </Text>
                                                    <Text style={[styles.clusterListDistance, { color: uiColors.secondary }]}>
                                                        {formatDirection(u.bearing)}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Ionicons name="chevron-forward" size={18} color={uiColors.secondary} />
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>

            </LinearGradient >
        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a1a',
    },
    embeddedContainer: {
        paddingTop: 0,
    },
    gradientBackground: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 30,
    },
    header: {
        paddingTop: 20,
        paddingHorizontal: 20,
        alignItems: 'center',
        marginBottom: 10,
    },
    embeddedHeader: {
        paddingTop: 10,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#00ffff',
        textShadowColor: 'rgba(0, 255, 255, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    subtitle: {
        fontSize: 13,
        color: '#fff',
        marginTop: 4,
        opacity: 0.8,
    },
    lastUpdateText: {
        fontSize: 11,
        color: '#888',
        marginTop: 2,
    },
    signalStatsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginTop: 10,
    },
    signalStatChip: {
        minHeight: 30,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    signalStatText: {
        fontSize: 11,
        fontWeight: '800',
    },
    liveAlertCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginHorizontal: 16,
        marginTop: 4,
        marginBottom: 12,
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
    },
    liveAlertTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    liveAlertText: {
        fontSize: 12,
        lineHeight: 18,
    },

    radarContainer: {
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    radarRings: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radarRing: {
        position: 'absolute',
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 255, 0.25)',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 4,
    },
    ringLabel: {
        fontSize: 9,
        color: 'rgba(0, 255, 255, 0.5)',
    },
    crossLines: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    horizontalLine: {
        position: 'absolute',
        width: '100%',
        height: 1,
        backgroundColor: 'rgba(0, 255, 255, 0.15)',
    },
    verticalLine: {
        position: 'absolute',
        width: 1,
        height: '100%',
        backgroundColor: 'rgba(0, 255, 255, 0.15)',
    },
    radarSweep: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    sweepGradient: {
        height: 3,
        borderRadius: 2,
    },
    centerPoint: {
        position: 'absolute',
        zIndex: 100,
    },
    centerDot: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#00ffff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#00ffff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
        elevation: 10,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    usersContainer: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userMarker: {
        position: 'absolute',
        alignItems: 'center',
        zIndex: 50,
    },
    userAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 2,
        borderColor: '#ff6b6b',
        backgroundColor: '#333',
    },
    statusDot: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#fff',
    },
    userInfoBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        marginTop: 2,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 255, 0.3)',
    },
    markerName: {
        fontSize: 8,
        fontWeight: '700',
        maxWidth: 60,
        textAlign: 'center',
    },
    distanceText: {
        fontSize: 8,
        fontWeight: 'bold',
    },
    genderCornerBadge: {
        position: 'absolute',
        bottom: 2,
        left: 0,
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.95)',
    },
    directionText: {
        color: '#fff',
        fontSize: 7,
        opacity: 0.8,
    },
    compassContainer: {
        position: 'absolute',
    },
    compassDirection: {
        position: 'absolute',
        width: 22,
        height: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    compassText: {
        color: 'rgba(0, 255, 255, 0.6)',
        fontSize: 13,
        fontWeight: 'bold',
    },
    northText: {
        color: '#ff6b6b',
    },
    headingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        gap: 8,
        flexWrap: 'wrap',
    },
    headingText: {
        fontSize: 16,
        color: '#00ffff',
        fontWeight: 'bold',
    },
    coordsText: {
        fontSize: 11,
        color: '#888',
    },
    controlsContainer: {
        paddingHorizontal: 20,
        marginTop: 12,
        gap: 10,
    },
    scanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#00b4d8',
        paddingVertical: 12,
        borderRadius: 22,
        gap: 8,
        shadowColor: '#00b4d8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 5,
    },
    scanButtonActive: {
        backgroundColor: '#ff6b6b',
        shadowColor: '#ff6b6b',
    },
    scanButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    nearMatchCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 12,
    },
    nearMatchInfo: {
        flex: 1,
        gap: 4,
    },
    nearMatchTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    nearMatchTitle: {
        fontSize: 14,
        fontWeight: '800',
    },
    nearMatchSubtitle: {
        fontSize: 12,
        lineHeight: 16,
    },
    radiusSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    radiusSelectorLabel: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    radiusButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        justifyContent: 'flex-end',
        maxWidth: SCREEN_WIDTH * 0.62,
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    filterButtons: {
        flexDirection: 'row',
        gap: 6,
    },
    filterButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    filterButtonText: {
        fontSize: 11,
        fontWeight: '600',
    },
    filterSection: {
        gap: 8,
    },
    filterChipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'flex-end',
        maxWidth: SCREEN_WIDTH * 0.72,
        alignSelf: 'flex-end',
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 12,
        borderWidth: 1,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    ageChip: {
        minWidth: 76,
        alignItems: 'center',
    },
    filterEmptyListText: {
        padding: 16,
        textAlign: 'center',
        fontSize: 13,
        lineHeight: 19,
    },

    radiusButton: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    radiusButtonActive: {
        backgroundColor: '#00ffff',
        borderColor: '#00ffff',
    },
    radiusButtonText: {
        color: '#fff',
        fontSize: 11,
    },
    radiusButtonTextActive: {
        color: '#000',
        fontWeight: 'bold',
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        gap: 6,
    },
    refreshButtonText: {
        color: '#00ffff',
        fontSize: 13,
    },
    // User List Styles
    userListSection: {
        marginTop: 20,
        marginHorizontal: 15,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 255, 0.2)',
    },
    userListHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        backgroundColor: 'rgba(0, 255, 255, 0.1)',
    },
    userListHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    userListTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    userList: {
        maxHeight: 400,
    },
    userListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
    },
    listUserAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: '#00ffff',
        backgroundColor: '#333',
    },
    listUserInfo: {
        flex: 1,
        marginLeft: 12,
    },
    listNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    listNameInner: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minWidth: 0,
    },
    listUserName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
        flex: 1,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        gap: 5,
    },
    statusPillDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusPillText: {
        fontSize: 10,
        fontWeight: '700',
    },
    listUserAge: {
        fontSize: 12,
        color: '#888',
        marginTop: 1,
    },
    listUserStats: {
        flexDirection: 'row',
        marginTop: 4,
        gap: 12,
    },
    listStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    listStatText: {
        fontSize: 11,
        color: '#aaa',
    },
    listActions: {
        flexDirection: 'row',
        gap: 8,
    },
    listActionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 255, 0.3)',
    },
    listSeparator: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        marginHorizontal: 12,
    },
    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#888',
        marginTop: 15,
        textAlign: 'center',
    },
    emptyStateSubtext: {
        fontSize: 13,
        color: '#666',
        marginTop: 5,
        textAlign: 'center',
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
    },
    modalContent: {
        borderRadius: 20,
        padding: 24,
        width: SCREEN_WIDTH * 0.88,
        alignItems: 'center',
        borderWidth: 1.5,
    },
    closeButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 10,
    },
    modalAvatar: {
        width: 90,
        height: 90,
        borderRadius: 45,
        marginBottom: 12,
        borderWidth: 3,
    },
    modalName: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    modalAge: {
        fontSize: 13,
        marginBottom: 4,
    },
    modalGender: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 10,
    },
    modalStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginVertical: 12,
        paddingVertical: 12,
        borderRadius: 12,
    },
    modalStatItem: {
        alignItems: 'center',
    },
    modalStatValue: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 4,
    },
    modalStatLabel: {
        fontSize: 10,
        marginTop: 2,
    },
    modalBioContainer: {
        marginTop: 8,
        padding: 12,
        borderRadius: 10,
        width: '100%',
    },
    modalBio: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    signalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: 18,
        paddingVertical: 11,
        paddingHorizontal: 14,
        marginTop: 14,
        gap: 8,
    },
    signalButtonText: {
        fontSize: 13,
        fontWeight: '700',
    },
    messageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 18,
        gap: 6,
    },
    messageButtonText: {
        fontSize: 13,
        fontWeight: 'bold',
    },
    viewProfileButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 18,
        gap: 6,
        borderWidth: 1,
    },
    viewProfileButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    // Error State Styles
    errorState: {
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 20,
        marginHorizontal: 15,
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 107, 107, 0.3)',
    },
    errorStateText: {
        fontSize: 14,
        color: '#ff6b6b',
        marginTop: 10,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 12,
        paddingVertical: 8,
        paddingHorizontal: 20,
        backgroundColor: '#ff6b6b',
        borderRadius: 16,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    // Ã¢â€â‚¬Ã¢â€â‚¬ Cluster styles Ã¢â€â‚¬Ã¢â€â‚¬
    clusterAvatarStack: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    clusterAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        backgroundColor: '#333',
    },
    clusterCountBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: '#fff',
        zIndex: 60,
    },
    clusterCountText: {
        color: '#000',
        fontSize: 10,
        fontWeight: '900',
    },
    clusterScrollList: {
        width: '100%',
        maxHeight: 360,
    },
    clusterListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    clusterListAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        backgroundColor: '#333',
    },
    clusterListInfo: {
        flex: 1,
        marginLeft: 12,
    },
    clusterListName: {
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
    },
    clusterListPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 999,
        gap: 4,
    },
    clusterListDistance: {
        fontSize: 11,
        fontWeight: '600',
    },
});

export default ProximityRadar;










