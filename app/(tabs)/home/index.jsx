import { useAppState } from '@/context/AppStateContext';
import React, { useEffect, useState, useContext } from 'react';
import { View, StatusBar, ActivityIndicator, StyleSheet } from 'react-native';
import ListUser from '@/components/home/ListUser';
import { useAuth } from '@/context/authContext';
import { getDocs } from 'firebase/firestore';
import { userRef } from '@/firebaseConfig';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import useHome from './useHome';


export default function Home() {
  const appState = useAppState();
  const { user } = useAuth();
  const { getUsers, users, loading, refreshing, handleRefresh } = useHome();
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light; 

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={currentThemeColors.tint} />
        </View>
      ) : (
        <ListUser users={users} refreshing={refreshing} onRefresh={handleRefresh} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
