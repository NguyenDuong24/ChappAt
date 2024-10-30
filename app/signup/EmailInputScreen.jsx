import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext'; // Import the useAuth hook
import { useLogoState } from '@/context/LogoStateContext'; // Import the useLogoState hook

const EmailInputScreen = () => {
  const { setEmail } = useAuth(); // Get setEmail from context
  const router = useRouter();
  const logoUrl = useLogoState(); // Get the logo URL from context

  const [email, setEmailInput] = useState('');
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);

  const handleEmailChange = (input) => {
    setEmailInput(input);
    setIsButtonEnabled(validateEmail(input));
  };

  const validateEmail = (email) => {
    // Simple email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleNext = () => {
    setEmail(email); // Save email to auth context
    router.push('signup/PasswordInputScreen'); // Navigate to the next screen
  };

  return (
    <View style={styles.container}>
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={styles.logo} /> // Display the logo
      ) : (
        <Text>Loading...</Text> // Optional loading state
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
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
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
    backgroundColor: '#1e90ff',
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
