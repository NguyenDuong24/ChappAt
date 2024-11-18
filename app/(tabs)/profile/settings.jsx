import React, { useState, useContext } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { List, Divider, Switch, Title, Button } from 'react-native-paper';
import { ThemeContext } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/authContext';
import { Colors } from '@/constants/Colors';
import { useNavigation } from '@react-navigation/native';

const SettingsScreen = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [isNotificationsEnabled, setNotificationsEnabled] = useState(false);
  const { logout } = useAuth();
  const toggleNotifications = () => setNotificationsEnabled(!isNotificationsEnabled);

  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const navigation = useNavigation();

  const handleLogout = () => {
    Alert.alert(
      'Xác nhận đăng xuất',
      'Bạn có chắc muốn đăng xuất không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'OK',
          onPress: async () => {
            try {
              await logout();
              console.log('Người dùng đã đăng xuất thành công');
            } catch (error) {
              console.error('Lỗi khi đăng xuất: ', error);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const navigateToProfileEdit = () => {
    navigation.navigate('EditProfile');
  };

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>

      <List.Item
        title="Chỉnh sửa Hồ sơ"
        description="Cập nhật thông tin hồ sơ của bạn"
        left={props => <List.Icon {...props} icon="account-edit" />}
        onPress={navigateToProfileEdit}
      />
      
      <Divider style={[styles.divider, { backgroundColor: currentThemeColors.divider }]} />

      <List.Item
        title="Chế độ Dark"
        description="Kích hoạt chế độ tối cho ứng dụng"
        left={props => <List.Icon {...props} icon="theme-light-dark" />}
        right={() => (
          <Switch
            value={theme === 'dark'} 
            onValueChange={toggleTheme}
          />
        )}
      />
      
      <Divider style={[styles.divider, { backgroundColor: currentThemeColors.divider }]} />
      
      <List.Item
        title="Thông báo"
        description="Kích hoạt hoặc tắt thông báo"
        left={props => <List.Icon {...props} icon="bell" />}
        right={() => (
          <Switch
            value={isNotificationsEnabled}
            onValueChange={toggleNotifications}
          />
        )}
      />
      
      <Divider style={[styles.divider, { backgroundColor: currentThemeColors.divider }]} />
      
      <View style={styles.logoutContainer}>
        <Button
          mode="contained"
          onPress={handleLogout}
          style={[styles.logoutButton, { backgroundColor: Colors.primary }]}
          labelStyle={{ color: currentThemeColors.text }}
        >
          Đăng xuất
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
