import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Appbar, Avatar } from 'react-native-paper';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';

export default function ChatRoomHeader({ user, router }: any) {
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  return (
    <Appbar.Header style={[styles.header, { backgroundColor: currentThemeColors.backgroundHeader }]}>
      <Appbar.BackAction onPress={() => router.back()} color={currentThemeColors.text} />
      <Appbar.Content title={user?.username} titleStyle={{ color: currentThemeColors.text }} />
      <Appbar.Action icon="dots-vertical" onPress={() => { }} color={currentThemeColors.text} />
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    padding: 10,
  },
  header: {
    height: 50
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 10,
  },
  headerRight: {
    flexDirection: 'row',
  },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: 18,
  },
});
