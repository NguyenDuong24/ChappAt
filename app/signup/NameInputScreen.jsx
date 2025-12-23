import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ImageBackground, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { useLogoState } from '@/context/LogoStateContext';
import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import ProgressIndicator from '@/components/signup/ProgressIndicator';
import { useTranslation } from 'react-i18next';

const NameInputScreen = () => {
  const { t } = useTranslation();
  const { setName, cancelRegistration, signupType } = useAuth();
  const [name, setLocalName] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const logoUrl = useLogoState();
  const currentThemeColors = Colors.dark;

  // Dynamic step calculation
  const stepInfo = useMemo(() => {
    if (signupType === 'google') {
      return { current: 2, total: 4 };
    }
    return { current: 4, total: 6 };
  }, [signupType]);

  const handleNameChange = useCallback((text) => {
    setLocalName(text);
    if (text.length > 0 && text.length < 2) {
      setError(t('signup.name_error'));
    } else {
      setError('');
    }
  }, [t]);

  const handleNext = useCallback(() => {
    if (name.length < 2) {
      setError(t('signup.name_error'));
      return;
    }
    setName(name);
    router.push('/signup/AgeInputScreen');
  }, [name, setName, router, t]);

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

  const isButtonDisabled = !name || name.length < 2;

  return (
    <ImageBackground
      source={require('../../assets/images/cover.png')}
      style={styles.backgroundImage}
    >
      <LinearGradient colors={['rgba(15,23,42,0.85)', 'rgba(15,23,42,0.65)']} style={styles.backdrop} />

      <View style={styles.overlay}>
        <ProgressIndicator
          currentStep={stepInfo.current}
          totalSteps={stepInfo.total}
          signupType={signupType || 'email'}
        />

        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logo} />
        ) : (
          <Text style={{ color: currentThemeColors.text }}>{t('common.loading')}</Text>
        )}

        <Text style={[styles.title, { color: currentThemeColors.text }]}>{t('signup.name_title')}</Text>
        <Text style={styles.subtitle}>{t('signup.name_subtitle')}</Text>

        <TextInput
          style={[
            styles.input,
            { backgroundColor: currentThemeColors.inputBackground, borderColor: currentThemeColors.inputBorder, color: currentThemeColors.text }
          ]}
          value={name}
          onChangeText={handleNameChange}
          placeholder={t('signup.name_placeholder')}
          placeholderTextColor={currentThemeColors.placeholderText}
          autoFocus
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.nextButton, isButtonDisabled && styles.disabledButton, { backgroundColor: currentThemeColors.tint }]}
          onPress={handleNext}
          disabled={isButtonDisabled}
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
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
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
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    padding: 15,
    borderWidth: 1,
    borderRadius: 25,
    marginBottom: 20,
    fontSize: 18,
    fontWeight: '500',
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

export default NameInputScreen;
