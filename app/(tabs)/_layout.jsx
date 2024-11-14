import React, { useContext } from 'react';
import { Tabs } from 'expo-router';
import { Entypo, Ionicons, FontAwesome, Feather } from '@expo/vector-icons';
import { ThemeContext } from '../../context/ThemeContext'; // Đảm bảo đường dẫn chính xác
import { Colors } from '../../constants/Colors'; // Đảm bảo đã khai báo màu sắc cho theme
import { View, StyleSheet } from 'react-native';

export default function TabsLayout() {
  const { theme } = useContext(ThemeContext); // Lấy theme từ ThemeContext

  // Chọn màu sắc cho tab bar icons và nền dựa trên theme
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  return (
    <Tabs>
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={24} color={color || currentThemeColors.text} />
          ),
          headerShown: false,
          tabBarStyle: {
            backgroundColor: currentThemeColors.background, // Đổi màu nền cho tab bar
          },
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Feather name="globe" size={24} color={color || currentThemeColors.text} />
          ),
          tabBarStyle: {
            backgroundColor: currentThemeColors.background, // Đổi màu nền cho tab bar
          },
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Entypo name="chat" size={24} color={color || currentThemeColors.text} />
          ),
          tabBarStyle: {
            backgroundColor: currentThemeColors.background, // Đổi màu nền cho tab bar
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <FontAwesome name="user-circle-o" size={24} color={color || currentThemeColors.text} />
          ),
          tabBarStyle: {
            backgroundColor: currentThemeColors.background, // Đổi màu nền cho tab bar
          },
        }}
      />
    </Tabs>
  );
}

// Style cho màn hình
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
