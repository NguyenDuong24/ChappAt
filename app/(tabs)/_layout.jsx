import { View, Text } from 'react-native'
import React from 'react'
import { Tabs } from 'expo-router'
import { Entypo, Ionicons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';

export default () => {
  return (
    <Tabs>
      <Tabs.Screen name="home" options={{
        tabBarIcon:({color})=><Ionicons name='home' size={24} color={color}></Ionicons>,
        headerShown: false
      }}/>
      <Tabs.Screen name="explore" options={{
        headerShown: false,
        tabBarIcon:({color})=><Feather name="globe" size={24} color={color} />
      }}/>
      <Tabs.Screen name="chat" options={{
         headerShown: false,
         tabBarIcon:({color})=><Entypo name="chat" size={24} color={color} />
        }}/>
      <Tabs.Screen name="profile" options={{
        headerShown: false, 
        tabBarIcon:({color})=><FontAwesome name="user-circle-o" size={24} color={color} />
      }}/>
    </Tabs>
  )
}
