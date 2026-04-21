import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Menu } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemedColors } from '@/hooks/useThemedColors';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { formatTime } from '@/utils/common';
import { getPrivacyIcon } from '@/utils/postPrivacyUtils';
import VibeAvatar from '@/components/vibe/VibeAvatar';
import { UserVibe } from '@/types/vibe';
import { getLiquidMenuContentStyle, getLiquidMenuItemTitleStyle } from '@/components/liquid';

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
  const colors = useThemedColors();
  const { theme } = useTheme();
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
            <Text style={[styles.username, { color: colors.text }]} numberOfLines={1}>
              {userInfo?.username || 'Unknown User'}
            </Text>
            {/* Privacy Icon */}
            <MaterialIcons
              name={getPrivacyIcon(postPrivacy) as any}
              size={14}
              color={colors.subtleText}
              style={styles.privacyIcon}
            />
          </View>
          <Text style={[styles.time, { color: colors.subtleText }]}>
            {formatTime(timestamp)}
          </Text>
        </View>
      </TouchableOpacity>

      {!isOwner && (
        <TouchableOpacity
          style={[styles.followButton,
            {
              borderColor: colors.primary,
              backgroundColor: isFollowing ? colors.primary : 'transparent',
              opacity: isFollowing ? 1 : 0.85
            }
          ]}
          onPress={onFollowPress}
          disabled={isFollowing}
          activeOpacity={0.7}
        >
          <Text style={[styles.followText, { color: isFollowing ? '#fff' : colors.primary }]}>
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
              <TouchableOpacity onPress={openMenu} style={styles.menuButton} activeOpacity={0.6}>
                <MaterialIcons
                  name="more-vert"
                  size={24}
                  color={colors.icon}
                />
              </TouchableOpacity>
            }
            contentStyle={[styles.menuContent, getLiquidMenuContentStyle(theme)]}
          >
            <Menu.Item
              onPress={handlePrivacyChange}
              title="Quyền riêng tư"
              titleStyle={getLiquidMenuItemTitleStyle(theme)}
              leadingIcon="shield-account"
              dense
            />
            <Menu.Item
              onPress={handleDeletePost}
              title="Xóa bài viết"
              titleStyle={[getLiquidMenuItemTitleStyle(theme), { color: '#ff4444' }]}
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
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'space-between',
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
    marginTop: 1,
  },
  username: {
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 3,
    letterSpacing: 0.3,
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
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.7,
  },
  menuWrapper: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
    marginRight: -8,
  },
  menuContent: {
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 150,
  },
  followButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1.5,
    marginLeft: 8,
  },
  followText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default React.memo(PostHeader, (prev, next) => {
  return (
    prev.userId === next.userId &&
    prev.timestamp === next.timestamp &&
    prev.isFollowing === next.isFollowing &&
    prev.postPrivacy === next.postPrivacy &&
    prev.userInfo?.profileUrl === next.userInfo?.profileUrl &&
    prev.userInfo?.username === next.userInfo?.username &&
    prev.userInfo?.activeFrame === next.userInfo?.activeFrame &&
    prev.isOwner === next.isOwner
  );
});
