import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ImageBackground, Alert,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
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

const EmailInputScreen = () => {
  const { t } = useTranslation();
  const { setEmail: setAuthEmail, setPassword: setAuthPassword, signUpWithEmail, cancelRegistration, signupType } = useAuth();
  const router = useRouter();
  const logoUrl = useLogoState();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const stepInfo = useMemo(() => {
    if (signupType === 'google') return { current: 1, total: 3 };
    return { current: 1, total: 4 };
  }, [signupType]);

  const handleNext = useCallback(async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert(t('signup.invalid_email_title', { defaultValue: 'Email không hợp lệ' }), t('signup.invalid_email_message', { defaultValue: 'Vui lòng nhập địa chỉ email hợp lệ' }));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('signup.invalid_password_title', { defaultValue: 'Mật khẩu yếu' }), t('signup.invalid_password_message', { defaultValue: 'Mật khẩu cần ít nhất 6 ký tự' }));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('signup.password_mismatch_title', { defaultValue: 'Không khớp' }), t('signup.password_mismatch_message', { defaultValue: 'Mật khẩu xác nhận không khớp' }));
      return;
    }

    setLoading(true);
    try {
      setAuthEmail(email);
      setAuthPassword(password);
      const response = await signUpWithEmail(email, password);
      if (!response?.success) {
        Alert.alert(t('common.error', { defaultValue: 'Lỗi' }), response?.msg || t('signup.create_account_error', { defaultValue: 'Không thể tạo tài khoản' }));
        return;
      }
      router.push('/signup/EmailVerificationScreen');
    } catch (error) {
      Alert.alert(t('common.error', { defaultValue: 'Lỗi' }), t('signup.create_account_error', { defaultValue: 'Không thể tạo tài khoản' }));
    } finally {
      setLoading(false);
    }
  }, [email, password, confirmPassword, router, setAuthEmail, setAuthPassword, signUpWithEmail, t]);

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

  const inputTheme = { colors: { primary: '#FB7185', text: '#fff', placeholder: 'rgba(255,255,255,0.4)', outline: 'rgba(255,255,255,0.1)' } };

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

                <Text style={s.title}>{t('signup.create_account_title', { defaultValue: 'Tạo tài khoản' })}</Text>
                <Text style={s.subtitle}>{t('signup.create_account_subtitle', { defaultValue: 'Nhập email và mật khẩu để bắt đầu' })}</Text>

                <View style={s.form}>
                  <TextInput
                    placeholder={t('signup.email_label', { defaultValue: 'Email' })}
                    value={email}
                    onChangeText={setEmail}
                    style={s.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    mode="outlined"
                    textColor="#fff"
                    left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="email-outline" size={20} color="rgba(255,255,255,0.6)" />} />}
                    theme={inputTheme}
                  />

                  <TextInput
                    placeholder={t('signup.password_label', { defaultValue: 'Mật khẩu' })}
                    value={password}
                    onChangeText={setPassword}
                    style={s.input}
                    secureTextEntry={!showPassword}
                    mode="outlined"
                    textColor="#fff"
                    left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="lock-outline" size={20} color="rgba(255,255,255,0.6)" />} />}
                    right={<TextInput.Icon icon={() => <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="rgba(255,255,255,0.5)" />} onPress={() => setShowPassword(v => !v)} />}
                    theme={inputTheme}
                  />

                  <TextInput
                    placeholder={t('signup.confirm_password_label', { defaultValue: 'Xác nhận mật khẩu' })}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    style={s.input}
                    secureTextEntry={!showPassword}
                    mode="outlined"
                    textColor="#fff"
                    left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="lock-check-outline" size={20} color="rgba(255,255,255,0.6)" />} />}
                    theme={inputTheme}
                  />
                </View>

                <View style={s.btnRow}>
                  <TouchableOpacity onPress={handleCancel} style={s.cancelBtn}>
                    <Text style={s.cancelText}>{t('signup.cancel_confirm', { defaultValue: 'Hủy' })}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleNext} disabled={loading} style={s.nextBtn} activeOpacity={0.88}>
                    <LinearGradient colors={['#FB7185', '#E11D48']} style={s.nextGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      {loading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <>
                          <Text style={s.nextText}>{t('common.next', { defaultValue: 'Tiếp tục' })}</Text>
                          <Ionicons name="arrow-forward" size={18} color="#FFF" />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <View style={s.loginRow}>
                  <Text style={s.loginHint}>{t('signup.have_account', { defaultValue: 'Đã có tài khoản?' })}</Text>
                  <TouchableOpacity onPress={() => router.push('/signin')}>
                    <Text style={s.loginLink}>{t('signup.login_now', { defaultValue: ' Đăng nhập ngay' })}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  form: { gap: 12 },
  input: { backgroundColor: 'transparent', fontSize: 15 },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  cancelText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '700' },
  nextBtn: { borderRadius: 22, overflow: 'hidden' },
  nextGrad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 28, paddingVertical: 14, gap: 8 },
  nextText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18, gap: 2 },
  loginHint: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
  loginLink: { color: '#FB7185', fontSize: 13, fontWeight: '800' },
});

export default EmailInputScreen;
