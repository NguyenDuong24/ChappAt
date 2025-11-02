import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface ModerationBadgeProps {
  type: 'filtered' | 'blocked' | 'warning';
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
}

const ModerationBadge: React.FC<ModerationBadgeProps> = ({
  type,
  onPress,
  size = 'medium',
}) => {
  const getConfig = () => {
    switch (type) {
      case 'filtered':
        return {
          icon: 'filter',
          color: '#FF9800',
          backgroundColor: '#FFF3E0',
          text: 'Đã lọc',
          description: 'Nội dung đã được làm sạch'
        };
      case 'blocked':
        return {
          icon: 'block-helper',
          color: '#F44336',
          backgroundColor: '#FFEBEE',
          text: 'Đã chặn',
          description: 'Nội dung bị chặn do vi phạm'
        };
      case 'warning':
        return {
          icon: 'alert',
          color: '#FF5722',
          backgroundColor: '#FFF3E0',
          text: 'Cảnh báo',
          description: 'Nội dung có thể không phù hợp'
        };
      default:
        return {
          icon: 'shield-check',
          color: '#4CAF50',
          backgroundColor: '#E8F5E8',
          text: 'An toàn',
          description: 'Nội dung đã được kiểm tra'
        };
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return {
          iconSize: 12,
          fontSize: 10,
          padding: 4,
          borderRadius: 4,
        };
      case 'large':
        return {
          iconSize: 20,
          fontSize: 14,
          padding: 8,
          borderRadius: 8,
        };
      default: // medium
        return {
          iconSize: 16,
          fontSize: 12,
          padding: 6,
          borderRadius: 6,
        };
    }
  };

  const config = getConfig();
  const sizeConfig = getSizeConfig();

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      style={[
        styles.badge,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.color,
          padding: sizeConfig.padding,
          borderRadius: sizeConfig.borderRadius,
        },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <MaterialCommunityIcons
        name={config.icon as any}
        size={sizeConfig.iconSize}
        color={config.color}
      />
      <Text
        style={[
          styles.text,
          {
            color: config.color,
            fontSize: sizeConfig.fontSize,
            marginLeft: sizeConfig.iconSize * 0.3,
          },
        ]}
      >
        {config.text}
      </Text>
    </Component>
  );
};

// Component để hiển thị thông tin chi tiết về moderation
interface ModerationInfoProps {
  type: 'filtered' | 'blocked' | 'warning';
  originalText?: string;
  filteredText?: string;
  blockedWords?: string[];
  reason?: string;
}

export const ModerationInfo: React.FC<ModerationInfoProps> = ({
  type,
  originalText,
  filteredText,
  blockedWords,
  reason,
}) => {
  const config = {
    filtered: {
      title: '🛡️ Nội dung đã được lọc',
      description: 'Một số từ ngữ không phù hợp đã được thay thế bằng ký tự ***',
    },
    blocked: {
      title: '🚫 Nội dung bị chặn',
      description: 'Nội dung này vi phạm quy định cộng đồng và đã bị chặn',
    },
    warning: {
      title: '⚠️ Cảnh báo nội dung',
      description: 'Nội dung này có thể không phù hợp với một số người dùng',
    },
  };

  return (
    <View style={styles.infoContainer}>
      <Text style={styles.infoTitle}>{config[type].title}</Text>
      <Text style={styles.infoDescription}>{config[type].description}</Text>
      
      {reason && (
        <Text style={styles.reasonText}>Lý do: {reason}</Text>
      )}

      {blockedWords && blockedWords.length > 0 && (
        <View style={styles.blockedWordsContainer}>
          <Text style={styles.blockedWordsTitle}>Từ khóa bị chặn:</Text>
          <Text style={styles.blockedWordsText}>
            {blockedWords.join(', ')}
          </Text>
        </View>
      )}

      {originalText && filteredText && originalText !== filteredText && (
        <View style={styles.textComparisonContainer}>
          <Text style={styles.comparisonTitle}>So sánh:</Text>
          <Text style={styles.originalText}>Gốc: {originalText}</Text>
          <Text style={styles.filteredText}>Đã lọc: {filteredText}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  infoDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  reasonText: {
    fontSize: 12,
    color: '#e65100',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  blockedWordsContainer: {
    backgroundColor: '#fff3e0',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  blockedWordsTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#e65100',
    marginBottom: 4,
  },
  blockedWordsText: {
    fontSize: 11,
    color: '#f57c00',
  },
  textComparisonContainer: {
    backgroundColor: '#e8f5e8',
    borderRadius: 4,
    padding: 8,
  },
  comparisonTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 4,
  },
  originalText: {
    fontSize: 11,
    color: '#d32f2f',
    marginBottom: 2,
  },
  filteredText: {
    fontSize: 11,
    color: '#388e3c',
  },
});

export default ModerationBadge;
