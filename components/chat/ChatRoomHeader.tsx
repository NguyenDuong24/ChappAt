import React, { useContext, useState, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
// import { Appbar } from 'react-native-paper'; // not used
import { ThemeContext } from '@/context/ThemeContext';
import { useAuth } from '@/context/authContext';
// removed unused: addDoc, collection, db, createMeeting, token
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createCall, CALL_TYPE } from '@/services/firebaseCallService';
import { useCallNavigation } from '@/hooks/useNewCallNavigation';
import VibeAvatar from '@/components/vibe/VibeAvatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatTheme } from '@/context/ChatThemeContext';
import { useThemedColors } from '@/hooks/useThemedColors';

export default function ChatRoomHeader({ user, router, userId, onThemePress, chatTheme, onBack }: { user: any, router: any, userId: string, onThemePress: any, chatTheme?: ChatTheme, onBack?: () => void }) {
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const currentThemeColors = useThemedColors();
  const { user: userCurrent } = useAuth();
  const viewerShowOnline = userCurrent?.showOnlineStatus !== false;
  const { navigateToListenCallScreen } = useCallNavigation();
  const insets = useSafeAreaInsets();
  const [showMenu, setShowMenu] = useState(false);
  const menuAnimation = useRef(new Animated.Value(0)).current;
  const menuButtonRef = useRef<any>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const menuButtonBackground = chatTheme
    ? 'rgba(30, 41, 59, 0.46)'
    : (theme === 'dark' ? 'rgba(255, 255, 255, 0.16)' : '#4F46E5');
  const menuButtonBorderColor = chatTheme
    ? 'rgba(255, 255, 255, 0.34)'
    : (theme === 'dark' ? 'rgba(255, 255, 255, 0.25)' : '#6366F1');
  const menuButtonIconColor = '#FFFFFF';
  const menuBackgroundColor = currentThemeColors.palette?.menuBackground || (theme === 'dark' ? '#111827' : '#FFFFFF');
  const menuBorderColor = currentThemeColors.border;
  const menuTextColor = currentThemeColors.text;
  const menuIconColor = currentThemeColors.primary;
  const displayName = user?.username || user?.displayName || user?.name || 'Unknown User';
  const headerGradientColors = useMemo<readonly [string, string, ...string[]]>(() => {
    const colors = chatTheme
      ? (chatTheme.sentMessageGradient || chatTheme.gradientColors || [chatTheme.backgroundColor, chatTheme.backgroundColor])
      : (theme === 'dark' ? ['#1E293B', '#334155'] : ['#FFFFFF', '#F8FAFC']);
    if (colors.length >= 2) return colors as [string, string, ...string[]];
    return [colors[0] || '#FFFFFF', colors[0] || '#FFFFFF'];
  }, [chatTheme, theme]);

  const handleAudioCall = async () => {
    try {
      if (!userCurrent?.uid) return;
      const callData = await createCall(userCurrent.uid, userId, CALL_TYPE.AUDIO);
      navigateToListenCallScreen(callData);
    } catch (error) {
      console.error('Error starting audio call:', error);
    }
  };

  const handleVideoCall = async () => {
    try {
      if (!userCurrent?.uid) return;
      const callData = await createCall(userCurrent.uid, userId, CALL_TYPE.VIDEO);
      navigateToListenCallScreen(callData);
    } catch (error) {
      console.error('Error starting video call:', error);
    }
  };

  const toggleMenu = () => {
    if (showMenu) {
      Animated.timing(menuAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShowMenu(false));
    } else {
      setShowMenu(true);
      Animated.timing(menuAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleMenuLayout = (event: any) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setMenuPosition({ x, y, width, height });
  };

  const styles = StyleSheet.create({
    headerContainer: {
      // paddingTop provided dynamically via insets.top
      paddingBottom: 8,
      paddingHorizontal: 16,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      elevation: 2,
    },
    userInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 8,
    },
    avatarContainer: {
      position: 'relative',
      marginRight: 10, // giảm từ 12 xuống 10
    },
    avatar: {
      backgroundColor: 'transparent',
      overflow: 'hidden',
    },
    onlineIndicator: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 10, // giảm từ 14 xuống 10
      height: 10,
      borderRadius: 5, // giảm từ 7 xuống 5
      borderWidth: 2,
      borderColor: '#FFFFFF',
      zIndex: 3,
    },
    userDetails: {
      flex: 1,
    },
    userName: {
      fontSize: 16, // giảm từ 18 xuống 16
      fontWeight: '600',
      marginBottom: 2,
    },
    userStatus: {
      fontSize: 12,
      fontWeight: '400',
    },
    actionButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    actionButton: {
      width: 32, // giảm từ 40 xuống 32
      height: 32,
      borderRadius: 16, // giảm từ 20 xuống 16
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      elevation: 2,
    },
    menuOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(2, 6, 23, 0.22)',
    },
    customMenu: {
      position: 'absolute',
      borderRadius: 16,
      paddingVertical: 0,
      paddingHorizontal: 0,
      minWidth: 188,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.34,
      shadowRadius: 16,
      elevation: 14,
      borderWidth: 1,
      overflow: 'hidden',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 16,
    },
    menuItemText: {
      fontSize: 15,
      marginLeft: 8,
      fontWeight: '600',
    },
  });

  return (
    <LinearGradient
      colors={headerGradientColors}
      style={[styles.headerContainer, { paddingTop: insets.top }]}
    >
      <View style={styles.headerContent}>
        {/* Left section with back button */}
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: chatTheme?.receivedMessageColor || currentThemeColors.surface }]}
          onPress={() => onBack ? onBack() : router?.back()}
        >
          <Ionicons name="arrow-back" size={24} color={chatTheme?.textColor || currentThemeColors.text} />
        </TouchableOpacity>

        {/* Center section with user info */}
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            <VibeAvatar
              avatarUrl={user?.profileUrl}
              size={40} // giảm từ 56 xuống 40
              currentVibe={user?.currentVibe || null}
              showAddButton={false}
              storyUser={{ id: userId, username: displayName, profileUrl: user?.profileUrl }}
              vibeBadgePosition="top-left"
            />
            {/* Online dot at bottom-right */}
            {viewerShowOnline && (
              <View
                style={[
                  styles.onlineIndicator,
                  { backgroundColor: user?.isOnline ? currentThemeColors.success : currentThemeColors.warning, width: 10, height: 10, borderRadius: 5 }
                ]}
              />
            )}
          </View>
          <TouchableOpacity style={styles.userDetails} onPress={() => router.push({
            pathname: "/(screens)/user/UserProfileScreen",
            params: { userId: userId }
          })}>
            <Text style={[styles.userName, { color: chatTheme?.textColor || currentThemeColors.text, fontSize: 16 }]}>{displayName}</Text>
            <Text style={[styles.userStatus, { color: chatTheme?.textColor || currentThemeColors.subtleText }]}
            >
              {viewerShowOnline ? (user?.isOnline ? 'Online' : 'Last seen recently') : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Right section with action buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: chatTheme?.receivedMessageColor || currentThemeColors.surface, width: 32, height: 32, borderRadius: 16 }]}
            onPress={handleAudioCall}
          >
            <Ionicons name="call" size={16} color={currentThemeColors.success} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: chatTheme?.receivedMessageColor || currentThemeColors.surface, width: 32, height: 32, borderRadius: 16 }]}
            onPress={handleVideoCall}
          >
            <Ionicons name="videocam" size={16} color={currentThemeColors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            ref={menuButtonRef}
            style={[
              styles.actionButton,
              {
                backgroundColor: menuButtonBackground,
                borderWidth: 1,
                borderColor: menuButtonBorderColor,
                width: 32,
                height: 32,
                borderRadius: 16
              }
            ]}
            onPress={toggleMenu}
            onLayout={handleMenuLayout}
            activeOpacity={0.82}
          >
            <MaterialIcons name="more-vert" size={16} color={menuButtonIconColor} />
          </TouchableOpacity>
        </View>
      </View>

      {showMenu && (
        <TouchableOpacity style={styles.menuOverlay} onPress={toggleMenu} activeOpacity={1}>
          <Animated.View
            style={[
              styles.customMenu,
              {
                backgroundColor: menuBackgroundColor,
                borderColor: menuBorderColor,
                opacity: menuAnimation,
                transform: [{ scale: menuAnimation.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
                top: menuPosition.y + menuPosition.height + 5,
                right: 16, // Adjust based on screen width
              },
            ]}
          >
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { toggleMenu(); setTimeout(() => { if (onThemePress) onThemePress(); }, 220); }}
              activeOpacity={0.86}
            >
              <MaterialIcons name="palette" size={20} color={menuIconColor} />
              <Text style={[styles.menuItemText, { color: menuTextColor }]}>Chọn đổi chủ đề</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}

