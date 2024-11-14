import { Tabs } from 'expo-router';
import { Text, StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useContext } from 'react';
import { ThemeContext } from '@/context/ThemeContext';

export default function ExploreLayout() {
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  return (
    <View style={[styles.container]}>
      <Tabs
      screenOptions={{
        tabBarStyle: {
          position: 'absolute',
          paddingBottom: 15,
          top: 50,
          elevation: 0,
          backgroundColor: currentThemeColors.background,
          borderBottomWidth: 1,
          borderBottomColor: 'white',
          borderTopWidth: 0,
          shadowColor: 'transparent',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="tab1"
        options={{
          tabBarLabel: ({ focused }) => (
            <Text style={[styles.tabLabel, focused && { color: currentThemeColors.text, fontSize: 18 }]}>
              Mới Nhất
            </Text>
          ),
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
        name="tab2"
        options={{
          tabBarLabel: ({ focused }) => (
            <Text style={[styles.tabLabel, focused && { color: currentThemeColors.text, fontSize: 18 }]}>
              Phổ Biến
            </Text>
          ),
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
          name="explore/[id]"
          options={{
            headerShown: false,
          }}
        />
    </Tabs>
    
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabLabel: {
    fontWeight: 'bold',
    fontSize: 16,
    color: 'lightgray',
  },
});
