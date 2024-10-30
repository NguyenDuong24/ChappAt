import { View, Text } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'

const StackLayout = () => {
  return (
    <Stack>
        <Stack.Screen
         name="index"
         options={{
            headerShown: false
         }}
        />
        <Stack.Screen name="GenderSelectionScreen" options={{
            headerShown: false
        }} />
        <Stack.Screen name="NameInputScreen" options={{  
            headerShown: false
        }} />
        <Stack.Screen name="EmailInputScreen" options={{  
            headerShown: false
        }} />
        <Stack.Screen name="PasswordInputScreen" options={{  
            headerShown: false
        }} />
    </Stack>
  )
}

export default StackLayout