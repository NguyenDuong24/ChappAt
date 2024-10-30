import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

export default function ExploreLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          position: 'absolute',
          paddingBottom: 15,
          top: 50,
          elevation: 0,
          backgroundColor: 'rgba(255, 255, 255, 0)',
          borderBottomWidth: 1,
          borderBottomColor: Colors.borderLine,
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
            <Text style={[styles.tabLabel, focused && styles.focusedTabLabel]}>
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
            <Text style={[styles.tabLabel, focused && styles.focusedTabLabel]}>
              Phổ Biến
            </Text>
          ),
          tabBarIcon: () => null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    fontWeight: 'bold', // In đậm văn bản
    fontSize: 16, // Kích thước font chữ
    color: 'lightgray', // Màu sắc văn bản khi không được chọn
  },
  focusedTabLabel: {
    color: 'black', // Màu sắc văn bản khi được chọn
    fontSize: 18, // Tăng kích thước font chữ khi được chọn
  },
});
