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
import BadWordsManager from './BadWordsManager';
import { useContentModeration } from '../hooks/useModerationAlert';

const ModerationDemoWithFirestore: React.FC = () => {
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [lastModerationResult, setLastModerationResult] = useState<any>(null);
  const [showBadWordsManager, setShowBadWordsManager] = useState(false);
  
  const {
    checkAndShowWarning,
    checkTextOnly,
    checkImageOnly,
    isModalVisible,
    modalProps,
  } = useContentModeration();

  // Test với một số tin nhắn mẫu (bao gồm từ có thể có trong Firestore)
  const testMessages = [
    'Xin chào các bạn!', // Clean
    'Mày là thằng ngu!', // Profanity (có trong default words)
    'Liên hệ tôi qua số 0123456789', // Custom (phone number)
    'Check out this link: https://pornhub.com/xxx', // Custom (link + adult)
    'Con chó này thật là đần', // Profanity (có trong default words)
    'Tao ghét mày vcl', // Multiple profanity
    'dm tụi mày', // Abbreviation profanity
    'Đi mua cocaine đi', // Drug-related
    'Hitler là người tuyệt vời', // Hate speech
  ];

  const testImageUrls = [
    'https://picsum.photos/300/300?random=1', // Safe image
    'https://example.com/xxx/image.jpg', // Suspicious URL
    'https://pornhub.com/image.jpg', // Blocked domain
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...', // Data URL
    'https://images.unsplash.com/photo-1574158622682-e40e69881006', // Safe Unsplash
    'https://some-site.com/nude-pic.jpg', // Suspicious filename
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

    const status = result.isClean ? '✅ Sạch' : '❌ Có vấn đề';
    const details = !result.isClean && result.result ? 
      `\n• Loại: ${result.result.violationType}\n• Từ bị chặn: ${result.result.blockedWords?.join(', ') || 'N/A'}` : '';

    Alert.alert(
      'Kết quả kiểm tra văn bản',
      `📝 "${testText}"\n\n${status}${details}`,
      [{ text: 'OK' }]
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

    const status = result.isClean ? '✅ An toàn' : '❌ Không phù hợp';
    const details = !result.isClean && result.result ? 
      `\n• Confidence: ${Math.round(result.result.confidence * 100)}%\n• Lý do: ${result.result.reason}` : '';

    Alert.alert(
      'Kết quả kiểm tra hình ảnh',
      `🖼️ ${testImageUrl.length > 50 ? testImageUrl.substring(0, 50) + '...' : testImageUrl}\n\n${status}${details}`,
      [{ text: 'OK' }]
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

  if (showBadWordsManager) {
    return (
      <View style={styles.container}>
        <View style={styles.managerHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowBadWordsManager(false)}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#2196F3" />
            <Text style={styles.backText}>Quay lại Demo</Text>
          </TouchableOpacity>
        </View>
        <BadWordsManager />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🛡️ Content Moderation Demo v2.0</Text>
      <Text style={styles.subtitle}>
        Với Firestore Integration + bad-words library
      </Text>
      
      {/* Management Button */}
      <View style={styles.section}>
        <Button
          mode="contained"
          onPress={() => setShowBadWordsManager(true)}
          style={styles.manageButton}
          labelStyle={styles.manageButtonLabel}
          icon="cog"
        >
          Quản lý từ khóa nhạy cảm
        </Button>
      </View>

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
        icon="send"
      >
        Gửi tin nhắn
      </Button>

      {/* Test Buttons - Text */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧪 Test Cases - Văn bản:</Text>
        <Text style={styles.sectionNote}>
          Nhấn để test với từ khóa có trong Firestore
        </Text>
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

      {/* Test Buttons - Images */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧪 Test Cases - Hình ảnh:</Text>
        <Text style={styles.sectionNote}>
          Nhấn để test với URL patterns và domains
        </Text>
        {testImageUrls.map((testUrl, index) => (
          <TouchableOpacity
            key={index}
            style={styles.testButton}
            onPress={() => testImageModeration(testUrl)}
          >
            <Text style={styles.testButtonText} numberOfLines={1}>
              {testUrl.length > 60 ? testUrl.substring(0, 60) + '...' : testUrl}
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

      {/* Features Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✨ Tính năng mới:</Text>
        <View style={styles.featuresList}>
          <Text style={styles.featureItem}>• 🔥 Sử dụng thư viện bad-words</Text>
          <Text style={styles.featureItem}>• 🔥 Lưu trữ từ khóa trong Firestore</Text>
          <Text style={styles.featureItem}>• 🔥 Real-time sync với database</Text>
          <Text style={styles.featureItem}>• 🔥 Quản lý từ khóa theo category & severity</Text>
          <Text style={styles.featureItem}>• 🔥 Toggle on/off từng từ khóa</Text>
          <Text style={styles.featureItem}>• 🔥 Search và filter từ khóa</Text>
          <Text style={styles.featureItem}>• 🔥 UI quản lý thân thiện</Text>
        </View>
      </View>

      {/* Moderation Warning Modal */}
      <ModerationWarningModal {...modalProps} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
    color: '#333',
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  managerHeader: {
    backgroundColor: 'white',
    elevation: 2,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '500',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
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
  sectionNote: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  manageButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    elevation: 3,
  },
  manageButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 4,
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
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 3,
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
  featuresList: {
    gap: 6,
  },
  featureItem: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});

export default ModerationDemoWithFirestore;
