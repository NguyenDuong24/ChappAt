import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { useLogoState } from '@/context/LogoStateContext';
import { Colors } from '@/constants/Colors';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import ProgressIndicator from '@/components/signup/ProgressIndicator';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
const AgeInputScreen = () => {
  const { t } = useTranslation();
  const { setAge: setAuthAge, cancelRegistration, signupType } = useAuth();
  const router = useRouter();
  const logoUrl = useLogoState();
  const [date, setDate] = useState(new Date(2000, 0, 1));
  const [show, setShow] = useState(false);

  // Dynamic step calculation
  const stepInfo = useMemo(() => {
    if (signupType === 'google') {
      return { current: 1, total: 5 };
    }
    return { current: 3, total: 7 };
  }, [signupType]);

  const onChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShow(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const handleNext = useCallback(() => {
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
      age--;
    }

    if (age < 18) {
      Alert.alert(t('signup.age_limit_title'), t('signup.age_limit_message'));
      return;
    }

    setAuthAge(date);
    router.push('/signup/IconSelectionScreen');
  }, [date, router, setAuthAge, t]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      t('signup.cancel_title'),
      t('signup.cancel_message'),
      [
        { text: t('common.no'), style: 'cancel' },
        { text: t('signup.cancel_confirm'), style: 'destructive', onPress: async () => { try { await cancelRegistration({ deleteAccount: true, navigateTo: '/signin' }); } catch (_) { } } },
      ]
    );
  }, [cancelRegistration, t]);

  return (
    <ImageBackground
      source={require('../../assets/images/cover.webp')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.dim} />

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image source={require('@/assets/images/logo.png')} style={styles.mainLogo} contentFit="contain" />
          <Text style={styles.brandSubtitle}>{t('signup.brand_subtitle')}</Text>
        </View>

        <View style={styles.outerCard}>
          <LinearGradient colors={["rgba(255,255,255,0.15)", "rgba(255,255,255,0.02)"]} style={styles.borderLayer}>
            <View style={styles.blurWrap}>
              <View style={styles.inner}>
                <ProgressIndicator
                  currentStep={stepInfo.current}
                  totalSteps={stepInfo.total}
                  signupType={signupType || 'email'}
                />

                <Text style={styles.title}>{t('signup.age_title')}</Text>
                <Text style={styles.subtitle}>{t('signup.age_subtitle')}</Text>

                <View style={styles.form}>
                  <TouchableOpacity onPress={() => setShow(true)} style={styles.dateSelector}>
                    <MaterialCommunityIcons name="calendar-heart" size={24} color="#FB7185" />
                    <View style={styles.dateLabelWrap}>
                      <Text style={styles.dateLabel}>{t('signup.age_label')}</Text>
                      <Text style={styles.dateValue}>{date.toLocaleDateString('vi-VN')}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(255,255,255,0.3)" />
                  </TouchableOpacity>

                  {show && (
                    <DateTimePicker
                      testID="dateTimePicker"
                      value={date}
                      mode="date"
                      display="spinner"
                      onChange={onChange}
                      maximumDate={new Date()}
                      themeVariant="dark"
                    />
                  )}

                  <TouchableOpacity 
                    style={styles.btnPrimary} 
                    activeOpacity={0.85} 
                    onPress={handleNext} 
                  >
                    <LinearGradient 
                      colors={['#E91E63', '#FB7185']} 
                      start={{ x: 0, y: 0 }} 
                      end={{ x: 1, y: 0 }} 
                      style={styles.btnPrimaryGrad}
                    >
                      <View style={styles.btnContent}>
                        <Text style={styles.btnPrimaryText}>{t('common.next')}</Text>
                        <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" style={styles.btnIcon} />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
                    <Text style={styles.cancelText}>{t('signup.cancel_registration')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, width: '100%' },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,7,12,0.45)' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  mainLogo: { width: 140, height: 80 },
  brandSubtitle: { fontSize: 11, color: '#fff', letterSpacing: 4, marginTop: 5, fontWeight: '500', opacity: 0.8 },
  outerCard: { width: '92%', maxWidth: 400 },
  borderLayer: { borderRadius: 32, padding: 1 },
  blurWrap: { borderRadius: 31, overflow: 'hidden', backgroundColor: 'rgba(28, 22, 34, 0.85)' },
  inner: { paddingVertical: 35, paddingHorizontal: 25 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center', marginTop: 10 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 8, marginBottom: 30, textAlign: 'center', lineHeight: 18 },
  form: { width: '100%' },
  dateSelector: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    padding: 16, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 30
  },
  dateLabelWrap: { flex: 1, marginLeft: 15 },
  dateLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 2 },
  dateValue: { fontSize: 16, color: '#fff', fontWeight: '600' },
  btnPrimary: { borderRadius: 30, overflow: 'hidden', height: 58, shadowColor: '#FB7185', shadowOpacity: 0.4, shadowRadius: 15, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  btnPrimaryGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
  btnPrimaryText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },
  btnIcon: { marginLeft: 10 },
  cancelBtn: { marginTop: 20, alignItems: 'center' },
  cancelText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textDecorationLine: 'underline' },
});

export default AgeInputScreen;
