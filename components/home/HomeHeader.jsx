import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Appbar, Avatar, Button, Drawer, IconButton, useTheme } from 'react-native-paper';
import { useAuth } from '@/context/authContext';
import { FontAwesome } from 'react-native-vector-icons';

import { Colors } from '@/constants/Colors';

const HomeHeader = () => {
  const { logout, user } = useAuth();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const { colors } = useTheme();

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
      <Appbar.Header style={[styles.header, { backgroundColor: colors.primary }]}>
        <Appbar.Action icon="filter" onPress={toggleDrawer} color="white" />
        <Appbar.Content title="Dating App" titleStyle={[styles.title, { color: colors.text }]} />
        <View style={styles.rightContainer}>
          <Text style={[styles.greeting, { color: colors.text }]}>
            Hey there, {user ? user.displayName : 'Guest'}!
          </Text>
          {user && user.photoURL ? (
            <Avatar.Image size={40} source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <FontAwesome name="user-circle" size={40} color={colors.text} style={styles.avatar} />
          )}
          <Appbar.Action icon="logout" onPress={handleLogout} color="white" />
        </View>
      </Appbar.Header>
      {drawerVisible && (
        <Drawer.Section style={[styles.drawerSection, { backgroundColor: colors.background }]}>
          <Drawer.Item label="Filter Option 1" />
          <Drawer.Item label="Filter Option 2" />
          <Drawer.Item label="Filter Option 3" />
          <View style={styles.buttonContainer}>
            <Button mode="contained" onPress={toggleDrawer} color={colors.accent}>
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
    justifyContent: 'space-between',
    paddingTop: 0,
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
    paddingTop: 20,
    zIndex: 1,
    elevation: 5,
  },
  buttonContainer: {
    padding: 20,
  },
});

export default HomeHeader;
