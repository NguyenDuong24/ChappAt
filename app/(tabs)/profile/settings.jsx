import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../../../context/authContext';
import SettingsScreen from '@/components/settings/SettingsScreen';

const Settings = () => {
  const { logout, user, name, email, icon } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      console.log('Người dùng đã đăng xuất thành công');
    } catch (error) {
      console.error('Lỗi khi đăng xuất: ', error);
    }
  };

  // Compose a lightweight currentUser for SettingsScreen display
  const currentUser = {
    uid: user?.uid,
    username: name || '',
    displayName: user?.displayName || '',
    email: email || user?.email || '',
    profileUrl: icon || user?.photoURL || '',
  };

  return (
    <View style={styles.container}>
      <SettingsScreen
        currentUser={currentUser}
        onSignOut={handleLogout}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default Settings;
