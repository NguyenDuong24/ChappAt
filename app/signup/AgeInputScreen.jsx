import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { useLogoState } from '@/context/LogoStateContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/Colors';
import {convertToAge} from '../../utils/common'
const AgeInputScreen = () => {
  const { setAge } = useAuth();
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
      console.log(12345, convertToAge(currentDate))
    }
  };

  const handleNext = () => {
    if (errorMessage === '' && date <= new Date()) {
      router.push('signup/IconSelectionScreen');
    }
  };

  const isButtonEnabled = formattedDate !== 'dd/mm/yyyy' && errorMessage === '';

  return (
    <ImageBackground 
      source={require('../../assets/images/cover.png')} 
      style={styles.background} 
      resizeMode="cover"
    >
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
          activeOpacity={0.8}
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
        >
          <Text style={styles.nextButtonText}>Next</Text>
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
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    color: Colors.gray,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  dateInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginVertical: 20,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  enabledButton: {
    backgroundColor: Colors.primary,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  nextButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AgeInputScreen;
