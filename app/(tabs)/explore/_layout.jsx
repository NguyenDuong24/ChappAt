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
            height: 95,
            paddingBottom: 25,
            top: 0,
            elevation: 0,
            backgroundColor: currentThemeColors.backgroundHeader,
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
              <View style={styles.tabContainer}>
                <Text style={[styles.tabLabel, focused && { color: currentThemeColors.text, fontSize: 20 }]}>
                  Mới Nhất
                </Text>
                {focused && <View style={[styles.underline, { backgroundColor: currentThemeColors.text }]} />}
              </View>
            ),
            tabBarIcon: () => null,
          }}
        />
        <Tabs.Screen
          name="tab2"
          options={{
            tabBarLabel: ({ focused }) => (
              <View style={styles.tabContainer}>
                <Text style={[styles.tabLabel, focused && { color: currentThemeColors.text, fontSize: 18 }]}>
                  Phổ Biến
                </Text>
                {focused && <View style={[styles.underline, { backgroundColor: currentThemeColors.text }]} />}
              </View>
            ),
            tabBarIcon: () => null,
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
    fontSize: 18,
    color: 'lightgray',
  },
  tabContainer: {
    alignItems: 'center',
  },
  underline: {
    height: 3,
    width: 80,
    marginTop: 5,
    borderRadius: 2,
  },
});
