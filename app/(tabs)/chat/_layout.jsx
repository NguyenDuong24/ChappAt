import React, { useContext } from 'react';
import { Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import ChatListHeader from '../../../components/chat/ChatListHeader';
import { ThemeContext } from '../../../context/ThemeContext';
import { Colors } from '../../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const StackLayout = () => {
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar
        style="light"
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
        style={[styles.headerGradient, { paddingTop: insets.top }]}
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
    // paddingTop provided by insets.top for consistent safe area
  },
});

export default StackLayout;
