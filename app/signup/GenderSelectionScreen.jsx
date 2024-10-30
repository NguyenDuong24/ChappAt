import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Animated, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext'; // Import the useAuth hook
import { useLogoState } from '@/context/LogoStateContext'; // Import the useLogoState hook

const GenderSelectionScreen = () => {
  const { setGender } = useAuth(); // Get setGender from context
  const router = useRouter();
  const logoUrl = useLogoState(); // Get the logo URL from context
  const [selectedGender, setSelectedGender] = useState(null); // State to track selected gender

  // Animated values for button scaling
  const maleButtonScale = new Animated.Value(1);
  const femaleButtonScale = new Animated.Value(1);

  const handleSelectGender = (gender) => {
    setSelectedGender(gender); // Set the selected gender in the state
    setGender(gender); // Set the selected gender in the context
  };

  // Function to animate button on press
  const animateButton = (scaleValue) => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      friction: 3,
      useNativeDriver: true,
    }).start(() => {
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }).start();
    });
  };

  const isNextButtonDisabled = !selectedGender; // Disable next button if no gender is selected

  return (
    <View style={styles.container}>
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={styles.logo} /> // Use the logo URL from context
      ) : (
        <Text>Loading...</Text> // Optional loading state
      )}
      <Text style={styles.title}>Giới tính của bạn là gì?</Text>
      <View style={styles.buttonContainer}>
        <Animated.View style={{ transform: [{ scale: maleButtonScale }] }}>
          <TouchableOpacity
            style={[styles.button, selectedGender === 'male' ? styles.selectedButton : styles.unselectedButton]}
            onPressIn={() => animateButton(maleButtonScale)}
            onPress={() => handleSelectGender('male')}
          >
            <Text style={styles.buttonText}>Nam</Text>
          </TouchableOpacity>
        </Animated.View>
        <Animated.View style={{ transform: [{ scale: femaleButtonScale }] }}>
          <TouchableOpacity
            style={[styles.button, selectedGender === 'female' ? styles.selectedButton : styles.unselectedButton]}
            onPressIn={() => animateButton(femaleButtonScale)}
            onPress={() => handleSelectGender('female')}
          >
            <Text style={styles.buttonText}>Nữ</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
      <TouchableOpacity 
        style={[styles.nextButton, isNextButtonDisabled && styles.disabledButton]} 
        onPress={() => isNextButtonDisabled ? null : router.push('/signup/NameInputScreen')} // Navigate only if a gender is selected
        disabled={isNextButtonDisabled} // Disable button if no gender selected
      >
        <Text style={styles.nextButtonText}>Tiếp theo</Text>
      </TouchableOpacity>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
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
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  selectedButton: {
    backgroundColor: '#1e90ff', // Color when selected
  },
  unselectedButton: {
    backgroundColor: '#fff', // Color when unselected
  },
  buttonText: {
    fontSize: 20,
    color: '#000', // Text color
    fontWeight: 'bold',
  },
  nextButton: {
    backgroundColor: '#1e90ff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 20,
  },
  nextButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#cccccc', // Gray color for disabled button
  },
});

export default GenderSelectionScreen;
