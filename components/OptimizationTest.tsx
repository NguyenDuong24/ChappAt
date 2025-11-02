import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useOptimizedChatMessages } from '@/hooks/useOptimizedChatMessages';
import { useAuth } from '@/context/authContext';
import { getRoomId } from '@/utils/common';
import messageBatchService from '@/services/messageBatchService';
import userCacheService from '@/services/userCacheService';
import globalOptimizationService from '@/services/globalOptimizationService';

interface OptimizationTestProps {
  peerId: string;
}

export const OptimizationTest: React.FC<OptimizationTestProps> = ({ peerId }) => {
  const { user } = useAuth();
  const roomId = getRoomId(user?.uid as string, peerId);
  
  // Use optimized chat messages
  const { 
    messages, 
    loading, 
    hasMore, 
    loadMoreMessages,
    refreshMessages 
  } = useOptimizedChatMessages({
    roomId,
    pageSize: 20,
    enableRealtime: true
  });

  const testBatchOperations = async () => {
    if (!user?.uid) return;
    
    console.log('🧪 Testing batch operations...');
    
    // Test batch mark as read
    const unreadMessageIds = messages
      .filter(msg => msg.uid !== user.uid)
      .map(msg => msg.id)
      .slice(0, 5); // Test with 5 messages
    
    if (unreadMessageIds.length > 0) {
      messageBatchService.batchMarkAsRead(roomId, unreadMessageIds, user.uid);
      console.log('✅ Batch mark as read queued');
    }
    
    // Test user cache
    const testUserIds = messages
      .map(msg => msg.uid)
      .filter((uid, index, array) => array.indexOf(uid) === index)
      .slice(0, 5);
    
    if (testUserIds.length > 0) {
      const cachedUsers = await userCacheService.getUsers(testUserIds);
      console.log(`✅ Cached ${cachedUsers.size} users`);
    }
  };

  const testLocationOptimization = async () => {
    if (!user?.uid) return;
    
    console.log('🌍 Testing location optimization...');
    
    // Mock location for testing
    const mockLocation = {
      latitude: 21.0285, // Hanoi coordinates
      longitude: 105.8542
    };
    
    const nearbyUsers = await globalOptimizationService.queryOptimizedNearbyUsers(
      mockLocation,
      user.uid,
      1000 // 1km radius
    );
    
    console.log(`✅ Found ${nearbyUsers.length} nearby users`);
  };

  const showOptimizationStats = () => {
    const stats = globalOptimizationService.getOptimizationStats();
    console.log('📊 Optimization Statistics:');
    console.log('- Total requests saved:', stats.totalRequestsSaved);
    console.log('- Cache hit rate:', stats.cacheHitRate.toFixed(2) + '%');
    console.log('- Active connections:', stats.activeConnections);
    console.log('- Cache stats:', stats.cacheStats);
    console.log('- Connection stats:', stats.connectionStats);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Optimization Test Panel</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chat Messages</Text>
        <Text>Total messages: {messages.length}</Text>
        <Text>Loading: {loading ? 'Yes' : 'No'}</Text>
        <Text>Has more: {hasMore ? 'Yes' : 'No'}</Text>
        
        <TouchableOpacity style={styles.button} onPress={loadMoreMessages}>
          <Text style={styles.buttonText}>Load More Messages</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={refreshMessages}>
          <Text style={styles.buttonText}>Refresh Messages</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Batch Operations</Text>
        
        <TouchableOpacity style={styles.button} onPress={testBatchOperations}>
          <Text style={styles.buttonText}>Test Batch Operations</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testLocationOptimization}>
          <Text style={styles.buttonText}>Test Location Optimization</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        
        <TouchableOpacity style={styles.button} onPress={showOptimizationStats}>
          <Text style={styles.buttonText}>Show Optimization Stats</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.messagesList}>
        <Text style={styles.sectionTitle}>Recent Messages</Text>
        {messages.slice(-10).map((message, index) => (
          <View key={message.id || index} style={styles.messageItem}>
            <Text style={styles.messageText}>
              {message.senderName || 'Unknown'}: {message.text || 'No text'}
            </Text>
            <Text style={styles.messageTime}>
              {message.createdAt ? new Date(message.createdAt.seconds * 1000).toLocaleTimeString() : 'No time'}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  messagesList: {
    maxHeight: 200,
  },
  messageItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  messageText: {
    fontSize: 14,
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});
