import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Audio } from "expo-av";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
interface VoiceRecorderProps {
  onSend: (uri: string, duration: number) => void;
  onCancel: () => void;
  currentThemeColors: any;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onSend,
  onCancel,
  currentThemeColors,
}) => {
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationRef = useRef(0);
  const isMountedRef = useRef(true);
  const pulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const cleanupPulseAnimation = useCallback(() => {
    pulseAnimationRef.current?.stop();
    pulseAnimationRef.current = null;
    scaleAnim.setValue(1);
  }, [scaleAnim]);

  const stopRecording = useCallback(
    async (shouldSend: boolean) => {
      const activeRecording = recordingRef.current;
      recordingRef.current = null;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      cleanupPulseAnimation();

      if (isMountedRef.current) {
        setIsRecording(false);
      }

      if (!activeRecording) return;

      try {
        await activeRecording.stopAndUnloadAsync();
        const uri = activeRecording.getURI();

        if (shouldSend && uri) {
          onSend(uri, durationRef.current);
        } else {
          onCancel();
        }
      } catch (error) {
        console.error("Failed to stop recording", error);
        onCancel();
      }
    },
    [cleanupPulseAnimation, onCancel, onSend],
  );

  const startRecording = useCallback(async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        onCancel();
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: nextRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      if (!isMountedRef.current) {
        await nextRecording.stopAndUnloadAsync();
        return;
      }

      recordingRef.current = nextRecording;
      durationRef.current = 0;
      setDuration(0);
      setIsRecording(true);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        if (isMountedRef.current) setDuration(durationRef.current);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording", err);
      onCancel();
    }
  }, [onCancel]);

  useEffect(() => {
    isMountedRef.current = true;
    startRecording();
    return () => {
      isMountedRef.current = false;
      void stopRecording(false);
    };
  }, [startRecording, stopRecording]);

  useEffect(() => {
    if (isRecording) {
      cleanupPulseAnimation();
      pulseAnimationRef.current = Animated.loop(
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
        ]),
      );
      pulseAnimationRef.current.start();
    } else {
      cleanupPulseAnimation();
    }

    return () => {
      cleanupPulseAnimation();
    };
  }, [cleanupPulseAnimation, isRecording, scaleAnim]);

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }, []);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: currentThemeColors.surface },
      ]}
    >
      <View style={styles.recordingIndicator}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <MaterialIcons name="mic" size={24} color="#EF4444" />
        </Animated.View>
        <Text style={[styles.timerText, { color: currentThemeColors.text }]}>
          {formatDuration(duration)}
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={() => stopRecording(false)}
          style={styles.cancelButton}
        >
          <Text style={{ color: currentThemeColors.subtleText }}>H?y</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => stopRecording(true)}
          style={[
            styles.sendButton,
            { backgroundColor: currentThemeColors.tint },
          ]}
        >
          <MaterialIcons name="send" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 60,
    borderRadius: 30,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timerText: {
    fontSize: 16,
    fontWeight: "600",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  cancelButton: {
    padding: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default VoiceRecorder;
