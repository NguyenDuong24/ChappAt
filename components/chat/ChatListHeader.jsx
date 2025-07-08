import React, { useState, useContext } from 'react';
import { Appbar, Drawer } from 'react-native-paper';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
const ChatListHeader = () => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const navigation = useNavigation();
  const router = useRouter();
  const toggleDrawer = () => setDrawerVisible(!drawerVisible);

  return (
    <View>
      {/* Appbar Header */}
      <Appbar.Header style={[styles.appbar, { backgroundColor: currentThemeColors.backgroundHeader }]}>
        {/* Nút hỗ trợ */}
        <Appbar.Action
          icon={() => (
            <MaterialCommunityIcons name="headset" size={24} color={currentThemeColors.text} />
          )}
          onPress={() => console.log('Hỗ trợ được nhấn')}
        />

        {/* Tiêu đề */}
        <Appbar.Content
          title="Trò chuyện"
          titleStyle={{ color: currentThemeColors.text, fontSize: 20, fontWeight: 'bold' }}
        />

        {/* Nút menu */}
        <Appbar.Action
          icon={() => (
            <MaterialIcons name="more-vert" size={24} color={currentThemeColors.text} />
          )}
          onPress={toggleDrawer}
        />
      </Appbar.Header>

      {/* Drawer Section */}
      {drawerVisible && (
        <Drawer.Section style={[styles.drawer, { backgroundColor: currentThemeColors.backgroundHeader }]}>
          {/* Mục "Thêm bạn" */}
          <Drawer.Item
            icon={() => <Ionicons name="person-add" size={24} color={currentThemeColors.text} />}
            label="Thêm bạn"
            labelStyle={{ color: currentThemeColors.text }}
            onPress={() => {
              router.push('/AddFriend');
          }
        }
          />

          {/* Mục "Tìm chat" */}
          <Drawer.Item
            icon={() => <MaterialIcons name="find-in-page" size={24} color={currentThemeColors.text} />}
            label="Tìm kiếm tin nhắn"
            labelStyle={{ color: currentThemeColors.text }}
            onPress={() => {
              setDrawerVisible(false);
              navigation.navigate('SearchChatScreen'); // Chuyển đến màn hình Tìm kiếm tin nhắn
            }}
          />
        </Drawer.Section>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  appbar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56, // Chiều cao tiêu chuẩn cho thanh Appbar
    elevation: 0, // Loại bỏ đổ bóng
  },
  drawer: {
    position: 'absolute',
    top: 60, // Hiển thị ngay dưới Appbar
    right: 10,
    borderRadius: 8,
    elevation: 4, // Hiệu ứng đổ bóng
    width: 200, // Định rõ kích thước menu
  },
});

export default ChatListHeader;
