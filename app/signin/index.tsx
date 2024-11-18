import { useRouter } from 'expo-router';
import React, { useContext } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert, ImageBackground, Image } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { useAuth } from '@/context/authContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';

const LoginScreen = () => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const { theme } = useContext(ThemeContext);
  const currentThemeColors = Colors.dark;

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
    <ImageBackground 
      source={require('../../assets/images/cover.png')} // Path to your image
      style={styles.backgroundImage}
    >
      <View style={styles.container}>
        <Image source={require('@/assets/images/logo.png')} style={styles.logo} />
        
        <Text style={[styles.title, { color: currentThemeColors.text }]}>Welcome Back</Text>
        <Text style={[styles.subtitle, { color: currentThemeColors.subtleText }]}>Sign in to continue</Text>

        <View style={styles.form}>
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          style={[styles.input, { backgroundColor: currentThemeColors.inputBackground }]}
          keyboardType="email-address"
          autoCapitalize="none"
          theme={{ colors: { primary: 'white', text: 'white' } }}
          mode="outlined"
          textColor='white'
        />
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={[styles.input, { backgroundColor: currentThemeColors.inputBackground }]}
          theme={{ colors: { primary: 'white', text: 'white',  } }} 
          mode="outlined"
          textColor='white'
        />

        </View>

        <TouchableOpacity onPress={handleForgotPassword}>
          <Text style={[styles.forgotPassword, { color: currentThemeColors.tint }]}>Forgot Password?</Text>
        </TouchableOpacity>

        {loading ? (
          <Text style={{ color: currentThemeColors.text }}>Loading...</Text>
        ) : (
          <Button mode="contained" onPress={handleLogin} style={[styles.button, { backgroundColor: currentThemeColors.tint }]}>
            Login
          </Button>
        )}

        <View style={styles.signUpTextContainer}>
          <Text style={[styles.signUpText, { color: currentThemeColors.subtleText }]}>Don't have an account? </Text>
          <TouchableOpacity onPress={handleSignUp}>
            <Text style={[styles.signUpLink, { color: currentThemeColors.tint }]}>Sign Up</Text>
          </TouchableOpacity>
        </View>
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
  container: {
    width: '100%',
    height: "100%",
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 20,
    backgroundColor: 'rgba(100 , 80, 56, 0.3))',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 15,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 20,
    marginBottom: 30,
    textAlign: 'center',
    fontWeight: '500',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  form: {
    width: '100%',
    marginBottom: 30,
  },
  input: {
    width: '100%',
    marginBottom: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
    fontSize: 20,
    fontWeight: '600',
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    width: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  signUpTextContainer: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'center',
  },
  signUpText: {
    fontSize: 16,
    fontWeight: '400',
  },
  signUpLink: {
    fontSize: 16,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
