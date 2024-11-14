import { db } from '@/firebaseConfig';
import { calculateAge, formatTime, getRoomId } from '@/utils/common';
import { useRouter } from 'expo-router';
import { collection, doc, DocumentData, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState, useContext } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Avatar, Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ThemeContext } from '@/context/ThemeContext';  // Import your theme context
import { Colors } from '@/constants/Colors';  // Assuming Colors contains both light and dark colors

const ChatItem = ({ item, noBorder = false, currenUser }) => {
  const { theme } = useContext(ThemeContext);  // Access the current theme context
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;  // Choose colors based on theme

  const router = useRouter();
  const [lastMessage, setLastMessage] = useState<DocumentData | null>(null);
  const maxLength = 25;

  const genderIconColor = item.gender === 'male' ? Colors.primary : item.gender === 'female' ? Colors.secondary : Colors.neutralDark;
  useEffect(() => {
    const roomId = getRoomId(currenUser?.uid, item?.id);
    const docRef = doc(db, "rooms", roomId);
    const messagesRef = collection(docRef, "messages");
    const q = query(messagesRef, orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(q, (snapshot) => {
      let allMessages = snapshot.docs.map((doc) => doc.data());
      setLastMessage(allMessages[0] ? allMessages[0] : null);
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
      return currenUser?.uid === lastMessage?.uid ? `You: ${lastMessage?.text}` : lastMessage?.text;
    } else {
      return 'Say hi';
    }
  };

  const renderUsername = () => {
    return item.username.length > maxLength ? `${item.username.slice(0, maxLength)}...` : item.username;
  };

  return (
    <TouchableOpacity
      style={[styles.container, !noBorder && { borderBottomColor: currentThemeColors.border }]}
      onPress={() => {
        router.push({
          pathname: "/chat/[id]",
          params: { id: item.id }
        });
      }}
    >
      <View style={styles.avatarContainer}>
        <Avatar.Image size={50} source={{ uri: item.profileUrl }} style={styles.image} />
        <View style={[styles.statusIndicator, item.isOnline ? styles.online : styles.offline, { borderColor: currentThemeColors.background }]} />
      </View>
      <View style={styles.textContainer}>
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Text style={[styles.name, { color: currentThemeColors.text }]}>
              {renderUsername()}
            </Text>
            {item.gender === 'male' ? (
              <MaterialCommunityIcons name="gender-male" size={15} color={genderIconColor} />
            ) : item.gender === 'female' ? (
              <MaterialCommunityIcons name="gender-female" size={15} color={genderIconColor} />
            ) : null}
            <Text style={[styles.age, { color: genderIconColor }]}>
              {calculateAge(item.age)}
            </Text>
          </View>
          <Text style={[styles.time, { color: currentThemeColors.subtleText }]}>
            {renderTime()}
          </Text>
        </View>
        <Text style={[styles.lastMessage, { color: currentThemeColors.subtleText }]}>
          {renderLastMessage()}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    position: 'relative',
  },
  image: {
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  age: {
    fontSize: 12,
    marginLeft: 5,
  },
  time: {
    fontSize: 12,
  },
  lastMessage: {
    fontSize: 14,
  },
  statusIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    position: 'absolute',
    bottom: 0,
    right: 13,
    borderWidth: 2,
  },
  online: {
    backgroundColor: '#4CAF50', // Green for online
  },
  offline: {
    backgroundColor: '#FFC107', // Yellow for offline
  },
});

export default ChatItem;
