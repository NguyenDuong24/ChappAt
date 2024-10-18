import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Appbar, Avatar } from 'react-native-paper';

import { Colors } from '@/constants/Colors';

export default function ChatRoomHeader({ user, router }: any) {
  return (
    <Appbar.Header style={styles.header}>
      <Appbar.BackAction onPress={() => router.back()} />
      <Appbar.Content title={user?.username} />
      <Appbar.Action icon="dots-vertical" onPress={() => { }} />
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    padding: 10,
  },
  header:{
    backgroundColor: Colors.light.backgroundHeader
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 10,
  },
  headerRight: {
    flexDirection: 'row'
  },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: 18,
  },
});
