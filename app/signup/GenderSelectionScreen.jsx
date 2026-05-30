import React, { useState, useContext, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { useLogoState } from '@/context/LogoStateContext';
import { Colors } from '@/constants/Colors';
import { ThemeContext } from '@/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import ProgressIndicator from '@/components/signup/ProgressIndicator';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
const GenderSelectionScreen = () => {
  const { t } = useTranslation();
  const { setGender, cancelRegistration, signupType } = useAuth();
  const router = useRouter();
  const logoUrl = useLogoState();
  const [selectedGender, setSelectedGender] = useState(null);

  const theme = useContext(ThemeContext)?.theme || 'light';
  const currentThemeColors = Colors.dark;

  // Dynamic step calculation
  const stepInfo = useMemo(() => {
    if (signupType === 'google') {
      return { current: 2, total: 5 };
    }
    return { current: 4, total: 7 };
  }, [signupType]);

  const handleSelectGender = useCallback((gender) => {
    setSelectedGender(gender);
    setGender(gender);
  }, [setGender]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      t('signup.cancel_registration'),
      t('signup.cancel_message'),
      [
        { text: t('common.no'), style: 'cancel' },
        { text: t('signup.cancel_confirm'), style: 'destructive', onPress: async () => { try { await cancelRegistration({ deleteAccount: true, navigateTo: '/signin' }); } catch (_) { } } },
      ]
    );
  }, [cancelRegistration, t]);

  const isNextButtonDisabled = !selectedGender;

  const handleNext = useCallback(() => {
    if (!isNextButtonDisabled) {
      router.push('/signup/NameInputScreen');
    }
  }, [isNextButtonDisabled, router]);

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

                <Text style={styles.title}>{t('signup.gender_title')}</Text>
                <Text style={styles.subtitle}>{t('signup.gender_subtitle')}</Text>

                <View style={styles.genderRow}>
                  <TouchableOpacity
                    style={[
                      styles.genderOption,
                      selectedGender === 'male' && styles.genderOptionActive
                    ]}
                    onPress={() => handleSelectGender('male')}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={selectedGender === 'male' ? ['#E91E63', '#FB7185'] : ['transparent', 'transparent']}
                      style={styles.genderGrad}
                    >
                      <MaterialCommunityIcons 
                        name="human-male" 
                        size={32} 
                        color={selectedGender === 'male' ? '#fff' : 'rgba(255,255,255,0.4)'} 
                      />
                      <Text style={[styles.genderText, selectedGender === 'male' && styles.genderTextActive]}>
                        {t('signup.male')}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.genderOption,
                      selectedGender === 'female' && styles.genderOptionActive
                    ]}
                    onPress={() => handleSelectGender('female')}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={selectedGender === 'female' ? ['#E91E63', '#FB7185'] : ['transparent', 'transparent']}
                      style={styles.genderGrad}
                    >
                      <MaterialCommunityIcons 
                        name="human-female" 
                        size={32} 
                        color={selectedGender === 'female' ? '#fff' : 'rgba(255,255,255,0.4)'} 
                      />
                      <Text style={[styles.genderText, selectedGender === 'female' && styles.genderTextActive]}>
                        {t('signup.female')}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={styles.btnPrimary} 
                  activeOpacity={0.85} 
                  onPress={handleNext} 
                  disabled={!selectedGender}
                >
                  <LinearGradient 
                    colors={!selectedGender ? ['#475569', '#334155'] : ['#E91E63', '#FB7185']} 
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
  genderRow: { flexDirection: 'row', gap: 15, marginBottom: 35 },
  genderOption: { flex: 1, height: 110, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' },
  genderOptionActive: { borderColor: '#FB7185', shadowColor: '#FB7185', shadowOpacity: 0.3, shadowRadius: 10 },
  genderGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  genderText: { marginTop: 8, fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  genderTextActive: { color: '#fff' },
  btnPrimary: { borderRadius: 30, overflow: 'hidden', height: 58, shadowColor: '#FB7185', shadowOpacity: 0.4, shadowRadius: 15, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  btnPrimaryGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
  btnPrimaryText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },
  btnIcon: { marginLeft: 10 },
  cancelBtn: { marginTop: 20, alignItems: 'center' },
  cancelText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textDecorationLine: 'underline' },
});

export default GenderSelectionScreen;
