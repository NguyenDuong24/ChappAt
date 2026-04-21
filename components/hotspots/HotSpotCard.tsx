import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { formatTime } from '@/utils/common';
import { ThemeContext } from '@/context/ThemeContext';
import { getLiquidPalette, LiquidSurface } from '../liquid';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { HotSpot } from '@/types/hotSpots';

const { width: screenWidth } = Dimensions.get('window');

interface HotSpotCardProps {
  hotSpot: HotSpot;
  onPress: () => void;
  onInteraction: (type: 'interested' | 'joined') => void;
  userInteractions?: string[]; // Array of interaction types user has made
  style?: any;
}

const HotSpotCard: React.FC<HotSpotCardProps> = ({
  hotSpot,
  onPress,
  onInteraction,
  userInteractions = [],
  style
}) => {
  const themeContext = React.useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const isDark = themeContext?.isDark ?? (theme === 'dark');
  const palette = React.useMemo(() => themeContext?.palette || getLiquidPalette(theme), [theme, themeContext]);
  
  const isInterested = userInteractions.includes('interested');
  const isJoined = userInteractions.includes('joined');
  const isCheckedIn = userInteractions.includes('checked_in');

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      music: 'music-note',
      food: 'restaurant',
      sports: 'sports-soccer',
      art: 'palette',
      nightlife: 'nightlife',
      shopping: 'shopping-bag',
      culture: 'account-balance',
      outdoor: 'park'
    };
    return icons[category] || 'place';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatPrice = (price?: number) => {
    if (!price) return 'Miễn phí';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  return (
    <LiquidSurface
      themeMode={theme}
      borderRadius={24}
      intensity={isDark ? 10 : 20}
      style={[styles.container, style]}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={{ flex: 1 }}
      >
        {/* Hot Spot Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: hotSpot.thumbnail }} style={styles.image} contentFit="cover" />

          {/* Type Badge */}
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={[styles.typeBadge, { borderColor: 'rgba(255,255,255,0.1)' }]}>
            <MaterialIcons
              name={hotSpot.type === 'event' ? 'event' : 'place'}
              size={12}
              color={hotSpot.type === 'event' ? '#EC4899' : '#10B981'}
            />
            <Text style={[styles.typeBadgeText, { color: palette.textColor }]}>
              {hotSpot.type === 'event' ? 'Sự kiện' : 'Địa điểm'}
            </Text>
          </BlurView>

          {/* Featured Badge */}
          {hotSpot.isFeatured && (
            <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={styles.featuredBadge}>
              <MaterialIcons name="star" size={12} color="#FFD700" />
              <Text style={styles.featuredText}>Hot</Text>
            </BlurView>
          )}

          {/* User Status Indicators */}
          {(isInterested || isJoined || isCheckedIn) && (
            <View style={styles.statusContainer}>
              {isCheckedIn && (
                <View style={[styles.statusBadge, styles.checkedInBadge]}>
                  <MaterialIcons name="check-circle" size={12} color="white" />
                </View>
              )}
              {isJoined && !isCheckedIn && (
                <View style={[styles.statusBadge, styles.joinedBadge]}>
                  <MaterialIcons name="group" size={12} color="white" />
                </View>
              )}
              {isInterested && !isJoined && (
                <View style={[styles.statusBadge, styles.interestedBadge]}>
                  <MaterialIcons name="favorite" size={12} color="white" />
                </View>
              )}
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.categoryContainer}>
              <MaterialIcons
                name={getCategoryIcon(hotSpot.category) as any}
                size={16}
                color={palette.sphereGradient[0]}
              />
              <Text style={[styles.category, { color: palette.subtitleColor }]}>{hotSpot.category}</Text>
            </View>

            {hotSpot.type === 'event' && hotSpot.eventInfo && (
              <Text style={[styles.price, { color: palette.sphereGradient[0] }]}>
                {formatPrice(hotSpot.eventInfo.price)}
              </Text>
            )}
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: palette.textColor }]} numberOfLines={2}>
            {hotSpot.title}
          </Text>

          {/* Location */}
          <View style={styles.locationContainer}>
            <MaterialIcons name="location-on" size={14} color={palette.subtitleColor} />
            <Text style={[styles.location, { color: palette.subtitleColor }]} numberOfLines={1}>
              {hotSpot.location.address}
            </Text>
          </View>

          {/* Event Info */}
          {hotSpot.type === 'event' && hotSpot.eventInfo && (
            <View style={styles.eventInfo}>
              <View style={styles.dateContainer}>
                <MaterialIcons name="schedule" size={14} color={palette.subtitleColor} />
                <Text style={[styles.dateText, { color: palette.subtitleColor }]}>
                  {formatDate(hotSpot.eventInfo.startDate)}
                </Text>
              </View>

              {hotSpot.eventInfo.maxParticipants && (
                <Text style={[styles.participantsText, { color: palette.subtitleColor }]}>
                  {hotSpot.eventInfo.currentParticipants}/{hotSpot.eventInfo.maxParticipants} người
                </Text>
              )}
            </View>
          )}

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <FontAwesome5 name="heart" size={12} color={palette.sphereGradient[0]} />
              <Text style={[styles.statText, { color: palette.textColor }]}>{hotSpot.stats.interested}</Text>
            </View>

            <View style={styles.statItem}>
              <FontAwesome5 name="users" size={12} color={palette.sphereGradient[0]} />
              <Text style={[styles.statText, { color: palette.textColor }]}>{hotSpot.stats.joined}</Text>
            </View>

            {hotSpot.stats.checkedIn > 0 && (
              <View style={styles.statItem}>
                <FontAwesome5 name="map-marker-alt" size={12} color={palette.sphereGradient[0]} />
                <Text style={[styles.statText, { color: palette.textColor }]}>{hotSpot.stats.checkedIn}</Text>
              </View>
            )}

            {hotSpot.stats.rating > 0 && (
              <View style={styles.statItem}>
                <FontAwesome5 name="star" size={12} color="#FFD700" />
                <Text style={[styles.statText, { color: palette.textColor }]}>{hotSpot.stats.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { borderColor: isInterested ? palette.sphereGradient[0] : 'transparent', backgroundColor: isInterested ? 'transparent' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)') }
              ]}
              onPress={() => onInteraction('interested')}
              activeOpacity={0.7}
            >
              {isInterested && (
                <LinearGradient
                  colors={palette.sphereGradient as any}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              )}
              <MaterialIcons
                name={isInterested ? "favorite" : "favorite-border"}
                size={16}
                color={isInterested ? "white" : palette.textColor}
              />
              <Text style={[
                styles.actionButtonText,
                { color: isInterested ? "white" : palette.textColor }
              ]}>
                {isInterested ? 'Đã quan tâm' : 'Quan tâm'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                { borderColor: isJoined ? palette.sphereGradient[0] : 'transparent', backgroundColor: isJoined ? 'transparent' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)') }
              ]}
              onPress={() => onInteraction('joined')}
              activeOpacity={0.7}
            >
              {isJoined && (
                <LinearGradient
                  colors={palette.sphereGradient as any}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              )}
              <MaterialIcons
                name={isJoined ? "group" : "group-add"}
                size={16}
                color={isJoined ? "white" : palette.textColor}
              />
              <Text style={[
                styles.actionButtonText,
                { color: isJoined ? "white" : palette.textColor }
              ]}>
                {isJoined ? 'Đã tham gia' : 'Tham gia'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </LiquidSurface>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  imageContainer: {
    position: 'relative',
    height: 200,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  typeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  featuredText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  statusContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  interestedBadge: {
    backgroundColor: 'rgba(255, 107, 107, 0.9)',
  },
  joinedBadge: {
    backgroundColor: 'rgba(78, 205, 196, 0.9)',
  },
  checkedInBadge: {
    backgroundColor: 'rgba(69, 183, 209, 0.9)',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  category: {
    fontSize: 12,
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 24,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  location: {
    fontSize: 14,
    marginLeft: 4,
    flex: 1,
  },
  eventInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    marginLeft: 4,
  },
  participantsText: {
    fontSize: 12,
  },
  stats: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    zIndex: 1,
  },
});

export default HotSpotCard;
