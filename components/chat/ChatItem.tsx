import { db } from '@/firebaseConfig';
import { formatTime, getRoomId } from '@/utils/common';
import { useRouter } from 'expo-router';
import { collection, doc, DocumentData, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { Avatar, Text, useTheme } from 'react-native-paper';

const ChatItem = ({ item, noBorder = false, currenUser }:any) => {
  const { colors } = useTheme();
  const router = useRouter();
  const [lastMessage, setLastMessage] = useState<DocumentData | null>(null);
  useEffect(() => {

    const roomId = getRoomId(currenUser?.userId, item?.userId);
    console.log('currentUser', currenUser)
    const docRef = doc(db, "rooms", roomId);
    const messagesRef = collection(docRef, "messages");
    const q = query(messagesRef, orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(q, (snapshot) => {
      let allMessages = snapshot.docs.map((doc) =>{
        return doc.data()
      });
      setLastMessage(allMessages[0] ? allMessages[0] : null);
    });

    return unsub;
  }, []);

  const renderTime = () =>{
      if(lastMessage){
        let date = formatTime(lastMessage?.createdAt)
        return date
      }
  }

  const renderLastMessage = () =>{
    if(typeof lastMessage == 'undefined') return 'Loading...'
    if(lastMessage)
    {
      if(currenUser?.userId == lastMessage?.userId) return "You: "+lastMessage?.text
      return lastMessage?.text
    }else{
      return 'Say hi';
    }
  }

  return (
    <TouchableOpacity style={styles.container } onPress={() => {router.push({
      pathname: "/chat/[id]",
      params: {id: item.userId}
    })}}>
      <Avatar.Image size={50} source={{ uri: item.profileUrl }} style={styles.image} />
      <View style={styles.textContainer}>
        <View style={styles.header}>
          <Text style={[styles.name, { color: colors.text }]}>{item.username}</Text>
          <Text style={[styles.time, { color: colors.text }]}>
          {
            renderTime()
          }
          </Text>
        </View>
        <Text style={[styles.lastMessage, { color: colors.text }]}>
          {
            renderLastMessage()
          }
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
    borderBottomColor: '#ddd',
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
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  time: {
    fontSize: 12,
  },
  lastMessage: {
    fontSize: 14,
  },
});

export default ChatItem;
