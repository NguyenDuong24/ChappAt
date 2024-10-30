import { db } from '@/firebaseConfig';
import { calculateAge, formatTime, getRoomId } from '@/utils/common';
import { useRouter } from 'expo-router';
import { collection, doc, DocumentData, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { Avatar, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors } from '@/constants/Colors';

const ChatItem = ({ item, noBorder = false, currenUser }) => {
  const { colors } = useTheme();
  const router = useRouter();
  const [lastMessage, setLastMessage] = useState<DocumentData | null>(null);
  const maxLength = 25;

  const ageColor = item.gender === 'male' ? Colors.primary : item.gender === 'female' ? Colors.secondary : Colors.neutralDark;

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
      style={[styles.container, !noBorder && { borderBottomColor: colors.border }]}
      onPress={() => {
        router.push({
          pathname: "/chat/[id]",
          params: { id: item.id }
        });
      }}
    >
      <View style={styles.avatarContainer}>
        <Avatar.Image size={50} source={{ uri: item.profileUrl }} style={styles.image} />
        <View style={[styles.statusIndicator, item.isOnline ? styles.online : styles.offline]} />
      </View>
      <View style={styles.textContainer}>
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Text style={[styles.name, { color: colors.text }]}>
              {renderUsername()}
            </Text>
            {item.gender === 'male' ? (
              <MaterialCommunityIcons name="gender-male" size={15} color={Colors.primary} />
            ) : item.gender === 'female' ? (
              <MaterialCommunityIcons name="gender-female" size={15} color={Colors.secondary} />
            ) : null}
            <Text style={[styles.age, { color: ageColor }]}>
              {calculateAge(item.age)}
            </Text>
          </View>
          <Text style={[styles.time, { color: colors.subtleText }]}>
            {renderTime()}
          </Text>
        </View>
        <Text style={[styles.lastMessage, { color: colors.subtleText }]}>
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
    borderColor: Colors.borderLine,
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
    color: Colors.light.text, 
  },
  age: {
    fontSize: 12,
    marginLeft: 5,
    color: Colors.light.icon, 
  },
  time: {
    fontSize: 12,
    color: Colors.light.icon, 
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.light.icon, 
  },
  statusIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    position: 'absolute',
    bottom: 0,
    right: 13,
    borderWidth: 2,
    borderColor: Colors.light.background,
  },
  online: {
    backgroundColor: Colors.success,
  },
  offline: {
    backgroundColor: Colors.warning,
  },
});

export default ChatItem;
