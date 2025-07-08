import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Avatar, Card } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { calculateDistance } from '@/utils/calculateDistance';
import { Colors } from '@/constants/Colors';
import { LocationContext } from '@/context/LocationContext';
import { ThemeContext } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';

const FollowUser = () => {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { location } = useContext(LocationContext);
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const currentUser = auth.currentUser;

  const handleSearch = async () => {
    if (search.trim() === '') {
      alert('Vui lòng nhập user ID cần tìm.');
      return;
    }
    setLoading(true);
    try {
      const userRef = doc(db, 'users', search.trim());
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const foundUser = { id: userSnap.id, ...userSnap.data() };

        // Kiểm tra xem người dùng hiện tại đã theo dõi user này chưa
        const followRef = doc(db, 'follows', `${currentUser.uid}_${foundUser.id}`);
        const followSnap = await getDoc(followRef);
        foundUser.followStatus = followSnap.exists();

        setUsers([foundUser]);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Lỗi khi tìm kiếm user:', error);
    }
    setLoading(false);
  };

  const followUser = async (targetUserId) => {
    if (!currentUser) return;
    try {
      const followRef = doc(db, 'follows', `${currentUser.uid}_${targetUserId}`);
      await setDoc(followRef, {
        followerId: currentUser.uid,
        followingId: targetUserId,
        followedAt: new Date().toISOString(),
      });
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === targetUserId ? { ...user, followStatus: true } : user
        )
      );
    } catch (error) {
      console.error('Lỗi khi theo dõi user:', error);
    }
  };

  const renderUserItem = ({ item }) => {
    const genderIcon =
      item.gender === 'male'
        ? 'gender-male'
        : item.gender === 'female'
        ? 'gender-female'
        : 'account';
    const genderColor =
      item.gender === 'male'
        ? Colors.secondary
        : item.gender === 'female'
        ? Colors.primary
        : Colors.neutralDark;

    let distance = 0;
    if (location && item.location) {
      distance = calculateDistance(location.coords, item.location);
    }

    return (
      <Card
        style={[
          styles.card,
          {
            backgroundColor: currentThemeColors.cardBackground,
            borderColor: currentThemeColors.border,
          },
        ]}
        elevation={2}
      >
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: '/UserProfileScreen',
              params: { userId: item.id },
            })
          }
        >
          <Card.Title
            title={item.username}
            subtitle={item.bio}
            left={(props) => (
              <Avatar.Image {...props} source={{ uri: item.profileUrl }} size={50} />
            )}
            right={(props) => (
              <View style={styles.rightContainer}>
                <MaterialCommunityIcons
                  name={genderIcon}
                  size={20}
                  color={genderColor}
                  style={{ marginRight: 6 }}
                />
                {distance !== 0 && !isNaN(distance) && (
                  <Text style={[styles.distance, { color: currentThemeColors.text }]}>
                    {distance.toFixed(1)} km
                  </Text>
                )}
              </View>
            )}
          />
          <Card.Actions style={styles.cardActions}>
            {item.followStatus ? (
              <Text style={styles.followingText}>Đang theo dõi</Text>
            ) : (
              <TouchableOpacity
                style={styles.followButton}
                onPress={() => followUser(item.id)}
              >
                <Text style={styles.followButtonText}>Theo dõi</Text>
              </TouchableOpacity>
            )}
          </Card.Actions>
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: currentThemeColors.background },
      ]}
    >
      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: currentThemeColors.searchBackground,
              color: currentThemeColors.text,
            },
          ]}
          placeholder="Nhập user ID..."
          placeholderTextColor={currentThemeColors.placeholderText}
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <MaterialCommunityIcons name="magnify" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} />
      ) : users.length === 0 ? (
        <Text style={styles.noResultText}>Không tìm thấy user</Text>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 20,
    fontSize: 16,
  },
  searchButton: {
    width: 40,
    height: 40,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  listContainer: {
    paddingBottom: 20,
  },
  noResultText: {
    textAlign: 'center',
    fontSize: 16,
    color: Colors.neutralDark,
    marginTop: 20,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  distance: {
    fontSize: 12,
  },
  cardActions: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  followButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  followButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  followingText: {
    color: Colors.neutralDark,
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default FollowUser;
