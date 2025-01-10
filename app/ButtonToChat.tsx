import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import React, { useContext, useEffect, useRef } from 'react';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function ButtonToChat({id}) {
  const router = useRouter();
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  return (
    <View style={[styles.createPostButton, {backgroundColor: Colors.primary}]}>
      <TouchableOpacity style={{
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center'
      }} onPress={() =>
        router.push({
          pathname: "/chat/[id]",
          params: { id: id }
        })}>
        <Text style={{
          marginRight: 10,
          color: currentThemeColors.background,
          fontSize: 20
        }}>Gửi tin nhắn</Text>
       <Ionicons name="chatbox-outline" size={40} color={currentThemeColors.background}/>

      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  createPostButton: {
    borderRadius: 20,
    height: 50,
    width: 200,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    position: 'absolute',
    bottom: 50,
    right: 10
  },
});
