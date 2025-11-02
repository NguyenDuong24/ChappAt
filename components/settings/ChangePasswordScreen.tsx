// Bây giờ, cập nhật file ChangePasswordScreen
// Tôi đã cải thiện UI: Thêm icon cho input (sử dụng expo/vector-icons), loading state, validation tốt hơn, styles đẹp hơn (gradient button, shadow, etc.).
// Giả sử bạn đã install @expo/vector-icons. Nếu chưa, chạy: expo install @expo/vector-icons
// Thêm logic gọi updateUserPassword từ useAuth.

import React, { useState, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/authContext';  // Giả sử đường dẫn đến AuthContext của bạn
import { Ionicons } from '@expo/vector-icons';  // Import icon
import { ThemeContext } from '../../context/ThemeContext';
import { Colors } from '@/constants/Colors';

const ChangePasswordScreen = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const { updateUserPassword } = useAuth();
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  const validateInputs = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return false;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu mới không khớp');
      return false;
    }
    if (newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải ít nhất 6 ký tự');
      return false;
    }
    if (newPassword === currentPassword) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải khác mật khẩu hiện tại');
      return false;
    }
    return true;
  };

  const handleChangePassword = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    const result = await updateUserPassword(currentPassword, newPassword);
    setLoading(false);

    if (result.success) {
      Alert.alert('Thành công', 'Mật khẩu đã được đổi thành công');
      router.back();
    } else {
      Alert.alert('Lỗi', result.msg || 'Đổi mật khẩu thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      
      <View style={[styles.inputContainer, { backgroundColor: currentThemeColors.inputBackground, borderColor: currentThemeColors.inputBorder }]}>
        <Ionicons name="lock-closed-outline" size={24} color={currentThemeColors.icon} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { color: currentThemeColors.text }]}
          placeholder="Mật khẩu hiện tại"
          placeholderTextColor={currentThemeColors.placeholderText}
          secureTextEntry={!showCurrentPassword}
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />
        <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={styles.eyeIcon}>
          <Ionicons name={showCurrentPassword ? "eye-outline" : "eye-off-outline"} size={24} color={currentThemeColors.icon} />
        </TouchableOpacity>
      </View>

      <View style={[styles.inputContainer, { backgroundColor: currentThemeColors.inputBackground, borderColor: currentThemeColors.inputBorder }]}>
        <Ionicons name="lock-open-outline" size={24} color={currentThemeColors.icon} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { color: currentThemeColors.text }]}
          placeholder="Mật khẩu mới"
          placeholderTextColor={currentThemeColors.placeholderText}
          secureTextEntry={!showNewPassword}
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
          <Ionicons name={showNewPassword ? "eye-outline" : "eye-off-outline"} size={24} color={currentThemeColors.icon} />
        </TouchableOpacity>
      </View>

      <View style={[styles.inputContainer, { backgroundColor: currentThemeColors.inputBackground, borderColor: currentThemeColors.inputBorder }]}>
        <Ionicons name="lock-open-outline" size={24} color={currentThemeColors.icon} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { color: currentThemeColors.text }]}
          placeholder="Xác nhận mật khẩu mới"
          placeholderTextColor={currentThemeColors.placeholderText}
          secureTextEntry={!showConfirmPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
          <Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={24} color={currentThemeColors.icon} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.button, { backgroundColor: loading ? currentThemeColors.tintLight : currentThemeColors.tint }, loading && styles.buttonDisabled]} 
        onPress={handleChangePassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[styles.buttonText, { color: currentThemeColors.cardBackground }]}>Đổi mật khẩu</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 32,
    textAlign: 'center',
    color: '#1F2937',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  inputIcon: {
    paddingLeft: 16,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
  },
  eyeIcon: {
    paddingRight: 16,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#A5B4FC',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChangePasswordScreen;