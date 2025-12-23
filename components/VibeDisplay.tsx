import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UserVibe } from '@/types/vibe';
import { useVibeExpiration } from '@/hooks/useVibeExpiration';

interface VibeDisplayProps {
  vibe: UserVibe | null | undefined;
  showTimeRemaining?: boolean;
}

/**
 * Component to display a vibe with expiration status
 */
export const VibeDisplay: React.FC<VibeDisplayProps> = ({
  vibe,
  showTimeRemaining = true
}) => {
  const { isExpired, formattedTimeRemaining, hoursRemaining, formattedTimeAgo } = useVibeExpiration(vibe);

  if (!vibe || isExpired) {
    return (
      <View style={styles.expiredContainer}>
        <Text style={styles.expiredText}>No active vibe</Text>
      </View>
    );
  }

  const isExpiringSoon = hoursRemaining < 2; // Less than 2 hours remaining

  return (
    <View style={[
      styles.vibeContainer,
      isExpiringSoon && styles.expiringSoonContainer
    ]}>
      <Text style={styles.vibeEmoji}>{vibe.vibe.emoji}</Text>
      <View style={styles.vibeInfo}>
        <Text style={styles.vibeName}>{vibe.vibe.name}</Text>
        {vibe.customMessage && (
          <Text style={styles.customMessage}>{vibe.customMessage}</Text>
        )}
        {showTimeRemaining && (
          <Text style={[
            styles.timeRemaining,
            isExpiringSoon && styles.expiringSoonText
          ]}>
            {formattedTimeAgo}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  vibeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
  },
  expiringSoonContainer: {
    backgroundColor: '#fff3e0',
    borderColor: '#ff9800',
    borderWidth: 1,
  },
  expiredContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
    alignItems: 'center',
  },
  vibeEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  vibeInfo: {
    flex: 1,
  },
  vibeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  customMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  timeRemaining: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  expiringSoonText: {
    color: '#ff9800',
    fontWeight: 'bold',
  },
  expiredText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});
