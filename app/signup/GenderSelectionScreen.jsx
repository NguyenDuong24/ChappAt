import React, { useState, useContext, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ImageBackground, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { useLogoState } from '@/context/LogoStateContext';
import { Colors } from '@/constants/Colors';
import { ThemeContext } from '@/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import ProgressIndicator from '@/components/signup/ProgressIndicator';
import { useTranslation } from 'react-i18next';

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
      return { current: 1, total: 4 };
    }
    return { current: 3, total: 6 };
  }, [signupType]);

  const handleSelectGender = useCallback((gender) => {
    setSelectedGender(gender);
    setGender(gender);
  }, [setGender]);

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

  const isNextButtonDisabled = !selectedGender;

  const handleNext = useCallback(() => {
    if (!isNextButtonDisabled) {
      router.push('/signup/NameInputScreen');
    }
  }, [isNextButtonDisabled, router]);

  return (
    <ImageBackground
      source={require('../../assets/images/cover.png')}
      style={styles.background}
      resizeMode="cover"
    >
      {/* Dark scrim to guarantee text contrast on any image */}
      <LinearGradient
        colors={['rgba(15,23,42,0.85)', 'rgba(15,23,42,0.65)']}
        style={styles.backdrop}
      />

      <View style={styles.container}>
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
        <Text style={[styles.title, { color: currentThemeColors.text }]}>{t('signup.gender_title')}</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              selectedGender === 'male' ? { backgroundColor: currentThemeColors.tint } : { backgroundColor: currentThemeColors.inputBackground },
            ]}
            onPress={() => handleSelectGender('male')}
            activeOpacity={0.85}
          >
            <Text style={[styles.buttonText, { color: currentThemeColors.text }]}>{t('signup.male')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              selectedGender === 'female' ? { backgroundColor: currentThemeColors.tint } : { backgroundColor: currentThemeColors.inputBackground },
            ]}
            onPress={() => handleSelectGender('female')}
            activeOpacity={0.85}
          >
            <Text style={[styles.buttonText, { color: currentThemeColors.text }]}>{t('signup.female')}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[
            styles.nextButton,
            isNextButtonDisabled ? styles.disabledButton : { backgroundColor: currentThemeColors.tint },
          ]}
          onPress={handleNext}
          disabled={isNextButtonDisabled}
          activeOpacity={0.85}
        >
          <Text style={[styles.nextButtonText, { color: currentThemeColors.text }]}>{t('common.next')}</Text>
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
    paddingHorizontal: 30,
    backgroundColor: 'transparent',
    width: '100%',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  nextButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 20,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: Colors.gray600,
  },
});

export default GenderSelectionScreen;
