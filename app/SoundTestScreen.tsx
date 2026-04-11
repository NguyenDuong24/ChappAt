import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useSound } from '@/hooks/useSound';
import { useAudio } from '@/context/AudioContext';
import { useTranslation } from 'react-i18next';

export default function SoundTestScreen() {
  const { t } = useTranslation();
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
      await soundFunction();
      Alert.alert(t('common.success'), t('sound_test.played', { name: soundName }));
    } catch (error) {
      Alert.alert(t('common.error'), t('sound_test.play_failed', { name: soundName, error: error?.message || t('hotspots.chat.unknown_error') }));
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('sound_test.title')}</Text>
        <Text style={styles.subtitle}>{t('sound_test.initialized')}: {isInitialized ? t('sound_test.yes') : t('sound_test.no')}</Text>
        <Text style={styles.subtitle}>{t('sound_test.loaded')}: {soundsLoaded ? t('sound_test.yes') : t('sound_test.no')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('sound_test.message_sounds')}</Text>

        <TouchableOpacity style={styles.button} onPress={() => testSound(playMessageReceivedSound, t('sound_test.message_received'))}>
          <Text style={styles.buttonText}>{t('sound_test.play_message_received')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => testSound(playMessageSentSound, t('sound_test.message_sent'))}>
          <Text style={styles.buttonText}>{t('sound_test.play_message_sent')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => testSound(playNotificationSound, t('sound_test.notification'))}>
          <Text style={styles.buttonText}>{t('sound_test.play_notification')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('sound_test.call_sounds')}</Text>

        <TouchableOpacity style={styles.button} onPress={() => testSound(playIncomingCallSound, t('sound_test.incoming_call'))}>
          <Text style={styles.buttonText}>{t('sound_test.play_incoming_call')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.stopButton]}
          onPress={() => {
            stopCallSounds();
            Alert.alert(t('sound_test.stopped_title'), t('sound_test.stopped_call_sounds'));
          }}
        >
          <Text style={styles.buttonText}>{t('sound_test.stop_call_sounds')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('sound_test.system_sounds')}</Text>

        <TouchableOpacity style={styles.button} onPress={() => testSound(playSuccessSound, t('common.success'))}>
          <Text style={styles.buttonText}>{t('sound_test.play_success')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => testSound(playErrorSound, t('common.error'))}>
          <Text style={styles.buttonText}>{t('sound_test.play_error')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.stopButton]}
          onPress={() => {
            stopAllSounds();
            Alert.alert(t('sound_test.stopped_title'), t('sound_test.stopped_all_sounds'));
          }}
        >
          <Text style={styles.buttonText}>{t('sound_test.stop_all_sounds')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.infoText}>{t('sound_test.checklist_title')}</Text>
        <Text style={styles.infoText}>{t('sound_test.check_1')}</Text>
        <Text style={styles.infoText}>{t('sound_test.check_2')}</Text>
        <Text style={styles.infoText}>{t('sound_test.check_3')}</Text>
        <Text style={styles.infoText}>{t('sound_test.check_4')}</Text>
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
