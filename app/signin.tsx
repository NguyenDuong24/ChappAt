import Loading from '@/components/Loading';
import { useRouter } from 'expo-router';
import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { useAuth } from '@/context/authContext';


const LoginScreen = () => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const { login } = useAuth();
  
  const router = useRouter();

  const handleLogin = async () => {
    // Logic to handle login

    if(!email || !password)
    {
        Alert.alert('Sign In', "Please fill all the fields");
        return;
    }
    
    setLoading(true);
    const response = await login(email, password);
    setLoading(false);
    if(!response.success){
        Alert.alert('Sign In', response.msg);
    }
  };

  const handleForgotPassword = () => {
    // Logic to handle forgot password
    console.log('Forgot password');
  };

  const handleSignUp = () => {
    // Navigate to sign up screen
    router.push('signup');
  };

  return (
    <View style={styles.container}>
      <TextInput
        label="Email"
        value={email}
        onChangeText={text => setEmail(text)}
        style={styles.input}
      />
      <TextInput
        label="Password"
        value={password}
        onChangeText={text => setPassword(text)}
        secureTextEntry
        style={styles.input}
      />
      <TouchableOpacity onPress={handleForgotPassword}>
        <Text style={styles.forgotPassword}>Forgot Password?</Text>
      </TouchableOpacity>

      <View>
        {
            loading? (
                <View>
                    <Loading></Loading>
                </View>
            ):(
            <Button mode="contained" onPress={handleLogin} style={styles.button}>
                Login
            </Button>
            )
        }
      </View>

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
    justifyContent: 'center',
    padding: 20,
  },
  input: {
    marginBottom: 10,
  },
  button: {
    marginTop: 20,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 10,
    color: 'blue',
  },
  signUpTextContainer: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'center',
  },
  signUpText: {
    fontSize: 16,
  },
  signUpLink: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'blue',
  },
});

export default LoginScreen;
