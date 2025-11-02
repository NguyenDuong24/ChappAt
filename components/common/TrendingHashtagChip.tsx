import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HashtagService } from '@/services/hashtagService';

interface TrendingHashtagChipProps {
  hashtag: string;
  count: number;
  onPress?: () => void;
  style?: ViewStyle;
}

const TrendingHashtagChip: React.FC<TrendingHashtagChipProps> = ({
  hashtag,
  count,
  onPress,
  style
}) => {
  const displayTag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
  const formattedCount = HashtagService.formatPostCount(count);
  
  // Sử dụng useMemo để tránh tạo màu mới mỗi lần render
  const chipColor = useMemo(() => {
    // Tạo màu dựa trên hashtag để đảm bảo consistent
    const colors = [
      '#FF6B6B', '#8A4AF3', '#5D3FD3', '#FF9500', 
      '#4CAF50', '#2196F3', '#E91E63', '#9C27B0',
      '#FF5722', '#795548', '#607D8B', '#FFC107'
    ];
    const index = hashtag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  }, [hashtag]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.container, style]}
    >
      <LinearGradient
        colors={[chipColor, `${chipColor}80`]}
        style={styles.gradient}
      >
        <Text style={styles.hashtagText}>{displayTag}</Text>
        <Text style={styles.countText}>{formattedCount}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 70,
  },
  gradient: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  hashtagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  countText: {
    fontSize: 9,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
});

export default TrendingHashtagChip;
