import React, { useEffect, useState, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import CustomImage from './CustomImage';

interface UserInfo {
  uid: string;
  username: string;
  displayName?: string;
  profileUrl?: string;
}

interface LikedByModalProps {
  visible: boolean;
  onClose: () => void;
  likedUserIds: string[];
}

const LikedByModal: React.FC<LikedByModalProps> = ({
  visible,
  onClose,
  likedUserIds,
}) => {
  const themeCtx = useContext(ThemeContext);
  const theme = (themeCtx && typeof themeCtx === 'object' && 'theme' in themeCtx) ? themeCtx.theme : 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && likedUserIds.length > 0) {
      fetchUsersInfo();
    }
  }, [visible, likedUserIds]);

  const fetchUsersInfo = async () => {
    setLoading(true);
    try {
      const usersInfo: UserInfo[] = [];
      
      for (const userId of likedUserIds) {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          usersInfo.push({
            uid: userId,
            username: userData.username || 'Unknown User',
            displayName: userData.displayName,
            profileUrl: userData.profileUrl,
          });
        }
      }
      
      setUsers(usersInfo);
    } catch (error) {
      console.error('Error fetching users info:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderUserItem = ({ item }: { item: UserInfo }) => (
    <TouchableOpacity 
      style={[styles.userItem, { backgroundColor: currentThemeColors.surface }]}
      activeOpacity={0.8}
      // Có thể thêm navigation đến profile user ở đây
      onPress={() => {
        // navigation.navigate('UserProfile', { userId: item.uid });
        console.log('Navigate to user profile:', item.uid);
      }}
    >
      <View style={styles.userInfo}>
        <View style={styles.avatarContainer}>
          <CustomImage 
            source={item.profileUrl} 
            style={styles.avatar} 
          />
        </View>
        <View style={styles.userTextInfo}>
          <Text style={[styles.displayName, { color: currentThemeColors.text }]}>
            {item.displayName || item.username}
          </Text>
          {item.displayName && (
            <Text style={[styles.username, { color: currentThemeColors.subtleText }]}>
              @{item.username}
            </Text>
          )}
        </View>
      </View>
      
      {/* Like icon with animation effect */}
      <View style={styles.likeIconContainer}>
        <View style={styles.likeIconBg}>
          <Ionicons name="heart" size={18} color="white" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: currentThemeColors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={currentThemeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: currentThemeColors.text }]}>
            Liked by
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={currentThemeColors.tint} />
            <Text style={[styles.loadingText, { color: currentThemeColors.subtleText }]}>
              Loading users...
            </Text>
          </View>
        ) : users.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={48} color={currentThemeColors.subtleText} />
            <Text style={[styles.emptyText, { color: currentThemeColors.subtleText }]}>
              No likes yet
            </Text>
          </View>
        ) : (
          <FlatList
            data={users}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.uid}
            contentContainerStyle={styles.listContainer}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: currentThemeColors.border }]} />
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  listContainer: {
    paddingVertical: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 12,
    marginVertical: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userTextInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    fontWeight: '400',
  },
  likeIconContainer: {
    padding: 8,
  },
  likeIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1877F2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1877F2',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  separator: {
    height: 1,
    marginHorizontal: 16,
  },
});

export default LikedByModal;
