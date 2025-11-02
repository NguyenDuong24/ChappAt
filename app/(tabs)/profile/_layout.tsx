import { View, Text } from 'react-native';
import React from 'react';
import { Stack } from 'expo-router';
import { useContext } from 'react';
import { ThemeContext } from '../../../context/ThemeContext';
import { Colors } from '@/constants/Colors';

const StackLayout = () => {
  const { theme } = useContext(ThemeContext);

  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="EditProfile"
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          headerStyle: {
            backgroundColor: currentThemeColors.backgroundHeader,
          },
          headerTitle: 'Cài Đặt',
          headerTintColor: currentThemeColors.text,
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          headerShown: false,
          headerStyle: {
            backgroundColor: currentThemeColors.backgroundHeader,
          },
          headerTitle: 'Tạo Post',
          headerTintColor: currentThemeColors.text,
        }}
      />
      <Stack.Screen
        name="ChangePasswordScreen"
        options={{
          headerStyle: {
            backgroundColor: currentThemeColors.backgroundHeader,
          },
          headerTitle: 'Đổi mật khẩu',
          headerTintColor: currentThemeColors.text,
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: 'bold',
          },
        }}
      />
    </Stack>
  );
};

export default StackLayout;
