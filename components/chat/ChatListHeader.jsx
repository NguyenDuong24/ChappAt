import React, { useState, useContext } from 'react';
import { Appbar, Menu, Text } from 'react-native-paper';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';

const ChatListHeader = () => {
  const [menuVisible, setMenuVisible] = useState(false);
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  return (
    <Appbar.Header style={[styles.appbar, { backgroundColor: currentThemeColors.backgroundHeader }]}>
      <Appbar.Action
        icon={() => <MaterialCommunityIcons name="headset" size={24} color={currentThemeColors.text} />}
        onPress={() => {}}
      />
      <Appbar.Content 
        title="Trò chuyện" 
        titleStyle={{ color: currentThemeColors.text, fontSize: 20, fontWeight: 'bold' }} 
      />
      <Appbar.Action 
        icon={() => <MaterialIcons name="more-vert" size={24} color={currentThemeColors.text} />} 
        onPress={openMenu} 
      />

      <Menu
        visible={menuVisible}
        onDismiss={closeMenu}
        anchor={<View />}
      >
        <Menu.Item
          onPress={() => { closeMenu(); }}
          title={
            <View style={styles.menuItem}>
              <Ionicons name="person-add" size={24} color={currentThemeColors.text} />
              <Text style={[styles.menuText, { color: currentThemeColors.text }]}>Thêm bạn</Text>
            </View>
          }
        />
        <Menu.Item
          onPress={() => { closeMenu(); }}
          title={
            <View style={styles.menuItem}>
              <MaterialIcons name="find-in-page" size={24} color={currentThemeColors.text} />
              <Text style={[styles.menuText, { color: currentThemeColors.text }]}>Tìm chat</Text>
            </View>
          }
        />
      </Menu>
    </Appbar.Header>
  );
};

const styles = StyleSheet.create({
  appbar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 10,
  },
  menuText: {
    fontSize: 16,
    marginLeft: 10,
    fontWeight: '500',
  },
});

export default ChatListHeader;
