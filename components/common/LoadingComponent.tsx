import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LoadingComponent = ({ text = 'Đang tải...' }: { text?: string }) => (
  <SafeAreaView style={styles.container}>
    <View style={styles.content}>
      <ActivityIndicator size="large" color="#4ECDC4" />
      <Text style={styles.text}>{text}</Text>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
});

export default LoadingComponent;
