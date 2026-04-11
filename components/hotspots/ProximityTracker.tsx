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
  const [distanceToHotSpot, setDistanceToHotSpot] = useState<number | null>(null);
  const [distanceToUser, setDistanceToUser] = useState<number | null>(null);
  const [canCheckIn, setCanCheckIn] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState(false);
  const autoCheckTriggeredRef = useRef(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
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

  useEffect(() => {
    if (canCheckIn) {
      Animated.spring(scaleAnim, {
        toValue: 1.05,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  }, [canCheckIn]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');

      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'To auto check-in, please allow location access.',
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
      Alert.alert('Error', 'Location permission is required to start tracking.');
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
      Alert.alert('Error', 'Unable to track location.');
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

      setDistanceToHotSpot(result.distanceToHotSpot);
      setDistanceToUser(result.distanceToUser);
      setCanCheckIn(result.canCheckIn);
      if (result.autoCheckInEligible && !autoCheckTriggeredRef.current && !isCheckingIn) {
        autoCheckTriggeredRef.current = true;
        handleCheckIn();
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const handleCheckIn = async () => {
    if (!session || !canCheckIn || isCheckingIn) return;

    setIsCheckingIn(true);
    try {
      stopTracking();

      // Complete meetup and get reward
      const reward = await hotSpotInviteService.completeMeetup(session.id);

      Alert.alert(
        'Check-in Successful!',
        `${reward.message}\n\nYou received ${reward.points} points!`,
        [
          {
            text: 'Great!',
            onPress: () => {
              if (onCheckInComplete) {
                onCheckInComplete(reward);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error during check-in:', error);
      const errMsg = String((error as any)?.message || "");
      if (errMsg.toLowerCase().includes("already completed")) {
        return;
      }
      Alert.alert('Error', 'Check-in failed. Please try again.');
      autoCheckTriggeredRef.current = false;
      startTracking(); // Restart tracking if failed
    } finally {
      setIsCheckingIn(false);
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
            <Text style={styles.errorTitle}>Location Permission Needed</Text>
            <Text style={styles.errorSubtitle}>
              Please allow location access to enable auto check-in.
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestLocationPermission}
            >
              <Text style={styles.permissionButtonText}>Grant permission</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const otherUser = session.participants.find(id => id !== userId);
  const userCheckIn = session.checkInData[userId];
  const otherCheckIn = session.checkInData[otherUser || ''];

  const getGradientColors = (): [string, string] => {
    if (canCheckIn) return ['#FFD700', '#FFA500']; // Gold/Orange for highlight
    if (tracking) return ['#10B981', '#059669']; // Green for active tracking
    return ['rgba(139, 92, 246, 0.1)', 'rgba(236, 72, 153, 0.1)']; // Default
  };

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <LinearGradient
          colors={getGradientColors()}
          style={[styles.banner, canCheckIn && styles.bannerHighlighted]}
        >
          <Animated.View style={[styles.iconContainer, tracking && { transform: [{ scale: pulseAnim }] }]}>
            <Ionicons
              name={canCheckIn ? 'star' : tracking ? 'location' : 'location-outline'}
              size={28}
              color={canCheckIn ? 'white' : tracking ? 'white' : '#8B5CF6'}
            />
          </Animated.View>

          <View style={styles.content}>
            <Text style={[styles.title, (tracking || canCheckIn) && styles.titleActive]}>
              {canCheckIn
                ? 'Ready to check in!'
                : tracking ? 'Tracking location' : 'Ready to meet'}
            </Text>

            {distanceToUser !== null && distanceToUser <= 500 && (
              <View style={styles.distanceContainer}>
                <Text style={[styles.distanceLabel, (tracking || canCheckIn) && styles.subtitleActive]}>
                  Distance between 2 users:
                </Text>
                <Text style={[styles.distanceText, (tracking || canCheckIn) && styles.distanceTextActive]}>
                  {distanceToUser}m
                </Text>
              </View>
            )}

            <Text style={[styles.subtitle, (tracking || canCheckIn) && styles.subtitleActive]}>
              {canCheckIn
                ? 'You are close enough now. Tap Check-In to complete.'
                : `When both users are near ${hotSpotTitle} (within 200m) and near each other (under 50m), check-in will be available.`}
            </Text>

            <View style={styles.statusGrid}>
              <View style={[styles.statusCard, (tracking || canCheckIn) && styles.statusCardActive]}>
                <MaterialIcons
                  name={userCheckIn?.isWithinRadius ? 'check-circle' : 'radio-button-unchecked'}
                  size={20}
                  color={userCheckIn?.isWithinRadius ? '#10B981' : (tracking || canCheckIn) ? 'rgba(0,0,0,0.3)' : '#9CA3AF'}
                />
                <Text style={[styles.statusLabel, (tracking || canCheckIn) && styles.statusLabelActive]}>You</Text>
                <Text style={[styles.statusValue, userCheckIn?.isWithinRadius && styles.statusValueActive]}>
                  {userCheckIn?.isWithinRadius ? 'Arrived' : 'Not yet'}
                </Text>
              </View>

              <View style={[styles.statusCard, (tracking || canCheckIn) && styles.statusCardActive]}>
                <MaterialIcons
                  name={otherCheckIn?.isWithinRadius ? 'check-circle' : 'radio-button-unchecked'}
                  size={20}
                  color={otherCheckIn?.isWithinRadius ? '#10B981' : (tracking || canCheckIn) ? 'rgba(0,0,0,0.3)' : '#9CA3AF'}
                />
                <Text style={[styles.statusLabel, (tracking || canCheckIn) && styles.statusLabelActive]}>Friend</Text>
                <Text style={[styles.statusValue, otherCheckIn?.isWithinRadius && styles.statusValueActive]}>
                  {otherCheckIn?.isWithinRadius ? 'Arrived' : 'Not yet'}
                </Text>
              </View>
            </View>

            {canCheckIn && (
              <TouchableOpacity
                style={styles.checkInButton}
                onPress={handleCheckIn}
                disabled={isCheckingIn}
              >
                <LinearGradient colors={['#FF4B2B', '#FF416C']} style={styles.checkInButtonGradient}>
                  {isCheckingIn ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <MaterialIcons name="touch-app" size={24} color="white" />
                      <Text style={styles.checkInButtonText}>CHECK IN TOGETHER</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}

            {!tracking && !canCheckIn && (
              <TouchableOpacity style={styles.startButton} onPress={startTracking}>
                <LinearGradient colors={['#8B5CF6', '#EC4899']} style={styles.startButtonGradient}>
                  <Ionicons name="play-circle-outline" size={20} color="white" />
                  <Text style={styles.startButtonText}>Start tracking</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {tracking && !canCheckIn && (
              <TouchableOpacity style={styles.stopButton} onPress={stopTracking}>
                <Text style={styles.stopButtonText}>Stop tracking</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </Animated.View>
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
    borderWidth: 1,
    borderColor: 'transparent',
  },
  bannerHighlighted: {
    borderColor: '#FFD700',
    borderWidth: 2,
    elevation: 8,
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  distanceContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 8,
    borderRadius: 12,
  },
  distanceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
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
  statusCardActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  statusLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  statusLabelActive: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statusValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  statusValueActive: {
    color: '#10B981',
  },
  checkInButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 12,
    elevation: 4,
  },
  checkInButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  checkInButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.5,
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
