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
    <Tabs
      screenOptions={{
        tabBarShowLabel: false, // Loại bỏ văn bản dưới biểu tượng
        tabBarStyle: {
          backgroundColor: currentThemeColors.background, // Đổi màu nền cho tab bar
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              <Ionicons
                name="home"
                size={focused ? 30 : 24}
                color={focused ? Colors.primary : currentThemeColors.text}
              />
              {focused && <View style={[styles.indicator, {backgroundColor: Colors.primary}]} />}
            </View>
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              <Feather
                name="globe"
                size={focused ? 30 : 24}
                color={focused ? Colors.primary : currentThemeColors.text}
              />
               {focused && <View style={[styles.indicator, {backgroundColor: Colors.primary}]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              <Entypo
                name="chat"
                size={focused ? 30 : 24}
                color={focused ? Colors.primary : currentThemeColors.text}
              />
               {focused && <View style={[styles.indicator, {backgroundColor: Colors.primary}]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              <FontAwesome
                name="user-circle-o"
                size={focused ? 30 : 24}
                color={focused ? Colors.primary : currentThemeColors.text}
              />
               {focused && <View style={[styles.indicator, {backgroundColor: Colors.primary}]} />}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

// Style cho màn hình
const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    height: 3,
    width: 20,
    marginTop: 5,
    borderRadius: 2,
  },
});
