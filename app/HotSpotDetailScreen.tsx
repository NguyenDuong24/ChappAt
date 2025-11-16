import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Alert,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useHotSpotDetails, useHotSpots } from '@/hooks/useHotSpots';
import { getDistance } from 'geolib';

import LoadingComponent from '@/components/common/LoadingComponent';
import ErrorComponent from '@/components/common/ErrorComponent';
import InteractionButtons from '@/components/hotspots/InteractionButtons';
import ActionMenu from '@/components/hotspots/ActionMenu';
import HotSpotDetailsContent from '@/components/hotspots/HotSpotDetailsContent';
import ImageGallery from '@/components/hotspots/ImageGallery';
import EventDetails from '@/components/hotspots/EventDetails';

const CHECK_IN_RADIUS_METERS = 200;

const HotSpotDetailScreen = () => {
  const { hotSpotId } = useLocalSearchParams<{ hotSpotId: string }>();
  
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
      if (currentHasInteraction) {
        await removeInteraction(hotSpot.id, type);
      } else {
        await interactWithHotSpot(hotSpot.id, type);
      }
      await refetch();
    } catch (e) {
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

  if (loading) {
    return <LoadingComponent text="Đang tải chi tiết Hot Spot..." />;
  }

  if (error || !hotSpot) {
    return <ErrorComponent message={error || 'Không tìm thấy thông tin Hot Spot.'} onRetry={refetch} />;
  }

  const isInterested = hasInteraction('interested');
  const isJoined = hasInteraction('joined');
  const isCheckedIn = hasInteraction('checked_in');

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Image Gallery - Full Width */}
        <ImageGallery images={hotSpot.images} thumbnail={hotSpot.thumbnail} />

        {/* Main Content */}
        <View style={styles.content}>

          {/* Interaction Buttons - Highlighted */}
          <View style={styles.interactionSection}>
            <InteractionButtons
              isInterested={isInterested}
              isJoined={isJoined}
              isCheckedIn={isCheckedIn}
              checkingIn={checkingIn}
              onInteract={handleInteraction}
              onCheckIn={handleCheckIn}
            />
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Action Menu */}
          <View style={styles.section}>
            <ActionMenu hotSpot={hotSpot} />
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Details Content */}
          <View style={styles.section}>
            <HotSpotDetailsContent hotSpot={hotSpot} />
          </View>

          {/* Event Details */}
          {hotSpot.eventInfo && (
            <>
              <View style={styles.divider} />
              <View style={styles.section}>
                <EventDetails hotSpot={hotSpot} />
              </View>
            </>
          )}

          {/* Bottom Space */}
          <View style={styles.bottomSpace} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  interactionSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#F8F9FA',
  },
  divider: {
    height: 8,
    backgroundColor: '#F0F2F5',
  },
  bottomSpace: {
    height: 32,
  },
});

export default HotSpotDetailScreen;