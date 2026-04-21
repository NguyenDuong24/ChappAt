import React from 'react'
import { Stack } from 'expo-router'

const StackLayout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 200,
        gestureEnabled: true,
        freezeOnBlur: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          animation: 'fade',
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
