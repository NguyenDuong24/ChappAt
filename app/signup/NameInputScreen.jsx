import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext'; 
import { useLogoState } from '@/context/LogoStateContext';
import { Colors } from '@/constants/Colors';

const NameInputScreen = () => {
  const { setName } = useAuth(); 
  const [name, setLocalName] = React.useState('');
  const router = useRouter();
  const logoUrl = useLogoState();
  const currentThemeColors = Colors.dark;

  const handleNext = () => {
    if (name) { 
      setName(name);
      router.push('signup/AgeInputScreen');
    }
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/cover.png')} // Ensure the path is correct
      style={styles.backgroundImage}
    >
      <View style={styles.overlay}>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logo} />
        ) : (
          <Text style={{ color: currentThemeColors.text }}>Loading...</Text>
        )}
        
        <Text style={[styles.title, { color: currentThemeColors.text }]}>Enter Your Name</Text>

        <TextInput
          style={[styles.input, { backgroundColor: currentThemeColors.inputBackground }]}
          value={name}
          onChangeText={setLocalName}
          placeholder="Your Name"
          placeholderTextColor="#888"
        />

        <TouchableOpacity 
          style={[styles.nextButton, !name && styles.disabledButton, { backgroundColor: currentThemeColors.tint }]} 
          onPress={handleNext} 
          disabled={!name} 
        >
          <Text style={styles.nextButtonText}>Next</Text>
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

export default NameInputScreen;
