import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useThemedColors } from '@/hooks/useThemedColors';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (report: ReportData) => Promise<void>;
  targetType: 'user' | 'message' | 'group';
  targetInfo: {
    id: string;
    name?: string;
    avatar?: string;
    content?: string;
  };
  currentUser?: any;
}

interface ReportData {
  targetType: string;
  targetId: string;
  reason: string;
  description: string;
  reporterId: string;
  images?: string[];
}

const ReportModal = ({ visible, onClose, onSubmit, targetType, targetInfo, currentUser }: ReportModalProps) => {
  const colors = useThemedColors();
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      setSelectedReason('');
      setDescription('');
      setSelectedImages([]);
    }
  }, [visible]);

  const reportReasons = {
    user: [
      { id: 'harassment', label: 'Quấy rối', icon: 'account-alert' },
      { id: 'spam', label: 'Spam', icon: 'message-alert' },
      { id: 'fake', label: 'Tài khoản giả', icon: 'account-cancel' },
      { id: 'inappropriate', label: 'Nội dung không phù hợp', icon: 'alert-circle' },
      { id: 'scam', label: 'Lừa đảo', icon: 'security' },
      { id: 'other', label: 'Khác', icon: 'dots-horizontal' },
    ],
    message: [
      { id: 'spam', label: 'Tin nhắn spam', icon: 'message-alert' },
      { id: 'harassment', label: 'Quấy rối/Bắt nạt', icon: 'account-alert' },
      { id: 'hate_speech', label: 'Ngôn từ thù địch', icon: 'comment-alert' },
      { id: 'inappropriate', label: 'Nội dung không phù hợp', icon: 'alert-circle' },
      { id: 'violence', label: 'Bạo lực/Đe dọa', icon: 'shield-alert' },
      { id: 'privacy', label: 'Vi phạm quyền riêng tư', icon: 'lock-alert' },
      { id: 'other', label: 'Khác', icon: 'dots-horizontal' },
    ],
    group: [
      { id: 'inappropriate_content', label: 'Nội dung không phù hợp', icon: 'alert-circle' },
      { id: 'spam', label: 'Nhóm spam', icon: 'message-alert' },
      { id: 'hate_group', label: 'Nhóm thù địch', icon: 'account-group-outline' },
      { id: 'illegal', label: 'Hoạt động bất hợp pháp', icon: 'gavel' },
      { id: 'fake', label: 'Nhóm giả mạo', icon: 'account-cancel' },
      { id: 'other', label: 'Khác', icon: 'dots-horizontal' },
    ],
  };

  const resetForm = useCallback(() => {
    setSelectedReason('');
    setDescription('');
    setSelectedImages([]);
  }, []);

  const pickImage = useCallback(async () => {
    try {
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
    }
  }, []);

  const takePhoto = useCallback(async () => {
    try {
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
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedReason) {
      Alert.alert('⚠️ Thiếu thông tin', 'Vui lòng chọn lý do báo cáo');
      return;
    }

    if (selectedReason === 'other' && !description.trim()) {
      Alert.alert('⚠️ Thiếu thông tin', 'Vui lòng mô tả chi tiết khi chọn "Khác"');
      return;
    }

    try {
      setSubmitting(true);
      const reportData: ReportData = {
        targetType,
        targetId: targetInfo.id,
        reason: selectedReason,
        description: description.trim(),
        reporterId: currentUser?.uid || 'anonymous',
        images: selectedImages.length > 0 ? selectedImages : [],
      };

      await onSubmit(reportData);

      Alert.alert(
        '✅ Đã gửi báo cáo',
        'Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét và xử lý trong thời gian sớm nhất.',
        [{ text: 'OK', onPress: () => { resetForm(); onClose(); } }]
      );
    } catch (error) {
      Alert.alert('❌ Lỗi', 'Không thể gửi báo cáo. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }, [selectedReason, description, targetType, targetInfo.id, currentUser?.uid, onSubmit, resetForm, onClose, selectedImages]);

  const getTargetTitle = useCallback(() => {
    switch (targetType) {
      case 'user': return 'Báo cáo người dùng';
      case 'message': return 'Báo cáo tin nhắn';
      case 'group': return 'Báo cáo nhóm';
      default: return 'Báo cáo';
    }
  }, [targetType]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" presentationStyle="overFullScreen">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.overlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color={colors.subtleText} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.text }]}>{getTargetTitle()}</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Target Info */}
              <View style={[styles.targetInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.targetHeader}>
                  {targetInfo.avatar ? (
                    <Image source={{ uri: targetInfo.avatar }} style={styles.targetAvatar} />
                  ) : (
                    <View style={[styles.targetAvatar, styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
                      <MaterialCommunityIcons
                        name={targetType === 'user' ? 'account' : targetType === 'group' ? 'account-group' : 'message'}
                        size={24}
                        color={colors.subtleText}
                      />
                    </View>
                  )}
                  <View style={styles.targetDetails}>
                    <Text style={[styles.targetName, { color: colors.text }]}>{targetInfo.name || 'Không có tên'}</Text>
                    <Text style={[styles.targetType, { color: colors.subtleText }]}>
                      {targetType === 'user' ? 'Người dùng' :
                        targetType === 'group' ? 'Nhóm' : 'Tin nhắn'}
                    </Text>
                  </View>
                </View>

                {targetInfo.content && (
                  <View style={[styles.messageContent, { backgroundColor: colors.background, borderLeftColor: colors.primary }]}>
                    <Text style={[styles.messageText, { color: colors.text }]} numberOfLines={3} ellipsizeMode="tail">
                      {targetInfo.content}
                    </Text>
                  </View>
                )}
              </View>

              {/* Warning */}
              <View style={[styles.warningBox, { backgroundColor: colors.isDark ? colors.surface : '#FEF2F2' }]}>
                <MaterialCommunityIcons name="shield-alert" size={20} color={colors.error} />
                <Text style={[styles.warningText, { color: colors.error }]}>
                  Báo cáo sai sự thật có thể dẫn đến việc hạn chế tài khoản của bạn
                </Text>
              </View>

              {/* Reasons */}
              <View style={styles.reasonsContainer}>
                <Text style={[styles.reasonsTitle, { color: colors.text }]}>Lý do báo cáo *</Text>
                {reportReasons[targetType]?.map((reason) => (
                  <TouchableOpacity
                    key={reason.id}
                    style={[
                      styles.reasonButton,
                      { borderColor: colors.border },
                      selectedReason === reason.id && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setSelectedReason(reason.id)}
                  >
                    <MaterialCommunityIcons
                      name={reason.icon as any}
                      size={20}
                      color={selectedReason === reason.id ? '#FFFFFF' : colors.primary}
                    />
                    <Text style={[
                      styles.reasonText,
                      { color: colors.text },
                      selectedReason === reason.id && { color: '#FFFFFF' },
                    ]}>
                      {reason.label}
                    </Text>
                    {selectedReason === reason.id && (
                      <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Description */}
              <View style={styles.descriptionContainer}>
                <Text style={[styles.descriptionTitle, { color: colors.text }]}>
                  Mô tả chi tiết {selectedReason === 'other' ? '*' : '(tùy chọn)'}
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Vui lòng mô tả cụ thể hành vi vi phạm để chúng tôi xử lý chính xác..."
                  multiline
                  numberOfLines={4}
                  style={[styles.descriptionInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  maxLength={500}
                  placeholderTextColor={colors.subtleText}
                  autoFocus={selectedReason === 'other'}
                />
                <Text style={[styles.charCount, { color: colors.subtleText }]}>{description.length}/500</Text>
              </View>

              {/* Image Attachments */}
              <View style={styles.imagesContainer}>
                <Text style={[styles.imagesTitle, { color: colors.text }]}>Hình ảnh đính kèm (tùy chọn)</Text>
                <Text style={[styles.imagesSubtitle, { color: colors.subtleText }]}>Thêm ảnh để cung cấp bằng chứng chi tiết hơn</Text>

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
                        <Image source={{ uri: item }} style={[styles.selectedImage, { borderColor: colors.border }]} />
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
                  <TouchableOpacity style={[styles.imageButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={pickImage}>
                    <MaterialCommunityIcons name="image" size={20} color={colors.primary} />
                    <Text style={[styles.imageButtonText, { color: colors.primary }]}>Chọn từ thư viện</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.imageButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={takePhoto}>
                    <MaterialCommunityIcons name="camera" size={20} color={colors.primary} />
                    <Text style={[styles.imageButtonText, { color: colors.primary }]}>Chụp ảnh</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.imageLimitText, { color: colors.subtleText }]}>
                  {selectedImages.length}/5 hình ảnh (tối đa 5 ảnh)
                </Text>
              </View>

              {/* Privacy Notice */}
              <View style={[styles.privacyNotice, { backgroundColor: colors.isDark ? colors.surface : '#EFF6FF' }]}>
                <MaterialCommunityIcons name="information" size={16} color={colors.primary} />
                <Text style={[styles.privacyText, { color: colors.isDark ? colors.text : '#1E40AF' }]}>
                  Báo cáo của bạn sẽ được xử lý bảo mật và không được chia sẻ với người bị báo cáo
                </Text>
              </View>
            </ScrollView>

            {/* Submit Button */}
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.submitButton, { opacity: submitting ? 0.7 : 1 }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <LinearGradient
                  colors={[colors.error, colors.error + 'CC']}
                  style={styles.submitGradient}
                >
                  {submitting ? (
                    <Text style={styles.submitText}>Đang gửi...</Text>
                  ) : (
                    <>
                      <MaterialCommunityIcons name="flag" size={20} color="#FFFFFF" />
                      <Text style={styles.submitText}>Gửi báo cáo</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    height: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  targetInfo: {
    marginVertical: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  targetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetDetails: {
    flex: 1,
  },
  targetName: {
    fontSize: 16,
    fontWeight: '600',
  },
  targetType: {
    fontSize: 14,
    marginTop: 2,
  },
  messageContent: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  reasonsContainer: {
    marginBottom: 24,
  },
  reasonsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  reasonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  reasonText: {
    flex: 1,
    fontSize: 16,
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  descriptionInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  imagesContainer: {
    marginBottom: 20,
  },
  imagesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  imagesSubtitle: {
    fontSize: 14,
    marginBottom: 12,
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
    borderRadius: 8,
    gap: 8,
  },
  imageButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  imageLimitText: {
    fontSize: 12,
    textAlign: 'center',
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReportModal;