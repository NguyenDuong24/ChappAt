import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { FontAwesome } from '@expo/vector-icons';

const SignUpScreen = () => {
  const [username, setUsername] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const { register } = useAuth();
  const router = useRouter();

  const handleLogin = () => {
    router.push('signin');
  };

  const handleSignUp = async () => {
    if (!username || !password || !email || !confirmPassword) {
      Alert.alert('Sign Up', "Please fill all the fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Sign Up', "Passwords do not match");
      return;
    }

    setLoading(true);
    let response = await register(email, password, username);
    setLoading(false);
    if (!response.success) {
      Alert.alert('Sign Up', response.msg);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Join us to explore the world of opportunities</Text>
      
      <View style={styles.inputContainer}>
        <FontAwesome name="user" size={20} style={styles.icon} />
        <TextInput
          label="Username"
          value={username}
          onChangeText={text => setUsername(text)}
          style={styles.input}
          mode="flat"
          theme={{ colors: { primary: '#1e90ff', background: '#1f1f1f', text: '#ffffff' } }} 
        />
      </View>
      <View style={styles.inputContainer}>
        <FontAwesome name="envelope" size={20} style={styles.icon} />
        <TextInput
          label="Email"
          value={email}
          onChangeText={text => setEmail(text)}
          keyboardType="email-address"
          style={styles.input}
          mode="flat"
          theme={{ colors: { primary: '#1e90ff', background: '#1f1f1f', text: '#ffffff' } }} 
        />
      </View>
      <View style={styles.inputContainer}>
        <FontAwesome name="lock" size={20} style={styles.icon} />
        <TextInput
          label="Password"
          value={password}
          onChangeText={text => setPassword(text)}
          secureTextEntry
          style={styles.input}
          mode="flat"
          theme={{ colors: { primary: '#1e90ff', background: '#1f1f1f', text: '#ffffff' } }}
        />
      </View>
      <View style={styles.inputContainer}>
        <FontAwesome name="lock" size={20} style={styles.icon} />
        <TextInput
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={text => setConfirmPassword(text)}
          secureTextEntry
          style={styles.input}
          mode="flat"
          theme={{ colors: { primary: '#1e90ff', background: '#1f1f1f', text: '#ffffff' } }}
        />
      </View>


      <View style={styles.buttonContainer}>
        {loading ? (
          <Text>Loading...</Text>
        ) : (
          <Button mode="contained" onPress={handleSignUp} style={styles.button}>
            Sign Up
          </Button>
        )}
      </View>

      <View style={styles.signUpTextContainer}>
        <Text style={styles.signUpText}>Already have an account? </Text>
        <TouchableOpacity onPress={handleLogin}>
          <Text style={styles.signUpLink}>Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#121212', 
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    alignSelf: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#b0b0b0',
    alignSelf: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f1f1f',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    elevation: 2,
  },
  icon: {
    marginRight: 10,
    color: '#b0b0b0',
  },
  input: {
    flex: 1,
    color: '#ffffff', 
  },
  buttonContainer: {
    marginTop: 20,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 10,
    backgroundColor: '#1e90ff',
  },
  signUpTextContainer: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'center',
  },
  signUpText: {
    fontSize: 16,
    color: '#b0b0b0', 
  },
  signUpLink: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e90ff', 
  },
});

export default SignUpScreen;
