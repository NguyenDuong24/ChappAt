import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemedColors } from '@/hooks/useThemedColors';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (feedback: FeedbackData) => void;
}

interface FeedbackData {
  rating: number;
  category: string;
  comment: string;
  contactInfo?: string;
}

const FeedbackModal = ({ visible, onClose, onSubmit }: FeedbackModalProps) => {
  const colors = useThemedColors();
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState('');
  const [comment, setComment] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Ensure inputs are reset when modal opens
    if (visible) {
      setRating(0);
      setCategory('');
      setComment('');
      setContactInfo('');
    }
  }, [visible]);

  const feedbackCategories = [
    { id: 'bug', label: 'Báo lỗi', icon: 'bug' },
    { id: 'feature', label: 'Yêu cầu tính năng', icon: 'lightbulb' },
    { id: 'ui', label: 'Giao diện', icon: 'palette' },
    { id: 'performance', label: 'Hiệu suất', icon: 'speedometer' },
    { id: 'other', label: 'Khác', icon: 'dots-horizontal' },
  ];

  const resetForm = () => {
    setRating(0);
    setCategory('');
    setComment('');
    setContactInfo('');
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('⚠️ Thiếu thông tin', 'Vui lòng đánh giá ứng dụng');
      return;
    }

    if (!category) {
      Alert.alert('⚠️ Thiếu thông tin', 'Vui lòng chọn loại phản hồi');
      return;
    }

    if (!comment.trim()) {
      Alert.alert('⚠️ Thiếu thông tin', 'Vui lòng nhập nội dung phản hồi');
      return;
    }

    try {
      setSubmitting(true);

      const feedbackData: FeedbackData = {
        rating,
        category,
        comment: comment.trim(),
        contactInfo: contactInfo.trim() || undefined,
      };

      await onSubmit(feedbackData);

      Alert.alert('🎉 Cảm ơn!', 'Phản hồi của bạn đã được gửi thành công', [
        { text: 'OK', onPress: () => { resetForm(); onClose(); } }
      ]);
    } catch (error) {
      Alert.alert('❌ Lỗi', 'Không thể gửi phản hồi. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" presentationStyle="overFullScreen">
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={colors.subtleText} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Phản hồi & Đánh giá</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Star Rating */}
            <View style={styles.ratingContainer}>
              <Text style={[styles.ratingLabel, { color: colors.text }]}>Đánh giá ứng dụng *</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    style={styles.starButton}
                  >
                    <MaterialCommunityIcons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={32}
                      color={star <= rating ? '#FFD700' : colors.border}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.ratingText, { color: colors.subtleText }]}>
                {rating === 0 ? 'Chưa đánh giá' :
                  rating === 1 ? 'Rất tệ' :
                    rating === 2 ? 'Tệ' :
                      rating === 3 ? 'Bình thường' :
                        rating === 4 ? 'Tốt' : 'Xuất sắc'}
              </Text>
            </View>

            {/* Categories */}
            <View style={styles.categoriesContainer}>
              <Text style={[styles.categoryLabel, { color: colors.text }]}>Loại phản hồi *</Text>
              <View style={styles.categoriesGrid}>
                {feedbackCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryButton,
                      { backgroundColor: category === cat.id ? colors.primary : colors.surface, borderColor: colors.border }
                    ]}
                    onPress={() => setCategory(cat.id)}
                  >
                    <MaterialCommunityIcons
                      name={cat.icon as any}
                      size={20}
                      color={category === cat.id ? '#FFFFFF' : colors.primary}
                    />
                    <Text style={[
                      styles.categoryText,
                      { color: category === cat.id ? '#FFFFFF' : colors.primary }
                    ]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Comment */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Nội dung phản hồi *</Text>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Chia sẻ trải nghiệm hoặc gợi ý cải thiện..."
                multiline
                numberOfLines={4}
                style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                maxLength={500}
                placeholderTextColor={colors.subtleText}
              />
              <Text style={[styles.charCount, { color: colors.subtleText }]}>{comment.length}/500</Text>
            </View>

            {/* Contact Info */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Thông tin liên hệ (tùy chọn)</Text>
              <TextInput
                value={contactInfo}
                onChangeText={setContactInfo}
                placeholder="Email hoặc số điện thoại để chúng tôi phản hồi"
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                maxLength={100}
                placeholderTextColor={colors.subtleText}
              />
            </View>

            {/* Info Box */}
            <View style={[styles.infoBox, { backgroundColor: colors.isDark ? colors.surface : '#EFF6FF' }]}>
              <MaterialCommunityIcons name="information" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.isDark ? colors.text : '#1E40AF' }]}>
                Phản hồi của bạn giúp chúng tôi cải thiện ứng dụng tốt hơn
              </Text>
            </View>
          </ScrollView>

          {/* Submit Button */}
          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.submitButton, { opacity: submitting ? 0.7 : 1 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <LinearGradient
                colors={[colors.primary, colors.tintDark || colors.primary]}
                style={styles.submitGradient}
              >
                {submitting ? (
                  <Text style={styles.submitText}>Đang gửi...</Text>
                ) : (
                  <>
                    <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
                    <Text style={styles.submitText}>Gửi phản hồi</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    height: '80%', // Ensure ScrollView (flex:1) has space to render on Android
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  ratingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  categoriesContainer: {
    marginBottom: 24,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0F172A',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0F172A',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
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

export default FeedbackModal;
