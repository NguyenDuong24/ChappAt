import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Modal, Button } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface ModerationWarningModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  violationType?: 'profanity' | 'nsfw' | 'custom' | 'image';
  blockedWords?: string[];
  // Thêm props cho image moderation
  imageDetails?: {
    confidence: number;
    reason: string;
    imageUri?: string;
  };
  onEdit?: () => void;
  onIgnore?: () => void;
  onReplaceImage?: () => void; // Thêm callback để thay thế ảnh
}

const ModerationWarningModal: React.FC<ModerationWarningModalProps> = ({
  visible,
  onClose,
  title,
  message,
  violationType,
  blockedWords,
  imageDetails,
  onEdit,
  onIgnore,
  onReplaceImage,
}) => {
  const getIcon = () => {
    switch (violationType) {
      case 'profanity':
        return 'emoticon-angry';
      case 'nsfw':
        return 'eye-off';
      case 'custom':
        return 'shield-alert';
      case 'image':
        return 'image-off';
      default:
        return 'alert-circle';
    }
  };

  const getIconColor = () => {
    switch (violationType) {
      case 'profanity':
        return '#FF5722';
      case 'nsfw':
        return '#E91E63';
      case 'custom':
        return '#FF9800';
      case 'image':
        return '#9C27B0';
      default:
        return '#F44336';
    }
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onClose}
      contentContainerStyle={styles.modalContainer}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <MaterialCommunityIcons
            name={getIcon()}
            size={48}
            color={getIconColor()}
          />
          <Text style={styles.title}>{title}</Text>
        </View>

        <Text style={styles.message}>{message}</Text>

        {blockedWords && blockedWords.length > 0 && (
          <View style={styles.blockedWordsContainer}>
            <Text style={styles.blockedWordsTitle}>Từ khóa bị chặn:</Text>
            <View style={styles.wordsContainer}>
              {blockedWords.map((word, index) => (
                <View key={index} style={styles.wordBadge}>
                  <Text style={styles.wordText}>{word}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {imageDetails && violationType !== 'image' && (
          <View style={styles.imageDetailsContainer}>
            <Text style={styles.imageDetailsTitle}>📸 Thông tin ảnh bị chặn:</Text>
            <View style={styles.imageInfoRow}>
              <Text style={styles.imageInfoLabel}>Độ tin cậy:</Text>
              <Text style={styles.imageInfoValue}>
                {Math.round(imageDetails.confidence * 100)}%
              </Text>
            </View>
            <View style={styles.imageInfoRow}>
              <Text style={styles.imageInfoLabel}>Lý do:</Text>
              <Text style={styles.imageInfoValue}>{imageDetails.reason}</Text>
            </View>
            {imageDetails.imageUri && (
              <View style={styles.imagePreviewContainer}>
                <Text style={styles.imagePreviewTitle}>Ảnh bị chặn:</Text>
                <View style={styles.blockedImagePreview}>
                  <MaterialCommunityIcons
                    name="image-off"
                    size={32}
                    color="#E91E63"
                  />
                  <Text style={styles.blockedImageText}>
                    Ảnh không thể hiển thị do vi phạm quy định
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {violationType === 'image' && imageDetails && (
          <View style={styles.imageDetailsContainer}>
            <Text style={styles.imageDetailsTitle}>Thông tin ảnh bị chặn:</Text>
            {imageDetails.imageUri && (
              <Image
                source={{ uri: imageDetails.imageUri }}
                style={styles.imagePreview}
                contentFit="cover"
              />
            )}
            <Text style={styles.imageDetailsText}>
              • Độ tin cậy: {imageDetails.confidence}%{'\n'}
              • Lý do: {imageDetails.reason}
            </Text>
          </View>
        )}

        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 Gợi ý:</Text>
          <Text style={styles.tipsText}>
            • Sử dụng từ ngữ lịch sự và tích cực{'\n'}
            • Tránh các từ khóa nhạy cảm{'\n'}
            • Tôn trọng các thành viên khác trong cộng đồng
          </Text>
        </View>

        <View style={styles.actionsContainer}>
          {onEdit && (
            <Button
              mode="contained"
              onPress={onEdit}
              style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
              labelStyle={styles.buttonLabel}
            >
              Chỉnh sửa
            </Button>
          )}

          {onIgnore && (
            <Button
              mode="outlined"
              onPress={onIgnore}
              style={styles.actionButton}
              labelStyle={styles.buttonLabel}
            >
              Bỏ qua
            </Button>
          )}

          {violationType === 'image' && onReplaceImage && (
            <Button
              mode="contained"
              onPress={onReplaceImage}
              style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
              labelStyle={styles.buttonLabel}
            >
              Thay thế ảnh
            </Button>
          )}

          <Button
            mode="contained"
            onPress={onClose}
            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
            labelStyle={styles.buttonLabel}
          >
            Đã hiểu
          </Button>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  container: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  blockedWordsContainer: {
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  blockedWordsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e65100',
    marginBottom: 8,
  },
  wordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  wordBadge: {
    backgroundColor: '#ffcc02',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  wordText: {
    fontSize: 12,
    color: '#e65100',
    fontWeight: '500',
  },

  tipsContainer: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 13,
    color: '#388e3c',
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  actionButton: {
    borderRadius: 8,
    flex: 1,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Styles cho image moderation
  imageDetailsContainer: {
    backgroundColor: '#fce4ec',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#E91E63',
  },
  imageDetailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ad1457',
    marginBottom: 8,
  },
  imageInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  imageInfoLabel: {
    fontSize: 13,
    color: '#880e4f',
    fontWeight: '500',
  },
  imageInfoValue: {
    fontSize: 13,
    color: '#c2185b',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  imagePreviewContainer: {
    marginTop: 8,
  },
  imagePreviewTitle: {
    fontSize: 12,
    color: '#880e4f',
    marginBottom: 6,
    fontWeight: '500',
  },
  blockedImagePreview: {
    backgroundColor: '#ffebee',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1bee7',
    borderStyle: 'dashed',
  },
  blockedImageText: {
    fontSize: 12,
    color: '#c2185b',
    textAlign: 'center',
    marginTop: 8,
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  imageDetailsText: {
    fontSize: 13,
    color: '#880e4f',
    lineHeight: 18,
  },
});

export default ModerationWarningModal;
