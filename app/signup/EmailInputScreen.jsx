import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { useLogoState } from '@/context/LogoStateContext';
import { Colors } from '@/constants/Colors';

const EmailInputScreen = () => {
  const { setEmail } = useAuth();
  const router = useRouter();
  const logoUrl = useLogoState();

  const [email, setEmailInput] = useState('');
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);

  const handleEmailChange = (input) => {
    setEmailInput(input);
    setIsButtonEnabled(validateEmail(input));
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleNext = () => {
    setEmail(email);
    router.push('signup/PasswordInputScreen');
  };

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
        <Text style={styles.title}>Enter Your Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Your Email"
          placeholderTextColor="#888"
          keyboardType="email-address"
          value={email}
          onChangeText={handleEmailChange}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.nextButton, !isButtonEnabled && styles.disabledButton]}
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
    backgroundColor: 'rgba(0, 0, 0, 0.0)',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 25,
    marginBottom: 20,
    fontSize: 18,
    backgroundColor: '#fff',
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
    backgroundColor: '#cccccc',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default EmailInputScreen;
