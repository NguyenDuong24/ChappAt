import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Appbar, Drawer, Avatar, Button, IconButton, DrawerSection, DrawerItem } from 'react-native-paper';
import { useAuth } from '@/context/authContext';
import { FontAwesome } from 'react-native-vector-icons';

import { Colors } from '@/constants/Colors';

const HomeHeader = () => {
  const { logout, user } = useAuth();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const toggleDrawer = () => {
    setDrawerVisible(!drawerVisible);
  };

  return (
    <View>
      <Appbar.Header style={styles.header}>
        <Appbar.Action icon="filter" onPress={toggleDrawer} color="white" />
        <Appbar.Content title="Dating App" titleStyle={styles.title} />
        <View style={styles.rightContainer}>
          <Text style={styles.greeting}>Hey there, {user ? user.displayName : 'Guest'}!</Text>
          {user && user.photoURL ? (
            <Avatar.Image size={40} source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <FontAwesome name="user-circle" size={40} color="white" style={styles.avatar} />
          )}
          <Appbar.Action icon="logout" onPress={handleLogout} color="white" />
        </View>
      </Appbar.Header>

      {drawerVisible && (
        <Drawer.Section style={styles.drawerSection}>
          <Drawer.Item label="Filter Option 1" />
          <Drawer.Item label="Filter Option 2" />
          <Drawer.Item label="Filter Option 3" />
          <View style={styles.buttonContainer}>
            <Button mode="contained" onPress={toggleDrawer}>
              Apply
            </Button>
          </View>
        </Drawer.Section>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.light.backgroundHeader, 
    justifyContent: 'space-between',
  },
  title: {
    fontWeight: 'bold',
    fontSize: 20,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    color: 'white',
    marginRight: 10,
  },
  avatar: {
    marginRight: 10,
  },
  drawerSection: {
    position: 'absolute',
    top: 56, 
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingTop: 20,
    zIndex: 1, 
  },
  buttonContainer: {
    padding: 20,
  },
});

export default HomeHeader;
