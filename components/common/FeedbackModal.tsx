import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState('');
  const [comment, setComment] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const renderStarRating = () => (
    <View style={styles.ratingContainer}>
      <Text style={styles.ratingLabel}>Đánh giá ứng dụng *</Text>
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
              color={star <= rating ? '#FFD700' : '#E2E8F0'}
            />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.ratingText}>
        {rating === 0 ? 'Chưa đánh giá' : 
         rating === 1 ? 'Rất tệ' :
         rating === 2 ? 'Tệ' :
         rating === 3 ? 'Bình thường' :
         rating === 4 ? 'Tốt' : 'Xuất sắc'}
      </Text>
    </View>
  );

  const renderCategories = () => (
    <View style={styles.categoriesContainer}>
      <Text style={styles.categoryLabel}>Loại phản hồi *</Text>
      <View style={styles.categoriesGrid}>
        {feedbackCategories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryButton,
              { backgroundColor: category === cat.id ? '#6366F1' : '#F8FAFC' }
            ]}
            onPress={() => setCategory(cat.id)}
          >
            <MaterialCommunityIcons
              name={cat.icon as any}
              size={20}
              color={category === cat.id ? '#FFFFFF' : '#6366F1'}
            />
            <Text style={[
              styles.categoryText,
              { color: category === cat.id ? '#FFFFFF' : '#6366F1' }
            ]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Phản hồi & Đánh giá</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Star Rating */}
            {renderStarRating()}

            {/* Categories */}
            {renderCategories()}

            {/* Comment */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nội dung phản hồi *</Text>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Chia sẻ trải nghiệm hoặc gợi ý cải thiện..."
                multiline
                numberOfLines={4}
                style={styles.textArea}
                maxLength={500}
              />
              <Text style={styles.charCount}>{comment.length}/500</Text>
            </View>

            {/* Contact Info */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Thông tin liên hệ (tùy chọn)</Text>
              <TextInput
                value={contactInfo}
                onChangeText={setContactInfo}
                placeholder="Email hoặc số điện thoại để chúng tôi phản hồi"
                style={styles.textInput}
                maxLength={100}
              />
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <MaterialCommunityIcons name="information" size={20} color="#6366F1" />
              <Text style={styles.infoText}>
                Phản hồi của bạn giúp chúng tôi cải thiện ứng dụng tốt hơn
              </Text>
            </View>
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.submitButton, { opacity: submitting ? 0.7 : 1 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
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
    width: SCREEN_WIDTH * 0.9,
    maxHeight: SCREEN_HEIGHT * 0.8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
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
