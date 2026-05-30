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
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemedColors } from '@/hooks/useThemedColors';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const colors = useThemedColors();
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState('');
  const [comment, setComment] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fallback helper
  const tf = useCallback((key: string, fallback: string) => {
    const translated = t(key);
    return translated !== key ? translated : fallback;
  }, [t]);

  useEffect(() => {
    if (visible) {
      setRating(0);
      setCategory('');
      setComment('');
      setContactInfo('');
    }
  }, [visible]);

  const feedbackCategories = [
    { id: 'bug', label: tf('feedback_modal.categories.bug', 'Lỗi'), icon: 'bug' },
    { id: 'feature', label: tf('feedback_modal.categories.feature', 'Tính năng'), icon: 'lightbulb' },
    { id: 'ui', label: tf('feedback_modal.categories.ui', 'Giao diện'), icon: 'palette' },
    { id: 'performance', label: tf('feedback_modal.categories.performance', 'Hiệu suất'), icon: 'speedometer' },
    { id: 'other', label: tf('feedback_modal.categories.other', 'Khác'), icon: 'dots-horizontal' },
  ];

  const resetForm = () => {
    setRating(0);
    setCategory('');
    setComment('');
    setContactInfo('');
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert(tf('feedback_modal.missing_info', 'Thiếu thông tin'), tf('feedback_modal.please_rate', 'Vui lòng đánh giá'));
      return;
    }

    if (!category) {
      Alert.alert(tf('feedback_modal.missing_info', 'Thiếu thông tin'), tf('feedback_modal.please_select_category', 'Vui lòng chọn danh mục'));
      return;
    }

    if (!comment.trim()) {
      Alert.alert(tf('feedback_modal.missing_info', 'Thiếu thông tin'), tf('feedback_modal.please_enter_comment', 'Vui lòng nhập nội dung'));
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

      Alert.alert(tf('feedback_modal.thank_you', 'Cảm ơn bạn'), tf('feedback_modal.submit_success', 'Gửi phản hồi thành công'), [
        { text: 'OK', onPress: () => { resetForm(); onClose(); } }
      ]);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      Alert.alert(tf('common.error', 'Lỗi'), tf('feedback_modal.submit_error', 'Lỗi gửi phản hồi'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" presentationStyle="overFullScreen">
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.surfaceElevated || colors.cardBackground || colors.appBackground }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{tf('feedback_modal.title', 'Gửi phản hồi')}</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.ratingContainer}>
              <Text style={[styles.ratingLabel, { color: colors.text }]}>{tf('feedback_modal.rate_app', 'Đánh giá ứng dụng')}</Text>
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
                      color={star <= rating ? '#FBBF24' : colors.border}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.ratingText, { color: colors.subtleText }]}>
                {rating === 0 ? tf('feedback_modal.ratings.unrated', 'Chưa đánh giá') :
                  rating === 1 ? tf('feedback_modal.ratings.terrible', 'Rất tệ') :
                    rating === 2 ? tf('feedback_modal.ratings.bad', 'Tệ') :
                      rating === 3 ? tf('feedback_modal.ratings.normal', 'Bình thường') :
                        rating === 4 ? tf('feedback_modal.ratings.good', 'Tốt') : tf('feedback_modal.ratings.excellent', 'Rất tốt')}
              </Text>
            </View>

            <View style={styles.categoriesContainer}>
              <Text style={[styles.categoryLabel, { color: colors.text }]}>{tf('feedback_modal.category_label', 'Danh mục')}</Text>
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
                      { color: category === cat.id ? '#FFFFFF' : colors.text }
                    ]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>{tf('feedback_modal.content_label', 'Nội dung')}</Text>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder={tf('feedback_modal.content_placeholder', 'Nhập nội dung phản hồi...')}
                multiline
                numberOfLines={4}
                style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                maxLength={500}
                placeholderTextColor={colors.subtleText}
              />
              <Text style={[styles.charCount, { color: colors.subtleText }]}>{comment.length}/500</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>{tf('feedback_modal.contact_info_label', 'Thông tin liên hệ (tùy chọn)')}</Text>
              <TextInput
                value={contactInfo}
                onChangeText={setContactInfo}
                placeholder={tf('feedback_modal.contact_info_placeholder', 'Email hoặc số điện thoại')}
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                maxLength={100}
                placeholderTextColor={colors.subtleText}
              />
            </View>

            <View style={[styles.infoBox, { backgroundColor: colors.isDark ? colors.surface : '#EFF6FF' }]}>
              <MaterialCommunityIcons name="information" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.isDark ? colors.text : '#1E40AF' }]}>
                {tf('feedback_modal.help_us_improve', 'Phản hồi của bạn sẽ giúp chúng tôi cải thiện ứng dụng')}
              </Text>
            </View>
          </ScrollView>

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
                  <Text style={styles.submitText}>{tf('feedback_modal.submitting', 'Đang gửi...')}</Text>
                ) : (
                  <>
                    <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
                    <Text style={styles.submitText}>{tf('feedback_modal.submit', 'Gửi phản hồi')}</Text>
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
    backgroundColor: 'rgba(15,23,42,0.38)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 18,
    overflow: 'hidden',
    height: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
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