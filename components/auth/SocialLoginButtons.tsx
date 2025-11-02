import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface SocialLoginButtonsProps {
  onGoogleLogin: () => Promise<any>;
  onFacebookLogin: () => Promise<any>;
  isDarkMode?: boolean;
}

const SocialLoginButtons = ({ 
  onGoogleLogin, 
  onFacebookLogin, 
  isDarkMode = false 
}: SocialLoginButtonsProps) => {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);

  const colors = {
    background: isDarkMode ? '#0F172A' : '#FFFFFF',
    text: isDarkMode ? '#F8FAFC' : '#0F172A',
    subtleText: isDarkMode ? '#94A3B8' : '#64748B',
    border: isDarkMode ? '#374151' : '#E2E8F0',
    google: '#4285F4',
    facebook: '#1877F2',
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      const result = await onGoogleLogin();
      
      if (result.success) {
        Alert.alert('Thành công', result.message);
      } else {
        Alert.alert('Lỗi', result.message);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Đăng nhập Google thất bại');
      console.error('Google login error:', error);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      setFacebookLoading(true);
      const result = await onFacebookLogin();
      
      if (result.success) {
        Alert.alert('Thành công', result.message);
      } else {
        Alert.alert('Lỗi', result.message);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Đăng nhập Facebook thất bại');
      console.error('Facebook login error:', error);
    } finally {
      setFacebookLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.dividerContainer}>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.subtleText }]}>
          Hoặc tiếp tục với
        </Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      </View>

      <View style={styles.socialButtons}>
        {/* Google Login Button */}
        <TouchableOpacity
          style={[
            styles.socialButton,
            { backgroundColor: colors.google, borderColor: colors.border }
          ]}
          onPress={handleGoogleLogin}
          disabled={googleLoading || facebookLoading}
        >
          {googleLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="google" size={20} color="#FFFFFF" />
              <Text style={styles.socialButtonText}>Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Facebook Login Button */}
        <TouchableOpacity
          style={[
            styles.socialButton,
            { backgroundColor: colors.facebook, borderColor: colors.border }
          ]}
          onPress={handleFacebookLogin}
          disabled={googleLoading || facebookLoading}
        >
          {facebookLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="facebook" size={20} color="#FFFFFF" />
              <Text style={styles.socialButtonText}>Facebook</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Text style={[styles.disclaimer, { color: colors.subtleText }]}>
        Bằng cách đăng nhập, bạn đồng ý với{' '}
        <Text style={[styles.link, { color: colors.google }]}>
          Điều khoản sử dụng
        </Text>{' '}
        và{' '}
        <Text style={[styles.link, { color: colors.google }]}>
          Chính sách bảo mật
        </Text>{' '}
        của chúng tôi.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 20,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  socialButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 8,
  },
  link: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});

export default SocialLoginButtons;
