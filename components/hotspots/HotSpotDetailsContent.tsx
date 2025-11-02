import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HotSpot } from '@/types/hotSpots';

type HotSpotDetailsContentProps = {
  hotSpot: HotSpot;
};

const HotSpotDetailsContent = ({ hotSpot }: HotSpotDetailsContentProps) => {
  return (
    <View style={styles.detailsContainer}>
      <Text style={styles.sectionTitle}>Mô tả</Text>
      <Text style={styles.description}>{hotSpot.description}</Text>

      <Text style={styles.sectionTitle}>Thống kê</Text>
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{hotSpot.stats.interested}</Text>
          <Text style={styles.statLabel}>Quan tâm</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{hotSpot.stats.joined}</Text>
          <Text style={styles.statLabel}>Tham gia</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{hotSpot.stats.checkedIn}</Text>
          <Text style={styles.statLabel}>Check-in</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  detailsContainer: {
    padding: 15,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  statLabel: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
});

export default HotSpotDetailsContent;
