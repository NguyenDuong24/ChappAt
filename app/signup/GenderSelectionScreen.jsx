import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Animated, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext'; 
import { useLogoState } from '@/context/LogoStateContext';

const GenderSelectionScreen = () => {
  const { setGender } = useAuth(); 
  const router = useRouter();
  const logoUrl = useLogoState();
  const [selectedGender, setSelectedGender] = useState(null); 

  
  const maleButtonScale = new Animated.Value(1);
  const femaleButtonScale = new Animated.Value(1);

  const handleSelectGender = (gender) => {
    setSelectedGender(gender); 
    setGender(gender); 
  };
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

  const isNextButtonDisabled = !selectedGender; 

  return (
    <View style={styles.container}>
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={styles.logo} /> 
      ) : (
        <Text>Loading...</Text> 
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
        disabled={isNextButtonDisabled} 
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
    backgroundColor: '#1e90ff', 
  },
  unselectedButton: {
    backgroundColor: '#fff', 
  },
  buttonText: {
    fontSize: 20,
    color: '#000', 
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
    backgroundColor: '#cccccc',
  },
});

export default GenderSelectionScreen;
