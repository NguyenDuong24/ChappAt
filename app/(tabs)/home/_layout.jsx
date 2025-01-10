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
            tabBarLabel: () => null,
            header : ()=> <HomeHeader/>,
            headerTitle: "Home Page",
            
         }}
        />
    </Stack>
  )
}

export default StackLayout