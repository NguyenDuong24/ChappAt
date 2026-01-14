import React, { useContext, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Menu } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { formatTime } from '@/utils/common';
import { getPrivacyIcon } from '@/utils/postPrivacyUtils';
import VibeAvatar from '@/components/vibe/VibeAvatar';
import { UserVibe } from '@/types/vibe';

interface PostHeaderProps {
  userInfo: {
    username: string;
    profileUrl?: string;
    currentVibe?: UserVibe | null;
    activeFrame?: string;
  } | null;
  timestamp: any;
  userId: string;
  isOwner: boolean;
  onUserPress: () => void;
  onDeletePost: () => void;
  onPrivacyChange?: () => void;
  postPrivacy?: 'public' | 'friends' | 'private';
  isFollowing?: boolean;
  onFollowPress?: () => void;
}

const PostHeader: React.FC<PostHeaderProps> = ({
  userInfo,
  timestamp,
  userId,
  isOwner,
  onUserPress,
  onDeletePost,
  onPrivacyChange,
  postPrivacy = 'public',
  isFollowing = false,
  onFollowPress
}) => {
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
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
        <VibeAvatar
          avatarUrl={userInfo?.profileUrl || 'https://via.placeholder.com/150'}
          size={44}
          currentVibe={userInfo?.currentVibe || null}
          showAddButton={false}
          frameType={userInfo?.activeFrame}
          storyUser={{ id: userId, username: userInfo?.username, profileUrl: userInfo?.profileUrl }}
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

      {!isOwner && (
        <TouchableOpacity
          style={[
            styles.followButton,
            {
              borderColor: Colors.primary,
              backgroundColor: isFollowing ? Colors.primary : 'transparent'
            }
          ]}
          onPress={onFollowPress}
          disabled={isFollowing}
        >
          <Text style={[styles.followText, { color: isFollowing ? '#fff' : Colors.primary }]}>
            {isFollowing ? 'Đã theo dõi' : 'Theo dõi'}
          </Text>
        </TouchableOpacity>
      )}

      {isOwner && (
        <View style={styles.menuWrapper}>
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
            contentStyle={[styles.menuContent, { backgroundColor: currentThemeColors.surface }]}
          >
            <Menu.Item
              onPress={handlePrivacyChange}
              title="Quyền riêng tư"
              titleStyle={{ fontSize: 14, color: currentThemeColors.text }}
              leadingIcon="shield-account"
              dense
            />
            <Menu.Item
              onPress={handleDeletePost}
              title="Xóa bài viết"
              titleStyle={{ fontSize: 14, color: '#ff4444' }}
              leadingIcon="delete"
              dense
            />
          </Menu>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
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
    marginLeft: 12,
    marginTop: 2,
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
  menuWrapper: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  menuButton: {
    padding: 4,
    marginRight: -8, // Adjust to align with edge
  },
  menuContent: {
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 150,
  },
  followButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginLeft: 8,
  },
  followText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default PostHeader;
