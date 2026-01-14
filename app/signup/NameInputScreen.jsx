import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { useLogoState } from '@/context/LogoStateContext';
import { Colors } from '@/constants/Colors';
import { TextInput } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import ProgressIndicator from '@/components/signup/ProgressIndicator';
import { useTranslation } from 'react-i18next';

const NameInputScreen = () => {
  const { t } = useTranslation();
  const { setName: setAuthName, cancelRegistration, signupType } = useAuth();
  const router = useRouter();
  const logoUrl = useLogoState();
  const [name, setName] = useState('');

  // Dynamic step calculation
  const stepInfo = useMemo(() => {
    if (signupType === 'google') {
      return { current: 2, total: 4 };
    }
    return { current: 4, total: 6 };
  }, [signupType]);

  const handleNext = useCallback(() => {
    if (name.trim().length < 2) {
      Alert.alert(t('signup.invalid_name_title'), t('signup.invalid_name_message'));
      return;
    }
    setAuthName(name.trim());
    router.push('/signup/IconSelectionScreen');
  }, [name, router, setAuthName, t]);

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
      source={require('../../assets/images/cover.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <LinearGradient colors={['rgba(15,23,42,0.85)', 'rgba(15,23,42,0.65)']} style={styles.backdrop} />

      <View style={styles.container}>
        <ProgressIndicator
          currentStep={stepInfo.current}
          totalSteps={stepInfo.total}
          signupType={signupType || 'email'}
        />

        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logo} contentFit="contain" />
        ) : (
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        )}
        <Text style={styles.title}>{t('signup.name_title')}</Text>
        <TextInput
          label={t('signup.name_label')}
          value={name}
          onChangeText={setName}
          style={styles.input}
          mode="outlined"
          theme={{ colors: { primary: Colors.primary, text: 'white', placeholder: 'rgba(255,255,255,0.7)' } }}
          textColor="white"
        />
        <TouchableOpacity
          style={[styles.nextButton, !name && styles.disabledButton]}
          onPress={handleNext}
          disabled={!name}
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
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'transparent',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    color: 'white',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
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
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default NameInputScreen;
