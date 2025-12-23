import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ImageBackground, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { useLogoState } from '@/context/LogoStateContext';
import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import ProgressIndicator from '@/components/signup/ProgressIndicator';

const EmailInputScreen = () => {
  const { setEmail, setSignupType, cancelRegistration } = useAuth();
  const router = useRouter();
  const logoUrl = useLogoState();

  const [email, setEmailInput] = useState('');
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);

  const handleEmailChange = useCallback((input) => {
    setEmailInput(input);
    setIsButtonEnabled(validateEmail(input));
  }, []);

  const validateEmail = (emailStr) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr);
  };

  const handleNext = useCallback(() => {
    setEmail(email);
    setSignupType('email');
    router.push('/signup/PasswordInputScreen');
  }, [email, setEmail, setSignupType, router]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      'Huỷ đăng ký?',
      'Bạn có chắc muốn huỷ đăng ký?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Huỷ',
          style: 'destructive',
          onPress: async () => { try { await cancelRegistration({ deleteAccount: false, navigateTo: '/signin' }); } catch (_) { } },
        },
      ]
    );
  }, [cancelRegistration]);

  return (
    <ImageBackground
      source={require('../../assets/images/cover.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <LinearGradient colors={['rgba(15,23,42,0.85)', 'rgba(15,23,42,0.65)']} style={styles.backdrop} />

      <View style={styles.container}>
        <ProgressIndicator currentStep={1} totalSteps={6} signupType="email" />

        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logo} />
        ) : (
          <Text style={styles.loadingText}>Loading...</Text>
        )}
        <Text style={styles.title}>Nhập Email của bạn</Text>
        <Text style={styles.subtitle}>Email sẽ được dùng để đăng nhập</Text>

        <TextInput
          style={[styles.input, { color: Colors.dark.text, borderColor: Colors.dark.inputBorder, backgroundColor: Colors.dark.inputBackground }]}
          placeholder="example@email.com"
          placeholderTextColor={Colors.dark.placeholderText}
          keyboardType="email-address"
          value={email}
          onChangeText={handleEmailChange}
          autoCapitalize="none"
          autoComplete="email"
        />
        <TouchableOpacity
          style={[styles.nextButton, !isButtonEnabled && styles.disabledButton]}
          onPress={handleNext}
          disabled={!isButtonEnabled}
          activeOpacity={0.85}
        >
          <Text style={styles.nextButtonText}>Tiếp theo</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Huỷ đăng ký</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'transparent',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    color: Colors.light.text,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    padding: 15,
    borderWidth: 1,
    borderRadius: 25,
    marginBottom: 20,
    fontSize: 18,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    width: '100%',
  },
  disabledButton: {
    backgroundColor: '#475569',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelBtn: { marginTop: 14 },
  cancelText: { color: '#ffd1d1', textDecorationLine: 'underline' },
});

export default EmailInputScreen;

