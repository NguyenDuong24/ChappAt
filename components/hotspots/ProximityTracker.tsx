import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import hotSpotInviteService from '@/services/hotSpotInviteService';
import { MeetupSession } from '@/types/hotSpotInvites';

interface ProximityTrackerProps {
  inviteId: string;
  userId: string;
  hotSpotLocation: {
    latitude: number;
    longitude: number;
  };
  hotSpotTitle: string;
  onCheckInComplete?: (reward: any) => void;
}

const ProximityTracker: React.FC<ProximityTrackerProps> = ({
  inviteId,
  userId,
  hotSpotLocation,
  hotSpotTitle,
  onCheckInComplete,
}) => {
  const [session, setSession] = useState<MeetupSession | null>(null);
  const [tracking, setTracking] = useState(false);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState(false);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const locationWatcherRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    requestLocationPermission();
    loadSession();

    return () => {
      stopTracking();
    };
  }, []);

  useEffect(() => {
    if (!session || session.status !== 'both_confirmed') return;

    // Auto start tracking when both confirmed
    startTracking();
  }, [session]);

  useEffect(() => {
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
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Cần quyền truy cập vị trí',
          'Để tự động check-in, bạn cần cấp quyền truy cập vị trí.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const loadSession = async () => {
    try {
      const sessionData = await hotSpotInviteService.getActiveMeetupSession(userId, inviteId);
      setSession(sessionData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading session:', error);
      setLoading(false);
    }
  };

  const startTracking = async () => {
    if (!locationPermission) {
      Alert.alert('Lỗi', 'Cần quyền truy cập vị trí để theo dõi');
      return;
    }

    setTracking(true);

    try {
      // Get initial location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      await updateLocation(location.coords.latitude, location.coords.longitude);

      // Start watching location
      locationWatcherRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 10, // Or when moved 10 meters
        },
        (location) => {
          updateLocation(location.coords.latitude, location.coords.longitude);
        }
      );
    } catch (error) {
      console.error('Error starting tracking:', error);
      Alert.alert('Lỗi', 'Không thể theo dõi vị trí');
      setTracking(false);
    }
  };

  const stopTracking = () => {
    if (locationWatcherRef.current) {
      locationWatcherRef.current.remove();
      locationWatcherRef.current = null;
    }
    setTracking(false);
  };

  const updateLocation = async (latitude: number, longitude: number) => {
    if (!session) return;

    try {
      const result = await hotSpotInviteService.updateUserLocation(
        session.id,
        userId,
        latitude,
        longitude,
        hotSpotLocation
      );

      setCurrentDistance(result.distance);

      // If both users are in radius, auto check-in
      if (result.canCheckIn) {
        stopTracking();
        
        // Complete meetup and get reward
        const reward = await hotSpotInviteService.completeMeetup(session.id);
        
        Alert.alert(
          '🎉 Check-in thành công!',
          `${reward.message}\n\nBạn nhận được ${reward.points} điểm!`,
          [
            {
              text: 'Tuyệt vời!',
              onPress: () => {
                if (onCheckInComplete) {
                  onCheckInComplete(reward);
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#8B5CF6" />
      </View>
    );
  }

  if (!session || session.status === 'completed') {
    return null;
  }

  if (!locationPermission) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(239, 68, 68, 0.1)', 'rgba(220, 38, 38, 0.1)']}
          style={styles.banner}
        >
          <MaterialIcons name="location-off" size={24} color="#EF4444" />
          <View style={styles.content}>
            <Text style={styles.errorTitle}>Cần quyền truy cập vị trí</Text>
            <Text style={styles.errorSubtitle}>
              Để tự động check-in khi gặp mặt, bạn cần cấp quyền
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestLocationPermission}
            >
              <Text style={styles.permissionButtonText}>Cấp quyền</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const otherUser = session.participants.find(id => id !== userId);
  const userCheckIn = session.checkInData[userId];
  const otherCheckIn = session.checkInData[otherUser || ''];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={tracking ? ['#10B981', '#059669'] : ['rgba(139, 92, 246, 0.1)', 'rgba(236, 72, 153, 0.1)']}
        style={styles.banner}
      >
        <Animated.View style={[styles.iconContainer, tracking && { transform: [{ scale: pulseAnim }] }]}>
          <Ionicons
            name={tracking ? 'location' : 'location-outline'}
            size={28}
            color={tracking ? 'white' : '#8B5CF6'}
          />
        </Animated.View>

        <View style={styles.content}>
          <Text style={[styles.title, tracking && styles.titleActive]}>
            {tracking ? '📍 Đang theo dõi vị trí' : 'Sẵn sàng gặp mặt'}
          </Text>
          
          {currentDistance !== null && (
            <Text style={[styles.distanceText, tracking && styles.distanceTextActive]}>
              Khoảng cách: {currentDistance}m
            </Text>
          )}

          <Text style={[styles.subtitle, tracking && styles.subtitleActive]}>
            Khi cả hai đến gần {hotSpotTitle} (trong vòng 200m), hệ thống sẽ tự động check-in
          </Text>

          <View style={styles.statusGrid}>
            <View style={styles.statusCard}>
              <MaterialIcons
                name={userCheckIn?.isWithinRadius ? 'check-circle' : 'radio-button-unchecked'}
                size={20}
                color={userCheckIn?.isWithinRadius ? '#10B981' : '#9CA3AF'}
              />
              <Text style={styles.statusLabel}>Bạn</Text>
              <Text style={[styles.statusValue, userCheckIn?.isWithinRadius && styles.statusValueActive]}>
                {userCheckIn?.isWithinRadius ? 'Đã đến' : 'Chưa đến'}
              </Text>
            </View>

            <View style={styles.statusCard}>
              <MaterialIcons
                name={otherCheckIn?.isWithinRadius ? 'check-circle' : 'radio-button-unchecked'}
                size={20}
                color={otherCheckIn?.isWithinRadius ? '#10B981' : '#9CA3AF'}
              />
              <Text style={styles.statusLabel}>Bạn bè</Text>
              <Text style={[styles.statusValue, otherCheckIn?.isWithinRadius && styles.statusValueActive]}>
                {otherCheckIn?.isWithinRadius ? 'Đã đến' : 'Chưa đến'}
              </Text>
            </View>
          </View>

          {!tracking && (
            <TouchableOpacity style={styles.startButton} onPress={startTracking}>
              <LinearGradient colors={['#8B5CF6', '#EC4899']} style={styles.startButtonGradient}>
                <Ionicons name="play-circle-outline" size={20} color="white" />
                <Text style={styles.startButtonText}>Bắt đầu theo dõi</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {tracking && (
            <TouchableOpacity style={styles.stopButton} onPress={stopTracking}>
              <Text style={styles.stopButtonText}>Dừng theo dõi</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  banner: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  content: {
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  titleActive: {
    color: 'white',
  },
  distanceText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#8B5CF6',
    textAlign: 'center',
  },
  distanceTextActive: {
    color: 'white',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  subtitleActive: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  statusCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  statusValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  statusValueActive: {
    color: '#10B981',
  },
  startButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 12,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  startButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
  },
  stopButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  stopButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 4,
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#DC2626',
    marginBottom: 12,
  },
  permissionButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});

export default ProximityTracker;
