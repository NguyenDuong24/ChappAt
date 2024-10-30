import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Animated, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext'; // Import the useAuth hook
import { useLogoState } from '@/context/LogoStateContext'; // Import the useLogoState hook
import DateTimePicker from '@react-native-community/datetimepicker';

const AgeInputScreen = () => {
  const { setAge } = useAuth(); // Get setAge from context
  const router = useRouter();
  const logoUrl = useLogoState(); // Get the logo URL from context

  const [date, setDate] = useState(new Date()); // State to hold the selected date
  const [showPicker, setShowPicker] = useState(false); // State to control visibility of date picker
  const [formattedDate, setFormattedDate] = useState('dd/mm/yyyy'); // Placeholder for date input
  const [errorMessage, setErrorMessage] = useState(''); // State to hold validation error messages

  // Animated values for button scaling
  const animatedScale = new Animated.Value(1);

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date; // Set the current date to selected date or keep existing
    setShowPicker(false); // Hide the picker
    setDate(currentDate); // Set the selected date
    setFormattedDate(currentDate.toLocaleDateString('en-GB')); // Update the formatted date

    // Validate selected date
    const today = new Date();
    if (currentDate > today) {
      setErrorMessage('Please select a date in the past.');
      setFormattedDate('dd/mm/yyyy'); // Reset formatted date
    } else {
      setErrorMessage(''); // Clear error message if valid
      setAge(currentDate); // Set the age in the auth context
    }
  };

  const handleNext = () => {
    if (errorMessage === '' && date <= new Date()) { // Ensure no errors and valid date
      router.push('signup/IconSelectionScreen'); // Navigate to email input screen
    }
  };

  const animateButton = () => {
    Animated.spring(animatedScale, {
      toValue: 0.95,
      friction: 3,
      useNativeDriver: true,
    }).start(() => {
      Animated.spring(animatedScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }).start();
    });
  };

  const isButtonEnabled = formattedDate !== 'dd/mm/yyyy' && errorMessage === ''; // Check if the button should be enabled

  return (
    <View style={styles.container}>
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={styles.logo} /> // Display the logo
      ) : (
        <Text style={styles.loadingText}>Loading...</Text> // Optional loading state
      )}
      <Text style={styles.title}>Select Your Birthday</Text>

      <TouchableOpacity 
        style={styles.dateInput} 
        onPress={() => setShowPicker(true)} 
        activeOpacity={0.8}
      >
        <Text style={styles.dateText}>
          {formattedDate} {/* Display the selected date or placeholder */}
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
        <Text style={styles.errorText}>{errorMessage}</Text> // Display validation error
      ) : null}

      <Animated.View style={{ transform: [{ scale: animatedScale }] }}>
        <TouchableOpacity 
          style={[styles.nextButton, isButtonEnabled ? styles.enabledButton : styles.disabledButton]} 
          onPress={() => { 
            animateButton(); 
            handleNext(); 
          }} 
          disabled={!isButtonEnabled}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fd',
  },
  logo: {
    width: 150, // Adjust logo size as needed
    height: 150,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#888',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  dateInput: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginVertical: 20,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 22, // Increased font size for prominence
    fontWeight: 'bold', // Make it bold for better visibility
    color: '#1e90ff', // Change the text color for better contrast
  },
  errorText: {
    color: 'red',
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
    backgroundColor: '#1e90ff', // Blue color when enabled
  },
  disabledButton: {
    backgroundColor: '#cccccc', // Gray color for disabled button
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AgeInputScreen;
