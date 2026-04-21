import React from 'react';
import { Stack } from 'expo-router';

const StackLayout = () => {
  return (
    <Stack
      screenOptions={{
        animation: 'slide_from_right',
        animationDuration: 200,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
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
        name="EditProfile"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="settings"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />

      <Stack.Screen
        name="create"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="ChangePasswordScreen"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
};

export default StackLayout;
