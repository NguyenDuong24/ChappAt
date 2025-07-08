import { useRouter } from 'expo-router';
import React, { useContext } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Text, RefreshControl } from 'react-native';
import { Avatar } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors } from '@/constants/Colors';
import { calculateDistance } from '@/utils/calculateDistance';

import { LocationContext } from '@/context/LocationContext';
import { ThemeContext } from '@/context/ThemeContext';
import { useAuth } from '@/context/authContext';

export default function ListUser({ users, onRefresh, refreshing }: any) {
  const router = useRouter();
  const { location } = React.useContext(LocationContext);
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  const renderUserItem = ({ item }: any) => {
    const ageColor = item.gender === 'male' ? Colors.secondary : item.gender === 'female' ? Colors.primary : Colors.neutralDark;
    const genderIconColor = item.gender === 'male' ? Colors.secondary : item.gender === 'female' ? Colors.primary : Colors.neutralDark;

    let distance = 0;
    if (location) {
      distance = calculateDistance(location.coords, item?.location);
    }

    return (
      <TouchableOpacity 
        style={[styles.userContainer, { borderColor: currentThemeColors.border }]} 
        onPress={() => {
          router.push({
            pathname: "/UserProfileScreen",
            params: { userId: item.id }
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
            <Text style={[styles.userName, { color: currentThemeColors.text }]}>{item.username}</Text>
            <Text style={[styles.bio, { color: currentThemeColors.subtleText }]}>{item.bio}</Text>
          </View>
          <MaterialCommunityIcons 
            name={item.gender === 'male' ? "gender-male" : item.gender === 'female' ? "gender-female" : ""} 
            size={15} 
            color={genderIconColor} 
          />
          <Text style={[styles.age, { color: ageColor }]}>
          {typeof item.age === 'number' && item.age}
          </Text>
          {distance !== null && !isNaN(distance) && (
            <Text style={[styles.distance, { color: currentThemeColors.icon }]}>
              {distance.toFixed(2)} km
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={users}
      renderItem={renderUserItem}
      keyExtractor={(item) => item.id || item.uid}
      contentContainerStyle={[styles.listContainer, { backgroundColor: currentThemeColors.background }]}
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
    fontSize: 16,
    fontWeight: 'bold',
  },
  bio: {
    fontSize: 12,
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
  },
  distance: {
    fontSize: 12,
    marginLeft: 5,
  },
  listContainer: {
    paddingTop: 10,
  },
});
