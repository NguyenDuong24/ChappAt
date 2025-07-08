import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Appbar, Avatar } from 'react-native-paper';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/authContext';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { createMeeting, token } from '@/api';

export default function ChatRoomHeader({ user, router, userId }: any) {
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  const { user: userCurrent } = useAuth();

  const initiateCall = async (callerId, receiverId, type) => {
    
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
    <Appbar.Header style={[styles.header, { backgroundColor: currentThemeColors.backgroundHeader, borderBottomColor: Colors.borderLine }]}>
      <Appbar.BackAction onPress={() => router.back()} color={currentThemeColors.text} />
      <Appbar.Content title={user?.username} titleStyle={{ color: currentThemeColors.text }} />
      <Appbar.Action
        icon="phone"
        onPress={async ()=>{
          await initiateCall(userCurrent?.uid, userId, "phone");
        }}
        color={currentThemeColors.text}
      />
      <Appbar.Action
        icon="video"
        onPress={async ()=>{
          await initiateCall(userCurrent?.uid, userId, "video");
        }}
        color={currentThemeColors.text}
      />
      <Appbar.Action icon="dots-vertical" onPress={() => { }} color={currentThemeColors.text} />
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    padding: 10,
  },
  header: {
    height: 50,
    borderBottomWidth: 1
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 10,
  },
  headerRight: {
    flexDirection: 'row',
  },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: 18,
  },
});
