import { useRouter } from 'expo-router';
import React, { useContext } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Text, RefreshControl, Animated } from 'react-native';
import { Avatar, Card, Chip } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/Colors';
import { calculateDistance } from '@/utils/calculateDistance';
import { LinearGradient } from 'expo-linear-gradient';

import { LocationContext } from '@/context/LocationContext';
import { ThemeContext } from '@/context/ThemeContext';
import { useAuth } from '@/context/authContext';

export default function ListUser({ users, onRefresh, refreshing }: any) {
  const router = useRouter();
  const { location } = React.useContext(LocationContext);
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  const renderUserItem = ({ item, index }: any) => {
    const ageColor = item.gender === 'male' ? Colors.secondary : item.gender === 'female' ? Colors.primary : currentThemeColors.subtleText;
    const genderIconColor = item.gender === 'male' ? Colors.secondary : item.gender === 'female' ? Colors.primary : currentThemeColors.subtleText;
    const gradientColors: [string, string] = item.gender === 'male' 
      ? ['#667eea', '#764ba2'] 
      : item.gender === 'female' 
      ? ['#f093fb', '#f5576c'] 
      : ['#4facfe', '#00f2fe'];

    let distance = 0;
    if (location) {
      distance = calculateDistance(location.coords, item?.location);
    }

    return (
      <Card style={[styles.userCard, { backgroundColor: currentThemeColors.surface || currentThemeColors.background }]}>
        <TouchableOpacity 
          style={styles.userContainer}
          onPress={() => {
            router.push({
              pathname: "/UserProfileScreen",
              params: { userId: item.id }
            });
          }}
          activeOpacity={0.7}
        >
          {/* Card Gradient Border */}
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBorder}
          >
            <View style={[styles.cardContent, { backgroundColor: currentThemeColors.surface || currentThemeColors.background }]}>
              {/* Avatar Section */}
              <View style={styles.avatarSection}>
                <View style={styles.avatarContainer}>
                  <Avatar.Image
                    source={{ uri: item.profileUrl }}
                    size={60}
                    style={styles.avatar}
                  />
                  {/* Online Status Indicator */}
                  <View style={[
                    styles.statusIndicator, 
                    item.isOnline ? styles.online : styles.offline
                  ]}>
                    <View style={[styles.statusDot, item.isOnline ? styles.onlineDot : styles.offlineDot]} />
                  </View>
                </View>
              </View>

              {/* User Info Section */}
              <View style={styles.userInfo}>
                <View style={styles.textContainer}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.userName, { color: currentThemeColors.text }]} numberOfLines={1}>
                      {item.username}
                    </Text>
                    <MaterialCommunityIcons 
                      name={item.gender === 'male' ? "gender-male" : item.gender === 'female' ? "gender-female" : "account"} 
                      size={16} 
                      color={genderIconColor} 
                    />
                  </View>
                  
                  <Text style={[styles.bio, { color: currentThemeColors.subtleText }]} numberOfLines={2}>
                    {item.bio || "Chưa có thông tin giới thiệu"}
                  </Text>
                  
                  {/* Tags Section */}
                  <View style={styles.tagsContainer}>
                    <Chip 
                      compact 
                      style={[styles.ageChip, { backgroundColor: ageColor + '15' }]}
                      textStyle={[styles.chipText, { color: ageColor }]}
                      icon="calendar"
                    >
                      {typeof item.age === 'number' ? `${item.age} tuổi` : 'N/A'}
                    </Chip>
                    
                    {distance !== null && !isNaN(distance) && (
                      <Chip 
                        compact 
                        style={[styles.distanceChip, { backgroundColor: currentThemeColors.tint + '15' }]}
                        textStyle={[styles.chipText, { color: currentThemeColors.tint }]}
                        icon="map-marker"
                      >
                        {distance.toFixed(1)} km
                      </Chip>
                    )}
                  </View>
                </View>
                
                {/* Action Button */}
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => {
                    // Navigate to chat or other action
                    router.push({
                      pathname: "/chat/[id]",
                      params: { id: item.id }
                    });
                  }}
                >
                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionGradient}
                  >
                    <MaterialIcons name="chat" size={20} color="white" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Card>
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
  userCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  userContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradientBorder: {
    padding: 2,
    borderRadius: 16,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
  },
  avatarSection: {
    position: 'relative',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    borderWidth: 3,
    borderColor: 'white',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  onlineDot: {
    backgroundColor: Colors.success,
  },
  offlineDot: {
    backgroundColor: Colors.warning,
  },
  online: {
    backgroundColor: Colors.success,
  },
  offline: {
    backgroundColor: Colors.warning,
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  bio: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  ageChip: {
    height: 28,
    borderRadius: 14,
  },
  distanceChip: {
    height: 28,
    borderRadius: 14,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionButton: {
    marginLeft: 12,
  },
  actionGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingTop: 8,
    paddingBottom: 100,
  },
});
