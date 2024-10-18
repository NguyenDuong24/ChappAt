import { View, Text } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'
import HomeHeader from '@/components/HomeHeader';

const StackLayout = () => {
  return (
    <Stack>
        <Stack.Screen
         name="index"
         options={{
            headerTitle: "Chat Page",
         }}
        />
    </Stack>
  )
}

export default StackLayout