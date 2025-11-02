import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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

export default function ChatRoomHeader({ user, router, userId }: any) {
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const { user: userCurrent } = useAuth();
  const viewerShowOnline = userCurrent?.showOnlineStatus !== false;
  const { navigateToListenCallScreen } = useCallNavigation();
  const insets = useSafeAreaInsets();

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

  return (
    <LinearGradient
      colors={theme === 'dark' ? ['#1E293B', '#334155'] : ['#FFFFFF', '#F8FAFC']}
      style={[styles.headerContainer, { paddingTop: insets.top }]}
    >
      <View style={styles.headerContent}>
        {/* Left section with back button */}
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: currentThemeColors.surface }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={currentThemeColors.text} />
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
            <Text style={[styles.userName, { color: currentThemeColors.text, fontSize: 16 }]}>{user?.username}</Text>
            <Text style={[styles.userStatus, { color: currentThemeColors.subtleText }]}
            >
              {viewerShowOnline ? (user?.isOnline ? 'Online' : 'Last seen recently') : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Right section with action buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: currentThemeColors.surface, width: 32, height: 32, borderRadius: 16 }]}
            onPress={handleAudioCall}
          >
            <Ionicons name="call" size={16} color={Colors.success} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: currentThemeColors.surface, width: 32, height: 32, borderRadius: 16 }]}
            onPress={handleVideoCall}
          >
            <Ionicons name="videocam" size={16} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: currentThemeColors.surface, width: 32, height: 32, borderRadius: 16 }]}
            onPress={() => {}}
          >
            <MaterialIcons name="more-vert" size={16} color={currentThemeColors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

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
});
