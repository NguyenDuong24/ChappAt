import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface NotificationBadgeProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  backgroundColor?: string;
  style?: any;
  maxCount?: number;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  size = 'medium',
  color = 'white',
  backgroundColor = '#f093fb',
  style,
  maxCount = 99
}) => {
  if (count <= 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();
  
  const sizeStyles = {
    small: {
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      fontSize: 9,
      paddingHorizontal: 4,
    },
    medium: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      fontSize: 11,
      paddingHorizontal: 4,
    },
    large: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      fontSize: 12,
      paddingHorizontal: 6,
    }
  };

  const currentSize = sizeStyles[size];

  return (
    <View 
      style={[
        styles.badge,
        {
          backgroundColor,
          minWidth: currentSize.minWidth,
          height: currentSize.height,
          borderRadius: currentSize.borderRadius,
        },
        style
      ]}
    >
      <Text 
        style={[
          styles.badgeText,
          {
            color,
            fontSize: currentSize.fontSize,
          }
        ]}
        numberOfLines={1}
      >
        {displayCount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  badgeText: {
    fontWeight: '800',
    textAlign: 'center',
  },
});

export default NotificationBadge;
