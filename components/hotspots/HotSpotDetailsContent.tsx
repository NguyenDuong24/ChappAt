import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HotSpot } from '@/types/hotSpots';
import HashtagDisplay from '../common/HashtagDisplay';
import HashtagText from '../common/HashtagText';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';

type HotSpotDetailsContentProps = {
  hotSpot: HotSpot;
};

const HotSpotDetailsContent = ({ hotSpot }: HotSpotDetailsContentProps) => {
  const router = useRouter();

  const handleHashtagPress = (hashtag: string) => {
    const cleanHashtag = hashtag.replace('#', '');
    router.push(`/HashtagScreen?hashtag=${cleanHashtag}`);
  };

  return (
    <View style={styles.detailsContainer}>
      <Text style={styles.sectionTitle}>Mô tả</Text>
      <HashtagText
        text={hotSpot.description}
        onHashtagPress={handleHashtagPress}
        textStyle={styles.description}
        hashtagStyle={styles.hashtagStyle}
      />

      {/* Tags */}
      {hotSpot.tags && hotSpot.tags.length > 0 && (
        <View style={styles.tagsSection}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <HashtagDisplay
            hashtags={hotSpot.tags}
            maxDisplay={10}
            size="medium"
            onHashtagPress={handleHashtagPress}
          />
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsSection}>
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
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{hotSpot.stats.rating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Đánh giá</Text>
          </View>
        </View>
      </View>

      {/* Additional Info */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Thông tin bổ sung</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Loại:</Text>
          <Text style={styles.infoValue}>
            {hotSpot.type === 'event' ? 'Sự kiện' : 'Địa điểm'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Danh mục:</Text>
          <Text style={styles.infoValue}>{hotSpot.category}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Trạng thái:</Text>
          <Text style={styles.infoValue}>
            {hotSpot.isActive ? 'Hoạt động' : 'Không hoạt động'}
          </Text>
        </View>
        {hotSpot.isFeatured && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nổi bật:</Text>
            <Text style={[styles.infoValue, styles.featuredText]}>Có</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ngày tạo:</Text>
          <Text style={styles.infoValue}>
            {new Date(hotSpot.createdAt).toLocaleDateString('vi-VN')}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Cập nhật:</Text>
          <Text style={styles.infoValue}>
            {new Date(hotSpot.updatedAt).toLocaleDateString('vi-VN')}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  detailsContainer: {
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  tagsSection: {
    marginTop: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statsSection: {
    marginTop: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
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
  infoSection: {
    marginTop: 10,
    paddingBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  featuredText: {
    color: '#FFC300',
    fontWeight: 'bold',
  },
  hashtagStyle: {
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default HotSpotDetailsContent;
