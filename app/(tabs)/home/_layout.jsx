import { View, Text } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'
import HomeHeader from '@/components/home/HomeHeader';

const StackLayout = () => {
  return (
    <Stack>
        <Stack.Screen
         name="index"
         options={{
            headerShown: true,
            header: () => <HomeHeader/>,
            headerTransparent: true,
            headerTitle: "",
         }}
        />
    </Stack>
  )
}

export default StackLayout