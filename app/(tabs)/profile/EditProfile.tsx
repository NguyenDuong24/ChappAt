import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Pressable,
  Modal,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { Text } from 'react-native-paper';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '@/context/authContext';
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Colors } from '@/constants/Colors';
import { ThemeContext } from '@/context/ThemeContext';
import VibeAvatar from '@/components/vibe/VibeAvatar';
import { getInterestsArray, normalizeInterestsArray } from '@/utils/interests';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { pickImage, uploadFile } from '@/utils/fileUpload';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LiquidSurface,
  getLiquidPalette,
  LiquidGlassBackground,
} from '@/components/liquid';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface ProfileForm {
  name: string;
  email: string;
  age: string;
  bio: string;
  icon: string | null;
  coverImage: string | null;
  interests: string[];
  job: string;
  university: string;
  city: string;
  address: string;
  birthday: string;
}

const SECTION_SPACING = 20;

const JOBS = ['Designer', 'Developer', 'Student', 'Engineer', 'Doctor', 'Nurse', 'Teacher', 'Freelancer', 'Artist', 'Business Owner', 'KOL/Influencer', 'Khác'];
const EDUCATION_LEVELS = ['Trung học phổ thông', 'Cử nhân', 'Thạc sĩ', 'Tiến sĩ', 'Sinh viên đại học', 'Khác'];

const EditProfile = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, setName, setAge, setBio, icon, refreshUser, activeFrame, currentVibe } = useAuth();
  const router = useRouter();
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'dark';
  const isDark = theme === 'dark';
  const palette = useMemo(() => getLiquidPalette(theme), [theme]);
  const primaryColor = Colors.primary;

  const [profile, setProfile] = useState<ProfileForm>({
    name: '', email: '', age: '', bio: '', icon: '',
    coverImage: '', interests: [], job: '', university: '',
    city: '', address: '', birthday: '',
  });

  const interestItems = useMemo(() => getInterestsArray(), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectionModal, setSelectionModal] = useState<{ visible: boolean; type: 'job' | 'edu'; list: string[] }>({
    visible: false, type: 'job', list: []
  });

  const navigateBack = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    if (user) {
      let safeAge = '';
      if (user.age !== undefined && user.age !== null) {
        if (typeof user.age === 'object' && user.age.seconds !== undefined) {
          safeAge = '';
        } else {
          safeAge = user.age.toString();
        }
      }

      setProfile((prev) => ({
        ...prev,
        name: user.username || '',
        email: user.email || '',
        age: safeAge,
        bio: user.bio || '',
        icon: icon || user.profileUrl || null,
        coverImage: user.coverImage || null,
        interests: Array.isArray(user.interests) ? normalizeInterestsArray(user.interests) : [],
        job: user.job || '',
        university: user.university || '',
        city: user.city || '',
        address: user.address || '',
        birthday: user.birthday || '',
      }));
    }
  }, [user?.uid, icon]);

  const calculateAge = (bdayStr: string) => {
    try {
      const parts = bdayStr.split('/');
      if (parts.length !== 3) return '';
      const bday = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      const today = new Date();
      let age = today.getFullYear() - bday.getFullYear();
      const m = today.getMonth() - bday.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < bday.getDate())) {
        age--;
      }
      return age.toString();
    } catch {
      return '';
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const day = selectedDate.getDate().toString().padStart(2, '0');
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const year = selectedDate.getFullYear();
      const bdayStr = `${day}/${month}/${year}`;
      const newAge = calculateAge(bdayStr);
      setProfile(prev => ({ ...prev, birthday: bdayStr, age: newAge }));
    }
  };

  const handleSelectOption = (option: string) => {
    const field = selectionModal.type === 'job' ? 'job' : 'university';
    setProfile(prev => ({ ...prev, [field]: option }));
    setSelectionModal(prev => ({ ...prev, visible: false }));
  };

  const handleChange = (field: string, value: any) =>
    setProfile((prev) => ({ ...prev, [field]: value }));

  const toggleInterest = (id: string) => {
    setProfile((prev) => {
      const current = prev.interests || [];
      const next = current.includes(id) ? current.filter(i => i !== id) : [...current, id];
      return { ...prev, interests: next };
    });
  };

  const handlePickCoverImage = async () => {
    try {
      const result = await pickImage();
      if (result) {
        setUploadingCover(true);
        const path = `users/${user.uid}/cover_${Date.now()}.jpg`;
        const downloadURL = await uploadFile(result, path);
        setProfile((prev) => ({ ...prev, coverImage: downloadURL }));
      }
    } catch (error: any) {
      setError(t('edit_profile.cover_upload_error'));
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSave = async () => {
    if (!user || !user.uid) return setError(t('edit_profile.login_error'));
    setLoading(true);
    setError(null);
    try {
      const docRef = doc(db, 'users', user.uid);
      const updateData: any = {
        username: profile.name,
        age: profile.age ? Number(profile.age) : null,
        bio: profile.bio,
        profileUrl: profile.icon,
        coverImage: profile.coverImage,
        interests: normalizeInterestsArray(profile.interests || []),
        job: profile.job,
        university: profile.university,
        city: profile.city,
        address: profile.address,
        birthday: profile.birthday,
        updatedAt: new Date(),
      };

      await updateDoc(docRef, updateData);

      setName(profile.name);
      setAge(profile.age ? Number(profile.age) : null);
      if (setBio) setBio(profile.bio);
      refreshUser();
      Alert.alert(t('common.success'), t('edit_profile.save_success'), [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error(error);
      setError(t('edit_profile.save_error'));
    } finally {
      setLoading(false);
    }
  };

  const textColor = palette.textColor;
  const subtextColor = palette.subtitleColor;
  const glassBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const surfaceTint = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';

  const SelectionCard = ({ label, value, icon, onPress }: any) => {
    return (
      <View style={styles.inputWrapper}>
        <Text style={[styles.inputLabel, { color: subtextColor }]}>{label}</Text>
        <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.inputContainer, { borderColor: glassBorder, backgroundColor: surfaceTint }]}>
          <MaterialCommunityIcons name={icon} size={22} color={primaryColor} style={styles.inputIcon} />
          <Text style={[styles.input, { color: value ? textColor : subtextColor }]}>
            {value || t('common.select')}
          </Text>
          <Ionicons name="chevron-down" size={18} color={subtextColor} />
        </TouchableOpacity>
      </View>
    );
  };

  const LiquidInput = ({ label, value, field, placeholder, icon, keyboardType = 'default', editable = true }: any) => {
    const isFocused = useSharedValue(0);
    const animatedStyle = useAnimatedStyle(() => ({
      borderColor: withTiming(isFocused.value ? primaryColor : glassBorder, { duration: 250 }),
      backgroundColor: withTiming(isFocused.value ? 'rgba(255,255,255,0.08)' : surfaceTint, { duration: 250 }),
      transform: [{ scale: withSpring(isFocused.value ? 1.01 : 1) }]
    }));

    return (
      <View style={styles.inputWrapper}>
        <Text style={[styles.inputLabel, { color: subtextColor }]}>{label}</Text>
        <Animated.View style={[styles.inputContainer, animatedStyle]}>
          <MaterialCommunityIcons name={icon} size={22} color={isFocused.value ? primaryColor : subtextColor} style={styles.inputIcon} />
          <TextInput
            value={value}
            onChangeText={(val) => handleChange(field, val)}
            placeholder={placeholder}
            placeholderTextColor={subtextColor}
            onFocus={() => (isFocused.value = 1)}
            onBlur={() => (isFocused.value = 0)}
            keyboardType={keyboardType}
            editable={editable}
            style={[styles.input, { color: textColor }]}
          />
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LiquidGlassBackground themeMode={theme} style={StyleSheet.absoluteFillObject} />

      <BlurView intensity={25} tint="dark" style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={navigateBack} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('edit_profile.header_title')}</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.doneBtn}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <LinearGradient colors={['#FCD34D', '#F59E0B']} style={styles.doneBtnGradient}>
              <Text style={styles.doneBtnText}>{t('common.done')}</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </BlurView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 160 }]}
        >
          <Animated.View entering={FadeIn.duration(800)} style={styles.heroSection}>
            <TouchableOpacity activeOpacity={0.9} onPress={handlePickCoverImage} style={[styles.coverContainer, { borderColor: glassBorder }]}>
              {profile.coverImage ? (
                <Image source={{ uri: profile.coverImage }} style={styles.coverImage} contentFit="cover" transition={400} />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <MaterialCommunityIcons name="image-edit-outline" size={42} color={subtextColor} />
                  <Text style={{ color: subtextColor, marginTop: 8, fontWeight: '700', fontSize: 13 }}>{t('edit_profile.upload_cover')}</Text>
                </View>
              )}
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={StyleSheet.absoluteFill} />
              {uploadingCover && <View style={styles.coverLoading}><ActivityIndicator color="#FFF" /></View>}
              <View style={styles.cameraIconBadge}>
                <Ionicons name="camera" size={18} color="#FFF" />
              </View>
            </TouchableOpacity>

            <View style={styles.avatarWrapper}>
              <View style={styles.avatarMain}>
                <VibeAvatar
                  avatarUrl={profile.icon || undefined}
                  size={130}
                  onPress={() => router.push('/signup/IconSelectionScreen?redirectTo=EditProfile&isEditing=true')}
                  showAddButton={true}
                  onAddPress={() => router.push('/signup/IconSelectionScreen?redirectTo=EditProfile&isEditing=true')}
                  frameType={activeFrame}
                />
                <TouchableOpacity
                  onPress={() => router.push('/(screens)/user/VibeScreen')}
                  style={[styles.vibeBadge, { backgroundColor: '#F59E0B' }]}
                >
                  {currentVibe?.vibe?.emoji ? (
                    <Text style={styles.vibeEmoji}>{currentVibe.vibe.emoji}</Text>
                  ) : (
                    <MaterialCommunityIcons name="star" size={20} color="#FFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          <View style={styles.formContainer}>
            <LiquidSurface themeMode={theme} borderRadius={24} intensity={isDark ? 10 : 20} style={styles.sectionCard}>
              <Text style={[styles.cardTitle, { color: primaryColor }]}>{t('edit_profile.personal_info')}</Text>

              <LiquidInput
                label={t('edit_profile.full_name_label')}
                value={profile.name}
                field="name"
                placeholder={t('edit_profile.full_name_placeholder')}
                icon="account-outline"
              />

              <View style={styles.row}>
                <View style={{ flex: 1.6 }}>
                  <SelectionCard
                    label={t('edit_profile.birthday_label')}
                    value={profile.birthday}
                    icon="calendar-heart"
                    onPress={() => setShowDatePicker(true)}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <LiquidInput label={t('edit_profile.age_label')} value={profile.age} editable={false} icon="cake-variant" />
                </View>
              </View>

              <SelectionCard
                label={t('edit_profile.job_label')}
                value={profile.job}
                icon="briefcase-outline"
                onPress={() => setSelectionModal({ visible: true, type: 'job', list: JOBS })}
              />

              <SelectionCard
                label={t('edit_profile.education_label')}
                value={profile.university}
                icon="school-outline"
                onPress={() => setSelectionModal({ visible: true, type: 'edu', list: EDUCATION_LEVELS })}
              />
            </LiquidSurface>

            <LiquidSurface themeMode={theme} borderRadius={24} intensity={isDark ? 10 : 20} style={styles.sectionCard}>
              <Text style={[styles.cardTitle, { color: primaryColor }]}>{t('edit_profile.your_story')}</Text>
              <View style={[styles.bioContainer, { borderColor: glassBorder, backgroundColor: surfaceTint }]}>
                <TextInput
                  value={profile.bio}
                  onChangeText={(text) => handleChange('bio', text)}
                  multiline
                  placeholder={t('edit_profile.bio_placeholder')}
                  placeholderTextColor={subtextColor}
                  style={[styles.bioInput, { color: textColor }]}
                />
              </View>
            </LiquidSurface>

            <LiquidSurface themeMode={theme} borderRadius={24} intensity={isDark ? 10 : 20} style={styles.sectionCard}>
              <Text style={[styles.cardTitle, { color: primaryColor }]}>{t('edit_profile.interests_vibe')}</Text>
              <View style={styles.interestsGrid}>
                {interestItems.map((item, idx) => {
                  const isSelected = profile.interests?.includes(item.id);
                  return (
                    <Animated.View key={item.id} entering={FadeInDown.delay(idx * 15)}>
                      <TouchableOpacity
                        onPress={() => toggleInterest(item.id)}
                        style={[
                          styles.interestChip,
                          {
                            backgroundColor: isSelected ? primaryColor : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                            borderColor: isSelected ? primaryColor : glassBorder
                          }
                        ]}
                      >
                        <Text style={[styles.interestText, { color: isSelected ? '#FFF' : textColor }]}>{item.label}</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>
            </LiquidSurface>

            {error && (
              <Animated.View entering={FadeInUp} style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {showDatePicker && (
        <DateTimePicker
          value={profile.birthday ? (new Date(parseInt(profile.birthday.split('/')[2]), parseInt(profile.birthday.split('/')[1]) - 1, parseInt(profile.birthday.split('/')[0]))) : new Date(2005, 0, 1)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}

      <Modal visible={selectionModal.visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectionModal(prev => ({ ...prev, visible: false }))} />
          <View style={styles.modalContentWrapper}>
            <LiquidSurface themeMode={theme} borderRadius={32} intensity={isDark ? 50 : 80} style={styles.modalBody}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: textColor }]}>
                  {selectionModal.type === 'job' ? t('edit_profile.job_label') : t('edit_profile.education_label')}
                </Text>
                <TouchableOpacity onPress={() => setSelectionModal(prev => ({ ...prev, visible: false }))} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={textColor} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.optionList} showsVerticalScrollIndicator={false}>
                {selectionModal.list.map((option) => {
                  const isSelected = (selectionModal.type === 'job' ? profile.job : profile.university) === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      onPress={() => handleSelectOption(option)}
                      style={[styles.optionRow, { borderBottomColor: glassBorder }]}
                    >
                      <Text style={[styles.optionLabel, { color: isSelected ? primaryColor : textColor }]}>{option}</Text>
                      <Ionicons
                        name={isSelected ? "radio-button-on" : "radio-button-off"}
                        size={22}
                        color={isSelected ? primaryColor : subtextColor}
                      />
                    </TouchableOpacity>
                  );
                })}
                <View style={{ height: 20 }} />
              </ScrollView>
            </LiquidSurface>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    height: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  headerBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#FFF' },
  doneBtn: { borderRadius: 22, overflow: 'hidden' },
  doneBtnGradient: { paddingHorizontal: 20, paddingVertical: 10, alignItems: 'center' },
  doneBtnText: { color: '#000', fontWeight: '900', fontSize: 15 },
  scrollContent: { paddingTop: 10 },
  heroSection: { paddingHorizontal: 16, marginBottom: 50 },
  coverContainer: { height: 180, borderRadius: 28, overflow: 'hidden', borderWidth: 1, position: 'relative' },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  coverLoading: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  cameraIconBadge: { position: 'absolute', bottom: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  avatarWrapper: { position: 'absolute', bottom: -50, left: 24, zIndex: 10 },
  avatarMain: { padding: 4, position: 'relative' },
  vibeBadge: { position: 'absolute', top: 4, left: 4, width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: '#000', alignItems: 'center', justifyContent: 'center', elevation: 10 },
  vibeEmoji: { fontSize: 22 },
  formContainer: { paddingHorizontal: 16, gap: SECTION_SPACING },
  sectionCard: { padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  cardTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5, marginBottom: 18, textTransform: 'uppercase', opacity: 0.8 },
  inputWrapper: { marginBottom: 15 },
  inputLabel: { fontSize: 12, fontWeight: '800', marginBottom: 8, opacity: 0.6, marginLeft: 4 },
  inputContainer: { height: 56, borderRadius: 18, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center' },
  bioContainer: { minHeight: 120, borderRadius: 20, borderWidth: 1.5, padding: 16, borderStyle: 'solid' },
  bioInput: { fontSize: 16, fontWeight: '600', lineHeight: 24, textAlignVertical: 'top' },
  interestsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  interestText: { fontSize: 14, fontWeight: '700' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 16 },
  errorText: { color: '#EF4444', fontWeight: '700', fontSize: 14, flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContentWrapper: { padding: 16, paddingBottom: 40 },
  modalBody: { padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  closeBtn: { padding: 4 },
  optionList: { maxHeight: 400 },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, borderBottomWidth: 1 },
  optionLabel: { fontSize: 16, fontWeight: '800' },
  optionText: { fontSize: 16, fontWeight: '700' },
});

export default React.memo(EditProfile);
