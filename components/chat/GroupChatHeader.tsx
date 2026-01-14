import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface GroupChatHeaderProps {
  group: {
    name?: string;
    avatarUrl?: string;
    memberCount?: number;
  };
  onBack: () => void;
  onMembers: () => void;
}

export default function GroupChatHeader({ group, onBack, onMembers }: GroupChatHeaderProps) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
        <MaterialCommunityIcons name="arrow-left" size={24} color="#222" />
      </TouchableOpacity>
      <View style={styles.groupInfo}>
        <Image
          source={group?.avatarUrl ? { uri: group.avatarUrl } : require('../../assets/images/icon.png')}
          style={styles.avatar}
          contentFit="cover"
        />
        <View>
          <Text style={styles.groupName} numberOfLines={1}>{group?.name || 'Nhóm chat'}</Text>
          <Text style={styles.memberCount}>{group?.memberCount || 0} thành viên</Text>
        </View>
      </View>
      <TouchableOpacity onPress={onMembers} style={styles.iconBtn}>
        <MaterialCommunityIcons name="account-group" size={24} color="#222" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
  },
  iconBtn: {
    padding: 8,
  },
  groupInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#eee',
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    maxWidth: 180,
  },
  memberCount: {
    fontSize: 12,
    color: '#888',
  },
});
