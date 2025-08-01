import { db } from '@/firebaseConfig';
import { formatTime, getRoomId } from '@/utils/common';
import { useRouter } from 'expo-router';
import { collection, doc, DocumentData, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState, useContext } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Avatar, Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

const ChatItem = ({ item, noBorder = false, currenUser }: { item: any, noBorder?: boolean, currenUser: any }) => {
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const [lastMessage, setLastMessage] = useState<DocumentData | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const maxLength = 25;

  // Kiểm tra an toàn cho item
  if (!item || !item.id || !currenUser?.uid) {
    return null;
  }

  const genderIconColor = item.gender === 'male' ? '#667eea' : item.gender === 'female' ? '#f093fb' : '#999';
  
  useEffect(() => {
    const roomId = getRoomId(currenUser?.uid, item?.id);
    const docRef = doc(db, "rooms", roomId);
    const messagesRef = collection(docRef, "messages");
    const q = query(messagesRef, orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(q, (snapshot) => {
      let allMessages = snapshot.docs.map((doc) => doc.data());
      setLastMessage(allMessages[0] ? allMessages[0] : null);
      
      const unreadMessages = allMessages.filter(msg => 
        msg.uid !== currenUser?.uid && 
        (!msg.readBy || !msg.readBy.includes(currenUser?.uid))
      );
      setUnreadCount(unreadMessages ? unreadMessages.length : 0);
    });

    return unsub;
  }, []);

  const renderTime = () => {
    if (lastMessage) {
      let date = formatTime(lastMessage?.createdAt);
      return date;
    }
  };

  const renderLastMessage = () => {
    if (typeof lastMessage == 'undefined') return 'Loading...';
    if (lastMessage) {
      const prefix = currenUser?.uid === lastMessage?.uid ? 'You: ' : '';
      const statusIcon = getLastMessageStatusIcon();
      return `${prefix}${lastMessage?.text || '📷 Photo'} ${statusIcon}`;
    } else {
      return 'Say hi 👋';
    }
  };

  const getLastMessageStatusIcon = () => {
    if (currenUser?.uid !== lastMessage?.uid) return '';
    
    switch (lastMessage?.status) {
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return '✓✓';
      default:
        return '';
    }
  };

  const renderUsername = () => {
    if (!item?.username) return 'Unknown User';
    return item.username.length > maxLength ? `${item.username.slice(0, maxLength)}...` : item.username;
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: currentThemeColors.background }]}
      onPress={() => {
        router.push({
          pathname: "/chat/[id]",
          params: { id: item.id }
        });
      }}
    >
      <View style={styles.chatCard}>
        {/* Avatar Section */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarWrapper}>
            <Avatar.Image size={56} source={{ uri: item.profileUrl }} style={styles.avatar} />
            <View style={[
              styles.statusIndicator, 
              item.isOnline ? styles.online : styles.offline
            ]} />
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <View style={styles.userInfoRow}>
              <Text style={[styles.username, { color: currentThemeColors.text }]}>
                {renderUsername()}
              </Text>
              {item.gender && (
                <View style={styles.genderContainer}>
                  <MaterialCommunityIcons 
                    name={item.gender === 'male' ? "gender-male" : "gender-female"} 
                    size={16} 
                    color={genderIconColor} 
                  />
                  {typeof item.age === 'number' && (
                    <Text style={[styles.age, { color: genderIconColor }]}>
                      {item.age}
                    </Text>
                  )}
                </View>
              )}
            </View>
            
            <View style={styles.rightSection}>
              <Text style={[styles.time, { color: currentThemeColors.subtleText }]}>
                {renderTime()}
              </Text>
              {unreadCount > 0 && (
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.unreadBadge}
                >
                  <Text style={styles.unreadText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </LinearGradient>
              )}
            </View>
          </View>

          <Text style={[styles.lastMessage, { color: currentThemeColors.subtleText }]} numberOfLines={1}>
            {renderLastMessage()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    marginVertical: 2,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    backgroundColor: '#f0f4ff',
  },
  statusIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    position: 'absolute',
    bottom: -2,
    right: -2,
    borderWidth: 3,
    borderColor: 'white',
  },
  online: {
    backgroundColor: '#10b981',
  },
  offline: {
    backgroundColor: '#f59e0b',
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  username: {
    fontSize: 17,
    fontWeight: '700',
    marginRight: 8,
  },
  genderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  age: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  unreadBadge: {
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default ChatItem;
