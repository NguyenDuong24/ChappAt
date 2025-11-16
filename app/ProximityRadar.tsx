import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Image,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { useAuth } from '../context/authContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import proximityService, { NearbyUser } from '../services/proximityService';

const { width, height } = Dimensions.get('window');

const ProximityRadar = () => {
  const { user } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [heading, setHeading] = useState(0);
  const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null);
  const [myLocation, setMyLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [searchRadius, setSearchRadius] = useState(5000); // 5km mặc định

  // Animation
  const radarRotation = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Tìm người dùng xung quanh
  const findNearbyUsers = async () => {
    if (!myLocation || !user?.uid) return;

    try {
      const users = await proximityService.findNearbyUsers(myLocation, {
        radius: searchRadius,
        userId: user.uid,
        includeOffline: false,
        maxAge: 5 * 60 * 1000, // 5 minutes
      });

      setNearbyUsers(users);
    } catch (error) {
      console.error('Error finding nearby users:', error);
      Alert.alert('Lỗi', 'Không thể tìm người dùng xung quanh.');
    }
  };

  // Bắt đầu quét
  const startScanning = async () => {
    if (!user?.uid) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập để sử dụng tính năng này.');
      return;
    }

    const hasPermission = await proximityService.requestPermissions();
    if (!hasPermission) {
      Alert.alert('Quyền truy cập vị trí', 'Ứng dụng cần quyền truy cập vị trí để tìm người xung quanh.');
      return;
    }

    setScanning(true);
    setLocationPermission(true);

    const location = await proximityService.getCurrentLocation();
    if (location) {
      setMyLocation(location);
      await proximityService.updateUserLocation(user.uid, location);
      await findNearbyUsers();
    } else {
      Alert.alert('Lỗi', 'Không thể lấy vị trí của bạn. Vui lòng kiểm tra GPS.');
      setScanning(false);
      return;
    }

    // Bắt đầu animation radar
    Animated.loop(
      Animated.timing(radarRotation, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Dừng quét
  const stopScanning = () => {
    setScanning(false);
    radarRotation.stopAnimation();
    pulseAnim.stopAnimation();
  };

  // Lắng nghe cảm biến la bàn (compass)
  useEffect(() => {
    let subscription: any;

    const startMagnetometer = async () => {
      subscription = Magnetometer.addListener((data) => {
        const angleInRadians = Math.atan2(data.y, data.x);
        let angleInDegrees = (angleInRadians * 180) / Math.PI;
        angleInDegrees = (angleInDegrees + 360) % 360;
        setHeading(angleInDegrees);
      });
      Magnetometer.setUpdateInterval(100);
    };

    startMagnetometer();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  // Cập nhật vị trí định kỳ khi đang quét
  useEffect(() => {
    let locationInterval: NodeJS.Timeout;

    if (scanning && user?.uid) {
      locationInterval = setInterval(async () => {
        const location = await proximityService.getCurrentLocation();
        if (location) {
          setMyLocation(location);
          await proximityService.updateUserLocation(user.uid, location);
          await findNearbyUsers();
        }
      }, 10000); // Cập nhật mỗi 10 giây
    }

    return () => {
      if (locationInterval) {
        clearInterval(locationInterval);
      }
    };
  }, [scanning, user]);

  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      proximityService.cleanup();
    };
  }, []);

  // Render các người dùng xung quanh trên radar
  const renderUsersOnRadar = () => {
    const radarRadius = Math.min(width, height) * 0.35; // Bán kính radar
    const centerX = width / 2;
    const centerY = height / 2 - 50;

    return nearbyUsers.map((nearbyUser, index) => {
      // Tính toán vị trí trên radar
      const distanceRatio = Math.min(nearbyUser.distance / searchRadius, 1);
      const radius = distanceRatio * radarRadius;

      // Góc tương đối (bearing - heading)
      const relativeAngle = nearbyUser.bearing - heading;
      const angleInRadians = (relativeAngle * Math.PI) / 180;

      const x = centerX + radius * Math.sin(angleInRadians);
      const y = centerY - radius * Math.cos(angleInRadians);

      return (
        <TouchableOpacity
          key={nearbyUser.id}
          style={[
            styles.userMarker,
            {
              left: x - 20,
              top: y - 20,
            },
          ]}
          onPress={() => setSelectedUser(nearbyUser)}
        >
          <Image
            source={{ uri: nearbyUser.photoURL }}
            style={styles.userAvatar}
          />
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceText}>
              {nearbyUser.distance < 1000
                ? `${nearbyUser.distance}m`
                : `${(nearbyUser.distance / 1000).toFixed(1)}km`}
            </Text>
          </View>
        </TouchableOpacity>
      );
    });
  };

  const radarRotate = radarRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradientBackground}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Proximity Radar</Text>
          <Text style={styles.subtitle}>
            {nearbyUsers.length} người xung quanh
          </Text>
        </View>

        {/* Radar Container */}
        <View style={styles.radarContainer}>
          {/* Radar Rings */}
          <View style={styles.radarRings}>
            {[1, 2, 3, 4].map((ring) => (
              <View
                key={ring}
                style={[
                  styles.radarRing,
                  {
                    width: (width * 0.7 * ring) / 4,
                    height: (width * 0.7 * ring) / 4,
                    borderRadius: (width * 0.7 * ring) / 8,
                  },
                ]}
              />
            ))}
          </View>

          {/* Radar Scan Line */}
          {scanning && (
            <Animated.View
              style={[
                styles.radarScanLine,
                {
                  transform: [{ rotate: radarRotate }],
                },
              ]}
            >
              <LinearGradient
                colors={['transparent', 'rgba(0, 255, 255, 0.5)', 'transparent']}
                style={styles.scanLineGradient}
              />
            </Animated.View>
          )}

          {/* Center Point (You) */}
          <Animated.View
            style={[
              styles.centerPoint,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <Ionicons name="person" size={24} color="#fff" />
          </Animated.View>

          {/* Users on Radar */}
          {scanning && renderUsersOnRadar()}

          {/* Compass Directions */}
          <View style={styles.compassContainer}>
            <Text style={[styles.compassText, { top: 10 }]}>N</Text>
            <Text style={[styles.compassText, { bottom: 10 }]}>S</Text>
            <Text style={[styles.compassText, { left: 10 }]}>W</Text>
            <Text style={[styles.compassText, { right: 10 }]}>E</Text>
          </View>
        </View>

        {/* Heading Display */}
        <View style={styles.headingContainer}>
          <Ionicons name="compass-outline" size={20} color="#00ffff" />
          <Text style={styles.headingText}>{heading.toFixed(0)}°</Text>
        </View>

        {/* Control Buttons */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={[styles.scanButton, scanning && styles.scanButtonActive]}
            onPress={scanning ? stopScanning : startScanning}
          >
            {scanning ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.scanButtonText}>Đang quét...</Text>
              </>
            ) : (
              <>
                <Ionicons name="scan-outline" size={24} color="#fff" />
                <Text style={styles.scanButtonText}>Bắt đầu quét</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.radiusSelector}>
            <Text style={styles.radiusSelectorLabel}>Bán kính:</Text>
            <View style={styles.radiusButtons}>
              {[1000, 5000, 10000].map((radius) => (
                <TouchableOpacity
                  key={radius}
                  style={[
                    styles.radiusButton,
                    searchRadius === radius && styles.radiusButtonActive,
                  ]}
                  onPress={() => setSearchRadius(radius)}
                >
                  <Text
                    style={[
                      styles.radiusButtonText,
                      searchRadius === radius && styles.radiusButtonTextActive,
                    ]}
                  >
                    {radius / 1000}km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* User Details Modal */}
        <Modal
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
                  <Image
                    source={{ uri: selectedUser.photoURL }}
                    style={styles.modalAvatar}
                  />
                  <Text style={styles.modalName}>{selectedUser.name}</Text>
                  {selectedUser.age && (
                    <Text style={styles.modalAge}>{selectedUser.age} tuổi</Text>
                  )}

                  <View style={styles.modalInfoRow}>
                    <Ionicons name="location" size={20} color="#00ffff" />
                    <Text style={styles.modalDistance}>
                      {selectedUser.distance < 1000
                        ? `${selectedUser.distance} mét`
                        : `${(selectedUser.distance / 1000).toFixed(1)} km`}
                    </Text>
                  </View>

                  <View style={styles.modalInfoRow}>
                    <Ionicons name="compass" size={20} color="#00ffff" />
                    <Text style={styles.modalBearing}>
                      Hướng: {selectedUser.bearing.toFixed(0)}°
                    </Text>
                  </View>

                  {selectedUser.bio && (
                    <View style={styles.modalBioContainer}>
                      <Text style={styles.modalBio}>{selectedUser.bio}</Text>
                    </View>
                  )}

                  <TouchableOpacity style={styles.messageButton}>
                    <Ionicons name="chatbubble" size={20} color="#fff" />
                    <Text style={styles.messageButtonText}>Nhắn tin</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00ffff',
    textShadowColor: 'rgba(0, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    marginTop: 5,
    opacity: 0.8,
  },
  radarContainer: {
    width: width * 0.9,
    height: width * 0.9,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  radarRings: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  radarScanLine: {
    position: 'absolute',
    width: width * 0.7,
    height: width * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanLineGradient: {
    width: '100%',
    height: 2,
  },
  centerPoint: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00ffff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  userMarker: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ff6b6b',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  userAvatar: {
    width: '100%',
    height: '100%',
  },
  distanceBadge: {
    position: 'absolute',
    bottom: -15,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 35,
    alignItems: 'center',
  },
  distanceText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  compassContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compassText: {
    position: 'absolute',
    color: '#00ffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 10,
  },
  headingText: {
    fontSize: 18,
    color: '#00ffff',
    fontWeight: 'bold',
  },
  controlsContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 15,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00ffff',
    paddingVertical: 15,
    borderRadius: 25,
    gap: 10,
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  scanButtonActive: {
    backgroundColor: '#ff6b6b',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  radiusSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  radiusSelectorLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  radiusButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  radiusButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  radiusButtonActive: {
    backgroundColor: '#00ffff',
    borderColor: '#00ffff',
  },
  radiusButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  radiusButtonTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 25,
    width: width * 0.85,
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
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#00ffff',
  },
  modalName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  modalAge: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 15,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
    gap: 10,
  },
  modalDistance: {
    fontSize: 16,
    color: '#fff',
  },
  modalBearing: {
    fontSize: 16,
    color: '#fff',
  },
  modalBioContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    width: '100%',
  },
  modalBio: {
    fontSize: 14,
    color: '#ddd',
    textAlign: 'center',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00ffff',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 20,
    marginTop: 20,
    gap: 10,
  },
  messageButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProximityRadar;
