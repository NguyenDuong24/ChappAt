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
} from 'react-native';
import { Image } from 'expo-image';
import { Text } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
} from 'react-native-reanimated';
import { pickImage, uploadFile } from '@/utils/fileUpload';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LiquidSurface,
  getLiquidPalette,
  LiquidGlassBackground,
} from '@/components/liquid';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

const SECTION_SPACING = 24;

const JOBS = ['Designer', 'Developer', 'Student', 'Engineer', 'Doctor', 'Nurse', 'Teacher', 'Freelancer', 'Artist', 'Business Owner', 'Other'];
const EDUCATION_LEVELS = ['High School', 'Bachelor\'s Degree', 'Master\'s Degree', 'PhD', 'University Student', 'None'];

const EditProfile = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, setName, setEmail, setAge, setBio, setIcon, icon, refreshUser, activeFrame, currentVibe } = useAuth();
  const router = useRouter();
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
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
  
  // Modals & Pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectionModal, setSelectionModal] = useState<{ visible: boolean; type: 'job' | 'edu'; list: string[] }>({
    visible: false, type: 'job', list: []
  });

  const navigateBack = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    if (user) {
      setProfile((prev) => ({
        ...prev,
        name: user.username || '',
        email: user.email || '',
        age: user.age?.toString() || '',
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

  const openSelection = (type: 'job' | 'edu') => {
    setSelectionModal({
      visible: true,
      type,
      list: type === 'job' ? JOBS : EDUCATION_LEVELS
    });
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
    } catch (error) {
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
      await updateDoc(docRef, {
        username: profile.name,
        age: Number(profile.age),
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
      });
      
      setName(profile.name);
      setAge(Number(profile.age));
      setBio(profile.bio);
      refreshUser();
      router.back();
    } catch (error) {
      console.error(error);
      setError(t('edit_profile.save_error'));
    } finally {
      setLoading(false);
    }
  };

  const { isDark, palette: themePalette } = useContext(ThemeContext) || { isDark: false };
  const paletteToUse = themePalette || getLiquidPalette(theme);

  const textColor = paletteToUse.textColor;
  const subtextColor = paletteToUse.subtitleColor;
  const glassBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const surfaceTint = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';

  const SelectionCard = ({ label, value, icon, onPress }: any) => {
    return (
        <View style={styles.inputWrapper}>
          <Text style={[styles.inputLabel, { color: subtextColor }]}>{label}</Text>
          <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.inputContainer, { borderColor: glassBorder }]}>
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
      borderColor: withTiming(isFocused.value ? primaryColor : glassBorder, { duration: 200 }),
      backgroundColor: withTiming(isFocused.value ? surfaceTint : 'transparent', { duration: 200 }),
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
      <LiquidGlassBackground themeMode={theme} style={StyleSheet.absoluteFillObject} />
      
      {/* Dynamic Header */}
      <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint={isDark ? 'dark' : 'light'} style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity onPress={navigateBack} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={26} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>{t('edit_profile.header_title')}</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading} style={[styles.saveButton, { backgroundColor: primaryColor }]}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>{t('common.done')}</Text>
          )}
        </TouchableOpacity>
      </BlurView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        >
          {/* Hero Section */}
          <Animated.View entering={FadeIn.duration(800)} style={styles.heroSection}>
            <TouchableOpacity activeOpacity={0.8} onPress={handlePickCoverImage} style={[styles.coverContainer, { borderColor: glassBorder }]}>
              {profile.coverImage ? (
                <Image source={{ uri: profile.coverImage }} style={styles.coverImage} contentFit="cover" transition={400} />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <MaterialCommunityIcons name="image-plus" size={36} color={subtextColor} />
                  <Text style={{ color: subtextColor, marginTop: 8, fontWeight: '600' }}>{t('edit_profile.upload_cover')}</Text>
                </View>
              )}
              {uploadingCover && <View style={styles.coverLoading}><ActivityIndicator color="#FFF" /></View>}
              <View style={styles.editMediaBadge}>
                 <MaterialCommunityIcons name="camera" size={18} color="#FFF" />
              </View>
            </TouchableOpacity>

            <View style={styles.avatarPositioner}>
              <View style={styles.avatarContainer}>
                 <VibeAvatar
                    avatarUrl={profile.icon || undefined}
                    size={120}
                    onPress={() => router.push('/signup/IconSelectionScreen?redirectTo=EditProfile&isEditing=true')}
                    showAddButton={true}
                    onAddPress={() => router.push('/signup/IconSelectionScreen?redirectTo=EditProfile&isEditing=true')}
                    frameType={activeFrame}
                 />
                {/* Vibe Selector Button */}
                <TouchableOpacity 
                    onPress={() => router.push('/(screens)/user/VibeScreen')}
                    style={[styles.vibeBadge, { backgroundColor: primaryColor, borderColor: palette.menuBackground }]}
                >
                    {currentVibe?.vibe?.emoji ? (
                      <Text style={styles.vibeEmoji}>{currentVibe.vibe.emoji}</Text>
                    ) : (
                      <MaterialCommunityIcons name="star-face" size={20} color="#FFF" />
                    )}
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          <View style={styles.formContainer}>
            {/* Core Info */}
            <LiquidSurface themeMode={theme} borderRadius={32} intensity={theme === 'dark' ? 12 : 25} style={styles.sectionCard}>
              <Text style={styles.cardTitle}>{t('edit_profile.personal_info')}</Text>
              
              <LiquidInput 
                label={t('edit_profile.full_name_label')} 
                value={profile.name} 
                field="name" 
                placeholder={t('edit_profile.full_name_placeholder')} 
                icon="account-outline" 
              />

              <View style={styles.row}>
                <View style={{ flex: 1.5 }}>
                    <SelectionCard 
                        label={t('edit_profile.birthday_label')} 
                        value={profile.birthday} 
                        icon="calendar-month-outline"
                        onPress={() => setShowDatePicker(true)}
                    />
                </View>
                <View style={{ width: 16 }} />
                <View style={{ flex: 1 }}>
                    <LiquidInput label={t('edit_profile.age_label')} value={profile.age} editable={false} icon="cake-variant-outline" />
                </View>
              </View>

              <SelectionCard 
                label={t('edit_profile.job_label')} 
                value={profile.job} 
                icon="briefcase-variant-outline"
                onPress={() => openSelection('job')}
              />
              
              <SelectionCard 
                label={t('edit_profile.education_label')} 
                value={profile.university} 
                icon="school-outline"
                onPress={() => openSelection('edu')}
              />
            </LiquidSurface>

            {/* Bio Section */}
            <LiquidSurface themeMode={theme} borderRadius={32} intensity={theme === 'dark' ? 12 : 25} style={styles.sectionCard}>
                <Text style={styles.cardTitle}>{t('edit_profile.your_story')}</Text>
                <View style={[styles.bioInputBox, { borderColor: glassBorder }]}>
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

            {/* Interests Section */}
            <LiquidSurface themeMode={theme} borderRadius={32} intensity={theme === 'dark' ? 12 : 25} style={styles.sectionCard}>
              <Text style={styles.cardTitle}>{t('edit_profile.interests_vibe')}</Text>
              <View style={styles.interestsGrid}>
                {interestItems.map((item, idx) => {
                  const isSelected = profile.interests?.includes(item.id);
                  const unselectedTextColor = theme === 'dark' ? '#E2E8F0' : '#0F172A';
                  return (
                    <Animated.View key={item.id} entering={FadeInDown.delay(idx * 20)}>
                      <TouchableOpacity
                        onPress={() => toggleInterest(item.id)}
                        style={[
                          styles.interestChip,
                          { 
                            backgroundColor: isSelected ? primaryColor : theme === 'dark' ? '#1E293B' : '#F1F5F9',
                            borderColor: isSelected ? primaryColor : glassBorder
                          }
                        ]}
                      >
                        <Text style={[styles.interestText, { color: isSelected ? '#FFFFFF' : unselectedTextColor }]}>{item.label}</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>
            </LiquidSurface>

            {error && (
                <View style={styles.errorBanner}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={20} color={Colors.error} />
                    <Text style={styles.errorLabel}>{error}</Text>
                </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={profile.birthday ? (new Date(parseInt(profile.birthday.split('/')[2]), parseInt(profile.birthday.split('/')[1]) - 1, parseInt(profile.birthday.split('/')[0]))) : new Date(2000, 0, 1)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}

      {/* Selection Modal */}
      <Modal visible={selectionModal.visible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectionModal(prev => ({ ...prev, visible: false }))} />
          <Animated.View entering={FadeInUp} exiting={FadeOut} style={styles.modalWrapper}>
            <LiquidSurface themeMode={theme} borderRadius={32} intensity={theme === 'dark' ? 40 : 60} style={styles.modalContent}>
               <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: textColor }]}>
                    {selectionModal.type === 'job' ? t('edit_profile.job_label') : t('edit_profile.education_label')}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectionModal(prev => ({ ...prev, visible: false }))}>
                     <Ionicons name="close" size={24} color={textColor} />
                  </TouchableOpacity>
               </View>
               <ScrollView style={styles.modalScroll}>
                  {selectionModal.list.map((option) => (
                    <TouchableOpacity 
                        key={option} 
                        onPress={() => handleSelectOption(option)}
                        style={[styles.optionItem, { borderBottomColor: glassBorder }]}
                    >
                        <Text style={[styles.optionText, { color: textColor }]}>{option}</Text>
                        <MaterialCommunityIcons 
                            name={ (selectionModal.type === 'job' ? profile.job : profile.university) === option ? "radiobox-marked" : "radiobox-blank"} 
                            size={22} 
                            color={ (selectionModal.type === 'job' ? profile.job : profile.university) === option ? primaryColor : subtextColor} 
                        />
                    </TouchableOpacity>
                  ))}
               </ScrollView>
            </LiquidSurface>
          </Animated.View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 110,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 100,
  },
  headerBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  saveButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, minWidth: 80, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  scrollContent: { paddingTop: 20 },
  heroSection: { paddingHorizontal: 20, marginBottom: 50 },
  coverContainer: { height: 200, borderRadius: 32, overflow: 'hidden', borderWidth: 1, position: 'relative' },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.02)' },
  coverLoading: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  editMediaBadge: { position: 'absolute', bottom: 12, right: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  avatarPositioner: { position: 'absolute', bottom: -60, left: 30 },
  avatarContainer: { position: 'relative', padding: 8 },
  vibeBadge: { position: 'absolute', bottom: 4, left: 4, width: 42, height: 42, borderRadius: 21, borderWidth: 3, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  vibeEmoji: { fontSize: 20 },
  formContainer: { paddingHorizontal: 20, gap: SECTION_SPACING },
  sectionCard: { padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cardTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5, opacity: 0.5, marginBottom: 20, textTransform: 'uppercase' },
  inputWrapper: { marginBottom: 18 },
  inputLabel: { fontSize: 12, fontWeight: '800', marginBottom: 8, marginLeft: 4 },
  inputContainer: { height: 58, borderRadius: 18, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center' },
  bioInputBox: { minHeight: 120, borderRadius: 18, borderWidth: 1.5, padding: 16, borderStyle: 'dashed' },
  bioInput: { fontSize: 16, fontWeight: '600', lineHeight: 24, textAlignVertical: 'top' },
  interestsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  interestChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  interestText: { fontSize: 14, fontWeight: '700' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 16, marginTop: -10 },
  errorLabel: { color: Colors.error, fontWeight: '700', fontSize: 14, flex: 1 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 25 },
  modalWrapper: { width: '100%', maxHeight: '70%' },
  modalContent: { padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  modalScroll: { width: '100%' },
  optionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1 },
  optionText: { fontSize: 16, fontWeight: '700' },
});

export default React.memo(EditProfile);
