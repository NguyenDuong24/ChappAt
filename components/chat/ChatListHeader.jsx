import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';

const ChatListHeader = () => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  
  const toggleDrawer = () => setDrawerVisible(!drawerVisible);

  return (
    <View style={styles.container}>
      {/* Modern Header */}
      <View style={styles.header}>
        {/* Left section */}
        <View style={styles.leftSection}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="chat" size={28} color="white" />
          </View>
          <View style={styles.titleSection}>
            <Text style={styles.title}>Trò chuyện</Text>
            <Text style={styles.subtitle}>✨ Kết nối với bạn bè</Text>
          </View>
        </View>

        {/* Right section */}
        <View style={styles.rightSection}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/AddFriend')}
          >
            <Ionicons name="person-add" size={22} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={toggleDrawer}
          >
            <MaterialIcons name="more-vert" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Modern Dropdown Menu */}
      {drawerVisible && (
        <View style={styles.dropdown}>
          <TouchableOpacity 
            style={styles.dropdownItem}
            onPress={() => {
              setDrawerVisible(false);
              router.push('/AddFriend');
            }}
          >
            <View style={styles.dropdownIconContainer}>
              <Ionicons name="person-add" size={20} color="#667eea" />
            </View>
            <Text style={styles.dropdownText}>Thêm bạn</Text>
          </TouchableOpacity>

          <View style={styles.dropdownDivider} />

          <TouchableOpacity 
            style={styles.dropdownItem}
            onPress={() => {
              setDrawerVisible(false);
              // Handle search navigation
            }}
          >
            <View style={styles.dropdownIconContainer}>
              <MaterialIcons name="search" size={20} color="#667eea" />
            </View>
            <Text style={styles.dropdownText}>Tìm kiếm tin nhắn</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    height: 80,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  dropdown: {
    position: 'absolute',
    top: 85,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    minWidth: 200,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    paddingVertical: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
    marginHorizontal: 16,
  },
});

export default ChatListHeader;
