import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { HotSpot } from '@/types/hotSpots';

type EventDetailsProps = {
  hotSpot: HotSpot;
};

const EventDetails = ({ hotSpot }: EventDetailsProps) => {
  if (hotSpot.type !== 'event' || !hotSpot.eventInfo) {
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price?: number) => {
    if (!price || price === 0) return 'Miễn phí';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const eventInfo = hotSpot.eventInfo;

  return (
    <View style={styles.eventContainer}>
      <Text style={styles.sectionTitle}>Thông tin sự kiện</Text>

      <View style={styles.eventInfoRow}>
        <MaterialIcons name="event" size={20} color="#4ECDC4" />
        <View style={styles.eventInfoText}>
          <Text style={styles.eventInfoLabel}>Thời gian bắt đầu:</Text>
          <Text style={styles.eventInfoValue}>{formatDate(eventInfo.startDate)}</Text>
        </View>
      </View>

      <View style={styles.eventInfoRow}>
        <MaterialIcons name="event-available" size={20} color="#4ECDC4" />
        <View style={styles.eventInfoText}>
          <Text style={styles.eventInfoLabel}>Thời gian kết thúc:</Text>
          <Text style={styles.eventInfoValue}>{formatDate(eventInfo.endDate)}</Text>
        </View>
      </View>

      <View style={styles.eventInfoRow}>
        <FontAwesome5 name="user-tie" size={18} color="#4ECDC4" />
        <View style={styles.eventInfoText}>
          <Text style={styles.eventInfoLabel}>Người tổ chức:</Text>
          <Text style={styles.eventInfoValue}>{eventInfo.organizer}</Text>
        </View>
      </View>

      <View style={styles.eventInfoRow}>
        <MaterialIcons name="attach-money" size={20} color="#4ECDC4" />
        <View style={styles.eventInfoText}>
          <Text style={styles.eventInfoLabel}>Giá vé:</Text>
          <Text style={styles.eventInfoValue}>{formatPrice(eventInfo.price)}</Text>
        </View>
      </View>

      {eventInfo.maxParticipants && (
        <View style={styles.eventInfoRow}>
          <MaterialIcons name="group" size={20} color="#4ECDC4" />
          <View style={styles.eventInfoText}>
            <Text style={styles.eventInfoLabel}>Số lượng tham gia:</Text>
            <Text style={styles.eventInfoValue}>
              {eventInfo.currentParticipants}/{eventInfo.maxParticipants}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  eventContainer: {
    padding: 15,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventInfoText: {
    marginLeft: 12,
    flex: 1,
  },
  eventInfoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  eventInfoValue: {
    fontSize: 16,
    color: '#333',
    marginTop: 2,
  },
});

export default EventDetails;
