import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import contentModerationService from '@/services/contentModerationService';
import ModerationBadge, { ModerationInfo } from './ModerationBadge';

const ImageModerationTest: React.FC = () => {
  const [imageUri, setImageUri] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [moderationResult, setModerationResult] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        setModerationResult(null);
        await checkImage(uri);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const checkImageFromUrl = async () => {
    if (!imageUrl.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập URL ảnh');
      return;
    }

    setImageUri(imageUrl);
    setModerationResult(null);
    await checkImage(imageUrl);
  };

  const checkImage = async (uri: string) => {
    setIsChecking(true);
    try {
      const result = await contentModerationService.moderateImage(uri);
      setModerationResult(result);
      
      console.log('Image moderation result:', result);
      
      if (result.isInappropriate) {
        Alert.alert(
          'Ảnh không phù hợp', 
          `Ảnh này có thể chứa nội dung không phù hợp.\n\nLý do: ${result.reason}\nĐộ tin cậy: ${(result.confidence * 100).toFixed(1)}%`
        );
      } else {
        Alert.alert('Ảnh an toàn', 'Ảnh này được cho phép.');
      }
    } catch (error) {
      console.error('Error checking image:', error);
      Alert.alert('Lỗi', 'Không thể kiểm tra ảnh');
    } finally {
      setIsChecking(false);
    }
  };

  const testSuspiciousUrls = [
    'https://placehold.co/224x224/f44/white.png',
    'https://placehold.co/224x224/f44/white.png',
    'https://placehold.co/224x224/f44/white.png',
    'https://placehold.co/224x224/f44/white.png',
    'https://placehold.co/224x224/f44/white.png',
    'https://placehold.co/224x224/f44/white.png',
  ];

  const testSuspiciousUrl = async (url: string) => {
    setImageUrl(url);
    setImageUri(url);
    await checkImage(url);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🛡️ Test Image Moderation</Text>
      
      {/* Test với URL */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kiểm tra ảnh từ URL:</Text>
        <TextInput
          style={styles.input}
          value={imageUrl}
          onChangeText={setImageUrl}
          placeholder="Nhập URL ảnh..."
          mode="outlined"
        />
        <Button 
          mode="contained" 
          onPress={checkImageFromUrl}
          disabled={isChecking}
          style={styles.button}
        >
          Kiểm tra URL
        </Button>
      </View>

      {/* Test với ảnh từ thiết bị */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chọn ảnh từ thiết bị:</Text>
        <Button 
          mode="outlined" 
          onPress={pickImage}
          disabled={isChecking}
          style={styles.button}
          icon="image"
        >
          Chọn ảnh
        </Button>
      </View>

      {/* Quick test với các URL nghi ngờ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test với URL nghi ngờ:</Text>
        {testSuspiciousUrls.map((url, index) => (
          <TouchableOpacity
            key={index}
            style={styles.testUrlButton}
            onPress={() => testSuspiciousUrl(url)}
            disabled={isChecking}
          >
            <Text style={styles.testUrlText}>{url}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Hiển thị ảnh và kết quả */}
      {imageUri && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ảnh đang kiểm tra:</Text>
          
          {imageUri.startsWith('http') ? (
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: imageUri }} 
                style={styles.image}
                onError={() => {
                  Alert.alert('Lỗi', 'Không thể tải ảnh từ URL này');
                }}
              />
            </View>
          ) : (
            <Image source={{ uri: imageUri }} style={styles.image} />
          )}
          
          {isChecking && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>Đang kiểm tra ảnh...</Text>
            </View>
          )}
          
          {moderationResult && (
            <View style={styles.resultContainer}>
              <ModerationBadge 
                type={moderationResult.isInappropriate ? 'blocked' : 'filtered'}
                size="large"
              />
              
              <View style={styles.resultDetails}>
                <Text style={styles.resultTitle}>
                  {moderationResult.isInappropriate ? '❌ Ảnh bị chặn' : '✅ Ảnh được phép'}
                </Text>
                
                <Text style={styles.confidenceText}>
                  Độ tin cậy: {(moderationResult.confidence * 100).toFixed(1)}%
                </Text>
                
                {moderationResult.reason && (
                  <Text style={styles.reasonText}>
                    Lý do: {moderationResult.reason}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Hướng dẫn */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔍 Cách hoạt động:</Text>
        <Text style={styles.infoText}>
          • Kiểm tra URL có chứa từ khóa nhạy cảm{'\n'}
          • Phân tích domain và đường dẫn{'\n'}
          • Kiểm tra metadata của file{'\n'}
          • Đánh giá pattern và cấu trúc URL{'\n'}
          • Tính điểm nghi ngờ tổng hợp
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
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
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginVertical: 8,
  },
  testUrlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  testUrlText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  resultContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  resultDetails: {
    marginTop: 12,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  confidenceText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: '#e65100',
    fontStyle: 'italic',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default ImageModerationTest;
