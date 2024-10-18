import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import Loading from '@/components/Loading';
import { FontAwesome } from 'react-native-vector-icons';

const SignUpScreen = () => {
  const [username, setUsername] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [profileUrl, setProfileUrl] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  
  
  const { register } = useAuth();
  const router = useRouter();
  const handleLogin = ()=>{
    router.push('signin');
  }

  const handleSignUp = async () => {
    if (!username || !password || !email || !profileUrl) {
      Alert.alert('Sign Up', "Please fill all the fields");
      setLoading(false);
      return;
    }

    setLoading(true);
    let response = await register(email, password, username, profileUrl);
    if(!response.success){
        Alert.alert('Sign In', response.msg);
    }

  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <FontAwesome name="user" size={20} style={styles.icon} />
        <TextInput
          label="Username"
          value={username}
          onChangeText={text => setUsername(text)}
          style={styles.input}
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
        />
      </View>
      <View style={styles.inputContainer}>
        <FontAwesome name="image" size={20} style={styles.icon} />
        <TextInput
          label="Profile URL"
          value={profileUrl}
          onChangeText={text => setProfileUrl(text)}
          style={styles.input}
        />
      </View>

      <View>
        {loading ? (
          <View>
            <Loading />
          </View>
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
    backgroundColor: '#f0f0f0',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  icon: {
    marginRight: 10,
    color: '#6e6e6e',
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  button: {
    marginTop: 20,
    borderRadius: 10,
  },
  signUpTextContainer: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'center',
  },
  signUpText: {
    fontSize: 16,
    color: '#6e6e6e',
  },
  signUpLink: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e90ff',
  },
});

export default SignUpScreen;
