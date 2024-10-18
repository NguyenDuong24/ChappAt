import { View, Text } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'

const StackLayout = () => {
  return (
    <Stack>
        <Stack.Screen
         name="index"
         options={{
            headerTitle: "Profile Page",
         }}
        />
    </Stack>
  )
}

export default StackLayout