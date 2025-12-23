import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';

interface AudioMessageProps {
    uri: string;
    duration?: number;
    isCurrentUser: boolean;
    themeColors: any;
}

const AudioMessage: React.FC<AudioMessageProps> = ({ uri, duration = 0, isCurrentUser, themeColors }) => {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [soundDuration, setSoundDuration] = useState(duration * 1000); // ms

    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    const loadSound = async () => {
        setIsLoading(true);
        try {
            const { sound: newSound, status } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: true },
                onPlaybackStatusUpdate
            );
            setSound(newSound);
            setIsPlaying(true);
            if (status.isLoaded && status.durationMillis) {
                setSoundDuration(status.durationMillis);
            }
        } catch (error) {
            console.error('Error loading sound', error);
        } finally {
            setIsLoading(false);
        }
    };

    const onPlaybackStatusUpdate = (status: any) => {
        if (status.isLoaded) {
            setPosition(status.positionMillis);
            setSoundDuration(status.durationMillis || soundDuration);
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(0);
                // sound?.setPositionAsync(0); // Optional: reset to start
            }
        }
    };

    const handlePlayPause = async () => {
        if (!sound) {
            await loadSound();
        } else {
            if (isPlaying) {
                await sound.pauseAsync();
            } else {
                if (position >= soundDuration) {
                    await sound.replayAsync();
                } else {
                    await sound.playAsync();
                }
            }
        }
    };

    const formatTime = (millis: number) => {
        const totalSeconds = Math.floor(millis / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={handlePlayPause} disabled={isLoading}>
                {isLoading ? (
                    <ActivityIndicator size="small" color={isCurrentUser ? '#FFF' : themeColors.text} />
                ) : (
                    <MaterialIcons
                        name={isPlaying ? "pause" : "play-arrow"}
                        size={32}
                        color={isCurrentUser ? '#FFF' : themeColors.text}
                    />
                )}
            </TouchableOpacity>

            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)' }]}>
                    <View style={[
                        styles.progressFill,
                        {
                            width: `${Math.min((position / soundDuration) * 100, 100)}%`,
                            backgroundColor: isCurrentUser ? '#FFF' : themeColors.tint
                        }
                    ]} />
                </View>
                <Text style={[styles.durationText, { color: isCurrentUser ? 'rgba(255,255,255,0.8)' : themeColors.subtleText }]}>
                    {formatTime(isPlaying || position > 0 ? position : soundDuration)}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 4,
        minWidth: 150,
    },
    progressContainer: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    progressBar: {
        height: 4,
        borderRadius: 2,
        width: '100%',
        marginBottom: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    durationText: {
        fontSize: 11,
        fontWeight: '500',
    },
});

export default AudioMessage;
