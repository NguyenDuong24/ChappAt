import AsyncStorage from '@react-native-async-storage/async-storage';

const SOUND_SETTINGS_KEY = '@sound_settings';

export const SoundSettings = {
  // Default settings
  defaultSettings: {
    enabled: true,
    volume: {
      calls: 1.0,
      messages: 0.7,
      notifications: 0.8,
      system: 0.6,
    },
    vibration: {
      calls: true,
      messages: true,
      notifications: true,
    },
  },

  // Get sound settings
  async getSettings() {
    try {
      const settings = await AsyncStorage.getItem(SOUND_SETTINGS_KEY);
      return settings ? JSON.parse(settings) : this.defaultSettings;
    } catch (error) {
      console.error('Failed to get sound settings:', error);
      return this.defaultSettings;
    }
  },

  // Save sound settings
  async saveSettings(settings) {
    try {
      await AsyncStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Failed to save sound settings:', error);
      return false;
    }
  },

  // Update specific setting
  async updateSetting(key, value) {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, [key]: value };
      return await this.saveSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to update sound setting:', error);
      return false;
    }
  },

  // Check if sound is enabled
  async isSoundEnabled() {
    const settings = await this.getSettings();
    return settings.enabled;
  },

  // Toggle sound on/off
  async toggleSound() {
    const settings = await this.getSettings();
    return await this.updateSetting('enabled', !settings.enabled);
  },

  // Get volume for specific category
  async getVolume(category) {
    const settings = await this.getSettings();
    return settings.volume[category] || 0.7;
  },

  // Set volume for specific category
  async setVolume(category, volume) {
    const settings = await this.getSettings();
    const updatedVolume = { ...settings.volume, [category]: volume };
    return await this.saveSettings({ ...settings, volume: updatedVolume });
  },
};
