import React, { useContext } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/authContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

const withAlpha = (color: string | undefined, alphaHex: string, fallback: string) => {
  if (typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color)) {
    return `${color}${alphaHex}`;
  }
  return fallback;
};

interface GroupChatHeaderProps {
  group: any;
  onBack?: () => void;
  currentThemeColors?: any;
  onOpenManagementDrawer?: () => void;
}

const GroupChatHeader = ({ group, onBack, currentThemeColors: chatThemeColors, onOpenManagementDrawer }: GroupChatHeaderProps) => {
  const { t } = useTranslation();
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const currentThemeColors = chatThemeColors || (Colors[theme] || Colors.light);
  const isDarkHeader = !!currentThemeColors.isDarkChatTheme || !!themeCtx?.isDark || theme === 'dark';
  const headerBackground = currentThemeColors.backgroundHeader || currentThemeColors.background;
  const headerBorder = currentThemeColors.menuBorder || currentThemeColors.border;
  const tintSoft = withAlpha(currentThemeColors.tint, '22', isDarkHeader ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)');
  const tintBorder = withAlpha(currentThemeColors.tint, '55', headerBorder || 'rgba(148,163,184,0.22)');
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const getGroupAvatar = () => {
    return group?.avatarUrl || 'https://via.placeholder.com/40x40/0EA5E9/ffffff?text=G';
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
    if (onOpenManagementDrawer) {
      onOpenManagementDrawer();
      return;
    }
    router.push(`/groups/${group.id}`);
  };

  const handleJoinVoiceChat = () => {
    router.push({ pathname: '/(screens)/groups/GroupVoiceRoom', params: { groupId: group.id } });
  };

  return (
    <View style={[styles.container, { backgroundColor: headerBackground, borderBottomColor: headerBorder, paddingTop: insets.top }]}>
      {/* Control status bar color when native header is hidden */}
      <StatusBar style={isDarkHeader ? 'light' : 'dark'} backgroundColor={headerBackground} />
      <LinearGradient
        colors={isDarkHeader
          ? [currentThemeColors.surface || 'rgba(255,255,255,0.08)', 'rgba(0,0,0,0.12)']
          : [currentThemeColors.surface || 'rgba(255,255,255,0.88)', headerBackground]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: currentThemeColors.surface, borderColor: currentThemeColors.border }]}
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
            <View style={[styles.avatarRing, { borderColor: tintBorder, backgroundColor: tintSoft }]}>
              <Avatar.Image
                size={42}
                source={{ uri: getGroupAvatar() }}
                style={styles.avatar}
              />
            </View>

            <View style={styles.groupInfo}>
              <Text style={[styles.groupName, { color: currentThemeColors.text }]} numberOfLines={1}>
                {group?.name || t('groups.unnamed')}
              </Text>
              <View style={styles.metaRow}>
                <View style={[styles.onlineDot, { backgroundColor: currentThemeColors.tint }]} />
                <Text style={[styles.memberInfo, { color: currentThemeColors.subtleText }]} numberOfLines={1}>
                  {t('groups.members_count', { count: getMemberCount() })}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.rightSection}>
          <TouchableOpacity
            style={[styles.iconButton, styles.voiceButton, { backgroundColor: tintSoft, borderColor: tintBorder }]}
            onPress={handleJoinVoiceChat}
          >
            <MaterialCommunityIcons
              name="phone-in-talk"
              size={21}
              color={currentThemeColors.tint}
            />
          </TouchableOpacity>
          {isGroupAdmin() && (
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: currentThemeColors.surface, borderColor: currentThemeColors.border }]}
              onPress={handleGroupInfo}
            >
              <MaterialCommunityIcons name="cog-outline" size={21} color={currentThemeColors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148,163,184,0.18)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 10,
  },
  avatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginRight: 10,
  },
  avatar: {
    backgroundColor: 'transparent',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  memberInfo: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceButton: {
    marginRight: 8,
  },
  menu: {
    borderRadius: 12,
    marginTop: 8,
  },
});

export default GroupChatHeader;

