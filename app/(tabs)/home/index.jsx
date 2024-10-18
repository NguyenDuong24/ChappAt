import { View, Text } from 'react-native'
import React from 'react'
import { Link } from 'expo-router'

const Home = () => {
  return (
    <View>
      <Link href="/home/settings">Push Settings</Link>
    </View>
  )
}

export default Home