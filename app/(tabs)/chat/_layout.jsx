import { View, Text } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'
import ChatListHeader from '../../../components/chat/ChatListHeader';

const StackLayout = () => {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: () => <ChatListHeader title="Trò chuyện" />,
        }}
      />
    </Stack>
  )
}

export default StackLayout