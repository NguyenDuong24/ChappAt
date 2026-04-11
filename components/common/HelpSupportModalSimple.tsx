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
import { useThemedColors } from '@/hooks/useThemedColors';
import { useTranslation } from 'react-i18next';

interface HelpSupportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmitContact?: (message: string, email?: string, images?: string[], type?: 'support' | 'bug' | 'suggestion') => Promise<void> | void;
  startInContactForm?: boolean;
}

const HelpSupportModal = ({ visible, onClose, onSubmitContact, startInContactForm = false }: HelpSupportModalProps) => {
  const { t } = useTranslation();
  const colors = useThemedColors();
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
    { question: t('help_support.faq.q1.question'), answer: t('help_support.faq.q1.answer') },
    { question: t('help_support.faq.q2.question'), answer: t('help_support.faq.q2.answer') },
    { question: t('help_support.faq.q3.question'), answer: t('help_support.faq.q3.answer') },
    { question: t('help_support.faq.q4.question'), answer: t('help_support.faq.q4.answer') },
    { question: t('help_support.faq.q5.question'), answer: t('help_support.faq.q5.answer') },
    { question: t('help_support.faq.q6.question'), answer: t('help_support.faq.q6.answer') },
    { question: t('help_support.faq.q7.question'), answer: t('help_support.faq.q7.answer') },
    { question: t('help_support.faq.q8.question'), answer: t('help_support.faq.q8.answer') },
  ];

  const filteredFAQ = faqItems.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContactSubmit = async () => {
    if (!contactMessage.trim()) {
      Alert.alert(t('common.error'), t('help_support.validation_message_required'));
      return;
    }

    try {
      setSubmitting(true);

      if (onSubmitContact) {
        await onSubmitContact(contactMessage.trim(), contactEmail.trim() || undefined, selectedImages, contactType);
      } else {
        await new Promise(resolve => setTimeout(resolve, 1200));
      }

      Alert.alert(t('common.success'), t('help_support.submit_success'), [{
        text: t('common.ok'), onPress: () => {
          setContactMessage('');
          setContactEmail('');
          setSelectedImages([]);
          setShowContactForm(false);
          setContactType('support');
          setImageLoading(false);
        },
      }]);
    } catch {
      Alert.alert(t('common.error'), t('help_support.submit_error'));
    } finally {
      setSubmitting(false);
    }
  };

  const pickImage = useCallback(async () => {
    try {
      setImageLoading(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('help_support.permission_title'), t('help_support.permission_library'));
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
        setSelectedImages(prev => [...prev, ...newImages].slice(0, 5));
      }
    } catch {
      Alert.alert(t('common.error'), t('help_support.pick_image_error'));
    } finally {
      setImageLoading(false);
    }
  }, [t]);

  const takePhoto = useCallback(async () => {
    try {
      setImageLoading(true);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('help_support.permission_title'), t('help_support.permission_camera'));
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
    } catch {
      Alert.alert(t('common.error'), t('help_support.take_photo_error'));
    } finally {
      setImageLoading(false);
    }
  }, [t]);

  const removeImage = useCallback((index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const contactFormTitle = contactType === 'bug'
    ? t('help_support.report_bug')
    : contactType === 'suggestion'
      ? t('help_support.feature_request')
      : t('help_support.contact_support');

  if (showContactForm) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.container, { backgroundColor: colors.background }]}> 
            <View style={[styles.header, { borderBottomColor: colors.border }]}> 
              <TouchableOpacity onPress={() => setShowContactForm(false)}>
                <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: colors.text }]}>{contactFormTitle}</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('help_support.issue_description_required')}</Text>
                <TextInput
                  value={contactMessage}
                  onChangeText={setContactMessage}
                  placeholder={t('help_support.issue_description_placeholder')}
                  placeholderTextColor={colors.subtleText}
                  style={[styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  multiline
                  maxLength={1000}
                  textAlignVertical="top"
                />
                <Text style={[styles.charCount, { color: colors.subtleText }]}>{contactMessage.length}/1000</Text>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('help_support.contact_email_optional')}</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
                  <MaterialCommunityIcons name="email-outline" size={20} color={colors.primary} />
                  <TextInput
                    value={contactEmail}
                    onChangeText={setContactEmail}
                    placeholder="your@email.com"
                    placeholderTextColor={colors.subtleText}
                    style={[styles.textInput, { color: colors.text }]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('help_support.attachments_optional')}</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.subtleText }]}>{t('help_support.attachments_hint')}</Text>

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
                        <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
                          <MaterialCommunityIcons name="close-circle" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                )}

                <View style={styles.imageButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.imageButton, { backgroundColor: colors.surface, borderColor: colors.border }, imageLoading && styles.imageButtonDisabled]}
                    onPress={pickImage}
                    disabled={imageLoading}
                  >
                    <MaterialCommunityIcons name="image" size={20} color={colors.primary} />
                    <Text style={[styles.imageButtonText, { color: colors.primary }]}> 
                      {imageLoading ? t('help_support.uploading') : t('help_support.pick_from_library')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.imageButton, { backgroundColor: colors.surface, borderColor: colors.border }, imageLoading && styles.imageButtonDisabled]}
                    onPress={takePhoto}
                    disabled={imageLoading}
                  >
                    <MaterialCommunityIcons name="camera" size={20} color={colors.primary} />
                    <Text style={[styles.imageButtonText, { color: colors.primary }]}> 
                      {imageLoading ? t('help_support.uploading') : t('help_support.take_photo')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.imageLimitText, { color: colors.subtleText }]}> 
                  {t('help_support.images_limit', { count: selectedImages.length, max: 5 })}
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('help_support.request_type_required')}</Text>
                <View style={styles.contactTypeContainer}>
                  <TouchableOpacity
                    style={[styles.contactTypeButton, { backgroundColor: colors.surface, borderColor: colors.border }, contactType === 'support' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setContactType('support')}
                  >
                    <Text style={[styles.contactTypeButtonText, { color: colors.text }, contactType === 'support' && { color: '#FFFFFF' }]}>{t('help_support.support')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.contactTypeButton, { backgroundColor: colors.surface, borderColor: colors.border }, contactType === 'bug' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setContactType('bug')}
                  >
                    <Text style={[styles.contactTypeButtonText, { color: colors.text }, contactType === 'bug' && { color: '#FFFFFF' }]}>{t('help_support.report_bug')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.contactTypeButton, { backgroundColor: colors.surface, borderColor: colors.border }, contactType === 'suggestion' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setContactType('suggestion')}
                  >
                    <Text style={[styles.contactTypeButtonText, { color: colors.text }, contactType === 'suggestion' && { color: '#FFFFFF' }]}>{t('help_support.suggestion')}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={[styles.submitButton, { opacity: submitting ? 0.7 : 1 }]} onPress={handleContactSubmit} disabled={submitting}>
                <LinearGradient colors={[colors.primary, colors.tintDark || colors.primary]} style={styles.submitButtonGradient}>
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="send" size={20} color="#fff" />
                      <Text style={styles.submitButtonText}>{t('help_support.send_request')}</Text>
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
        <View style={[styles.container, { backgroundColor: colors.background }]}> 
          <View style={[styles.header, { borderBottomColor: colors.border }]}> 
            <View style={styles.headerSpacer} />
            <Text style={[styles.title, { color: colors.text }]}>{t('help_support.title')}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.subtleText} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('help_support.search_placeholder')}
                placeholderTextColor={colors.subtleText}
                style={[styles.searchInput, { color: colors.text }]}
              />
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('help_support.quick_actions')}</Text>
              <View style={styles.actionsGrid}>
                <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.surface }]} onPress={() => { setContactType('support'); setShowContactForm(true); }}>
                  <MaterialCommunityIcons name="headset" size={24} color={colors.primary} />
                  <Text style={[styles.actionTitle, { color: colors.text }]}>{t('help_support.contact_support')}</Text>
                  <Text style={[styles.actionDescription, { color: colors.subtleText }]}>{t('help_support.contact_support_desc')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.surface }]} onPress={() => Alert.alert(t('help_support.guide_title'), t('help_support.guide_coming_soon'))}>
                  <MaterialCommunityIcons name="play-circle" size={24} color={colors.primary} />
                  <Text style={[styles.actionTitle, { color: colors.text }]}>{t('help_support.guide')}</Text>
                  <Text style={[styles.actionDescription, { color: colors.subtleText }]}>{t('help_support.guide_desc')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.surface }]} onPress={() => { setContactType('bug'); setShowContactForm(true); }}>
                  <MaterialCommunityIcons name="bug" size={24} color={colors.primary} />
                  <Text style={[styles.actionTitle, { color: colors.text }]}>{t('help_support.report_bug')}</Text>
                  <Text style={[styles.actionDescription, { color: colors.subtleText }]}>{t('help_support.report_bug_desc')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.surface }]} onPress={() => { setContactType('suggestion'); setShowContactForm(true); }}>
                  <MaterialCommunityIcons name="lightbulb-outline" size={24} color={colors.primary} />
                  <Text style={[styles.actionTitle, { color: colors.text }]}>{t('help_support.suggestion')}</Text>
                  <Text style={[styles.actionDescription, { color: colors.subtleText }]}>{t('help_support.suggestion_desc')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('help_support.faq_title')}</Text>
              {filteredFAQ.map((item, index) => (
                <View key={index} style={[styles.faqItem, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.faqQuestion, { color: colors.text }]}>{item.question}</Text>
                  <Text style={[styles.faqAnswer, { color: colors.subtleText }]}>{item.answer}</Text>
                </View>
              ))}

              {filteredFAQ.length === 0 && searchQuery && (
                <View style={[styles.noResults, { backgroundColor: colors.surface }]}>
                  <MaterialCommunityIcons name="help-circle-outline" size={48} color={colors.subtleText} />
                  <Text style={[styles.noResultsText, { color: colors.subtleText }]}>{t('help_support.no_results')}</Text>
                  <TouchableOpacity style={[styles.contactSupportButton, { backgroundColor: colors.primary }]} onPress={() => setShowContactForm(true)}>
                    <Text style={styles.contactSupportText}>{t('help_support.contact_support')}</Text>
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
    height: '80%',
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
  contactTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
});

export default HelpSupportModal;
