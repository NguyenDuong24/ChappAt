import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
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
const PasswordInputScreen = () => {
  const { t } = useTranslation();
  const { email, setPassword: setAuthPassword, signUpWithEmail, cancelRegistration, signupType } = useAuth();
  const router = useRouter();
  const logoUrl = useLogoState();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Dynamic step calculation
  const stepInfo = useMemo(() => {
    if (signupType === 'google') {
      return { current: 1, total: 5 };
    }
    return { current: 2, total: 7 };
  }, [signupType]);

  const handleNext = useCallback(async () => {
    if (password.length < 6) {
      Alert.alert(t('signup.invalid_password_title'), t('signup.invalid_password_message'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('signup.password_mismatch_title'), t('signup.password_mismatch_message'));
      return;
    }
    if (signupType !== 'google' && !email) {
      Alert.alert(t('common.error'), t('signup.invalid_email_message'));
      router.replace('/signup/EmailInputScreen');
      return;
    }

    setLoading(true);
    try {
      setAuthPassword(password);
      if (signupType !== 'google') {
        const response = await signUpWithEmail(email, password);
        if (!response?.success) {
          Alert.alert(t('common.error'), response?.msg || t('signup.password_set_error'));
          return;
        }
      }
      router.push(signupType === 'google' ? '/signup/AgeInputScreen' : '/signup/EmailVerificationScreen');
    } catch (error) {
      Alert.alert(t('common.error'), t('signup.password_set_error'));
    } finally {
      setLoading(false);
    }
  }, [password, confirmPassword, email, router, setAuthPassword, signUpWithEmail, signupType, t]);

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

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1, width: '100%' }}
      >
        <ScrollView 
          contentContainerStyle={styles.scroll} 
          keyboardShouldPersistTaps='handled' 
          showsVerticalScrollIndicator={false}
        >
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

                  <Text style={styles.title}>{t('signup.password_title')}</Text>
                  <Text style={styles.subtitle}>{t('signup.password_subtitle')}</Text>

                  <View style={styles.form}>
                    <TextInput
                      placeholder={t('signup.password_label')}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      style={styles.input}
                      mode="outlined"
                      textColor="#fff"
                      left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="lock-outline" size={20} color="rgba(255,255,255,0.6)" />} />}
                      right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} forceTextInputFocus={false} color="rgba(255,255,255,0.6)" />}
                      theme={{ 
                        colors: { 
                          primary: '#FB7185', 
                          text: '#fff', 
                          placeholder: 'rgba(255,255,255,0.4)', 
                          outline: 'rgba(255,255,255,0.1)' 
                        } 
                      }}
                      outlineStyle={{ borderRadius: 18, borderWidth: 1 }}
                      placeholderTextColor="rgba(255,255,255,0.4)"
                    />

                    <TextInput
                      placeholder={t('signup.confirm_password_label')}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showPassword}
                      style={styles.input}
                      mode="outlined"
                      textColor="#fff"
                      left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="lock-check-outline" size={20} color="rgba(255,255,255,0.6)" />} />}
                      theme={{ 
                        colors: { 
                          primary: '#FB7185', 
                          text: '#fff', 
                          placeholder: 'rgba(255,255,255,0.4)', 
                          outline: 'rgba(255,255,255,0.1)' 
                        } 
                      }}
                      outlineStyle={{ borderRadius: 18, borderWidth: 1 }}
                      placeholderTextColor="rgba(255,255,255,0.4)"
                    />

                    <TouchableOpacity 
                      style={styles.btnPrimary} 
                      activeOpacity={0.85} 
                      onPress={handleNext} 
                      disabled={!password || !confirmPassword || loading}
                    >
                      <LinearGradient 
                        colors={(!password || !confirmPassword || loading) ? ['#475569', '#334155'] : ['#E91E63', '#FB7185']} 
                        start={{ x: 0, y: 0 }} 
                        end={{ x: 1, y: 0 }} 
                        style={styles.btnPrimaryGrad}
                      >
                        {loading ? <ActivityIndicator color="#fff" /> : (
                          <View style={styles.btnContent}>
                            <Text style={styles.btnPrimaryText}>{t('common.next')}</Text>
                            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" style={styles.btnIcon} />
                          </View>
                        )}
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
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, width: '100%' },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,7,12,0.45)' },
  scroll: { flexGrow: 1, alignItems: 'center', paddingVertical: 60 },
  logoContainer: { alignItems: 'center', marginBottom: 40, marginTop: 20 },
  mainLogo: { width: 140, height: 80 },
  brandSubtitle: { fontSize: 11, color: '#fff', letterSpacing: 4, marginTop: 5, fontWeight: '500', opacity: 0.8 },
  outerCard: { width: '92%', maxWidth: 400 },
  borderLayer: { borderRadius: 32, padding: 1 },
  blurWrap: { borderRadius: 31, overflow: 'hidden', backgroundColor: 'rgba(28, 22, 34, 0.85)' },
  inner: { paddingVertical: 35, paddingHorizontal: 25 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', textAlign: 'center', marginTop: 10 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 10, marginBottom: 30, textAlign: 'center', lineHeight: 20 },
  form: { width: '100%' },
  input: { marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.03)', height: 58 },
  btnPrimary: { borderRadius: 30, overflow: 'hidden', height: 58, shadowColor: '#FB7185', shadowOpacity: 0.4, shadowRadius: 15, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  btnPrimaryGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
  btnPrimaryText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },
  btnIcon: { marginLeft: 10 },
  cancelBtn: { marginTop: 20, alignItems: 'center' },
  cancelText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textDecorationLine: 'underline' },
});

export default PasswordInputScreen;
