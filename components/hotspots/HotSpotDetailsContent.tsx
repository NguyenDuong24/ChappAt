import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HotSpot } from '@/types/hotSpots';
import HashtagDisplay from '../common/HashtagDisplay';
import HashtagText from '../common/HashtagText';
import { useRouter } from 'expo-router';
import { ThemeContext } from '@/context/ThemeContext';
import { getLiquidPalette } from '../liquid';

type HotSpotDetailsContentProps = {
  hotSpot: HotSpot;
};

const HotSpotDetailsContent = ({ hotSpot }: HotSpotDetailsContentProps) => {
  const router = useRouter();
  const themeContext = React.useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const palette = React.useMemo(() => themeContext?.palette || getLiquidPalette(theme), [theme, themeContext]);

  const handleHashtagPress = (hashtag: string) => {
    const cleanHashtag = hashtag.replace('#', '');
    router.push(`/(screens)/social/HashtagScreen?hashtag=${cleanHashtag}` as any);
  };

  return (
    <View style={styles.detailsContainer}>
      <Text style={[styles.sectionTitle, { color: palette.textColor }]}>Mô tả</Text>
      <HashtagText
        text={hotSpot.description}
        onHashtagPress={handleHashtagPress}
        textStyle={[styles.description, { color: palette.subtitleColor }]}
        hashtagStyle={[styles.hashtagStyle, { color: palette.sphereGradient[0] }]}
      />

      {/* Tags */}
      {hotSpot.tags && hotSpot.tags.length > 0 && (
        <View style={styles.tagsSection}>
          <Text style={[styles.sectionTitle, { color: palette.textColor }]}>Tags</Text>
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
        <Text style={[styles.sectionTitle, { color: palette.textColor }]}>Thống kê</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: palette.sphereGradient[0] }]}>{hotSpot.stats.interested}</Text>
            <Text style={[styles.statLabel, { color: palette.subtitleColor }]}>Quan tâm</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: palette.sphereGradient[0] }]}>{hotSpot.stats.joined}</Text>
            <Text style={[styles.statLabel, { color: palette.subtitleColor }]}>Tham gia</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: palette.sphereGradient[0] }]}>{hotSpot.stats.checkedIn}</Text>
            <Text style={[styles.statLabel, { color: palette.subtitleColor }]}>Check-in</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: palette.sphereGradient[0] }]}>{hotSpot.stats.rating.toFixed(1)}</Text>
            <Text style={[styles.statLabel, { color: palette.subtitleColor }]}>Đánh giá</Text>
          </View>
        </View>
      </View>

      {/* Additional Info */}
      <View style={styles.infoSection}>
        <Text style={[styles.sectionTitle, { color: palette.textColor }]}>Thông tin bổ sung</Text>
        <View style={[styles.infoRow, { borderBottomColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
          <Text style={[styles.infoLabel, { color: palette.subtitleColor }]}>Loại:</Text>
          <Text style={[styles.infoValue, { color: palette.textColor }]}>
            {hotSpot.type === 'event' ? 'Sự kiện' : 'Địa điểm'}
          </Text>
        </View>
        <View style={[styles.infoRow, { borderBottomColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
          <Text style={[styles.infoLabel, { color: palette.subtitleColor }]}>Danh mục:</Text>
          <Text style={[styles.infoValue, { color: palette.textColor }]}>{hotSpot.category}</Text>
        </View>
        <View style={[styles.infoRow, { borderBottomColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
          <Text style={[styles.infoLabel, { color: palette.subtitleColor }]}>Trạng thái:</Text>
          <Text style={[styles.infoValue, { color: palette.textColor }]}>
            {hotSpot.isActive ? 'Hoạt động' : 'Không hoạt động'}
          </Text>
        </View>
        {hotSpot.isFeatured && (
          <View style={[styles.infoRow, { borderBottomColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
            <Text style={[styles.infoLabel, { color: palette.subtitleColor }]}>Nổi bật:</Text>
            <Text style={[styles.infoValue, { color: palette.sphereGradient[0] }]}>Có</Text>
          </View>
        )}
        <View style={[styles.infoRow, { borderBottomColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
          <Text style={[styles.infoLabel, { color: palette.subtitleColor }]}>Ngày tạo:</Text>
          <Text style={[styles.infoValue, { color: palette.textColor }]}>
            {new Date(hotSpot.createdAt).toLocaleDateString('vi-VN')}
          </Text>
        </View>
        <View style={[styles.infoRow, { borderBottomColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
          <Text style={[styles.infoLabel, { color: palette.subtitleColor }]}>Cập nhật:</Text>
          <Text style={[styles.infoValue, { color: palette.textColor }]}>
            {new Date(hotSpot.updatedAt).toLocaleDateString('vi-VN')}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  detailsContainer: {
    backgroundColor: 'transparent',
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
    fontWeight: '600',
  },
});

export default HotSpotDetailsContent;
