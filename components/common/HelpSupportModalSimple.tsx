import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  FlatList,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

interface HelpSupportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmitContact?: (message: string, email?: string, images?: string[], type?: 'support' | 'bug' | 'suggestion') => Promise<void> | void;
  startInContactForm?: boolean;
}

const HelpSupportModal = ({ visible, onClose, onSubmitContact, startInContactForm = false }: HelpSupportModalProps) => {
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [contactType, setContactType] = useState<'support' | 'bug' | 'suggestion'>('support');
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setShowContactForm(startInContactForm);
      setSelectedImages([]);
      setContactType('support');
      setImageLoading(false);
    } else {
      setShowContactForm(false);
      setSelectedImages([]);
      setContactType('support');
      setImageLoading(false);
    }
  }, [visible, startInContactForm]);

  const faqItems = [
    {
      question: 'Làm thế nào để tạo nhóm chat?',
      answer: 'Vào tab Groups, nhấn nút "+", nhập tên nhóm và thêm thành viên.',
    },
    {
      question: 'Làm thế nào để tìm và tham gia hotspot?',
      answer: 'Vào tab Hotspots, chọn vị trí trên bản đồ và tham gia các cuộc trò chuyện gần đó.',
    },
    {
      question: 'Tôi quên mật khẩu, phải làm sao?',
      answer: 'Nhấn "Quên mật khẩu" ở màn hình đăng nhập và làm theo hướng dẫn.',
    },
    {
      question: 'Làm thế nào để chặn người dùng?',
      answer: 'Vào profile người dùng, nhấn menu (3 chấm) và chọn "Chặn người dùng".',
    },
    {
      question: 'Ứng dụng bị lag, tôi phải làm gì?',
      answer: 'Thử khởi động lại app, xóa cache hoặc cập nhật phiên bản mới nhất.',
    },
    {
      question: 'Làm thế nào để báo cáo tin nhắn không phù hợp?',
      answer: 'Nhấn giữ tin nhắn, chọn "Báo cáo" và mô tả vấn đề.',
    },
    {
      question: 'Làm thế nào để mời bạn bè vào app?',
      answer: 'Vào tab Invitations, chọn bạn bè từ danh bạ hoặc chia sẻ link mời.',
    },
    {
      question: 'Làm thế nào để sử dụng hashtag?',
      answer: 'Trong chat, gõ # theo sau từ khóa để tạo hashtag và tìm kiếm cuộc trò chuyện.',
    },
  ];

  const filteredFAQ = faqItems.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContactSubmit = async () => {
    if (!contactMessage.trim()) {
      Alert.alert('⚠️ Lỗi', 'Vui lòng nhập nội dung cần hỗ trợ');
      return;
    }

    try {
      setSubmitting(true);
      console.log('📤 HelpSupportModal handleContactSubmit called');
      console.log('📝 Contact message:', contactMessage.trim());
      console.log('📧 Contact email:', contactEmail.trim() || 'not provided');
      console.log('🖼️ Selected images:', selectedImages);
      console.log('🏷️ Contact type:', contactType);

      if (onSubmitContact) {
        await onSubmitContact(contactMessage.trim(), contactEmail.trim() || undefined, selectedImages, contactType);
      } else {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      Alert.alert(
        '✅ Thành công',
        'Yêu cầu hỗ trợ đã được gửi. Chúng tôi sẽ phản hồi trong 24h.',
        [{ text: 'OK', onPress: () => {
          setContactMessage('');
          setContactEmail('');
          setSelectedImages([]);
          setShowContactForm(false);
          setContactType('support');
          setImageLoading(false);
        }}]
      );
    } catch (error) {
      console.log('❌ HelpSupportModal handleContactSubmit error:', error);
      console.log('❌ Error details:', {
        message: error instanceof Error ? error.message : String(error),
        code: error instanceof Error && 'code' in error ? (error as any).code : 'unknown',
        stack: error instanceof Error ? error.stack : undefined
      });
      Alert.alert('❌ Lỗi', 'Không thể gửi yêu cầu. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const pickImage = useCallback(async () => {
    try {
      setImageLoading(true);
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh để chọn hình ảnh');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 5,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        setSelectedImages(prev => [...prev, ...newImages].slice(0, 5)); // Limit to 5 images
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chọn hình ảnh');
      console.error('Image picker error:', error);
    } finally {
      setImageLoading(false);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    try {
      setImageLoading(true);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Cần quyền truy cập camera để chụp ảnh');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        setSelectedImages(prev => [...prev, result.assets[0].uri].slice(0, 5));
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chụp ảnh');
      console.error('Camera error:', error);
    } finally {
      setImageLoading(false);
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  if (showContactForm) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.container}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setShowContactForm(false)}>
                <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.title}>
                {contactType === 'bug' ? 'Báo cáo lỗi' : contactType === 'suggestion' ? 'Đề xuất tính năng' : 'Liên hệ hỗ trợ'}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Mô tả vấn đề *</Text>
                <TextInput
                  value={contactMessage}
                  onChangeText={setContactMessage}
                  placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
                  placeholderTextColor="#64748B"
                  style={styles.textArea}
                  multiline
                  maxLength={1000}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{contactMessage.length}/1000</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Email liên hệ (tùy chọn)</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="email-outline" size={20} color="#6366F1" />
                  <TextInput
                    value={contactEmail}
                    onChangeText={setContactEmail}
                    placeholder="your@email.com"
                    placeholderTextColor="#64748B"
                    style={styles.textInput}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Image Attachments */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Hình ảnh đính kèm (tùy chọn)</Text>
                <Text style={styles.sectionSubtitle}>Thêm ảnh để cung cấp bằng chứng chi tiết hơn</Text>
                
                {/* Selected Images */}
                {selectedImages.length > 0 && (
                  <FlatList
                    data={selectedImages}
                    keyExtractor={(item, index) => `${item}-${index}`}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.imagesList}
                    renderItem={({ item, index }) => (
                      <View style={styles.imageItem}>
                        <Image source={{ uri: item }} style={styles.selectedImage} />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => removeImage(index)}
                        >
                          <MaterialCommunityIcons name="close-circle" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                )}

                {/* Image Picker Buttons */}
                <View style={styles.imageButtonsContainer}>
                  <TouchableOpacity 
                    style={[styles.imageButton, imageLoading && styles.imageButtonDisabled]} 
                    onPress={pickImage}
                    disabled={imageLoading}
                  >
                    <MaterialCommunityIcons name="image" size={20} color="#6366F1" />
                    <Text style={styles.imageButtonText}>
                      {imageLoading ? 'Đang tải...' : 'Chọn từ thư viện'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.imageButton, imageLoading && styles.imageButtonDisabled]} 
                    onPress={takePhoto}
                    disabled={imageLoading}
                  >
                    <MaterialCommunityIcons name="camera" size={20} color="#6366F1" />
                    <Text style={styles.imageButtonText}>
                      {imageLoading ? 'Đang tải...' : 'Chụp ảnh'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.imageLimitText}>
                  {selectedImages.length}/5 hình ảnh (tối đa 5 ảnh)
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Loại yêu cầu *</Text>
                <View style={styles.contactTypeContainer}>
                  <TouchableOpacity
                    style={[styles.contactTypeButton, contactType === 'support' && styles.contactTypeButtonActive]}
                    onPress={() => setContactType('support')}
                  >
                    <Text style={styles.contactTypeButtonText}>Hỗ trợ</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.contactTypeButton, contactType === 'bug' && styles.contactTypeButtonActive]}
                    onPress={() => setContactType('bug')}
                  >
                    <Text style={styles.contactTypeButtonText}>Báo cáo lỗi</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.contactTypeButton, contactType === 'suggestion' && styles.contactTypeButtonActive]}
                    onPress={() => setContactType('suggestion')}
                  >
                    <Text style={styles.contactTypeButtonText}>Đề xuất</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, { opacity: submitting ? 0.7 : 1 }]}
                onPress={handleContactSubmit}
                disabled={submitting}
              >
                <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.submitButtonGradient}>
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="send" size={20} color="#fff" />
                      <Text style={styles.submitButtonText}>Gửi yêu cầu</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.title}>Trợ giúp & Hỗ trợ</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Search */}
            <View style={styles.searchContainer}>
              <MaterialCommunityIcons name="magnify" size={20} color="#64748B" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Tìm kiếm câu hỏi..."
                placeholderTextColor="#64748B"
                style={styles.searchInput}
              />
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hành động nhanh</Text>
              <View style={styles.actionsGrid}>
                <TouchableOpacity style={styles.actionCard} onPress={() => { setContactType('support'); setShowContactForm(true); }}>
                  <MaterialCommunityIcons name="headset" size={24} color="#6366F1" />
                  <Text style={styles.actionTitle}>Liên hệ hỗ trợ</Text>
                  <Text style={styles.actionDescription}>Chat trực tiếp với đội ngũ hỗ trợ</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionCard} onPress={() => Alert.alert('Hướng dẫn', 'Tính năng hướng dẫn đang được phát triển.')}>
                  <MaterialCommunityIcons name="play-circle" size={24} color="#6366F1" />
                  <Text style={styles.actionTitle}>Hướng dẫn</Text>
                  <Text style={styles.actionDescription}>Video và tài liệu hướng dẫn chi tiết</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionCard} onPress={() => { setContactType('bug'); setShowContactForm(true); }}>
                  <MaterialCommunityIcons name="bug" size={24} color="#6366F1" />
                  <Text style={styles.actionTitle}>Báo cáo lỗi</Text>
                  <Text style={styles.actionDescription}>Báo cáo lỗi hoặc vấn đề kỹ thuật</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionCard} onPress={() => { setContactType('suggestion'); setShowContactForm(true); }}>
                  <MaterialCommunityIcons name="lightbulb-outline" size={24} color="#6366F1" />
                  <Text style={styles.actionTitle}>Đề xuất</Text>
                  <Text style={styles.actionDescription}>Gửi ý tưởng cho tính năng mới</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* FAQ */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Câu hỏi thường gặp</Text>
              {filteredFAQ.map((item, index) => (
                <View key={index} style={styles.faqItem}>
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                </View>
              ))}
              
              {filteredFAQ.length === 0 && searchQuery && (
                <View style={styles.noResults}>
                  <MaterialCommunityIcons name="help-circle-outline" size={48} color="#64748B" />
                  <Text style={styles.noResultsText}>Không tìm thấy câu hỏi phù hợp</Text>
                  <TouchableOpacity style={styles.contactSupportButton} onPress={() => setShowContactForm(true)}>
                    <Text style={styles.contactSupportText}>Liên hệ hỗ trợ</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    height: '80%', // Ensure modal has height so ScrollView with flex:1 can layout on Android
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerSpacer: {
    width: 32,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
    color: '#0F172A',
  },
  actionDescription: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
    color: '#64748B',
  },
  faqItem: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 12,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#0F172A',
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
  },
  noResults: {
    padding: 32,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 16,
    color: '#64748B',
  },
  contactSupportButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  contactSupportText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#0F172A',
    textAlignVertical: 'top',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 20,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imagesList: {
    marginBottom: 12,
  },
  imageItem: {
    marginRight: 12,
    position: 'relative',
  },
  selectedImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  imageButtonDisabled: {
    opacity: 0.6,
  },
  imageButtonText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
  },
  imageLimitText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  contactTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  contactTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactTypeButtonActive: {
    backgroundColor: '#6366F1',
  },
  contactTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
});

export default HelpSupportModal;
