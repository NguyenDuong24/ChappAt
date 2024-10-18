import { View, Text, FlatList, StyleSheet } from 'react-native';
import React from 'react';
import ChatItem from './ChatItem';

const ChatList = ({ users, currenUser }:any) => {
  const renderEmptyList = () => (
    <View style={styles.emptyList}>
      <Text style={styles.emptyText}>No users available</Text>
    </View>
  );

  return (
    <View>
      <FlatList
        data={users}
        contentContainerStyle={styles.listContainer}
        keyExtractor={(item, index) => index.toString()} 
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => <ChatItem 
          item={item} 
          noBorder={index+1 == users.length} 
          currenUser={currenUser}
        />}
        ListEmptyComponent={renderEmptyList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    paddingVertical: 25,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#888',
  },
});

export default ChatList;
