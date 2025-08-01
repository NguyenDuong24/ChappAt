import React, { useContext, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Menu } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { formatTime } from '@/utils/common';
import { getPrivacyIcon } from '@/utils/postPrivacyUtils';
import CustomImage from './CustomImage';

interface PostHeaderProps {
  userInfo: {
    username: string;
    profileUrl?: string;
  } | null;
  timestamp: any;
  userId: string;
  isOwner: boolean;
  onUserPress: () => void;
  onDeletePost: () => void;
  onPrivacyChange?: () => void; // Thêm callback cho privacy
  postPrivacy?: 'public' | 'friends' | 'private'; // Thêm privacy level
}

const PostHeader: React.FC<PostHeaderProps> = ({
  userInfo,
  timestamp,
  userId,
  isOwner,
  onUserPress,
  onDeletePost,
  onPrivacyChange,
  postPrivacy = 'public'
}) => {
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const [menuVisible, setMenuVisible] = useState(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleDeletePost = () => {
    closeMenu();
    onDeletePost();
  };

  const handlePrivacyChange = () => {
    closeMenu();
    onPrivacyChange?.();
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onUserPress} style={styles.userContainer}>
        <CustomImage
          source={userInfo?.profileUrl || 'default_avatar_url_here'}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <View style={styles.usernameContainer}>
            <Text style={[styles.username, { color: currentThemeColors.text }]}>
              {userInfo?.username || 'Unknown User'}
            </Text>
            {/* Privacy Icon */}
            <MaterialIcons 
              name={getPrivacyIcon(postPrivacy) as any} 
              size={14} 
              color={currentThemeColors.subtleText}
              style={styles.privacyIcon}
            />
          </View>
          <Text style={[styles.time, { color: currentThemeColors.subtleText }]}>
            {formatTime(timestamp)}
          </Text>
        </View>
      </TouchableOpacity>
      
      {isOwner && (
        <Menu
          visible={menuVisible}
          onDismiss={closeMenu}
          anchor={
            <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
              <MaterialIcons 
                name="more-vert" 
                size={24} 
                color={currentThemeColors.icon} 
              />
            </TouchableOpacity>
          }
          contentStyle={[styles.menuContent, { backgroundColor: currentThemeColors.background }]}
        >
          <Menu.Item 
            onPress={handlePrivacyChange} 
            title="Quyền riêng tư"
            titleStyle={{ color: currentThemeColors.text }}
            leadingIcon="shield-account"
          />
          <Menu.Item 
            onPress={handleDeletePost} 
            title="Xóa bài viết"
            titleStyle={{ color: '#ff4444' }}
            leadingIcon="delete"
          />
        </Menu>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 2,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  privacyIcon: {
    marginLeft: 6,
  },
  time: {
    fontSize: 13,
    fontWeight: '400',
  },
  menuButton: {
    padding: 4,
  },
  menuContent: {
    borderRadius: 8,
    marginTop: 8,
  },
});

export default PostHeader;
