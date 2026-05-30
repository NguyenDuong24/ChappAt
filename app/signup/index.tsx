import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@/constants/Colors';
import { useTranslation } from 'react-i18next';

const SignUpScreen = () => {
  const { t } = useTranslation();
  const [username, setUsername] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const { register } = useAuth();
  const router = useRouter();

  // Auto redirect to email input for new signup flow
  React.useEffect(() => {
    router.replace('/signup/EmailInputScreen');
  }, []);

  const handleLogin = () => {
    router.push('/signin');
  };

  const handleSignUp = async () => {
    if (!username || !password || !email || !confirmPassword) {
      Alert.alert(t('signup.signup_button'), t('signup.fill_all_fields', { defaultValue: 'Please fill all the fields' }));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('signup.signup_button'), t('signup.password_mismatch_message'));
      return;
    }

    setLoading(true);
    let response = await register(email, password, username);
    setLoading(false);
    if (!response.success) {
      Alert.alert(t('signup.signup_button'), response.msg || t('common.error'));
    }
  };

  const paperTheme = {
    colors: {
      primary: Colors.primary,
      onPrimary: Colors.white,
      background: Colors.dark.inputBackground,
      surface: Colors.dark.cardBackground,
      text: Colors.dark.text,
      onSurface: Colors.dark.text,
      placeholder: Colors.dark.placeholderText,
    },
  } as const;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('signup.create_account_title')}</Text>
      <Text style={styles.subtitle}>{t('signup.create_account_subtitle')}</Text>

      <View style={styles.inputContainer}>
        <FontAwesome name="user" size={20} style={styles.icon} />
        <TextInput
          label={t('signup.username_label')}
          value={username}
          onChangeText={text => setUsername(text)}
          style={styles.input}
          mode="flat"
          theme={paperTheme}
          underlineColor={Colors.dark.inputBorder}
          activeUnderlineColor={Colors.primary}
        />
      </View>
      <View style={styles.inputContainer}>
        <FontAwesome name="envelope" size={20} style={styles.icon} />
        <TextInput
          label={t('signup.email_label')}
          value={email}
          onChangeText={text => setEmail(text)}
          keyboardType="email-address"
          style={styles.input}
          mode="flat"
          theme={paperTheme}
          underlineColor={Colors.dark.inputBorder}
          activeUnderlineColor={Colors.primary}
          autoCapitalize="none"
        />
      </View>
      <View style={styles.inputContainer}>
        <FontAwesome name="lock" size={20} style={styles.icon} />
        <TextInput
          label={t('signup.password_label')}
          value={password}
          onChangeText={text => setPassword(text)}
          secureTextEntry
          style={styles.input}
          mode="flat"
          theme={paperTheme}
          underlineColor={Colors.dark.inputBorder}
          activeUnderlineColor={Colors.primary}
        />
      </View>
      <View style={styles.inputContainer}>
        <FontAwesome name="lock" size={20} style={styles.icon} />
        <TextInput
          label={t('signup.confirm_password_label')}
          value={confirmPassword}
          onChangeText={text => setConfirmPassword(text)}
          secureTextEntry
          style={styles.input}
          mode="flat"
          theme={paperTheme}
          underlineColor={Colors.dark.inputBorder}
          activeUnderlineColor={Colors.primary}
        />
      </View>

      <View style={styles.buttonContainer}>
        {loading ? (
          <Text style={{ color: Colors.dark.text }}>{t('common.loading')}</Text>
        ) : (
          <Button mode="contained" onPress={handleSignUp} style={styles.button} labelStyle={{ color: Colors.white, fontWeight: '700' }}>
            {t('signup.signup_button')}
          </Button>
        )}
      </View>

      <View style={styles.signUpTextContainer}>
        <Text style={styles.signUpText}>{t('signup.have_account')}</Text>
        <TouchableOpacity onPress={handleLogin}>
          <Text style={styles.signUpLink}>{t('signup.login_now')}</Text>
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
    backgroundColor: Colors.dark.background, 
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.dark.text,
    alignSelf: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.subtleText,
    alignSelf: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.inputBackground,
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.dark.inputBorder,
  },
  icon: {
    marginRight: 10,
    color: Colors.dark.placeholderText,
  },
  input: {
    flex: 1,
    color: Colors.dark.text, 
    backgroundColor: 'transparent',
  },
  buttonContainer: {
    marginTop: 20,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
  },
  signUpTextContainer: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'center',
  },
  signUpText: {
    fontSize: 16,
    color: Colors.dark.subtleText, 
  },
  signUpLink: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary, 
  },
});

export default SignUpScreen;
