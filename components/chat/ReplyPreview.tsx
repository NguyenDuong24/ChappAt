import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface ReplyPreviewProps {
  replyTo: {
    text?: string;
    imageUrl?: string;
    senderName: string;
    uid: string;
  } | null;
  onClearReply: () => void;
  currentThemeColors: any;
}

const ReplyPreview: React.FC<ReplyPreviewProps> = ({
  replyTo,
  onClearReply,
  currentThemeColors,
}) => {
  if (!replyTo) return null;

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.surface }]}>
      <View style={styles.replyIndicator} />
      <View style={styles.content}>
        <Text style={[styles.senderName, { color: currentThemeColors.primary }]}>
          {replyTo.senderName}
        </Text>
        <Text
          style={[styles.messageText, { color: currentThemeColors.text }]}
          numberOfLines={2}
        >
          {replyTo.imageUrl ? '📷 Hình ảnh' : replyTo.text}
        </Text>
      </View>
      <TouchableOpacity onPress={onClearReply} style={styles.closeButton}>
        <MaterialIcons name="close" size={20} color={currentThemeColors.text} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
  },
  replyIndicator: {
    width: 4,
    height: 40,
    backgroundColor: '#2196F3',
    borderRadius: 2,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
    opacity: 0.8,
  },
  closeButton: {
    padding: 4,
  },
});

export default ReplyPreview;
