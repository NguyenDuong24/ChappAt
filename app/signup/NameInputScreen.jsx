import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ImageBackground, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext'; 
import { useLogoState } from '@/context/LogoStateContext';
import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

const NameInputScreen = () => {
  const { setName, cancelRegistration } = useAuth(); 
  const [name, setLocalName] = React.useState('');
  const router = useRouter();
  const logoUrl = useLogoState();
  const currentThemeColors = Colors.dark;

  const handleNext = () => {
    if (name) { 
      setName(name);
      router.push('/signup/AgeInputScreen');
    }
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

  return (
    <ImageBackground 
      source={require('../../assets/images/cover.png')} // Ensure the path is correct
      style={styles.backgroundImage}
    >
      {/* Overlay gradient to ensure high contrast over background image */}
      <LinearGradient colors={['rgba(15,23,42,0.85)','rgba(15,23,42,0.65)']} style={styles.backdrop} />

      <View style={styles.overlay}>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logo} />
        ) : (
          <Text style={{ color: currentThemeColors.text }}>Loading...</Text>
        )}
        
        <Text style={[styles.title, { color: currentThemeColors.text }]}>Enter Your Name</Text>

        <TextInput
          style={[
            styles.input,
            { backgroundColor: currentThemeColors.inputBackground, borderColor: currentThemeColors.inputBorder, color: currentThemeColors.text }
          ]}
          value={name}
          onChangeText={setLocalName}
          placeholder="Your Name"
          placeholderTextColor={currentThemeColors.placeholderText}
        />

        <TouchableOpacity 
          style={[styles.nextButton, !name && styles.disabledButton, { backgroundColor: currentThemeColors.tint }]} 
          onPress={handleNext} 
          disabled={!name} 
          activeOpacity={0.85}
        >
          <Text style={styles.nextButtonText}>Next</Text>
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
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
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

export default NameInputScreen;
