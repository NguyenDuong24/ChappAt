import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Alert,
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useHotSpotDetails, useHotSpots } from '@/hooks/useHotSpots';
import { getDistance } from 'geolib';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome5, FontAwesome } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import ErrorComponent from '@/components/common/ErrorComponent';
import HotSpotDetailsContent from '@/components/hotspots/HotSpotDetailsContent';
import EventDetails from '@/components/hotspots/EventDetails';
import { Colors } from '@/constants/Colors';
import { Share, Linking } from 'react-native';

const { width, height } = Dimensions.get('window');
const CHECK_IN_RADIUS_METERS = 200;
const HEADER_HEIGHT = 350;

const HotSpotDetailScreen = () => {
  const { hotSpotId } = useLocalSearchParams<{ hotSpotId: string }>();
  const router = useRouter();

  const {
    hotSpot,
    loading,
    error,
    hasInteraction,
    refetch
  } = useHotSpotDetails(hotSpotId || '');

  const { interactWithHotSpot, removeInteraction } = useHotSpots();
  const [isInteracting, setIsInteracting] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const handleInteraction = useCallback(async (type: 'interested' | 'joined') => {
    if (!hotSpot || isInteracting) return;

    setIsInteracting(true);
    const currentHasInteraction = hasInteraction(type);

    try {
      let success;
      if (currentHasInteraction) {
        success = await removeInteraction(hotSpot.id, type);
      } else {
        success = await interactWithHotSpot(hotSpot.id, type);
      }

      if (success) {
        await refetch();
      }
    } catch (e) {
      console.error('Interaction error:', e);
      Alert.alert('Lỗi', 'Không thể thực hiện tương tác. Vui lòng thử lại.');
    } finally {
      setIsInteracting(false);
    }
  }, [hotSpot, isInteracting, hasInteraction, removeInteraction, interactWithHotSpot, refetch]);

  const handleCheckIn = useCallback(async () => {
    if (!hotSpot || !navigator.geolocation) {
      Alert.alert('Lỗi', 'Thiết bị không hỗ trợ định vị hoặc không có thông tin Hot Spot.');
      return;
    }

    setCheckingIn(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        });
      });

      const { latitude, longitude } = position.coords;
      const hotSpotCoords = hotSpot.location.coordinates;

      const distance = getDistance(
        { latitude, longitude },
        { latitude: hotSpotCoords.latitude, longitude: hotSpotCoords.longitude }
      );

      if (distance <= CHECK_IN_RADIUS_METERS) {
        const success = await interactWithHotSpot(hotSpot.id, 'checked_in');
        if (success) {
          Alert.alert('Thành công', 'Bạn đã check-in thành công!');
          await refetch();
        } else {
          throw new Error('Failed to update check-in status.');
        }
      } else {
        Alert.alert('Chưa đến nơi', `Bạn cần ở trong phạm vi ${CHECK_IN_RADIUS_METERS}m để check-in. Bạn đang ở cách ${distance}m.`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể lấy vị trí của bạn.';
      Alert.alert('Lỗi Check-in', errorMessage);
    } finally {
      setCheckingIn(false);
    }
  }, [hotSpot, interactWithHotSpot, refetch]);

  const handleShare = async () => {
    if (!hotSpot) return;
    try {
      await Share.share({
        message: `Check out this hot spot: ${hotSpot.title}! Find it on ChappAt.`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleGetDirections = () => {
    if (!hotSpot) return;
    const { latitude, longitude } = hotSpot.location.coordinates;
    const scheme = Platform.OS === 'ios' ? 'maps:0,0?q=' : 'geo:0,0?q=';
    const latLng = `${latitude},${longitude}`;
    const label = hotSpot.title;
    const url = Platform.OS === 'ios' ? `${scheme}${label}@${latLng}` : `${scheme}${latLng}(${label})`;
    Linking.openURL(url);
  };

  const handleInviteFriend = () => {
    if (!hotSpot) return;
    router.push({
      pathname: '/AddFriend',
      params: { hotSpotId: hotSpot.id, hotSpotTitle: hotSpot.title, context: 'inviteToHotSpot' },
    });
  };

  if (loading) {
    return <ActivityIndicator size="large" color={Colors.primary} />;
  }

  if (error || !hotSpot) {
    return <ErrorComponent message={error || 'Không tìm thấy thông tin Hot Spot.'} onRetry={refetch} />;
  }

  const isInterested = hasInteraction('interested');
  const isCheckedIn = hasInteraction('checked_in');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: hotSpot.thumbnail || hotSpot.images[0] }}
            style={styles.heroImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
            style={styles.heroGradient}
          />

          <View style={styles.heroContent}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{hotSpot.category}</Text>
            </View>

            <Text style={styles.title} numberOfLines={2}>{hotSpot.title}</Text>

            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color="#E0E0E0" />
              <Text style={styles.locationText} numberOfLines={1}>
                {hotSpot.location.address}
              </Text>
            </View>

            <View style={styles.ratingRow}>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.ratingText}>{hotSpot.stats.rating.toFixed(1)}</Text>
                <Text style={styles.reviewCount}>({hotSpot.stats.reviewCount} đánh giá)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Main Content Sheet */}
        <View style={styles.contentSheet}>

          {/* Action Bar */}
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={[styles.primaryButton, isInterested && styles.primaryButtonActive]}
              onPress={() => handleInteraction('interested')}
              activeOpacity={0.8}
            >
              <FontAwesome name={isInterested ? "star" : "star-o"} size={18} color={isInterested ? "#FFF" : "#FFF"} />
              <Text style={styles.primaryButtonText}>
                {isInterested ? 'Đã quan tâm' : 'Quan tâm'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, isCheckedIn && styles.secondaryButtonActive]}
              onPress={handleCheckIn}
              disabled={isCheckedIn}
            >
              {checkingIn ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <FontAwesome5 name="map-marker-alt" size={16} color={isCheckedIn ? "#FFF" : Colors.primary} />
                  <Text style={[styles.secondaryButtonText, isCheckedIn && styles.secondaryButtonTextActive]}>
                    {isCheckedIn ? 'Đã Check-in' : 'Check-in'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconButton} onPress={handleGetDirections}>
              <FontAwesome5 name="directions" size={20} color={Colors.light.text} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconButton} onPress={handleInviteFriend}>
              <MaterialIcons name="person-add" size={22} color={Colors.light.text} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={22} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Details Content */}
          <HotSpotDetailsContent hotSpot={hotSpot} />

          {/* Event Details */}
          {hotSpot.eventInfo && (
            <>
              <View style={styles.divider} />
              <EventDetails hotSpot={hotSpot} />
            </>
          )}

          {/* Image Gallery Preview (if more than 1 image) */}
          {hotSpot.images.length > 1 && (
            <View style={styles.gallerySection}>
              <Text style={styles.sectionTitle}>Hình ảnh</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                {hotSpot.images.map((img, index) => (
                  <TouchableOpacity key={index} style={styles.galleryImageWrapper}>
                    <Image source={{ uri: img }} style={styles.galleryImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.bottomSpace} />
        </View>
      </ScrollView>

      {/* Floating Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <BlurView intensity={30} tint="dark" style={styles.blurContainer}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </BlurView>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  heroContainer: {
    height: HEADER_HEIGHT,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  heroContent: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  categoryText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    color: '#E0E0E0',
    fontSize: 14,
    marginLeft: 6,
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 12,
  },
  reviewCount: {
    color: '#CCC',
    fontSize: 12,
    marginLeft: 4,
  },
  contentSheet: {
    flex: 1,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -24,
    paddingTop: 24,
    paddingHorizontal: 20,
    minHeight: height - HEADER_HEIGHT + 24,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 10,
  },
  primaryButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonActive: {
    backgroundColor: '#FFB703',
    shadowColor: '#FFB703',
  },
  primaryButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 8,
  },
  secondaryButton: {
    flex: 2,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  secondaryButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
  secondaryButtonTextActive: {
    color: '#FFF',
  },
  iconButton: {
    width: 44,
    height: 44,
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  gallerySection: {
    marginTop: 8,
    marginBottom: 24,
  },
  galleryScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  galleryImageWrapper: {
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  galleryImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  bottomSpace: {
    height: 40,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  blurContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HotSpotDetailScreen;