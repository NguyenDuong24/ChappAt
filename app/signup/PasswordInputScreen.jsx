import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ImageBackground, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { Colors } from '@/constants/Colors';
import { useLogoState } from '@/context/LogoStateContext';
import { LinearGradient } from 'expo-linear-gradient';
import ProgressIndicator from '@/components/signup/ProgressIndicator';
import { useTranslation } from 'react-i18next';

const PasswordInputScreen = () => {
  const { t } = useTranslation();
  const { setPassword, cancelRegistration } = useAuth();
  const router = useRouter();
  const logoUrl = useLogoState();

  const [password, setPasswordInput] = useState('');
  const [confirmPassword, setConfirmPasswordInput] = useState('');
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const validatePassword = useCallback((pass, confirm) => {
    if (pass.length < 6) {
      setPasswordError(t('signup.password_error_min'));
      return false;
    }
    if (pass !== confirm) {
      setPasswordError(t('signup.password_error_mismatch'));
      return false;
    }
    setPasswordError('');
    return true;
  }, [t]);

  const handlePasswordChange = useCallback((input) => {
    setPasswordInput(input);
    const isValid = input.length >= 6 && input === confirmPassword;
    setIsButtonEnabled(isValid);
    if (input.length > 0 || confirmPassword.length > 0) {
      validatePassword(input, confirmPassword);
    }
  }, [confirmPassword, validatePassword]);

  const handleConfirmPasswordChange = useCallback((input) => {
    setConfirmPasswordInput(input);
    const isValid = password.length >= 6 && password === input;
    setIsButtonEnabled(isValid);
    if (password.length > 0 || input.length > 0) {
      validatePassword(password, input);
    }
  }, [password, validatePassword]);

  const handleNext = useCallback(() => {
    if (!validatePassword(password, confirmPassword)) {
      return;
    }
    setPassword(password);
    // Navigate to GenderSelectionScreen (Step 3)
    router.push('/signup/GenderSelectionScreen');
  }, [password, confirmPassword, setPassword, router, validatePassword]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      t('signup.cancel_title'),
      t('signup.cancel_message'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('common.cancel'),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelRegistration({ deleteAccount: false, navigateTo: '/signin' });
            } catch (_) { }
          }
        },
      ]
    );
  }, [cancelRegistration, t]);

  return (
    <ImageBackground
      source={require('../../assets/images/cover.png')}
      style={styles.backgroundImage}
    >
      <LinearGradient colors={['rgba(15,23,42,0.85)', 'rgba(15,23,42,0.65)']} style={styles.backdrop} />

      <View style={styles.overlay}>
        <ProgressIndicator currentStep={2} totalSteps={6} signupType="email" />

        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logo} />
        ) : (
          <Text style={{ color: Colors.dark.text }}>{t('common.loading')}</Text>
        )}

        <Text style={[styles.title, { color: Colors.dark.text }]}>{t('signup.password_title')}</Text>
        <Text style={styles.subtitle}>{t('signup.password_subtitle')}</Text>

        <TextInput
          style={[styles.input, { backgroundColor: Colors.dark.inputBackground, borderColor: Colors.dark.inputBorder, color: Colors.dark.text }]}
          placeholder={t('signup.password_placeholder')}
          placeholderTextColor={Colors.dark.placeholderText}
          secureTextEntry
          value={password}
          onChangeText={handlePasswordChange}
        />

        <TextInput
          style={[styles.input, { backgroundColor: Colors.dark.inputBackground, borderColor: Colors.dark.inputBorder, color: Colors.dark.text }]}
          placeholder={t('signup.password_confirm_placeholder')}
          placeholderTextColor={Colors.dark.placeholderText}
          secureTextEntry
          value={confirmPassword}
          onChangeText={handleConfirmPasswordChange}
        />

        {passwordError ? (
          <Text style={styles.errorText}>{passwordError}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.nextButton, !isButtonEnabled && styles.disabledButton, { backgroundColor: Colors.dark.tint }]}
          onPress={handleNext}
          disabled={!isButtonEnabled}
          activeOpacity={0.85}
        >
          <Text style={styles.nextButtonText}>{t('common.next')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleCancel} style={{ marginTop: 14 }}>
          <Text style={{ color: '#ffd1d1', textDecorationLine: 'underline' }}>{t('signup.cancel_registration')}</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    backgroundColor: 'transparent',
    width: '100%',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    padding: 15,
    borderWidth: 1,
    borderRadius: 25,
    marginBottom: 16,
    fontSize: 18,
    fontWeight: '500',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  nextButton: {
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    width: '100%',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#475569',
  },
});

export default PasswordInputScreen;

