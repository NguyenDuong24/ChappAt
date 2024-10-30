import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext'; 
import { useLogoState } from '@/context/LogoStateContext'; 

const NameInputScreen = () => {
  const { setName } = useAuth(); 
  const [name, setLocalName] = React.useState('');
  const router = useRouter();
  const logoUrl = useLogoState(); 

  const handleNext = () => {
    if (name) { 
      setName(name);
      router.push('signup/AgeInputScreen');
    }
  };

  return (
    <View style={styles.container}>
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={styles.logo} /> 
      ) : (
        <Text>Loading...</Text>
      )}
      <Text style={styles.title}>Enter Your Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setLocalName}
        placeholder="Your Name"
        placeholderTextColor="#888"
      />
      <TouchableOpacity 
        style={[styles.nextButton, !name && styles.disabledButton]} 
        onPress={handleNext} 
        disabled={!name} 
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
