import { Tabs } from 'expo-router';
import { Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { useContext } from 'react';
import { ThemeContext } from '@/context/ThemeContext';

export default function ExploreLayout() {
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  return (
    <View style={styles.container}>
      {/* Nền gradient phía trên */}
      <LinearGradient
        colors={['#1a1a1a', '#000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradientBackground}
      />
      <Tabs
        screenOptions={{
          tabBarStyle: {
            position: 'absolute',
            height: 85,
            paddingBottom: 15,
            top: 0,
            elevation: 0,
            backgroundColor: 'transparent', // Nền trong suốt cho gradient
            borderBottomWidth: 0,
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
                <Text
                  style={[
                    styles.tabLabel,
                    focused && { color: Colors.primary, fontSize: 16 },
                  ]}
                >
                  Mới Nhất
                </Text>
                {focused && (
                  <View
                    style={[
                      { backgroundColor: Colors.primary },
                    ]}
                  />
                )}
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
                <Text
                  style={[
                    styles.tabLabel,
                    focused && { color: Colors.primary, fontSize: 16 },
                  ]}
                >
                  Phổ Biến
                </Text>
                {focused && (
                  <View
                    style={[
                      { backgroundColor: Colors.primary },
                    ]}
                  />
                )}
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
    backgroundColor: '#000', // Nền đen
  },
  gradientBackground: {
    position: 'absolute',
    width: '100%',
    height: 150, // Chiều cao của gradient
    top: 0,
    zIndex: -1,
  },
  tabLabel: {
    fontWeight: '600',
    fontSize: 14,
    color: 'gray',
    textTransform: 'uppercase', // Chữ in hoa
    letterSpacing: 1.2, // Tạo khoảng cách giữa các chữ
  },
  tabContainer: {
    alignItems: 'center',
  },
  underline: {
    height: 4,
    width: 50,
    marginTop: 5,
    borderRadius: 2,
  },
});
