import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ImageBackground, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext'; 
import { useLogoState } from '@/context/LogoStateContext';
import { Colors } from '@/constants/Colors';
import { ThemeContext } from '@/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const GenderSelectionScreen = () => {
  const { setGender, cancelRegistration } = useAuth(); 
  const router = useRouter();
  const logoUrl = useLogoState();
  const [selectedGender, setSelectedGender] = useState(null);

  const { theme } = useContext(ThemeContext);
  const currentThemeColors = Colors.dark;

  const handleSelectGender = (gender) => {
    setSelectedGender(gender);
    setGender(gender);
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

  const isNextButtonDisabled = !selectedGender;

  return (
    <ImageBackground 
      source={require('../../assets/images/cover.png')}
      style={styles.background}
      resizeMode="cover"
    >
      {/* Dark scrim to guarantee text contrast on any image */}
      <LinearGradient
        colors={[ 'rgba(15,23,42,0.85)', 'rgba(15,23,42,0.65)' ]}
        style={styles.backdrop}
      />

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
            activeOpacity={0.85}
          >
            <Text style={[styles.buttonText, { color: currentThemeColors.text }]}>Nam</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              selectedGender === 'female' ? { backgroundColor: currentThemeColors.tint } : { backgroundColor: currentThemeColors.inputBackground },
            ]}
            onPress={() => handleSelectGender('female')}
            activeOpacity={0.85}
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
          activeOpacity={0.85}
        >
          <Text style={[styles.nextButtonText, { color: currentThemeColors.text }]}>Tiếp theo</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleCancel} style={{ marginTop: 14 }}>
          <Text style={{ color: '#ffd1d1', textDecorationLine: 'underline' }}>Huỷ đăng ký</Text>
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
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
    shadowOpacity: 0.35,
    shadowRadius: 6,
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
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: Colors.gray600,
  },
});

export default GenderSelectionScreen;
