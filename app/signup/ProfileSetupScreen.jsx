import React, { useState, useCallback, useMemo, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ImageBackground, Alert,
  KeyboardAvoidingView, Platform, ScrollView, Modal, FlatList, TextInput as RNTextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { useLogoState } from '@/context/LogoStateContext';
import { Colors } from '@/constants/Colors';
import { TextInput } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import ProgressIndicator from '@/components/signup/ProgressIndicator';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { VIETNAM_PROVINCES } from '@/constants/Provinces';
import { ThemeContext } from '@/context/ThemeContext';

const ProfileSetupScreen = () => {
  const { t } = useTranslation();
  const {
    setName: setAuthName, setAge: setAuthAge, setGender: setAuthGender, setHometown: setAuthHometown,
    cancelRegistration, signupType, name: authName, age: authAge, gender: authGender,
  } = useAuth();
  const router = useRouter();
  const logoUrl = useLogoState();
  const theme = useContext(ThemeContext)?.theme || 'light';

  const GENDERS = [
    { key: 'male', label: t('signup.gender_male'), icon: 'gender-male' },
    { key: 'female', label: t('signup.gender_female'), icon: 'gender-female' },
    { key: 'other', label: t('signup.gender_other'), icon: 'gender-non-binary' },
  ];

  const [displayName, setDisplayName] = useState(authName || '');
  const [selectedGender, setSelectedGender] = useState(authGender || '');
  const [birthDate, setBirthDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 20);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateChosen, setDateChosen] = useState(false);
  const [hometown, setHometown] = useState('');
  const [showProvinceModal, setShowProvinceModal] = useState(false);
  const [provinceSearch, setProvinceSearch] = useState('');

  const stepInfo = useMemo(() => {
    if (signupType === 'google') return { current: 2, total: 3 };
    return { current: 3, total: 4 };
  }, [signupType]);

  const filteredProvinces = useMemo(() => {
    const q = provinceSearch.trim().toLowerCase();
    if (!q) return VIETNAM_PROVINCES;
    return VIETNAM_PROVINCES.filter(p => p.toLowerCase().includes(q));
  }, [provinceSearch]);

  const calculateAge = useCallback((date) => {
    const today = new Date();
    let a = today.getFullYear() - date.getFullYear();
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) a--;
    return a;
  }, []);

  const handleNext = useCallback(() => {
    if (!displayName.trim()) {
      Alert.alert(t('common.info', { defaultValue: 'Thông báo' }), t('signup.name_required', { defaultValue: 'Vui lòng nhập tên của bạn' }));
      return;
    }
    if (!dateChosen) {
      Alert.alert(t('common.info', { defaultValue: 'Thông báo' }), t('signup.age_required', { defaultValue: 'Vui lòng chọn ngày sinh' }));
      return;
    }
    const userAge = calculateAge(birthDate);
    if (userAge < 18) {
      Alert.alert(t('common.info', { defaultValue: 'Thông báo' }), t('signup.age_error', { defaultValue: 'Bạn phải đủ 18 tuổi để sử dụng ứng dụng' }));
      return;
    }
    if (!selectedGender) {
      Alert.alert(t('common.info', { defaultValue: 'Thông báo' }), t('signup.gender_required', { defaultValue: 'Vui lòng chọn giới tính' }));
      return;
    }

    setAuthName(displayName.trim());
    setAuthAge(birthDate.toISOString());
    setAuthGender(selectedGender);
    setAuthHometown(hometown);

    router.push('/signup/IconSelectionScreen');
  }, [displayName, dateChosen, birthDate, selectedGender, calculateAge, setAuthName, setAuthAge, setAuthGender, setAuthHometown, router, t]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      t('signup.cancel_title', { defaultValue: 'Hủy đăng ký' }),
      t('signup.cancel_message', { defaultValue: 'Bạn có chắc chắn muốn hủy quá trình đăng ký?' }),
      [
        { text: t('common.no', { defaultValue: 'Không' }), style: 'cancel' },
        { text: t('signup.cancel_confirm', { defaultValue: 'Hủy' }), style: 'destructive', onPress: async () => { try { await cancelRegistration({ deleteAccount: true, navigateTo: '/signin' }); } catch (_) {} } },
      ]
    );
  }, [cancelRegistration, t]);

  const onDateChange = (event, selected) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) {
      setBirthDate(selected);
      setDateChosen(true);
    }
  };

  const formatDate = (d) => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

  return (
    <ImageBackground source={require('../../assets/images/cover.webp')} style={s.bg} resizeMode="cover">
      <View style={s.dim} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, width: '100%' }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.logoBox}>
            <Image source={require('@/assets/images/logo.png')} style={s.logo} contentFit="contain" />
            <Text style={s.brand}>{t('signup.email_brand')}</Text>
          </View>

          <View style={s.outerCard}>
            <LinearGradient colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.02)']} style={s.border}>
              <View style={s.inner}>
                <ProgressIndicator currentStep={stepInfo.current} totalSteps={stepInfo.total} signupType={signupType || 'email'} />

                <Text style={s.title}>{t('signup.profile_title', { defaultValue: 'Thông tin cá nhân' })}</Text>
                <Text style={s.subtitle}>{t('signup.profile_subtitle', { defaultValue: 'Cho chúng tôi biết thêm về bạn nhé!' })}</Text>

                <View style={s.form}>
                  {/* Name */}
                  <TextInput
                    placeholder={t('signup.name_label', { defaultValue: 'Tên hiển thị' })}
                    value={displayName}
                    onChangeText={setDisplayName}
                    style={s.input}
                    mode="outlined"
                    textColor="#fff"
                    left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="account-outline" size={20} color="rgba(255,255,255,0.6)" />} />}
                    theme={{ colors: { primary: '#FB7185', text: '#fff', placeholder: 'rgba(255,255,255,0.4)', outline: 'rgba(255,255,255,0.1)' } }}
                  />

                  {/* Date of Birth */}
                  <TouchableOpacity style={s.pickerBtn} onPress={() => setShowDatePicker(true)}>
                    <MaterialCommunityIcons name="calendar-month-outline" size={20} color="rgba(255,255,255,0.6)" />
                    <Text style={[s.pickerText, dateChosen && { color: '#FFF' }]}>
                      {dateChosen ? formatDate(birthDate) : t('signup.dob_placeholder', { defaultValue: 'Chọn ngày sinh' })}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={birthDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      maximumDate={new Date()}
                      minimumDate={new Date(1940, 0, 1)}
                      onChange={onDateChange}
                      textColor="#FFF"
                      themeVariant="dark"
                    />
                  )}

                  {/* Gender */}
                  <View style={s.genderRow}>
                    {GENDERS.map(g => (
                      <TouchableOpacity
                        key={g.key}
                        style={[s.genderBtn, selectedGender === g.key && { borderColor: '#FB7185', backgroundColor: 'rgba(251,113,133,0.15)' }]}
                        onPress={() => { setSelectedGender(g.key); setAuthGender(g.key); }}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons name={g.icon} size={22} color={selectedGender === g.key ? '#FB7185' : 'rgba(255,255,255,0.5)'} />
                        <Text style={[s.genderLabel, selectedGender === g.key && { color: '#FB7185' }]}>{g.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Hometown (Province) */}
                  <TouchableOpacity style={s.pickerBtn} onPress={() => setShowProvinceModal(true)}>
                    <MaterialCommunityIcons name="map-marker-outline" size={20} color="rgba(255,255,255,0.6)" />
                    <Text style={[s.pickerText, hometown && { color: '#FFF' }]}>
                      {hometown || t('signup.hometown_placeholder', { defaultValue: 'Chọn quê quán (Tùy chọn)' })}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>
                </View>

                {/* Buttons */}
                <View style={s.btnRow}>
                  <TouchableOpacity onPress={handleCancel} style={s.cancelBtn}>
                    <Text style={s.cancelText}>{t('signup.cancel_confirm', { defaultValue: 'Hủy' })}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleNext} style={s.nextBtn} activeOpacity={0.88}>
                    <LinearGradient colors={['#FB7185', '#E11D48']} style={s.nextGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <Text style={s.nextText}>{t('common.next', { defaultValue: 'Tiếp tục' })}</Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFF" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Province Picker Modal */}
      <Modal visible={showProvinceModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{t('signup.hometown_title', { defaultValue: 'Chọn tỉnh/thành' })}</Text>
              <TouchableOpacity onPress={() => { setShowProvinceModal(false); setProvinceSearch(''); }}>
                <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>
            <View style={s.modalSearch}>
              <Ionicons name="search" size={18} color="rgba(255,255,255,0.4)" />
              <RNTextInput
                style={s.modalSearchInput}
                placeholder={t('signup.search_province', { defaultValue: 'Tìm tỉnh thành...' })}
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={provinceSearch}
                onChangeText={setProvinceSearch}
              />
            </View>
            <FlatList
              data={filteredProvinces}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.provinceItem, hometown === item && { backgroundColor: 'rgba(251,113,133,0.15)' }]}
                  onPress={() => { setHometown(item); setShowProvinceModal(false); setProvinceSearch(''); }}
                >
                  <Text style={[s.provinceText, hometown === item && { color: '#FB7185', fontWeight: '800' }]}>{item}</Text>
                  {hometown === item && <Ionicons name="checkmark-circle" size={20} color="#FB7185" />}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
};

const s = StyleSheet.create({
  bg: { flex: 1 },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 40 },
  logoBox: { alignItems: 'center', marginBottom: 20 },
  logo: { width: 72, height: 72 },
  brand: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '900', letterSpacing: 3, marginTop: 6 },
  outerCard: { borderRadius: 32, overflow: 'hidden' },
  border: { borderRadius: 32, padding: 1.5 },
  inner: { backgroundColor: 'rgba(15,23,42,0.88)', borderRadius: 30, padding: 20 },
  title: { color: '#FFF', fontSize: 22, fontWeight: '900', marginTop: 16, marginBottom: 4 },
  subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600', marginBottom: 20 },
  form: { gap: 14 },
  input: { backgroundColor: 'transparent', fontSize: 15 },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', height: 52,
    borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14, gap: 10,
  },
  pickerText: { flex: 1, color: 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: '500' },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', gap: 6,
  },
  genderLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '700' },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  cancelText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '700' },
  nextBtn: { borderRadius: 22, overflow: 'hidden' },
  nextGrad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 28, paddingVertical: 14, gap: 8 },
  nextText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  // Province Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#1E293B', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '70%', paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  modalSearch: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 10, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, gap: 8 },
  modalSearchInput: { flex: 1, color: '#FFF', fontSize: 14, fontWeight: '600', padding: 0 },
  provinceItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  provinceText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600' },
});

export default ProfileSetupScreen;
