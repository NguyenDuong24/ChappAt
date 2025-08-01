import React, { useContext } from 'react';
import { Stack } from 'expo-router';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import ChatListHeader from '../../../components/chat/ChatListHeader';
import { ThemeContext } from '../../../context/ThemeContext';
import { Colors } from '../../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

const StackLayout = () => {
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      
      {/* Modern Chat Header */}
      <LinearGradient
        colors={theme === 'dark' 
          ? ['#667eea', '#764ba2'] 
          : ['#667eea', '#764ba2']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <ChatListHeader />
      </LinearGradient>

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerGradient: {
    paddingTop: 45,
  },
});

export default StackLayout;
