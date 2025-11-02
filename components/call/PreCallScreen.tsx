import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  Switch,
} from 'react-native';
import {
  useMediaDevice,
  createCameraVideoTrack,
  createMicrophoneAudioTrack,
} from '@videosdk.live/react-native-sdk';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface PreCallScreenProps {
  onJoinMeeting: (micEnabled: boolean, webcamEnabled: boolean) => void;
  onBack: () => void;
}

export default function PreCallScreen({ onJoinMeeting, onBack }: PreCallScreenProps) {
  const [micEnabled, setMicEnabled] = useState(true);
  const [webcamEnabled, setWebcamEnabled] = useState(true);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [devices, setDevices] = useState({
    cameras: [],
    microphones: [],
    speakers: [],
  });

  const {
    checkPermission,
    requestPermission,
    getCameras,
    getAudioDeviceList,
    getDevices,
  } = useMediaDevice({
    onAudioDeviceChanged: (device) => {
      console.log('🔄 Audio device changed:', device);
      // Refresh device list when devices change
      loadDevices();
    },
  });

  // Check and request permissions
  const checkPermissions = async () => {
    try {
      const audioPermission = await checkPermission('audio');
      const videoPermission = await checkPermission('video');
      
      console.log('📱 Audio permission:', audioPermission);
      console.log('📱 Video permission:', videoPermission);

      if (audioPermission.get('audio') && videoPermission.get('video')) {
        setPermissionsGranted(true);
        await loadDevices();
      } else {
        await requestPermissions();
      }
    } catch (error) {
      console.error('❌ Error checking permissions:', error);
      Alert.alert('Error', 'Failed to check permissions');
    }
  };

  const requestPermissions = async () => {
    try {
      const audioVideoPermission = await requestPermission('audio_video');
      console.log('✅ Requested permissions:', audioVideoPermission);
      
      if (audioVideoPermission.get('audio') && audioVideoPermission.get('video')) {
        setPermissionsGranted(true);
        await loadDevices();
      } else {
        Alert.alert('Permissions Required', 'Please grant camera and microphone permissions to continue');
      }
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request permissions');
    }
  };

  // Load available devices
  const loadDevices = async () => {
    try {
      const cameras = await getCameras();
      const microphones = await getAudioDeviceList();
      const allDevices = await getDevices();

      console.log('📷 Cameras:', cameras);
      console.log('🎤 Microphones:', microphones);
      console.log('🔊 All devices:', allDevices);

      setDevices({
        cameras: cameras || [],
        microphones: microphones || [],
        speakers: allDevices?.filter(device => device.kind === 'audiooutput') || [],
      });
    } catch (error) {
      console.error('❌ Error loading devices:', error);
    }
  };

  // Test media tracks
  const testMediaTracks = async () => {
    try {
      if (micEnabled) {
        const audioTrack = await createMicrophoneAudioTrack({
          encoderConfig: 'speech_standard',
          noiseConfig: {
            noiseSuppression: true,
            echoCancellation: true,
            autoGainControl: true,
          },
        });
        console.log('🎤 Audio track created:', audioTrack);
      }

      if (webcamEnabled) {
        const videoTrack = await createCameraVideoTrack({
          optimizationMode: 'motion',
          encoderConfig: 'h720p_w1280p',
          facingMode: 'user',
        });
        console.log('📷 Video track created:', videoTrack);
      }
    } catch (error) {
      console.error('❌ Error creating media tracks:', error);
    }
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  const renderDeviceItem = ({ item, type }: { item: any; type: string }) => (
    <View style={styles.deviceItem}>
      <Ionicons 
        name={type === 'camera' ? 'videocam' : type === 'microphone' ? 'mic' : 'volume-high'} 
        size={20} 
        color="#4CAF50" 
      />
      <Text style={styles.deviceText}>{item.label || item.deviceId}</Text>
    </View>
  );

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Pre-Call Setup</Text>
        </View>

        {!permissionsGranted ? (
          <View style={styles.permissionContainer}>
            <Ionicons name="shield-checkmark" size={80} color="#FFFFFF" />
            <Text style={styles.permissionText}>
              We need camera and microphone permissions to start the call
            </Text>
            <TouchableOpacity onPress={requestPermissions} style={styles.permissionButton}>
              <Text style={styles.buttonText}>Grant Permissions</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Media Controls */}
            <View style={styles.mediaControls}>
              <View style={styles.controlRow}>
                <View style={styles.controlInfo}>
                  <Ionicons name="mic" size={24} color="#FFFFFF" />
                  <Text style={styles.controlText}>Microphone</Text>
                </View>
                <Switch
                  value={micEnabled}
                  onValueChange={setMicEnabled}
                  trackColor={{ false: '#767577', true: '#4CAF50' }}
                  thumbColor={micEnabled ? '#FFFFFF' : '#f4f3f4'}
                />
              </View>

              <View style={styles.controlRow}>
                <View style={styles.controlInfo}>
                  <Ionicons name="videocam" size={24} color="#FFFFFF" />
                  <Text style={styles.controlText}>Camera</Text>
                </View>
                <Switch
                  value={webcamEnabled}
                  onValueChange={setWebcamEnabled}
                  trackColor={{ false: '#767577', true: '#4CAF50' }}
                  thumbColor={webcamEnabled ? '#FFFFFF' : '#f4f3f4'}
                />
              </View>
            </View>

            {/* Device Lists */}
            <View style={styles.deviceContainer}>
              <Text style={styles.sectionTitle}>Available Devices</Text>
              
              {devices.cameras.length > 0 && (
                <View style={styles.deviceSection}>
                  <Text style={styles.deviceSectionTitle}>📷 Cameras ({devices.cameras.length})</Text>
                  <FlatList
                    data={devices.cameras}
                    renderItem={(item) => renderDeviceItem({ ...item, type: 'camera' })}
                    keyExtractor={(item) => item.deviceId}
                    style={styles.deviceList}
                  />
                </View>
              )}

              {devices.microphones.length > 0 && (
                <View style={styles.deviceSection}>
                  <Text style={styles.deviceSectionTitle}>🎤 Microphones ({devices.microphones.length})</Text>
                  <FlatList
                    data={devices.microphones}
                    renderItem={(item) => renderDeviceItem({ ...item, type: 'microphone' })}
                    keyExtractor={(item) => item.deviceId}
                    style={styles.deviceList}
                  />
                </View>
              )}
            </View>

            {/* Test and Join Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity onPress={testMediaTracks} style={styles.testButton}>
                <Ionicons name="flask" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Test Media</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => onJoinMeeting(micEnabled, webcamEnabled)} 
                style={styles.joinButton}
              >
                <Ionicons name="call" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Join Meeting</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginVertical: 20,
  },
  permissionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  mediaControls: {
    marginBottom: 30,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 10,
  },
  controlInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 10,
  },
  deviceContainer: {
    flex: 1,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  deviceSection: {
    marginBottom: 20,
  },
  deviceSectionTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  deviceList: {
    maxHeight: 120,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    marginBottom: 5,
  },
  deviceText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 10,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  testButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 15,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  joinButton: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 12,
    marginLeft: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});
