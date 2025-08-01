import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Appbar, Avatar } from 'react-native-paper';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/authContext';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { createMeeting, token } from '@/api';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function ChatRoomHeader({ user, router, userId }: any) {
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const { user: userCurrent } = useAuth();

  const initiateCall = async (callerId: string, receiverId: string, type: string) => {
    try {
      const meetingId = await createMeeting({ token });
      await addDoc(collection(db, 'calls'), {
        callerId,
        receiverId,
        status: 'ringing',
        type,
        meetingId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error initiating call: ', error);
    }
  };

  return (
    <LinearGradient
      colors={theme === 'dark' 
        ? ['#1E293B', '#334155'] 
        : ['#FFFFFF', '#F8FAFC']
      }
      style={styles.headerContainer}
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
            <Avatar.Image 
              size={44} 
              source={{ uri: user?.profileUrl }} 
              style={styles.avatar}
            />
            <View style={[
              styles.onlineIndicator, 
              { backgroundColor: user?.isOnline ? Colors.success : Colors.warning }
            ]} />
          </View>
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: currentThemeColors.text }]}>
              {user?.username}
            </Text>
            <Text style={[styles.userStatus, { color: currentThemeColors.subtleText }]}>
              {user?.isOnline ? 'Online' : 'Last seen recently'}
            </Text>
          </View>
        </View>

        {/* Right section with action buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: currentThemeColors.surface }]}
            onPress={async () => {
              await initiateCall(userCurrent?.uid, userId, "phone");
            }}
          >
            <Ionicons name="call" size={20} color={Colors.success} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: currentThemeColors.surface }]}
            onPress={async () => {
              await initiateCall(userCurrent?.uid, userId, "video");
            }}
          >
            <Ionicons name="videocam" size={20} color={Colors.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: currentThemeColors.surface }]}
            onPress={() => {}}
          >
            <MaterialIcons name="more-vert" size={20} color={currentThemeColors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: 50, // StatusBar height
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
    marginRight: 12,
  },
  avatar: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
