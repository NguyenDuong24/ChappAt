import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext'; // Import the useAuth hook

const PasswordInputScreen = () => {
  const {
    setPassword, // Function to set password in context
    email,
    name,
    age,
    gender,
    register,
  } = useAuth(); // Destructure necessary state and functions from context

  const router = useRouter();

  const [password, setPasswordInput] = useState('');
  const [confirmPassword, setConfirmPasswordInput] = useState('');
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);
  const [loading, setLoading] = useState(false); // Loading state for sign-up

  const handlePasswordChange = (input) => {
    setPasswordInput(input);
    setIsButtonEnabled(input && input === confirmPassword);
  };

  const handleConfirmPasswordChange = (input) => {
    setConfirmPasswordInput(input);
    setIsButtonEnabled(input && input === password);
  };

  const handleNext = () => {
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }
    setPassword(password); // Save password in context
    handleSignUp(); // Call the sign-up function
  };

  const handleSignUp = async () => {
    // Ensure that all necessary fields are filled
    if (!name || !password || !email || !age || !gender) {
      Alert.alert('Sign Up', "Please fill all the fields");
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      Alert.alert('Sign Up', "Passwords do not match");
      return;
    }

    setLoading(true); // Start loading

    // Register the user using the context's register function
    let response = await register(); // Assume register uses state variables from context
    setLoading(false); // Stop loading

    // Handle response from register
    if (!response.success) {
      // Show error message if registration failed
      Alert.alert(
        'Sign Up',
        response.msg,
        [
          {
            text: 'OK',
            onPress: () => {
              // Handle email-related errors
              if (response.msg.includes('email')) {
                // Navigate back to the email input screen
                router.back('signup/EmailInputScreen'); // Replace with your actual email input screen route
              }
            }
          }
        ]
      );
    } 
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create a Password</Text>

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={handlePasswordChange}
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor="#888"
        secureTextEntry
        value={confirmPassword}
        onChangeText={handleConfirmPasswordChange}
      />

      <TouchableOpacity
        style={[styles.nextButton, !isButtonEnabled && styles.disabledButton]}
        onPress={handleNext}
        disabled={!isButtonEnabled || loading} // Disable if loading or not enabled
      >
        {loading ? (
          <Text style={styles.nextButtonText}>Loading...</Text>
        ) : (
          <Text style={styles.nextButtonText}>Next</Text>
        )}
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

export default PasswordInputScreen;
