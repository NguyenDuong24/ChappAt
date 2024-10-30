import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext'; // Import the useAuth hook
import { useLogoState } from '@/context/LogoStateContext'; // Import the useLogoState hook

const NameInputScreen = () => {
  const { setName } = useAuth(); // Get setName from context
  const [name, setLocalName] = React.useState(''); // Local state to hold the user's name
  const router = useRouter();
  const logoUrl = useLogoState(); // Get the logo URL from context

  const handleNext = () => {
    if (name) { // Ensure name is not empty before proceeding
      setName(name); // Set the name in the auth context
      router.push('signup/AgeInputScreen'); // Navigate to age input screen
    }
  };

  return (
    <View style={styles.container}>
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={styles.logo} /> // Display the logo
      ) : (
        <Text>Loading...</Text> // Optional loading state
      )}
      <Text style={styles.title}>Enter Your Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setLocalName} // Update local state with user input
        placeholder="Your Name"
        placeholderTextColor="#888"
      />
      <TouchableOpacity 
        style={[styles.nextButton, !name && styles.disabledButton]} // Disable button if name is empty
        onPress={handleNext} 
        disabled={!name} // Disable button if name is empty
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
    width: 150, // Adjust logo size as needed
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
    backgroundColor: '#cccccc', // Gray color for disabled button
  },
});

export default NameInputScreen;
