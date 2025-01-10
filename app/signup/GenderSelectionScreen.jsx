import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext'; 
import { useLogoState } from '@/context/LogoStateContext';
import { Colors } from '@/constants/Colors';
import { ThemeContext } from '@/context/ThemeContext';

const GenderSelectionScreen = () => {
  const { setGender } = useAuth(); 
  const router = useRouter();
  const logoUrl = useLogoState();
  const [selectedGender, setSelectedGender] = useState(null);

  const { theme } = useContext(ThemeContext);
  const currentThemeColors = Colors.dark;

  const handleSelectGender = (gender) => {
    setSelectedGender(gender);
    setGender(gender);
  };

  const isNextButtonDisabled = !selectedGender;

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
          <Text style={{ color: currentThemeColors.text }}>Loading...</Text>
        )}
        <Text style={[styles.title, { color: currentThemeColors.text }]}>Giới tính của bạn là gì?</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              selectedGender === 'male' ? { backgroundColor: currentThemeColors.tint } : { backgroundColor: currentThemeColors.inputBackground },
            ]}
            onPress={() => handleSelectGender('male')}
          >
            <Text style={[styles.buttonText, { color: currentThemeColors.text }]}>Nam</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              selectedGender === 'female' ? { backgroundColor: currentThemeColors.tint } : { backgroundColor: currentThemeColors.inputBackground },
            ]}
            onPress={() => handleSelectGender('female')}
          >
            <Text style={[styles.buttonText, { color: currentThemeColors.text }]}>Nữ</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[
            styles.nextButton,
            isNextButtonDisabled ? styles.disabledButton : { backgroundColor: currentThemeColors.tint },
          ]}
          onPress={() => !isNextButtonDisabled && router.push('/signup/NameInputScreen')}
          disabled={isNextButtonDisabled}
        >
          <Text style={[styles.nextButtonText, { color: currentThemeColors.text }]}>Tiếp theo</Text>
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
    backgroundColor: 'rgba(148, 156, 66, 0.0)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    backgroundColor: 'rgba(148, 156, 66, 0.0)',
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
    shadowOpacity: 0.5,
    shadowRadius: 4,
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
  },
  nextButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
});

export default GenderSelectionScreen;
