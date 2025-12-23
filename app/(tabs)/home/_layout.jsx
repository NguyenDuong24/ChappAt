import { View, Text } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'
import HomeHeader from '@/components/home/HomeHeader';

const StackLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          header: () => <HomeHeader />,
          headerTransparent: true,
          headerTitle: "",
        }}
      />
      <Stack.Screen
        name="chat/[id]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  )
}

export default StackLayout