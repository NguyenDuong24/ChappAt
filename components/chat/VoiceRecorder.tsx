import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { Audio } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';

interface VoiceRecorderProps {
    onSend: (uri: string, duration: number) => void;
    onCancel: () => void;
    currentThemeColors: any;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSend, onCancel, currentThemeColors }) => {
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [duration, setDuration] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        startRecording();
        return () => {
            stopRecording(false);
        };
    }, []);

    useEffect(() => {
        if (isRecording) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1.2,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            scaleAnim.setValue(1);
        }
    }, [isRecording]);

    const startRecording = async () => {
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status === 'granted') {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                });

                const { recording } = await Audio.Recording.createAsync(
                    Audio.RecordingOptionsPresets.HIGH_QUALITY
                );
                setRecording(recording);
                setIsRecording(true);

                timerRef.current = setInterval(() => {
                    setDuration(prev => prev + 1);
                }, 1000);
            }
        } catch (err) {
            console.error('Failed to start recording', err);
            onCancel();
        }
    };

    const stopRecording = async (shouldSend: boolean) => {
        if (!recording) return;

        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);

        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();

            if (shouldSend && uri) {
                onSend(uri, duration);
            } else {
                onCancel();
            }
        } catch (error) {
            console.error('Failed to stop recording', error);
            onCancel();
        }
        setRecording(null);
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <View style={[styles.container, { backgroundColor: currentThemeColors.surface }]}>
            <View style={styles.recordingIndicator}>
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                    <MaterialIcons name="mic" size={24} color="#EF4444" />
                </Animated.View>
                <Text style={[styles.timerText, { color: currentThemeColors.text }]}>
                    {formatDuration(duration)}
                </Text>
            </View>

            <View style={styles.controls}>
                <TouchableOpacity onPress={() => stopRecording(false)} style={styles.cancelButton}>
                    <Text style={{ color: currentThemeColors.subtleText }}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => stopRecording(true)} style={[styles.sendButton, { backgroundColor: currentThemeColors.tint }]}>
                    <MaterialIcons name="send" size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        height: 60,
        borderRadius: 30,
        marginHorizontal: 12,
        marginBottom: 8,
    },
    recordingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    timerText: {
        fontSize: 16,
        fontWeight: '600',
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    cancelButton: {
        padding: 8,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default VoiceRecorder;
