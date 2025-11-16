import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useSound } from '@/hooks/useSound';
import { useAudio } from '@/context/AudioContext';

export default function SoundTestScreen() {
  const {
    playMessageReceivedSound,
    playMessageSentSound,
    playNotificationSound,
    playIncomingCallSound,
    playSuccessSound,
    playErrorSound,
    stopCallSounds,
    stopAllSounds,
  } = useSound();

  const { isInitialized, soundsLoaded } = useAudio();

  const testSound = async (soundFunction, soundName) => {
    try {
      console.log(`Testing ${soundName}...`);
      await soundFunction();
      Alert.alert('Success', `${soundName} played!`);
    } catch (error) {
      console.error(`Error playing ${soundName}:`, error);
      Alert.alert('Error', `Failed to play ${soundName}: ${error.message}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔊 Sound Test Screen</Text>
        <Text style={styles.subtitle}>
          Initialized: {isInitialized ? '✅' : '❌'}
        </Text>
        <Text style={styles.subtitle}>
          Sounds Loaded: {soundsLoaded ? '✅' : '❌'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Message Sounds</Text>
        
        <TouchableOpacity
          style={styles.button}
          onPress={() => testSound(playMessageReceivedSound, 'Message Received')}
        >
          <Text style={styles.buttonText}>📨 Play Message Received</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => testSound(playMessageSentSound, 'Message Sent')}
        >
          <Text style={styles.buttonText}>📤 Play Message Sent</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => testSound(playNotificationSound, 'Notification')}
        >
          <Text style={styles.buttonText}>🔔 Play Notification</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Call Sounds</Text>
        
        <TouchableOpacity
          style={styles.button}
          onPress={() => testSound(playIncomingCallSound, 'Incoming Call')}
        >
          <Text style={styles.buttonText}>📞 Play Incoming Call</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.stopButton]}
          onPress={() => {
            stopCallSounds();
            Alert.alert('Stopped', 'All call sounds stopped');
          }}
        >
          <Text style={styles.buttonText}>⏹️ Stop Call Sounds</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Sounds</Text>
        
        <TouchableOpacity
          style={styles.button}
          onPress={() => testSound(playSuccessSound, 'Success')}
        >
          <Text style={styles.buttonText}>✅ Play Success</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => testSound(playErrorSound, 'Error')}
        >
          <Text style={styles.buttonText}>❌ Play Error</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.stopButton]}
          onPress={() => {
            stopAllSounds();
            Alert.alert('Stopped', 'All sounds stopped');
          }}
        >
          <Text style={styles.buttonText}>⏹️ Stop All Sounds</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.infoText}>
          Nếu không nghe được âm thanh, kiểm tra:
        </Text>
        <Text style={styles.infoText}>✓ Volume thiết bị đủ lớn</Text>
        <Text style={styles.infoText}>✓ Không ở chế độ im lặng</Text>
        <Text style={styles.infoText}>✓ Xem console logs</Text>
        <Text style={styles.infoText}>✓ Test trên thiết bị thật, không phải emulator</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    marginVertical: 2,
  },
  section: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginVertical: 5,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginVertical: 3,
    paddingLeft: 10,
  },
});
