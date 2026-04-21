import React, { useState, useCallback, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Alert,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  ActivityIndicator,
  FlatList,
  Share,
  Linking,
  Animated as RNAnimated,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useHotSpotDetails, useHotSpots } from '@/hooks/useHotSpots';
import { getDistance } from 'geolib';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome5, FontAwesome } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import ErrorComponent from '@/components/common/ErrorComponent';
import HotSpotDetailsContent from '@/components/hotspots/HotSpotDetailsContent';
import EventDetails from '@/components/hotspots/EventDetails';
import { Colors } from '@/constants/Colors';
import { ThemeContext } from '@/context/ThemeContext';
import { getLiquidPalette, LiquidGlassBackground, LiquidSurface } from '@/components/liquid';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const CHECK_IN_RADIUS_METERS = 200;
const HEADER_HEIGHT = 400;

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

  const themeContext = React.useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const isDark = themeContext?.isDark ?? (theme === 'dark');
  const palette = useMemo(() => themeContext?.palette || getLiquidPalette(theme), [theme, themeContext]);

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
      Alert.alert('Error', 'Unable to process this action. Please try again.');
    } finally {
      setIsInteracting(false);
    }
  }, [hotSpot, isInteracting, hasInteraction, removeInteraction, interactWithHotSpot, refetch]);

  const handleCheckIn = useCallback(async () => {
    if (!hotSpot) {
      Alert.alert('Error', 'No Hot Spot data found.');
      return;
    }

    setCheckingIn(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow location access to check in.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;
      const hotSpotCoords = hotSpot.location?.coordinates;
      if (!hotSpotCoords?.latitude || !hotSpotCoords?.longitude) {
        Alert.alert('Error', 'Hot Spot does not have coordinates for check-in.');
        return;
      }

      const distance = getDistance(
        { latitude, longitude },
        { latitude: hotSpotCoords.latitude, longitude: hotSpotCoords.longitude }
      );

      if (distance <= CHECK_IN_RADIUS_METERS) {
        const success = await interactWithHotSpot(hotSpot.id, 'checked_in', {
          checkInLocation: { latitude, longitude },
        });
        if (success) {
          Alert.alert('Success', 'Check-in successful!');
          await refetch();
        } else {
          throw new Error('Failed to update check-in status.');
        }
      } else {
        Alert.alert('Too Far', `You need to be within ${CHECK_IN_RADIUS_METERS}m to check in. You are ${distance}m away.`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unable to get your location.';
      Alert.alert('Check-in Error', errorMessage);
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
      pathname: '/AddFriend' as any,
      params: { hotSpotId: hotSpot.id, hotSpotTitle: hotSpot.title, context: 'inviteToHotSpot' },
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <LiquidGlassBackground themeMode={theme} />
        <ActivityIndicator size="large" color={palette.sphereGradient[0]} />
      </View>
    );
  }

  if (error || !hotSpot) {
    return (
      <View style={styles.container}>
        <LiquidGlassBackground themeMode={theme} />
        <ErrorComponent message={error || 'Unable to load Hot Spot information.'} onRetry={refetch} />
      </View>
    );
  }

  const isInterested = hasInteraction('interested');
  const isCheckedIn = hasInteraction('checked_in');

  return (
    <View style={styles.container}>
      <LiquidGlassBackground themeMode={theme} style={StyleSheet.absoluteFillObject} />
      <StatusBar barStyle="light-content" />

      <RNAnimated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          {hotSpot.images && hotSpot.images.length > 1 ? (
            <View style={{ flex: 1 }}>
              <FlatList
                data={hotSpot.images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(img, index) => `hero-img-${index}`}
                renderItem={({ item: imgUrl }) => (
                  <Image
                    source={{ uri: imgUrl }}
                    style={styles.heroImage}
                    contentFit="cover"
                    transition={200}
                  />
                )}
              />
              {/* Pagination Dots */}
              <View style={styles.paginationDots}>
                {hotSpot.images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      { backgroundColor: 'white', opacity: 0.8 }
                    ]}
                  />
                ))}
              </View>
            </View>
          ) : (
            <Image
              source={{ uri: hotSpot.thumbnail || hotSpot.images[0] }}
              style={styles.heroImage}
              contentFit="cover"
              transition={200}
            />
          )}

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)', isDark ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.6)']}
            style={styles.heroGradient}
          />

          <View style={styles.heroContent}>
            <View style={[styles.categoryBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)' }]}>
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
                <Text style={styles.reviewCount}>({hotSpot.stats.reviewCount} reviews)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Main Content Sheet */}
        <LiquidSurface
          themeMode={theme}
          intensity={isDark ? 10 : 20}
          borderRadius={32}
          style={styles.contentSheet}
        >
          {/* Action Bar */}
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={[styles.primaryButton, isInterested && { backgroundColor: palette.sphereGradient[0] }]}
              onPress={() => handleInteraction('interested')}
              activeOpacity={0.8}
            >
              {isInterested ? (
                <LinearGradient
                  colors={palette.sphereGradient as any}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.sphereGradient[0] }]} />
              )}
              <FontAwesome name={isInterested ? "star" : "star-o"} size={18} color="#FFF" />
              <Text style={styles.primaryButtonText}>
                {isInterested ? 'Interested' : 'Mark Interested'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryButton, 
                { backgroundColor: isCheckedIn ? '#10B981' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'), borderColor: isCheckedIn ? '#10B981' : 'transparent' }
              ]}
              onPress={handleCheckIn}
              disabled={isCheckedIn}
            >
              {checkingIn ? (
                <ActivityIndicator size="small" color={palette.sphereGradient[0]} />
              ) : (
                <>
                  <FontAwesome5 name="map-marker-alt" size={16} color={isCheckedIn ? "#FFF" : palette.sphereGradient[0]} />
                  <Text style={[styles.secondaryButtonText, { color: isCheckedIn ? '#FFF' : palette.textColor }]}>
                    {isCheckedIn ? 'Checked-in' : 'Check-in'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} onPress={handleGetDirections}>
              <FontAwesome5 name="directions" size={20} color={palette.textColor} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} onPress={handleInviteFriend}>
              <MaterialIcons name="person-add" size={22} color={palette.textColor} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={22} color={palette.textColor} />
            </TouchableOpacity>
          </View>

          <HotSpotDetailsContent hotSpot={hotSpot} />

          {/* Event Details */}
          {hotSpot.eventInfo && (
            <>
              <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} />
              <EventDetails hotSpot={hotSpot} />
            </>
          )}

          {/* Image Gallery Preview (if more than 1 image) */}
          {hotSpot.images.length > 1 && (
            <View style={styles.gallerySection}>
              <Text style={[styles.sectionTitle, { color: palette.textColor }]}>Images</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                {hotSpot.images.map((img, index) => (
                  <TouchableOpacity key={index} style={styles.galleryImageWrapper}>
                    <Image
                      source={{ uri: img }}
                      style={styles.galleryImage}
                      contentFit="cover"
                      transition={200}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.bottomSpace} />
        </LiquidSurface>
      </RNAnimated.ScrollView>

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
    width: width,
    height: '100%',
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
    marginTop: -32,
    paddingTop: 32,
    paddingHorizontal: 20,
    minHeight: height - HEADER_HEIGHT + 32,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 8,
    zIndex: 1,
  },
  secondaryButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    zIndex: 10,
  },
  blurContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationDots: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default HotSpotDetailScreen;
