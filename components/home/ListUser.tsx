import { useRouter } from 'expo-router';
import React from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Text, RefreshControl } from 'react-native';
import { Avatar } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { calculateAge } from '@/utils/common';
import { Colors } from '@/constants/Colors';

export default function ListUser({ users, onRefresh, refreshing }: any) {
  const router = useRouter();

  const renderUserItem = ({ item }: any) => {
    const ageColor = item.gender === 'male' ? Colors.primary : item.gender === 'female' ? Colors.secondary : Colors.neutralDark;

    return (
      <TouchableOpacity 
        style={styles.userContainer} 
        onPress={() => {
          router.push({
            pathname: "/chat/[id]",
            params: { id: item.id }
          });
        }}
      >
        <Avatar.Image
          source={{ uri: item.profileUrl }}
          size={50}
        />
        <View style={styles.statusContainer}>
          <View style={[styles.statusIndicator, item.isOnline ? styles.online : styles.offline]} />
        </View>
        <View style={styles.userInfo}>
          <View style={styles.textContainer}>
            <Text style={styles.userName}>{item.username}</Text>
            <Text style={styles.bio}>{item.bio}</Text>
          </View>
          {item.gender === 'male' ? (
            <MaterialCommunityIcons name="gender-male" size={15} color={Colors.primary} />
          ) : item.gender === 'female' ? (
            <MaterialCommunityIcons name="gender-female" size={15} color={Colors.secondary} />
          ) : null}
          <Text style={[styles.age, { color: ageColor }]}>
            {calculateAge(item.age)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={users}
      renderItem={renderUserItem}
      keyExtractor={(item) => item.id || item.uid}
      contentContainerStyle={styles.listContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    />
  );
}

const styles = StyleSheet.create({
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderColor: Colors.borderLine, 
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'row',
    marginLeft: 15,
    flex: 1,
  },
  textContainer: {
    flexDirection: 'column',
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text, 
  },
  bio: {
    fontSize: 14,
    color: Colors.light.icon, 
    marginTop: 2,
  },
  statusContainer: {
    bottom: 16,
    left: 53,
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 5,
    borderWidth: 2,
    borderColor: Colors.light.background,
  },
  online: {
    backgroundColor: Colors.success,
  },
  offline: {
    backgroundColor: Colors.warning,
  },
  age: {
    fontSize: 12,
    marginLeft: 5,
    color: Colors.light.icon, 
  },
});
