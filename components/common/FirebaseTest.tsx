import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { testFirebaseConnection } from '@/services/testFirebase';
import { useAuth } from '@/context/authContext';

const FirebaseTest = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleTest = async () => {
    setLoading(true);
    try {
      console.log('🧪 Starting Firebase test...');
      console.log('👤 Current user from auth context:', user);

      const result = await testFirebaseConnection();

      if (result.success) {
        Alert.alert('✅ Thành công', `Test document created with ID: ${result.docId}`);
      } else {
        Alert.alert('❌ Thất bại', `Error: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Test error:', error);
      Alert.alert('❌ Lỗi', 'Không thể test Firebase connection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firebase Connection Test</Text>
      <Text style={styles.info}>User: {user ? user.email : 'Not logged in'}</Text>
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleTest}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Testing...' : 'Test Firebase Connection'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  info: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#6366F1',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FirebaseTest;
