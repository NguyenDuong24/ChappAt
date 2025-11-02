import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useBlockStatus } from '@/hooks/useBlockStatus';
import { useAuth } from '@/context/authContext';

interface BlockedContentWrapperProps {
  targetUserId: string;
  children: React.ReactNode;
  showPlaceholder?: boolean;
  placeholderMessage?: string;
  isDarkMode?: boolean;
}

/**
 * Wrapper component that hides content if user is blocked
 * Use this to wrap posts, comments, or any user-generated content
 */
export const BlockedContentWrapper: React.FC<BlockedContentWrapperProps> = ({
  targetUserId,
  children,
  showPlaceholder = true,
  placeholderMessage = 'Nội dung này đã bị ẩn',
  isDarkMode = false,
}) => {
  const { user: currentUser } = useAuth();
  const { isBlocked, isBlockedBy, loading } = useBlockStatus(
    currentUser?.uid,
    targetUserId
  );

  // If loading, show content (or skeleton)
  if (loading) {
    return <>{children}</>;
  }

  // If there's a block relationship, hide content
  if (isBlocked || isBlockedBy) {
    if (!showPlaceholder) {
      return null;
    }

    const colors = {
      background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      text: isDarkMode ? '#94A3B8' : '#64748B',
      border: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    };

    return (
      <View style={[styles.blockedContainer, { 
        backgroundColor: colors.background,
        borderColor: colors.border,
      }]}>
        <Feather name="eye-off" size={24} color={colors.text} />
        <Text style={[styles.blockedText, { color: colors.text }]}>
          {isBlocked ? 'Bạn đã chặn người dùng này' : placeholderMessage}
        </Text>
      </View>
    );
  }

  // No block relationship, show content normally
  return <>{children}</>;
};

const styles = StyleSheet.create({
  blockedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  blockedText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
