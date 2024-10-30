import React, { useState } from 'react';
import { Appbar, Text, Menu, Button } from 'react-native-paper';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

const ChatListHeader = () => {
  const [menuVisible, setMenuVisible] = useState(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  return (
    <View style={styles.appbar}>
      <View style={{ margin: 0 }}>
        <TouchableOpacity>
          <MaterialCommunityIcons name="headset" size={24} />
        </TouchableOpacity>
      </View>
      <View>
        <Text variant="headlineSmall" style={{
          color: 'black'
        }}>Trò chuyện</Text>
      </View>
      <View>
        <Menu
          style={{ transform: [{ translateY: 65 }] }}
          visible={menuVisible}
          onDismiss={closeMenu}
          anchor={
            <View>
            <TouchableOpacity onPress={openMenu} >
              <MaterialIcons name="more-vert" size={24} color="black" />
            </TouchableOpacity>
            </View>
          }
        >
          <Menu.Item onPress={() => { closeMenu() }} title={
              <View style={styles.menuItem}>
                <Ionicons name="person-add" size={24} color="white" />
                <Text style={styles.menuText}>Thêm bạn</Text>
              </View>
            }/>
          <Menu.Item onPress={() => { closeMenu()}} title={
            <View style={styles.menuItem}>
              <MaterialIcons name="find-in-page" size={24} color="white" />
              <Text style={styles.menuText}>Tìm chat</Text>
            </View>
          } />
        </Menu>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  appbar: {
    width: '100%',
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 5,
    paddingVertical: 10,
    paddingRight: 25,
  },
  menuItem:{
    display: 'flex',
    flexDirection: 'row',
    alignItems: "center",
    width: "100%",
    justifyContent: "space-evenly"
  }
});

export default ChatListHeader;
