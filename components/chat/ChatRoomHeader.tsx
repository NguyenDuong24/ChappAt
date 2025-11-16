import React, { useContext, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
// import { Appbar } from 'react-native-paper'; // not used
import { Avatar } from 'react-native-paper';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/authContext';
// removed unused: addDoc, collection, db, createMeeting, token
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createCall, CALL_TYPE } from '@/services/firebaseCallService';
import { useCallNavigation } from '@/hooks/useNewCallNavigation';
import VibeAvatar from '@/components/vibe/VibeAvatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatTheme } from '@/context/ChatThemeContext';

export default function ChatRoomHeader({ user, router, userId, onThemePress, chatTheme }: { user: any, router: any, userId: string, onThemePress: any, chatTheme?: ChatTheme }) {
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const { user: userCurrent } = useAuth();
  const viewerShowOnline = userCurrent?.showOnlineStatus !== false;
  const { navigateToListenCallScreen } = useCallNavigation();
  const insets = useSafeAreaInsets();
  const [showMenu, setShowMenu] = useState(false);
  const menuAnimation = useRef(new Animated.Value(0)).current;
  const menuButtonRef = useRef<any>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });

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
      backgroundColor: 'rgba(0,0,0,0.1)',
    },
    customMenu: {
      position: 'absolute',
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
      minWidth: 180,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 10,
      borderWidth: 1,
      borderColor: currentThemeColors.border,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 8,
    },
    menuItemText: {
      fontSize: 16,
      marginLeft: 12,
      fontWeight: '500',
    },
  });

  return (
    <LinearGradient
      colors={chatTheme ? [chatTheme.backgroundColor, chatTheme.backgroundColor] : (theme === 'dark' ? ['#1E293B', '#334155'] : ['#FFFFFF', '#F8FAFC'])}
      style={[styles.headerContainer, { paddingTop: insets.top }]}
    >
      <View style={styles.headerContent}>
        {/* Left section with back button */}
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: chatTheme?.receivedMessageColor || currentThemeColors.surface }]}
          onPress={() => router.back()}
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
              storyUser={{ id: userId, username: user?.username, profileUrl: user?.profileUrl }}
              vibeBadgePosition="top-left"
            />
            {/* Online dot at bottom-right */}
            {viewerShowOnline && (
              <View
                style={[
                  styles.onlineIndicator,
                  { backgroundColor: user?.isOnline ? Colors.success : Colors.warning, width: 10, height: 10, borderRadius: 5 }
                ]}
              />
            )}
          </View>
          <TouchableOpacity style={styles.userDetails} onPress={() => router.push
            ({
              pathname: "/UserProfileScreen",
              params: { userId: userId }
            })}>
            <Text style={[styles.userName, { color: chatTheme?.textColor || currentThemeColors.text, fontSize: 16 }]}>{user?.username}</Text>
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
            <Ionicons name="call" size={16} color={Colors.success} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: chatTheme?.receivedMessageColor || currentThemeColors.surface, width: 32, height: 32, borderRadius: 16 }]}
            onPress={handleVideoCall}
          >
            <Ionicons name="videocam" size={16} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            ref={menuButtonRef}
            style={[styles.actionButton, { backgroundColor: currentThemeColors.surface, width: 32, height: 32, borderRadius: 16 }]}
            onPress={toggleMenu}
            onLayout={handleMenuLayout}
          >
            <MaterialIcons name="more-vert" size={16} color={currentThemeColors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {showMenu && (
        <TouchableOpacity style={styles.menuOverlay} onPress={toggleMenu} activeOpacity={1}>
          <Animated.View
            style={[
              styles.customMenu,
              {
                backgroundColor: currentThemeColors.surface,
                opacity: menuAnimation,
                transform: [{ scale: menuAnimation.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
                top: menuPosition.y + menuPosition.height + 5,
                right: 16, // Adjust based on screen width
              },
            ]}
          >
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { toggleMenu(); onThemePress(); }}
            >
              <MaterialIcons name="palette" size={20} color={currentThemeColors.text} />
              <Text style={[styles.menuItemText, { color: currentThemeColors.text }]}>Chọn đổi chủ đề</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}
