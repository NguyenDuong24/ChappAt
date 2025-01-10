// components/MessageList.js
import React from 'react';
import { View, Text, FlatList, StyleSheet, ScrollView } from 'react-native';
import MessageItem from './MessageItem';

export default function MessageList({ messages, currentUser, scrollViewRef }: any) {
  return (
    <ScrollView ref={scrollViewRef}>
      {
        messages.map((message:any, index:any)=>{
          return (
            <MessageItem message={message} key={index} currentUser={currentUser}/>
          )
        })
      }
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  messageText: {
    fontSize: 16,
  },
});
