import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ImageBackground, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext'; 
import { Colors } from '@/constants/Colors';
import { useLogoState } from '@/context/LogoStateContext'; // Add LogoStateContext
import { LinearGradient } from 'expo-linear-gradient';

const PasswordInputScreen = () => {
  const {
    setPassword, 
    email,
    name,
    age,
    gender,
    cancelRegistration,
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

  const handleSignUp = async () => {

    if (password !== confirmPassword) {
      Alert.alert('Sign Up', "Passwords do not match");
      return;
    }

    // Set password and navigate to next screen without registering yet
    setPassword(password);
    router.push('/signup/GenderSelectionScreen');
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/cover.png')}
      style={styles.backgroundImage}
    >
      <LinearGradient colors={['rgba(15,23,42,0.85)','rgba(15,23,42,0.65)']} style={styles.backdrop} />

      <View style={styles.overlay}>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logo} />
        ) : (
          <Text style={{ color: Colors.dark.text }}>Loading...</Text>
        )}

        <Text style={[styles.title, { color: Colors.dark.text }]}>Create a Password</Text>

        <TextInput
          style={[styles.input, { backgroundColor: Colors.dark.inputBackground, borderColor: Colors.dark.inputBorder, color: Colors.dark.text }]}
          placeholder="Password"
          placeholderTextColor={Colors.dark.placeholderText}
          secureTextEntry
          value={password}
          onChangeText={handlePasswordChange}
        />

        <TextInput
          style={[styles.input, { backgroundColor: Colors.dark.inputBackground, borderColor: Colors.dark.inputBorder, color: Colors.dark.text }]}
          placeholder="Confirm Password"
          placeholderTextColor={Colors.dark.placeholderText}
          secureTextEntry
          value={confirmPassword}
          onChangeText={handleConfirmPasswordChange}
        />

        <TouchableOpacity
          style={[styles.nextButton, !isButtonEnabled && styles.disabledButton, { backgroundColor: Colors.dark.tint }]}
          onPress={handleNext}
          disabled={!isButtonEnabled || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <Text style={styles.nextButtonText}>Loading...</Text>
          ) : (
            <Text style={styles.nextButtonText}>Next</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleCancel} style={{ marginTop: 14 }}>
          <Text style={{ color: '#ffd1d1', textDecorationLine: 'underline' }}>Huỷ đăng ký</Text>
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
  backdrop: { ...StyleSheet.absoluteFillObject },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    backgroundColor: 'transparent',
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
  },
  input: {
    width: '100%',
    padding: 15,
    borderWidth: 1,
    borderRadius: 25,
    marginBottom: 20,
    fontSize: 18,
    fontWeight: '500',
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
    backgroundColor: '#475569',
  },
});

export default PasswordInputScreen;
