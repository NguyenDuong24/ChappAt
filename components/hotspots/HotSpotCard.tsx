import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { HotSpot } from '@/types/hotSpots';
import { formatTime } from '@/utils/common';

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
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Hot Spot Image */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: hotSpot.thumbnail }} style={styles.image} />
        
        {/* Type Badge */}
        <View style={[styles.typeBadge, hotSpot.type === 'event' ? styles.eventBadge : styles.placeBadge]}>
          <MaterialIcons 
            name={hotSpot.type === 'event' ? 'event' : 'place'} 
            size={12} 
            color="white" 
          />
          <Text style={styles.typeBadgeText}>
            {hotSpot.type === 'event' ? 'Sự kiện' : 'Địa điểm'}
          </Text>
        </View>

        {/* Featured Badge */}
        {hotSpot.isFeatured && (
          <View style={styles.featuredBadge}>
            <MaterialIcons name="star" size={12} color="#FFD700" />
            <Text style={styles.featuredText}>Hot</Text>
          </View>
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
              color="#666" 
            />
            <Text style={styles.category}>{hotSpot.category}</Text>
          </View>
          
          {hotSpot.type === 'event' && hotSpot.eventInfo && (
            <Text style={styles.price}>
              {formatPrice(hotSpot.eventInfo.price)}
            </Text>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {hotSpot.title}
        </Text>

        {/* Location */}
        <View style={styles.locationContainer}>
          <MaterialIcons name="location-on" size={14} color="#666" />
          <Text style={styles.location} numberOfLines={1}>
            {hotSpot.location.address}
          </Text>
        </View>

        {/* Event Info */}
        {hotSpot.type === 'event' && hotSpot.eventInfo && (
          <View style={styles.eventInfo}>
            <View style={styles.dateContainer}>
              <MaterialIcons name="schedule" size={14} color="#666" />
              <Text style={styles.dateText}>
                {formatDate(hotSpot.eventInfo.startDate)}
              </Text>
            </View>
            
            {hotSpot.eventInfo.maxParticipants && (
              <Text style={styles.participantsText}>
                {hotSpot.eventInfo.currentParticipants}/{hotSpot.eventInfo.maxParticipants} người
              </Text>
            )}
          </View>
        )}

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <FontAwesome5 name="heart" size={12} color="#FF6B6B" />
            <Text style={styles.statText}>{hotSpot.stats.interested}</Text>
          </View>
          
          <View style={styles.statItem}>
            <FontAwesome5 name="users" size={12} color="#4ECDC4" />
            <Text style={styles.statText}>{hotSpot.stats.joined}</Text>
          </View>
          
          <View style={styles.statItem}>
            <FontAwesome5 name="map-marker-alt" size={12} color="#45B7D1" />
            <Text style={styles.statText}>{hotSpot.stats.checkedIn}</Text>
          </View>
          
          {hotSpot.stats.rating > 0 && (
            <View style={styles.statItem}>
              <FontAwesome5 name="star" size={12} color="#FFD93D" />
              <Text style={styles.statText}>{hotSpot.stats.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.interestedButton,
              isInterested && styles.interestedButtonActive
            ]}
            onPress={() => onInteraction('interested')}
          >
            <MaterialIcons
              name={isInterested ? "favorite" : "favorite-border"}
              size={16}
              color={isInterested ? "#FF6B6B" : "#666"}
            />
            <Text style={[
              styles.actionButtonText,
              isInterested && styles.interestedTextActive
            ]}>
              {isInterested ? 'Đã quan tâm' : 'Quan tâm'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.joinButton,
              isJoined && styles.joinButtonActive
            ]}
            onPress={() => onInteraction('joined')}
          >
            <MaterialIcons
              name={isJoined ? "group" : "group-add"}
              size={16}
              color={isJoined ? "#4ECDC4" : "#666"}
            />
            <Text style={[
              styles.actionButtonText,
              isJoined && styles.joinTextActive
            ]}>
              {isJoined ? 'Đã tham gia' : 'Tham gia'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: 200,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
  },
  eventBadge: {
    backgroundColor: 'rgba(255, 107, 107, 0.9)',
  },
  placeBadge: {
    backgroundColor: 'rgba(78, 205, 196, 0.9)',
  },
  typeBadgeText: {
    color: 'white',
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
    color: '#666',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
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
    color: '#666',
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
    color: '#666',
    marginLeft: 4,
  },
  participantsText: {
    fontSize: 12,
    color: '#999',
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
    color: '#666',
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    color: '#666',
  },
  interestedButton: {
    backgroundColor: '#FFF',
  },
  interestedButtonActive: {
    backgroundColor: '#FFE5E5',
    borderColor: '#FF6B6B',
  },
  interestedTextActive: {
    color: '#FF6B6B',
  },
  joinButton: {
    backgroundColor: '#FFF',
  },
  joinButtonActive: {
    backgroundColor: '#E5F9F7',
    borderColor: '#4ECDC4',
  },
  joinTextActive: {
    color: '#4ECDC4',
  },
});

export default HotSpotCard;
