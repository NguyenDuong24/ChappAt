import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

interface BlockedChatViewProps {
  reason?: 'blocked' | 'blockedBy';
  isDarkMode?: boolean;
}

/**
 * Component hiển thị khi không thể chat do bị chặn
 */
export const BlockedChatView: React.FC<BlockedChatViewProps> = ({
  reason = 'blocked',
  isDarkMode = false,
}) => {
  const colors = {
    background: isDarkMode ? '#1E293B' : '#F8FAFC',
    text: isDarkMode ? '#F8FAFC' : '#0F172A',
    subtleText: isDarkMode ? '#94A3B8' : '#64748B',
    border: isDarkMode ? '#374151' : '#E2E8F0',
    danger: '#EF4444',
  };

  const getMessage = () => {
    switch (reason) {
      case 'blocked':
        return {
          title: '🚫 Không thể nhắn tin',
          subtitle: 'Bạn đã chặn người dùng này',
          suggestion: 'Bỏ chặn để có thể nhắn tin lại',
        };
      case 'blockedBy':
        return {
          title: '⚠️ Không khả dụng',
          subtitle: 'Bạn không thể nhắn tin với người dùng này',
          suggestion: '',
        };
      default:
        return {
          title: '❌ Không thể nhắn tin',
          subtitle: 'Đã xảy ra lỗi',
          suggestion: '',
        };
    }
  };

  const message = getMessage();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.content, { 
        backgroundColor: isDarkMode ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)',
        borderColor: colors.border,
      }]}>
        <View style={[styles.iconContainer, { backgroundColor: colors.danger + '20' }]}>
          <Feather name="slash" size={40} color={colors.danger} />
        </View>
        
        <Text style={[styles.title, { color: colors.text }]}>
          {message.title}
        </Text>
        
        <Text style={[styles.subtitle, { color: colors.subtleText }]}>
          {message.subtitle}
        </Text>
        
        {message.suggestion && (
          <Text style={[styles.suggestion, { color: colors.subtleText }]}>
            {message.suggestion}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 400,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  suggestion: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.7,
  },
});
