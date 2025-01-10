import React, { useContext } from 'react';
import { Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import ChatListHeader from '../../../components/chat/ChatListHeader';
import { ThemeContext } from '../../../context/ThemeContext';
import { Colors } from '../../../constants/Colors';

const StackLayout = () => {
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          header: () => <ChatListHeader title="Trò chuyện" />,
          headerStyle: {
            backgroundColor: currentThemeColors.background,
          },
          headerTitleStyle: {
            color: currentThemeColors.text,
          },
        }}
      />
    </Stack>
  );
};

export default StackLayout;
