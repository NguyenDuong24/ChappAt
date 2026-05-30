import { View, TouchableOpacity, StyleSheet, Text, Alert, ActivityIndicator } from 'react-native';
import React, { useContext, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/context/authContext';
import { createCall, CALL_TYPE } from '@/services/firebaseCallService';
import { useCallNavigation } from '@/hooks/useNewCallNavigation';

interface ButtonToChatProps {
  id: string;
}

export default function ButtonToChat({ id }: ButtonToChatProps) {
  const router = useRouter();
  const themeCtx = useContext(ThemeContext);
  const theme = (themeCtx && typeof themeCtx === 'object' && 'theme' in themeCtx) ? themeCtx.theme : 'light';
  const { user } = useAuth();
  const { navigateToListenCallScreen } = useCallNavigation();
  const currentThemeColors = Colors[theme] || Colors.light;


  const [isCalling, setIsCalling] = useState(false);

  const handleAudioCall = async () => {
    if (isCalling) return;
    try {
      setIsCalling(true);
      if (!user?.uid) return;
      const callData = await createCall(user.uid, id, CALL_TYPE.AUDIO);
      navigateToListenCallScreen(callData);
    } catch (error: any) {
      Alert.alert('Thông báo', error?.userMessage || 'Không thể bắt đầu cuộc gọi. Vui lòng thử lại.');
    } finally {
      setIsCalling(false);
    }
  };

  const handleVideoCall = async () => {
    if (isCalling) return;
    try {
      setIsCalling(true);
      if (!user?.uid) return;
      const callData = await createCall(user.uid, id, CALL_TYPE.VIDEO);
      navigateToListenCallScreen(callData);
    } catch (error: any) {
      Alert.alert('Thông báo', error?.userMessage || 'Không thể bắt đầu cuộc gọi video. Vui lòng thử lại.');
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.createPostButton, { backgroundColor: Colors.primary }]}>
        <TouchableOpacity style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center'
        }} onPress={() => {
          router.push(`/chat/${id}` as any);
        }}>
          <Text style={{
            marginRight: 10,
            color: currentThemeColors.background,
            fontSize: 20
          }}>Gửi tin nhắn</Text>
          <Ionicons name="chatbox-outline" size={40} color={currentThemeColors.background} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 50,
    right: 10,
    gap: 10,
    alignItems: 'flex-end',
    zIndex: 100,
  },
  callButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    gap: 5,
    minWidth: 120,
  },
  audioButton: {
    backgroundColor: '#4CAF50',
  },
  videoButton: {
    backgroundColor: '#2196F3',
  },
  callButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  createPostButton: {
    borderRadius: 20,
    height: 50,
    width: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

