import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity } from 'react-native';
import { SoundSettings } from '../../utils/soundSettings';
import { useSound } from '../../hooks/useSound';

export const SoundSettingsScreen = () => {
  const [settings, setSettings] = useState(null);
  const { playMessageReceivedSound, playNotificationSound } = useSound();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const currentSettings = await SoundSettings.getSettings();
    setSettings(currentSettings);
  };

  const updateSetting = async (key, value) => {
    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);
    await SoundSettings.saveSettings(updatedSettings);
  };

  const updateVolume = async (category, volume) => {
    const updatedSettings = {
      ...settings,
      volume: { ...settings.volume, [category]: volume }
    };
    setSettings(updatedSettings);
    await SoundSettings.saveSettings(updatedSettings);
  };

  const testSound = (type) => {
    switch (type) {
      case 'message':
        playMessageReceivedSound();
        break;
      case 'notification':
        playNotificationSound();
        break;
    }
  };

  if (!settings) {
    return <Text>Loading...</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cài đặt âm thanh</Text>
      
      {/* Enable/Disable Sounds */}
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Bật âm thanh</Text>
        <Switch
          value={settings.enabled}
          onValueChange={(value) => updateSetting('enabled', value)}
        />
      </View>

      {settings.enabled && (
        <>
          {/* Call Volume */}
          <View style={styles.volumeSection}>
            <Text style={styles.volumeLabel}>Âm lượng cuộc gọi: {Math.round(settings.volume.calls * 100)}%</Text>
            <View style={styles.volumeButtons}>
              <TouchableOpacity onPress={() => updateVolume('calls', Math.max(0, settings.volume.calls - 0.1))}>
                <Text style={styles.volumeButton}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => updateVolume('calls', Math.min(1, settings.volume.calls + 0.1))}>
                <Text style={styles.volumeButton}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Message Volume */}
          <View style={styles.volumeSection}>
            <Text style={styles.volumeLabel}>Âm lượng tin nhắn: {Math.round(settings.volume.messages * 100)}%</Text>
            <View style={styles.volumeButtons}>
              <TouchableOpacity onPress={() => updateVolume('messages', Math.max(0, settings.volume.messages - 0.1))}>
                <Text style={styles.volumeButton}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => updateVolume('messages', Math.min(1, settings.volume.messages + 0.1))}>
                <Text style={styles.volumeButton}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => testSound('message')}>
                <Text style={styles.testButton}>Test</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Notification Volume */}
          <View style={styles.volumeSection}>
            <Text style={styles.volumeLabel}>Âm lượng thông báo: {Math.round(settings.volume.notifications * 100)}%</Text>
            <View style={styles.volumeButtons}>
              <TouchableOpacity onPress={() => updateVolume('notifications', Math.max(0, settings.volume.notifications - 0.1))}>
                <Text style={styles.volumeButton}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => updateVolume('notifications', Math.min(1, settings.volume.notifications + 0.1))}>
                <Text style={styles.volumeButton}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => testSound('notification')}>
                <Text style={styles.testButton}>Test</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* System Volume */}
          <View style={styles.volumeSection}>
            <Text style={styles.volumeLabel}>Âm lượng hệ thống: {Math.round(settings.volume.system * 100)}%</Text>
            <View style={styles.volumeButtons}>
              <TouchableOpacity onPress={() => updateVolume('system', Math.max(0, settings.volume.system - 0.1))}>
                <Text style={styles.volumeButton}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => updateVolume('system', Math.min(1, settings.volume.system + 0.1))}>
                <Text style={styles.volumeButton}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Vibration Settings */}
          <Text style={styles.sectionTitle}>Rung</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Rung khi có cuộc gọi</Text>
            <Switch
              value={settings.vibration.calls}
              onValueChange={(value) => updateSetting('vibration', { ...settings.vibration, calls: value })}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Rung khi có tin nhắn</Text>
            <Switch
              value={settings.vibration.messages}
              onValueChange={(value) => updateSetting('vibration', { ...settings.vibration, messages: value })}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Rung khi có thông báo</Text>
            <Switch
              value={settings.vibration.notifications}
              onValueChange={(value) => updateSetting('vibration', { ...settings.vibration, notifications: value })}
            />
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingLabel: {
    fontSize: 16,
  },
  volumeSection: {
    marginVertical: 15,
    paddingHorizontal: 10,
  },
  volumeLabel: {
    fontSize: 16,
    marginBottom: 10,
  },
  volumeButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  volumeButton: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    textAlign: 'center',
    minWidth: 50,
  },
  testButton: {
    color: '#007AFF',
    fontSize: 16,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#e8f4fd',
    borderRadius: 5,
  },
});

export default SoundSettingsScreen;
