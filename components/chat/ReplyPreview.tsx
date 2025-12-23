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
  currentThemeColors = {
    surface: '#F8FAFC',
    tint: '#6366F1',
    subtleText: '#64748B',
    text: '#0F172A',
  },
}) => {
  if (!replyTo) return null;

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.surface }]}>
      <View style={[styles.replyBar, { backgroundColor: currentThemeColors.tint || '#2196F3' }]} />
      <View style={styles.content}>
        <Text style={[styles.replyTitle, { color: currentThemeColors.tint || '#2196F3' }]}>
          Đang trả lời {replyTo.senderName}
        </Text>
        <Text
          style={[styles.replyText, { color: currentThemeColors.subtleText }]}
          numberOfLines={1}
        >
          {replyTo.imageUrl ? '📷 Hình ảnh' : replyTo.text}
        </Text>
      </View>
      <TouchableOpacity onPress={onClearReply} style={styles.closeButton}>
        <MaterialIcons name="close" size={22} color={currentThemeColors.text} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  replyBar: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  replyTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 14,
  },
  closeButton: {
    padding: 4,
  },
});

export default ReplyPreview;
