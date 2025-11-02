import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useMeeting } from '@videosdk.live/react-native-sdk';

interface DebugMonitorProps {
  enabled?: boolean;
}

export default function DebugMonitor({ enabled = true }: DebugMonitorProps) {
  const [logs, setLogs] = useState<string[]>([]);
  
  const { 
    localMicOn,
    localWebcamOn,
    participants,
    meetingId 
  } = useMeeting({});

  useEffect(() => {
    if (!enabled) return;
    
    const newLog = `${new Date().toLocaleTimeString()} - Mic: ${localMicOn}, Camera: ${localWebcamOn}, Participants: ${participants.size}`;
    
    setLogs(prev => {
      const updated = [...prev, newLog];
      // Keep only last 10 logs
      return updated.slice(-10);
    });
    
    console.log('🔍 State Monitor:', { localMicOn, localWebcamOn, participantCount: participants.size, meetingId });
  }, [localMicOn, localWebcamOn, participants.size, enabled]);

  if (!enabled) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 Debug Monitor</Text>
      <Text style={styles.status}>
        Mic: {localMicOn ? '🟢 ON' : '🔴 OFF'} | 
        Camera: {localWebcamOn ? '🟢 ON' : '🔴 OFF'} | 
        Participants: {participants.size}
      </Text>
      <View style={styles.logsContainer}>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>{log}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 10,
    borderRadius: 8,
    maxWidth: 300,
    zIndex: 1000,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  status: {
    color: '#FFFFFF',
    fontSize: 10,
    marginBottom: 5,
  },
  logsContainer: {
    maxHeight: 100,
  },
  logText: {
    color: '#CCCCCC',
    fontSize: 8,
    lineHeight: 12,
  },
});
