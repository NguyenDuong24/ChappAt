import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Chip } from 'react-native-paper';
import { useThemedColors } from '@/hooks/useThemedColors';

interface HashtagDisplayProps {
  hashtags: string[];
  maxDisplay?: number;
  size?: 'small' | 'medium' | 'large';
  onHashtagPress?: (hashtag: string) => void;
  style?: any;
}

const HashtagDisplay: React.FC<HashtagDisplayProps> = React.memo(({
  hashtags,
  maxDisplay = 5,
  size = 'medium',
  onHashtagPress,
  style
}) => {
  const colors = useThemedColors();
  if (!hashtags || hashtags.length === 0) return null;

  const displayHashtags = hashtags.slice(0, maxDisplay);
  const remainingCount = hashtags.length - maxDisplay;

  const chipHeight = size === 'small' ? 32 : size === 'large' ? 36 : 34;
  const fontSize = size === 'small' ? 12 : size === 'large' ? 16 : 14;

  return (
    <View style={[styles.container, style]}>
      {displayHashtags.map((hashtag, index) => (
        <Chip
          key={index}
          onPress={() => onHashtagPress?.(hashtag)}
          style={[
            styles.chip,
            { height: chipHeight, backgroundColor: colors.primary + '15' }
          ]}
          textStyle={[
            styles.chipText,
            { fontSize, color: colors.primary }
          ]}
          compact
        >
          {hashtag.startsWith('#') ? hashtag : `#${hashtag}`}
        </Chip>
      ))}

      {remainingCount > 0 && (
        <Chip
          style={[
            styles.chip,
            styles.moreChip,
            { height: chipHeight, backgroundColor: colors.accent + '15' }
          ]}
          textStyle={[
            styles.chipText,
            { fontSize, color: colors.accent }
          ]}
          compact
        >
          +{remainingCount}
        </Chip>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipContainer: {
    marginBottom: 4,
  },
  chip: {
    borderRadius: 16,
  },
  moreChip: {
    opacity: 0.7,
  },
  chipText: {
    fontWeight: '500',
  },
});

export default HashtagDisplay;