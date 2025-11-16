import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';

export default function SimpleSoundTest() {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [status, setStatus] = useState('Ready');

  async function playSound() {
    try {
      setStatus('Loading...');
      console.log('🔊 Loading Sound from assets/sounds/notification.mp3');
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/notification.mp3'),
        { shouldPlay: false }
      );
      
      setSound(newSound);
      setStatus('Playing...');
      console.log('🔊 Playing Sound');
      
      await newSound.playAsync();
      setStatus('Played! Did you hear it?');
      
      // Auto cleanup after 3 seconds
      setTimeout(() => {
        newSound.unloadAsync();
        setStatus('Ready');
      }, 3000);
      
    } catch (error) {
      console.error('❌ Error playing sound:', error);
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function playJoinSound() {
    try {
      setStatus('Loading join.mp3...');
      console.log('🔊 Loading join.mp3');
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/join.mp3'),
        { shouldPlay: false }
      );
      
      setStatus('Playing join.mp3...');
      console.log('🔊 Playing join.mp3');
      
      await newSound.playAsync();
      setStatus('join.mp3 played!');
      
      setTimeout(() => {
        newSound.unloadAsync();
        setStatus('Ready');
      }, 3000);
      
    } catch (error) {
      console.error('❌ Error playing join.mp3:', error);
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function playCallingSound() {
    try {
      setStatus('Loading calling.mp3...');
      console.log('🔊 Loading calling.mp3');
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/calling.mp3'),
        { shouldPlay: false }
      );
      
      setStatus('Playing calling.mp3...');
      console.log('🔊 Playing calling.mp3');
      
      await newSound.playAsync();
      setStatus('calling.mp3 played!');
      
      setTimeout(() => {
        newSound.unloadAsync();
        setStatus('Ready');
      }, 3000);
      
    } catch (error) {
      console.error('❌ Error playing calling.mp3:', error);
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  useEffect(() => {
    // Initialize Audio on mount
    const initAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        console.log('✅ Audio mode set successfully');
      } catch (error) {
        console.error('❌ Failed to set audio mode:', error);
      }
    };
    
    initAudio();
    
    return () => {
      if (sound) {
        console.log('🧹 Unloading Sound');
        sound.unloadAsync();
      }
    };
  }, [sound]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔊 Simple Sound Test</Text>
      <Text style={styles.status}>Status: {status}</Text>
      
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          ⚠️ Important:
        </Text>
        <Text style={styles.instructionText}>
          1. Tăng volume thiết bị
        </Text>
        <Text style={styles.instructionText}>
          2. Tắt chế độ im lặng (iOS)
        </Text>
        <Text style={styles.instructionText}>
          3. Test trên thiết bị thật
        </Text>
        <Text style={styles.instructionText}>
          4. Xem console logs
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button 
          title="▶️ Play notification.mp3" 
          onPress={playSound}
          color="#007AFF"
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button 
          title="▶️ Play join.mp3" 
          onPress={playJoinSound}
          color="#34C759"
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button 
          title="▶️ Play calling.mp3" 
          onPress={playCallingSound}
          color="#FF9500"
        />
      </View>

      <View style={styles.info}>
        <Text style={styles.infoText}>
          Nếu không nghe thấy:
        </Text>
        <Text style={styles.infoText}>
          • Check console logs cho lỗi
        </Text>
        <Text style={styles.infoText}>
          • File MP3 có tồn tại không?
        </Text>
        <Text style={styles.infoText}>
          • Emulator không hỗ trợ tốt
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  status: {
    fontSize: 18,
    marginBottom: 30,
    color: '#007AFF',
    fontWeight: '600',
  },
  instructions: {
    backgroundColor: '#FFF3CD',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
  },
  instructionText: {
    fontSize: 14,
    color: '#856404',
    marginVertical: 3,
  },
  buttonContainer: {
    marginVertical: 10,
    width: '80%',
  },
  info: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    width: '100%',
  },
  infoText: {
    fontSize: 13,
    color: '#1565C0',
    marginVertical: 2,
  },
});
