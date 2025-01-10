import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ImageBackground, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext'; 
import { Colors } from '@/constants/Colors';
import { useLogoState } from '@/context/LogoStateContext'; // Add LogoStateContext

const PasswordInputScreen = () => {
  const {
    setPassword, 
    email,
    name,
    age,
    gender,
    register,
  } = useAuth(); 

  const router = useRouter();
  const logoUrl = useLogoState(); // Retrieve logo URL from context

  const [password, setPasswordInput] = useState('');
  const [confirmPassword, setConfirmPasswordInput] = useState('');
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

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
    setPassword(password); 
    handleSignUp();
  };

  const handleSignUp = async () => {
    if (!name || !password || !email || !age || !gender) {
      Alert.alert('Sign Up', "Please fill all the fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Sign Up', "Passwords do not match");
      return;
    }

    setLoading(true);
    let response = await register(); 
    setLoading(false); 

    if (!response.success) {
      Alert.alert(
        'Sign Up',
        response.msg,
        [
          {
            text: 'OK',
            onPress: () => {
              if (response.msg.includes('email')) {
                router.back('signup/EmailInputScreen'); 
              }
            }
          }
        ]
      );
    } 
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/cover.png')}
      style={styles.backgroundImage}
    >
      <View style={styles.overlay}>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logo} />
        ) : (
          <Text style={{ color: Colors.dark.text }}>Loading...</Text>
        )}

        <Text style={[styles.title, { color: Colors.dark.text }]}>Create a Password</Text>

        <TextInput
          style={[styles.input, { backgroundColor: Colors.dark.inputBackground }]}
          placeholder="Password"
          placeholderTextColor="#888"
          secureTextEntry
          value={password}
          onChangeText={handlePasswordChange}
        />

        <TextInput
          style={[styles.input, { backgroundColor: Colors.dark.inputBackground }]}
          placeholder="Confirm Password"
          placeholderTextColor="#888"
          secureTextEntry
          value={confirmPassword}
          onChangeText={handleConfirmPasswordChange}
        />

        <TouchableOpacity
          style={[styles.nextButton, !isButtonEnabled && styles.disabledButton, { backgroundColor: Colors.dark.tint }]}
          onPress={handleNext}
          disabled={!isButtonEnabled || loading}
        >
          {loading ? (
            <Text style={styles.nextButtonText}>Loading...</Text>
          ) : (
            <Text style={styles.nextButtonText}>Next</Text>
          )}
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  overlay: {
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
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 15,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
  },
  input: {
    width: '100%',
    padding: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 25,
    marginBottom: 20,
    fontSize: 18,
    fontWeight: '500',
    color: Colors.dark.text,
  },
  nextButton: {
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    width: '100%',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
});

export default PasswordInputScreen;
