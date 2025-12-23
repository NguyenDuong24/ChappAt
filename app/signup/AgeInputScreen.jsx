import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ImageBackground, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { useLogoState } from '@/context/LogoStateContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/Colors';
import { convertToAge } from '../../utils/common';
import { LinearGradient } from 'expo-linear-gradient';
import ProgressIndicator from '@/components/signup/ProgressIndicator';
import { useTranslation } from 'react-i18next';

const MIN_AGE = 18;

const AgeInputScreen = () => {
  const { t } = useTranslation();
  const { setAge, cancelRegistration, signupType } = useAuth();
  const router = useRouter();
  const logoUrl = useLogoState();

  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [formattedDate, setFormattedDate] = useState('dd/mm/yyyy');
  const [errorMessage, setErrorMessage] = useState('');

  // Dynamic step calculation
  const stepInfo = useMemo(() => {
    if (signupType === 'google') {
      return { current: 3, total: 4 };
    }
    return { current: 5, total: 6 };
  }, [signupType]);

  const calculateAge = useCallback((birthDate) => {
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      years--;
    }
    return years;
  }, []);

  const handleDateChange = useCallback((event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowPicker(false);
    setDate(currentDate);
    setFormattedDate(currentDate.toLocaleDateString('en-GB'));

    const today = new Date();
    if (currentDate > today) {
      setErrorMessage(t('signup.age_error_future'));
      setFormattedDate('dd/mm/yyyy');
    } else {
      const userAge = calculateAge(currentDate);
      if (userAge < MIN_AGE) {
        setErrorMessage(t('signup.age_error_min', { minAge: MIN_AGE }));
      } else {
        setErrorMessage('');
        setAge(currentDate);
      }
    }
  }, [date, calculateAge, setAge, t]);

  const handleNext = useCallback(() => {
    if (errorMessage === '' && date <= new Date()) {
      const userAge = calculateAge(date);
      if (userAge >= MIN_AGE) {
        router.push('/signup/IconSelectionScreen');
      }
    }
  }, [errorMessage, date, calculateAge, router]);

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

  const isButtonEnabled = formattedDate !== 'dd/mm/yyyy' && errorMessage === '';

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
          <Image source={{ uri: logoUrl }} style={styles.logo} />
        ) : (
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        )}
        <Text style={styles.title}>{t('signup.age_title')}</Text>
        <Text style={styles.subtitle}>{t('signup.age_subtitle', { minAge: MIN_AGE })}</Text>

        <TouchableOpacity
          style={styles.dateInput}
          onPress={() => setShowPicker(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.dateText}>
            {formattedDate}
          </Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.nextButton, isButtonEnabled ? styles.enabledButton : styles.disabledButton]}
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
    color: Colors.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 24,
  },
  dateInput: {
    backgroundColor: Colors.dark.cardBackground,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginVertical: 20,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.inputBorder,
  },
  dateText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  errorText: {
    color: Colors.error,
    fontSize: 16,
    marginVertical: 10,
  },
  nextButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    width: '100%',
  },
  enabledButton: {
    backgroundColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#475569',
  },
  nextButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AgeInputScreen;
