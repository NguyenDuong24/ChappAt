import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ImageBackground, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { useLogoState } from '@/context/LogoStateContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/Colors';
import {convertToAge} from '../../utils/common'
import { LinearGradient } from 'expo-linear-gradient';

const AgeInputScreen = () => {
  const { setAge, cancelRegistration } = useAuth();
  const router = useRouter();
  const logoUrl = useLogoState();

  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [formattedDate, setFormattedDate] = useState('dd/mm/yyyy');
  const [errorMessage, setErrorMessage] = useState('');

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowPicker(false);
    setDate(currentDate);
    setFormattedDate(currentDate.toLocaleDateString('en-GB'));

    const today = new Date();
    if (currentDate > today) {
      setErrorMessage('Please select a date in the past.');
      setFormattedDate('dd/mm/yyyy');
    } else {
      setErrorMessage('');
      setAge(currentDate);
    }
  };

  const handleNext = () => {
    if (errorMessage === '' && date <= new Date()) {
      router.push('/signup/IconSelectionScreen');
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Huỷ đăng ký?',
      'Bạn có chắc muốn huỷ đăng ký và xoá tài khoản tạm thời (nếu có)?',
      [
        { text: 'Không', style: 'cancel' },
        { text: 'Huỷ & Xoá', style: 'destructive', onPress: async () => { try { await cancelRegistration({ deleteAccount: true, navigateTo: '/signin' }); } catch (_) {} } },
      ]
    );
  };

  const isButtonEnabled = formattedDate !== 'dd/mm/yyyy' && errorMessage === '';

  return (
    <ImageBackground 
      source={require('../../assets/images/cover.png')} 
      style={styles.background} 
      resizeMode="cover"
    >
      <LinearGradient colors={['rgba(15,23,42,0.85)','rgba(15,23,42,0.65)']} style={styles.backdrop} />

      <View style={styles.container}>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logo} />
        ) : (
          <Text style={styles.loadingText}>Loading...</Text>
        )}
        <Text style={styles.title}>Select Your Birthday</Text>

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
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleCancel} style={{ marginTop: 14 }}>
          <Text style={{ color: '#ffd1d1', textDecorationLine: 'underline' }}>Huỷ đăng ký</Text>
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
    color: Colors.light.text,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 20,
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
