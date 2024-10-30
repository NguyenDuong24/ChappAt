import { useRouter } from 'expo-router';
import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert, Image } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { useAuth } from '@/context/authContext';

const LoginScreen = () => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Sign In', "Please fill all the fields");
      return;
    }

    setLoading(true);
    const response = await login(email, password);
    setLoading(false);

    if (!response.success) {
      Alert.alert('Sign In', response.msg);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert('Forgot Password', 'Forgot password functionality to be implemented.');
  };

  const handleSignUp = () => {
    router.push('/signup/GenderSelectionScreen');
  };

  return (
    <View style={styles.container}>
      <Image source={require('@/assets/images/loading.json')} style={styles.logo} />
      
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Sign in to continue</Text>

      <TextInput
        label="Email"
        value={email}
        onChangeText={text => setEmail(text)}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        theme={{ colors: { primary: '#1e90ff' } }}
      />
      <TextInput
        label="Password"
        value={password}
        onChangeText={text => setPassword(text)}
        secureTextEntry
        style={styles.input}
        theme={{ colors: { primary: '#1e90ff' } }} 
      />
      
      <TouchableOpacity onPress={handleForgotPassword}>
        <Text style={styles.forgotPassword}>Forgot Password?</Text>
      </TouchableOpacity>

      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <Button mode="contained" onPress={handleLogin} style={styles.button}>
          Login
        </Button>
      )}

      <View style={styles.signUpTextContainer}>
        <Text style={styles.signUpText}>Don't have an account? </Text>
        <TouchableOpacity onPress={handleSignUp}>
          <Text style={styles.signUpLink}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#b0b0b0',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    marginBottom: 10,
    backgroundColor: '#1f1f1f', 
    color: '#ffffff',
  },
  button: {
    borderRadius: 10,
    paddingVertical: 10,
    backgroundColor: '#1e90ff',
    width: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    color: '#1e90ff',
    marginBottom: 20,
    fontSize: 14,
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

export default LoginScreen;
