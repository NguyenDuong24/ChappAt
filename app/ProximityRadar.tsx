import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Modal,
    Image,
    Animated as RNAnimated,
    Dimensions,
    Alert,
    ActivityIndicator,
    Platform,
    ScrollView,
    FlatList,
    SafeAreaView,
    Easing,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    interpolate,
    Extrapolate
} from 'react-native-reanimated';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { useAuth } from '../context/authContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import proximityService, { NearbyUser } from '../services/proximityService';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');
const RADAR_SIZE = Math.min(width * 0.95, height * 0.5); // Radar to hơn
const RADAR_RADIUS = RADAR_SIZE / 2 - 30;

// Default avatar placeholder
const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=00ffff&color=000&size=150&name=U';

const ProximityRadar = () => {
    const { user } = useAuth();
    const router = useRouter();
    const [scanning, setScanning] = useState(false);
    const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
    // Use a separate state for display to throttle updates
    const [displayHeading, setDisplayHeading] = useState(0);
    const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null);
    const [myLocation, setMyLocation] = useState<Location.LocationObject | null>(null);
    const [locationPermission, setLocationPermission] = useState(false);
    const [searchRadius, setSearchRadius] = useState(5000);
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [showUserList, setShowUserList] = useState(true); // Hiển thị danh sách user
    const [scanError, setScanError] = useState<string | null>(null);

    // Animation refs
    const radarRotation = useRef(new RNAnimated.Value(0)).current;
    const pulseAnim = useRef(new RNAnimated.Value(1)).current;
    const headingShared = useSharedValue(0); // Reanimated shared value for heading

    const radarAnimation = useRef<RNAnimated.CompositeAnimation | null>(null);
    const pulseAnimation = useRef<RNAnimated.CompositeAnimation | null>(null);

    // Location subscription ref
    const locationSubscription = useRef<Location.LocationSubscription | null>(null);

    // Smoothing heading
    const headingRef = useRef(0);
    const lastDisplayUpdateRef = useRef(0);
    const SMOOTHING_FACTOR = 0.1; // Reduced for smoother feel

    // Memoized radius options
    const radiusOptions = useMemo(() => [1000, 5000, 10000, 20000], []);

    // Get avatar URL with fallback
    const getAvatarUrl = useCallback((photoURL: string | undefined, name?: string) => {
        if (photoURL && photoURL.startsWith('http')) {
            return photoURL;
        }
        // Generate avatar from name
        const initial = name?.charAt(0)?.toUpperCase() || 'U';
        return `https://ui-avatars.com/api/?background=00ffff&color=000&size=150&name=${initial}`;
    }, []);

    // Calculate relative angle
    const getRelativeAngle = useCallback((targetBearing: number, deviceHeading: number): number => {
        let relativeAngle = targetBearing - deviceHeading;
        relativeAngle = ((relativeAngle % 360) + 360) % 360;
        return relativeAngle;
    }, []);

    // Find nearby users
    const findNearbyUsers = useCallback(async () => {
        if (!myLocation || !user?.uid) return;

        try {
            setIsLoading(true);
            setScanError(null);

            const users = await proximityService.findNearbyUsers(myLocation, {
                radius: searchRadius,
                userId: user.uid,
                includeOffline: false,
                maxAge: 10 * 60 * 1000, // 10 minutes - more lenient
            });

            const updatedUsers = users.map(u => ({
                ...u,
                bearing: proximityService.calculateBearing(
                    myLocation.coords.latitude,
                    myLocation.coords.longitude,
                    u.location.latitude,
                    u.location.longitude
                ),
                distance: proximityService.calculateDistance(
                    myLocation.coords.latitude,
                    myLocation.coords.longitude,
                    u.location.latitude,
                    u.location.longitude
                ),
            }));

            setNearbyUsers(updatedUsers);
            setLastUpdate(new Date());
        } catch (error: any) {
            console.error('Error finding nearby users:', error);
            setScanError(error?.message || 'Có lỗi khi tìm kiếm');
        } finally {
            setIsLoading(false);
        }
    }, [myLocation, searchRadius, user?.uid]);

    // Start scanning
    const startScanning = async () => {
        if (!user?.uid) {
            Alert.alert('Lỗi', 'Vui lòng đăng nhập để sử dụng tính năng này.');
            return;
        }

        const hasPermission = await proximityService.requestPermissions();
        if (!hasPermission) {
            Alert.alert(
                'Quyền truy cập vị trí',
                'Ứng dụng cần quyền truy cập vị trí để tìm người xung quanh.',
                [
                    { text: 'Hủy', style: 'cancel' },
                    { text: 'Cài đặt', onPress: () => Location.requestForegroundPermissionsAsync() }
                ]
            );
            return;
        }

        setScanning(true);
        setLocationPermission(true);
        setIsLoading(true);

        try {
            const location = await proximityService.getCurrentLocation();
            if (location) {
                setMyLocation(location);
                await proximityService.updateUserLocation(user.uid, location);

                locationSubscription.current = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.BestForNavigation,
                        timeInterval: 3000,
                        distanceInterval: 5,
                    },
                    async (newLocation) => {
                        setMyLocation(newLocation);
                        await proximityService.updateUserLocation(user.uid, newLocation);
                    }
                );

                await findNearbyUsers();
            } else {
                Alert.alert('Lỗi', 'Không thể lấy vị trí của bạn. Vui lòng kiểm tra GPS.');
                setScanning(false);
                setIsLoading(false);
                return;
            }
        } catch (error) {
            console.error('Error starting scan:', error);
            Alert.alert('Lỗi', 'Có lỗi xảy ra khi bắt đầu quét.');
            setScanning(false);
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
    };

    // Stop scanning
    const stopScanning = async () => {
        setScanning(false);

        if (radarAnimation.current) {
            radarAnimation.current.stop();
        }
        if (pulseAnimation.current) {
            pulseAnimation.current.stop();
        }
        radarRotation.setValue(0);
        pulseAnim.setValue(1);

        if (locationSubscription.current) {
            locationSubscription.current.remove();
            locationSubscription.current = null;
        }
    };

    // Magnetometer
    useEffect(() => {
        let magnetometerSubscription: any;

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
                if (now - lastDisplayUpdateRef.current > 200) {
                    setDisplayHeading(smoothedHeading);
                    lastDisplayUpdateRef.current = now;
                }
            });

            Magnetometer.setUpdateInterval(20); // 50fps for smoother animation
        };

        startMagnetometer();

        return () => {
            if (magnetometerSubscription) {
                magnetometerSubscription.remove();
            }
        };
    }, []);

    // Refresh interval
    useEffect(() => {
        let refreshInterval: NodeJS.Timeout;

        if (scanning && myLocation) {
            refreshInterval = setInterval(() => {
                findNearbyUsers();
            }, 10000);
        }

        return () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        };
    }, [scanning, myLocation, findNearbyUsers]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (locationSubscription.current) {
                locationSubscription.current.remove();
            }
            proximityService.cleanup();
        };
    }, []);

    // Render users on radar - Memoized to avoid unnecessary recalculations
    const userMarkers = useMemo(() => {
        return nearbyUsers.map((nearbyUser) => {
            const distanceRatio = Math.min(nearbyUser.distance / searchRadius, 1);
            const radius = distanceRatio * RADAR_RADIUS;

            // Calculate position based on bearing (North = 0)
            const angleInRadians = (nearbyUser.bearing * Math.PI) / 180;

            const x = radius * Math.sin(angleInRadians);
            const y = -radius * Math.cos(angleInRadians);

            return (
                <TouchableOpacity
                    key={nearbyUser.id}
                    style={[
                        styles.userMarker,
                        {
                            transform: [
                                { translateX: x },
                                { translateY: y },
                            ],
                        },
                    ]}
                    onPress={() => setSelectedUser(nearbyUser)}
                    activeOpacity={0.7}
                >
                    <Image
                        source={{ uri: getAvatarUrl(nearbyUser.photoURL, nearbyUser.name) }}
                        style={styles.userAvatar}
                        defaultSource={{ uri: DEFAULT_AVATAR }}
                    />
                    <View style={styles.userInfoBadge}>
                        <Text style={styles.distanceText}>
                            {proximityService.formatDistance(nearbyUser.distance)}
                        </Text>
                    </View>
                </TouchableOpacity>
            );
        });
    }, [nearbyUsers, searchRadius, getAvatarUrl]);

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
    const handleUserPress = (nearbyUser: NearbyUser) => {
        setSelectedUser(nearbyUser);
    };

    // Quick view profile from list
    const handleQuickViewProfile = (userId: string) => {
        router.push({
            pathname: '/(screens)/user/UserProfileScreen',
            params: { userId },
        } as any);
    };

    // Render user list item
    const renderUserListItem = ({ item }: { item: NearbyUser }) => {
        const direction = proximityService.getCardinalDirection(item.bearing);
        const relativeAngle = getRelativeAngle(item.bearing, displayHeading);

        return (
            <TouchableOpacity
                style={styles.userListItem}
                onPress={() => handleUserPress(item)}
                activeOpacity={0.7}
            >
                <Image
                    source={{ uri: getAvatarUrl(item.photoURL, item.name) }}
                    style={styles.listUserAvatar}
                    defaultSource={{ uri: DEFAULT_AVATAR }}
                />
                <View style={styles.listUserInfo}>
                    <Text style={styles.listUserName} numberOfLines={1}>{item.name}</Text>
                    {typeof item.age === 'number' && <Text style={styles.listUserAge}>{item.age} tuổi</Text>}
                    <View style={styles.listUserStats}>
                        <View style={styles.listStatItem}>
                            <Ionicons name="location" size={12} color="#00ffff" />
                            <Text style={styles.listStatText}>
                                {proximityService.formatDistance(item.distance)}
                            </Text>
                        </View>
                        <View style={styles.listStatItem}>
                            <Ionicons name="compass" size={12} color="#00ffff" />
                            <Text style={styles.listStatText}>{direction}</Text>
                        </View>
                        <View style={styles.listStatItem}>
                            <Ionicons name="navigate" size={12} color="#ff6b6b" />
                            <Text style={styles.listStatText}>{relativeAngle.toFixed(0)}°</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.listActions}>
                    <TouchableOpacity
                        style={styles.listActionButton}
                        onPress={() => handleQuickViewProfile(item.id)}
                    >
                        <Ionicons name="person" size={18} color="#00ffff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.listActionButton}
                        onPress={() => {
                            router.push({
                                pathname: '/chat/[id]',
                                params: { id: item.id },
                            } as any);
                        }}
                    >
                        <Ionicons name="chatbubble" size={18} color="#00ffff" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    const radarRotate = radarRotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    // Reanimated style for map rotation
    const animatedMapStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotate: `${-headingShared.value}deg` }],
        };
    });

    // Reanimated style for compass rotation
    const animatedCompassStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotate: `${-headingShared.value}deg` }],
        };
    });

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#0a0a1a', '#1a1a2e', '#16213e']}
                style={styles.gradientBackground}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>🛰️ Proximity Radar</Text>
                        <Text style={styles.subtitle}>
                            {scanning
                                ? `${nearbyUsers.length} người trong phạm vi ${searchRadius / 1000}km`
                                : 'Nhấn để bắt đầu quét'}
                        </Text>
                        {lastUpdate && scanning && (
                            <Text style={styles.lastUpdateText}>
                                Cập nhật: {typeof lastUpdate === 'string'
                                    ? lastUpdate
                                    : lastUpdate.toLocaleTimeString('vi-VN')}
                            </Text>
                        )}
                    </View>

                    {/* Radar Container */}
                    <View style={styles.radarContainer}>
                        {/* Radar Background Rings */}
                        <View style={styles.radarRings}>
                            {[0.25, 0.5, 0.75, 1].map((ratio, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.radarRing,
                                        {
                                            width: RADAR_SIZE * ratio,
                                            height: RADAR_SIZE * ratio,
                                            borderRadius: (RADAR_SIZE * ratio) / 2,
                                        },
                                    ]}
                                >
                                    <Text style={styles.ringLabel}>
                                        {proximityService.formatDistance(searchRadius * ratio)}
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
                                    { transform: [{ rotate: radarRotate }] },
                                ]}
                            >
                                <LinearGradient
                                    colors={['transparent', 'rgba(0, 255, 255, 0.3)', 'rgba(0, 255, 255, 0.6)']}
                                    style={styles.sweepGradient}
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
                            <View style={styles.centerDot}>
                                <Ionicons name="person" size={18} color="#fff" />
                            </View>
                        </RNAnimated.View>

                        {/* Users on Radar - Rotatable Container */}
                        {scanning && (
                            <Animated.View
                                style={[
                                    styles.usersContainer,
                                    animatedMapStyle
                                ]}
                            >
                                {userMarkers}
                            </Animated.View>
                        )}

                        {/* Compass Directions */}
                        <Animated.View style={[
                            styles.compassContainer,
                            animatedCompassStyle
                        ]}>
                            <View style={[styles.compassDirection, styles.compassNorth]}>
                                <Text style={[styles.compassText, styles.northText]}>N</Text>
                            </View>
                            <View style={[styles.compassDirection, styles.compassSouth]}>
                                <Text style={styles.compassText}>S</Text>
                            </View>
                            <View style={[styles.compassDirection, styles.compassEast]}>
                                <Text style={styles.compassText}>E</Text>
                            </View>
                            <View style={[styles.compassDirection, styles.compassWest]}>
                                <Text style={styles.compassText}>W</Text>
                            </View>
                        </Animated.View>
                    </View>

                    {/* Heading Display */}
                    <View style={styles.headingContainer}>
                        <Ionicons name="compass-outline" size={20} color="#00ffff" />
                        <Text style={styles.headingText}>
                            {displayHeading.toFixed(0)}° {proximityService.getCardinalDirection(displayHeading)}
                        </Text>
                        {myLocation && (
                            <Text style={styles.coordsText}>
                                {myLocation.coords.latitude.toFixed(4)}, {myLocation.coords.longitude.toFixed(4)}
                            </Text>
                        )}
                    </View>

                    {/* Control Buttons */}
                    <View style={styles.controlsContainer}>
                        <TouchableOpacity
                            style={[styles.scanButton, scanning && styles.scanButtonActive]}
                            onPress={scanning ? stopScanning : startScanning}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : scanning ? (
                                <>
                                    <Ionicons name="stop-circle" size={22} color="#fff" />
                                    <Text style={styles.scanButtonText}>Dừng quét</Text>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="radio-outline" size={22} color="#fff" />
                                    <Text style={styles.scanButtonText}>Bắt đầu quét</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Radius Selector */}
                        <View style={styles.radiusSelector}>
                            <Text style={styles.radiusSelectorLabel}>Bán kính:</Text>
                            <View style={styles.radiusButtons}>
                                {[1000, 5000, 10000, 20000].map((radius) => (
                                    <TouchableOpacity
                                        key={radius}
                                        style={[
                                            styles.radiusButton,
                                            searchRadius === radius && styles.radiusButtonActive,
                                        ]}
                                        onPress={() => {
                                            setSearchRadius(radius);
                                            if (scanning) findNearbyUsers();
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.radiusButtonText,
                                                searchRadius === radius && styles.radiusButtonTextActive,
                                            ]}
                                        >
                                            {radius >= 1000 ? `${radius / 1000}km` : `${radius}m`}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Refresh Button */}
                        {
                            scanning && (
                                <TouchableOpacity
                                    style={styles.refreshButton}
                                    onPress={findNearbyUsers}
                                    disabled={isLoading}
                                >
                                    <Ionicons name="refresh" size={18} color="#00ffff" />
                                    <Text style={styles.refreshButtonText}>Làm mới</Text>
                                </TouchableOpacity>
                            )
                        }
                    </View >

                    {/* User List Section */}
                    {
                        scanning && nearbyUsers.length > 0 && (
                            <View style={styles.userListSection}>
                                <TouchableOpacity
                                    style={styles.userListHeader}
                                    onPress={() => setShowUserList(!showUserList)}
                                >
                                    <View style={styles.userListHeaderLeft}>
                                        <Ionicons name="people" size={20} color="#00ffff" />
                                        <Text style={styles.userListTitle}>
                                            Người dùng gần đây ({nearbyUsers.length})
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name={showUserList ? "chevron-up" : "chevron-down"}
                                        size={20}
                                        color="#00ffff"
                                    />
                                </TouchableOpacity>

                                {showUserList && (
                                    <FlatList
                                        data={nearbyUsers}
                                        renderItem={renderUserListItem}
                                        keyExtractor={(item) => item.id}
                                        scrollEnabled={false}
                                        style={styles.userList}
                                        ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
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
                                    Không tìm thấy ai trong phạm vi {searchRadius / 1000}km
                                </Text>
                                <Text style={styles.emptyStateSubtext}>
                                    Thử tăng bán kính tìm kiếm hoặc quét lại
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
                                    <Text style={styles.retryButtonText}>Thử lại</Text>
                                </TouchableOpacity>
                            </View>
                        )
                    }

                </ScrollView >

                {/* User Details Modal */}
                < Modal
                    visible={selectedUser !== null}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setSelectedUser(null)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setSelectedUser(null)}
                            >
                                <Ionicons name="close-circle" size={32} color="#ff6b6b" />
                            </TouchableOpacity>

                            {selectedUser && (
                                <>
                                    <TouchableOpacity onPress={handleViewProfile}>
                                        <Image
                                            source={{ uri: getAvatarUrl(selectedUser.photoURL, selectedUser.name) }}
                                            style={styles.modalAvatar}
                                            defaultSource={{ uri: DEFAULT_AVATAR }}
                                        />
                                    </TouchableOpacity>
                                    <Text style={styles.modalName}>{selectedUser.name}</Text>
                                    {typeof selectedUser.age === 'number' && (
                                        <Text style={styles.modalAge}>{selectedUser.age} tuổi</Text>
                                    )}

                                    <View style={styles.modalStats}>
                                        <View style={styles.modalStatItem}>
                                            <Ionicons name="location" size={22} color="#00ffff" />
                                            <Text style={styles.modalStatValue}>
                                                {proximityService.formatDistance(selectedUser.distance)}
                                            </Text>
                                            <Text style={styles.modalStatLabel}>Khoảng cách</Text>
                                        </View>

                                        <View style={styles.modalStatItem}>
                                            <Ionicons name="compass" size={22} color="#00ffff" />
                                            <Text style={styles.modalStatValue}>
                                                {selectedUser.bearing.toFixed(0)}°
                                            </Text>
                                            <Text style={styles.modalStatLabel}>
                                                {proximityService.getCardinalDirection(selectedUser.bearing)}
                                            </Text>
                                        </View>

                                        <View style={styles.modalStatItem}>
                                            <Ionicons name="navigate" size={22} color="#00ffff" />
                                            <Text style={styles.modalStatValue}>
                                                {getRelativeAngle(selectedUser.bearing, displayHeading).toFixed(0)}°
                                            </Text>
                                            <Text style={styles.modalStatLabel}>Tương đối</Text>
                                        </View>
                                    </View>

                                    {typeof selectedUser.bio === 'string' && selectedUser.bio && (
                                        <View style={styles.modalBioContainer}>
                                            <Text style={styles.modalBio}>{selectedUser.bio}</Text>
                                        </View>
                                    )}

                                    <View style={styles.modalActions}>
                                        <TouchableOpacity
                                            style={styles.messageButton}
                                            onPress={handleMessageUser}
                                        >
                                            <Ionicons name="chatbubble" size={18} color="#000" />
                                            <Text style={styles.messageButtonText}>Nhắn tin</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.viewProfileButton}
                                            onPress={handleViewProfile}
                                        >
                                            <Ionicons name="person" size={18} color="#00ffff" />
                                            <Text style={styles.viewProfileButtonText}>Xem hồ sơ</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                </Modal >
            </LinearGradient >
        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a1a',
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
    radarContainer: {
        width: RADAR_SIZE,
        height: RADAR_SIZE,
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
        width: RADAR_SIZE,
        height: RADAR_SIZE,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    sweepGradient: {
        width: RADAR_SIZE / 2,
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
    userInfoBadge: {
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        marginTop: 3,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 255, 0.3)',
    },
    distanceText: {
        color: '#00ffff',
        fontSize: 9,
        fontWeight: 'bold',
    },
    directionText: {
        color: '#fff',
        fontSize: 7,
        opacity: 0.8,
    },
    compassContainer: {
        position: 'absolute',
        width: RADAR_SIZE,
        height: RADAR_SIZE,
    },
    compassDirection: {
        position: 'absolute',
        width: 22,
        height: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    compassNorth: {
        top: 3,
        left: RADAR_SIZE / 2 - 11,
    },
    compassSouth: {
        bottom: 3,
        left: RADAR_SIZE / 2 - 11,
    },
    compassEast: {
        right: 3,
        top: RADAR_SIZE / 2 - 11,
    },
    compassWest: {
        left: 3,
        top: RADAR_SIZE / 2 - 11,
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
        gap: 6,
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
    listUserName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
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
        backgroundColor: '#1a1a2e',
        borderRadius: 20,
        padding: 24,
        width: width * 0.88,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#00ffff',
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
        borderColor: '#00ffff',
    },
    modalName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    modalAge: {
        fontSize: 13,
        color: '#aaa',
        marginBottom: 12,
    },
    modalStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginVertical: 12,
        paddingVertical: 12,
        backgroundColor: 'rgba(0, 255, 255, 0.05)',
        borderRadius: 12,
    },
    modalStatItem: {
        alignItems: 'center',
    },
    modalStatValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 4,
    },
    modalStatLabel: {
        fontSize: 10,
        color: '#888',
        marginTop: 2,
    },
    modalBioContainer: {
        marginTop: 8,
        padding: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 10,
        width: '100%',
    },
    modalBio: {
        fontSize: 13,
        color: '#ddd',
        textAlign: 'center',
        lineHeight: 18,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    messageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#00ffff',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 18,
        gap: 6,
    },
    messageButtonText: {
        color: '#000',
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
        borderColor: '#00ffff',
    },
    viewProfileButtonText: {
        color: '#00ffff',
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
});

export default ProximityRadar;
