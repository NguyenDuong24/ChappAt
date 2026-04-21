import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useThemedColors } from '@/hooks/useThemedColors';
import { HotSpot } from '@/types/hotSpots';

type EventDetailsProps = {
  hotSpot: HotSpot;
};

const EventDetails = ({ hotSpot }: EventDetailsProps) => {
  const colors = useThemedColors();
  const hs = colors.hotSpots;
  
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
    <View style={[styles.eventContainer, { backgroundColor: hs.surface }]}>
      <Text style={[styles.sectionTitle, { color: hs.text }]}>Thông tin sự kiện</Text>

      <View style={styles.eventInfoRow}>
        <MaterialIcons name="event" size={20} color={hs.primary} />
        <View style={styles.eventInfoText}>
          <Text style={[styles.eventInfoLabel, { color: hs.textSecondary }]}>Thời gian bắt đầu:</Text>
          <Text style={[styles.eventInfoValue, { color: hs.text }]}>{formatDate(eventInfo.startDate)}</Text>
        </View>
      </View>

      <View style={styles.eventInfoRow}>
        <MaterialIcons name="event-available" size={20} color={hs.primary} />
        <View style={styles.eventInfoText}>
          <Text style={[styles.eventInfoLabel, { color: hs.textSecondary }]}>Thời gian kết thúc:</Text>
          <Text style={[styles.eventInfoValue, { color: hs.text }]}>{formatDate(eventInfo.endDate)}</Text>
        </View>
      </View>

      <View style={styles.eventInfoRow}>
        <FontAwesome5 name="user-tie" size={18} color={hs.primary} />
        <View style={styles.eventInfoText}>
          <Text style={[styles.eventInfoLabel, { color: hs.textSecondary }]}>Người tổ chức:</Text>
          <Text style={[styles.eventInfoValue, { color: hs.text }]}>{eventInfo.organizer}</Text>
        </View>
      </View>

      <View style={styles.eventInfoRow}>
        <MaterialIcons name="attach-money" size={20} color={hs.primary} />
        <View style={styles.eventInfoText}>
          <Text style={[styles.eventInfoLabel, { color: hs.textSecondary }]}>Giá vé:</Text>
          <Text style={[styles.eventInfoValue, { color: hs.text }]}>{formatPrice(eventInfo.price)}</Text>
        </View>
      </View>

      {eventInfo.maxParticipants && (
        <View style={styles.eventInfoRow}>
          <MaterialIcons name="group" size={20} color={hs.primary} />
          <View style={styles.eventInfoText}>
            <Text style={[styles.eventInfoLabel, { color: hs.textSecondary }]}>Số lượng tham gia:</Text>
            <Text style={[styles.eventInfoValue, { color: hs.text }]}>
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
    padding: 16,
    // backgroundColor applied dynamically
    marginTop: 12,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    // Color applied dynamically
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },
  eventInfoText: {
    marginLeft: 0,
    flex: 1,
  },
  eventInfoLabel: {
    fontSize: 14,
    // Color applied dynamically
    fontWeight: '600',
  },
  eventInfoValue: {
    fontSize: 16,
    // Color applied dynamically
    marginTop: 3,
    fontWeight: '500',
  },
});

export default EventDetails;
