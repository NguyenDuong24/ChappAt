import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { Button } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import ModerationWarningModal from './moderation/ModerationWarningModal';
import ModerationBadge from './moderation/ModerationBadge';
import { useContentModeration } from '../hooks/useModerationAlert';

const ModerationDemo: React.FC = () => {
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [lastModerationResult, setLastModerationResult] = useState<any>(null);
  
  const {
    checkAndShowWarning,
    checkTextOnly,
    checkImageOnly,
    isModalVisible,
    modalProps,
  } = useContentModeration();

  // Test với một số tin nhắn mẫu
  const testMessages = [
    'Xin chào các bạn!', // Clean
    'Mày là thằng ngu!', // Profanity
    'Liên hệ tôi qua số 0123456789', // Custom (phone number)
    'Check out this link: https://pornhub.com/xxx', // Custom (link)
    'Con chó này thật là đần', // Profanity
  ];

  const testImageUrls = [
    'https://picsum.photos/300/300?random=1', // Safe image
    'https://example.com/xxx/image.jpg', // Suspicious URL
    'https://pornhub.com/image.jpg', // Blocked domain
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...', // Data URL
  ];

  const handleSendMessage = async () => {
    if (!message.trim() && !selectedImage) {
      Alert.alert('Lỗi', 'Vui lòng nhập tin nhắn hoặc chọn hình ảnh');
      return;
    }

    const isContentSafe = await checkAndShowWarning(
      message.trim() || undefined,
      selectedImage || undefined,
      {
        onEdit: () => {
          console.log('User chose to edit message');
          // Focus back to text input
        },
        onIgnore: () => {
          console.log('User chose to ignore warning');
          // Proceed with sending (with logged warning)
          proceedWithSending();
        },
        onReplaceImage: () => {
          console.log('User chose to replace image');
          setSelectedImage(null);
          pickImage();
        },
      }
    );

    if (isContentSafe) {
      proceedWithSending();
    }
  };

  const proceedWithSending = () => {
    Alert.alert(
      'Tin nhắn đã gửi!',
      `Text: ${message}\nImage: ${selectedImage ? 'Có' : 'Không'}`,
      [
        {
          text: 'OK',
          onPress: () => {
            setMessage('');
            setSelectedImage(null);
          },
        },
      ]
    );
  };

  const testTextModeration = async (testText: string) => {
    const result = await checkTextOnly(testText);
    setLastModerationResult({
      type: 'text',
      input: testText,
      result: result.result,
      isClean: result.isClean,
    });

    Alert.alert(
      'Kết quả kiểm tra văn bản',
      `Text: "${testText}"\nKết quả: ${result.isClean ? 'Sạch' : 'Có vấn đề'}\n${
        result.result && !result.result.isClean
          ? `Loại vi phạm: ${result.result.violationType}\nTừ bị chặn: ${result.result.blockedWords?.join(', ') || 'N/A'}`
          : ''
      }`
    );
  };

  const testImageModeration = async (testImageUrl: string) => {
    const result = await checkImageOnly(testImageUrl);
    setLastModerationResult({
      type: 'image',
      input: testImageUrl,
      result: result.result,
      isClean: result.isClean,
    });

    Alert.alert(
      'Kết quả kiểm tra hình ảnh',
      `URL: "${testImageUrl}"\nKết quả: ${result.isClean ? 'An toàn' : 'Không phù hợp'}\n${
        result.result && result.result.isInappropriate
          ? `Độ tin cậy: ${Math.round(result.result.confidence * 100)}%\nLý do: ${result.result.reason}`
          : ''
      }`
    );
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chọn hình ảnh');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🛡️ Content Moderation Demo</Text>
      
      {/* Message Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tin nhắn:</Text>
        <TextInput
          style={styles.textInput}
          value={message}
          onChangeText={setMessage}
          placeholder="Nhập tin nhắn của bạn..."
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Image Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hình ảnh:</Text>
        <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
          {selectedImage ? (
            <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialCommunityIcons name="image-plus" size={32} color="#999" />
              <Text style={styles.imagePlaceholderText}>Chọn hình ảnh</Text>
            </View>
          )}
        </TouchableOpacity>
        {selectedImage && (
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={() => setSelectedImage(null)}
          >
            <Text style={styles.removeImageText}>Xóa ảnh</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Send Button */}
      <Button
        mode="contained"
        onPress={handleSendMessage}
        style={styles.sendButton}
        labelStyle={styles.sendButtonLabel}
      >
        Gửi tin nhắn
      </Button>

      {/* Test Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧪 Test Cases - Văn bản:</Text>
        {testMessages.map((testMsg, index) => (
          <TouchableOpacity
            key={index}
            style={styles.testButton}
            onPress={() => testTextModeration(testMsg)}
          >
            <Text style={styles.testButtonText} numberOfLines={1}>
              "{testMsg}"
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧪 Test Cases - Hình ảnh:</Text>
        {testImageUrls.map((testUrl, index) => (
          <TouchableOpacity
            key={index}
            style={styles.testButton}
            onPress={() => testImageModeration(testUrl)}
          >
            <Text style={styles.testButtonText} numberOfLines={1}>
              {testUrl}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Last Result */}
      {lastModerationResult && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Kết quả gần nhất:</Text>
          <View style={styles.resultContainer}>
            <Text style={styles.resultType}>
              {lastModerationResult.type === 'text' ? '📝' : '🖼️'} {lastModerationResult.type.toUpperCase()}
            </Text>
            <Text style={styles.resultInput} numberOfLines={2}>
              Input: {lastModerationResult.input}
            </Text>
            <View style={styles.resultBadgeContainer}>
              <ModerationBadge
                type={lastModerationResult.isClean ? 'filtered' : 'blocked'}
                size="medium"
              />
            </View>
            {!lastModerationResult.isClean && lastModerationResult.result && (
              <Text style={styles.resultDetails}>
                {lastModerationResult.type === 'text'
                  ? `Vi phạm: ${lastModerationResult.result.violationType}\nTừ bị chặn: ${lastModerationResult.result.blockedWords?.join(', ') || 'N/A'}`
                  : `Confidence: ${Math.round(lastModerationResult.result.confidence * 100)}%\nReason: ${lastModerationResult.result.reason}`
                }
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Moderation Warning Modal */}
      <ModerationWarningModal {...modalProps} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: '#fafafa',
  },
  imageButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  imagePlaceholder: {
    backgroundColor: '#f0f0f0',
    height: 150,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: '#999',
    fontSize: 14,
  },
  removeImageButton: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#ffebee',
    borderRadius: 6,
    alignItems: 'center',
  },
  removeImageText: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: '500',
  },
  sendButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    marginBottom: 16,
  },
  sendButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 4,
  },
  testButton: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  testButtonText: {
    fontSize: 14,
    color: '#1976d2',
  },
  resultContainer: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  resultType: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  resultInput: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  resultBadgeContainer: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  resultDetails: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
});

export default ModerationDemo;
