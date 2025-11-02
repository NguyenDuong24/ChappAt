import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { HotSpot } from '@/types/hotSpots';

type HotSpotHeaderProps = {
  hotSpot: HotSpot;
};

const HotSpotHeader = ({ hotSpot }: HotSpotHeaderProps) => {
  return (
    <View style={styles.headerContainer}>
      <Text style={styles.title}>{hotSpot.title}</Text>
      <View style={styles.categoryContainer}>
        <FontAwesome5 name="tag" size={14} color="#888" />
        <Text style={styles.categoryText}>{hotSpot.category}</Text>
      </View>
      <View style={styles.locationContainer}>
        <MaterialIcons name="location-on" size={16} color="#888" />
        <Text style={styles.locationText}>{hotSpot.location.address}</Text>
      </View>
      {hotSpot.type === 'event' && hotSpot.eventInfo && (
        <View style={styles.eventInfoContainer}>
          <MaterialIcons name="event" size={16} color="#888" />
          <Text style={styles.eventInfoText}>
            {new Date(hotSpot.eventInfo.startDate).toLocaleString()} - {new Date(hotSpot.eventInfo.endDate).toLocaleString()}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    padding: 15,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#555',
  },
  eventInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 5,
  },
  eventInfoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
});

export default HotSpotHeader;
