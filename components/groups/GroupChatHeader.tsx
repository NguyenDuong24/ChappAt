import React, { useContext, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Avatar, Menu, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/authContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

interface GroupChatHeaderProps {
  group: any;
  onBack?: () => void;
}

const GroupChatHeader = ({ group, onBack }: GroupChatHeaderProps) => {
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const { user } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const getGroupAvatar = () => {
    return group?.avatarUrl || 'https://via.placeholder.com/40x40/667eea/ffffff?text=G';
  };

  const getMemberCount = () => {
    return group?.members ? group.members.length : 0;
  };

  const isGroupAdmin = () => {
    return group?.createdBy === user?.uid || group?.admins?.includes(user?.uid);
  };

  const handleBackPress = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleGroupInfo = () => {
    setMenuVisible(false);
    router.push(`/GroupManagementScreen?id=${group.id}`);
  };

  const handleViewMembers = () => {
    setMenuVisible(false);
    router.push(`/GroupManagementScreen?id=${group.id}`);
  };

  const handleAddMembers = () => {
    setMenuVisible(false);
    router.push(`/GroupManagementScreen?id=${group.id}`);
  };

  const handleLeaveGroup = () => {
    setMenuVisible(false);
    Alert.alert(
      'Rời nhóm',
      'Bạn có chắc chắn muốn rời khỏi nhóm này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Rời nhóm', 
          style: 'destructive',
          onPress: () => {
            // Implement leave group logic here
            console.log('Leave group:', group.id);
          }
        }
      ]
    );
  };

  const handleJoinVoiceChat = () => {
    router.push({ pathname: '/GroupVoiceRoom', params: { groupId: group.id } });
  };

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.backgroundHeader, paddingTop: insets.top }]}> 
      {/* Control status bar color when native header is hidden */}
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor={currentThemeColors.backgroundHeader} />
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={currentThemeColors.text}
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.avatarSection}
            onPress={handleGroupInfo}
          >
            <Avatar.Image
              size={40}
              source={{ uri: getGroupAvatar() }}
              style={styles.avatar}
            />
            
            <View style={styles.groupInfo}>
              <Text style={[styles.groupName, { color: currentThemeColors.text }]} numberOfLines={1}>
                {group?.name || 'Nhóm không tên'}
              </Text>
              <Text style={[styles.memberInfo, { color: currentThemeColors.subtleText }]}
              >
                {getMemberCount()} thành viên
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.rightSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleJoinVoiceChat}
          >
            <MaterialCommunityIcons
              name="phone"
              size={24}
              color={currentThemeColors.tint}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // dedicated wrapper to apply safe-area padding and background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    // Removed hardcoded paddingTop to avoid double spacing under cutouts
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
  },
  memberInfo: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 16,
    padding: 4,
  },
  menu: {
    borderRadius: 12,
    marginTop: 8,
  },
});

export default GroupChatHeader;