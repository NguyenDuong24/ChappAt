import React, { useState, useContext } from 'react';
import { StyleSheet, View } from 'react-native';
import { List, Divider, Switch, Title, Button } from 'react-native-paper';
import { ThemeContext } from '../../../context/ThemeContext'; // Đảm bảo đường dẫn chính xác
import { AuthContext } from '../../../context/authContext'; // Context cho auth
import { Colors } from '@/constants/Colors'; // Sử dụng các màu từ dự án của bạn

// Màn hình Settings
const SettingsScreen = () => {
  const { theme, toggleTheme } = useContext(ThemeContext); // Lấy theme và toggle từ ThemeContext
  const { logout } = useContext(AuthContext); // Lấy logout từ AuthContext
  const [isNotificationsEnabled, setNotificationsEnabled] = useState(false);

  const toggleNotifications = () => setNotificationsEnabled(!isNotificationsEnabled);

  // Đặt màu sắc và nền tùy theo theme hiện tại
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <Title style={[styles.title, { color: currentThemeColors.text }]}>Settings</Title>
      
      <Divider style={[styles.divider, { backgroundColor: currentThemeColors.divider }]} />
      
      {/* Theme Switch */}
      <List.Item
        title="Dark Theme"
        description="Enable dark theme for the app"
        left={props => <List.Icon {...props} icon="theme-light-dark" />}
        right={() => (
          <Switch
            value={theme === 'dark'} // Đảm bảo giá trị chính xác
            onValueChange={toggleTheme}
          />
        )}
      />
      
      <Divider style={[styles.divider, { backgroundColor: currentThemeColors.divider }]} />
      
      {/* Notifications Switch */}
      <List.Item
        title="Notifications"
        description="Enable or disable notifications"
        left={props => <List.Icon {...props} icon="bell" />}
        right={() => (
          <Switch
            value={isNotificationsEnabled}
            onValueChange={toggleNotifications}
          />
        )}
      />
      
      <Divider style={[styles.divider, { backgroundColor: currentThemeColors.divider }]} />
      
      {/* Đăng xuất */}
      <View style={styles.logoutContainer}>
        <Button
          mode="contained"
          onPress={logout}
          style={[styles.logoutButton, { backgroundColor: currentThemeColors.primary }]}
          labelStyle={{ color: currentThemeColors.text }}
        >
          Log Out
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 8,
  },
  logoutContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  logoutButton: {
    width: '100%',
  },
});

export default SettingsScreen;
