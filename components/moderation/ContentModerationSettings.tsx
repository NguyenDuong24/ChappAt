import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { Modal, Button, Card, Chip } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import contentModerationService from '@/services/contentModerationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ContentModerationSettingsProps {
  visible: boolean;
  onClose: () => void;
}

const ContentModerationSettings: React.FC<ContentModerationSettingsProps> = ({
  visible,
  onClose,
}) => {
  const [customWords, setCustomWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [strictMode, setStrictMode] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('contentModerationSettings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setIsEnabled(parsed.isEnabled ?? true);
        setStrictMode(parsed.strictMode ?? false);
      }

      // Load custom words
      const words = contentModerationService.getCustomBadWords();
      setCustomWords(words);
    } catch (error) {
      console.error('Error loading moderation settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      const settings = {
        isEnabled,
        strictMode,
      };
      await AsyncStorage.setItem('contentModerationSettings', JSON.stringify(settings));
      Alert.alert('Thành công', 'Cài đặt đã được lưu');
    } catch (error) {
      console.error('Error saving moderation settings:', error);
      Alert.alert('Lỗi', 'Không thể lưu cài đặt');
    }
  };

  const addCustomWord = () => {
    if (!newWord.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập từ khóa');
      return;
    }

    const word = newWord.trim().toLowerCase();
    if (customWords.includes(word)) {
      Alert.alert('Lỗi', 'Từ khóa đã tồn tại');
      return;
    }

    const updatedWords = [...customWords, word];
    setCustomWords(updatedWords);
    contentModerationService.addCustomBadWords([word]);
    setNewWord('');
  };

  const removeCustomWord = (word: string) => {
    Alert.alert(
      'Xác nhận',
      `Bạn có muốn xóa từ khóa "${word}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            const updatedWords = customWords.filter(w => w !== word);
            setCustomWords(updatedWords);
            contentModerationService.removeCustomBadWords([word]);
          },
        },
      ]
    );
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Khôi phục mặc định',
      'Bạn có muốn khôi phục tất cả cài đặt về mặc định?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Khôi phục',
          onPress: () => {
            setIsEnabled(true);
            setStrictMode(false);
            // Reset custom words về danh sách mặc định
            const defaultWords = contentModerationService.getCustomBadWords();
            setCustomWords(defaultWords);
          },
        },
      ]
    );
  };

  const testModeration = async () => {
    const testText = 'Đây là tin nhắn test với từ đĩ';
    try {
      const result = await contentModerationService.moderateText(testText);
      
      Alert.alert(
        'Kết quả test',
        `Text: "${testText}"\n\n` +
        `Kết quả: ${result.isClean ? 'Sạch' : 'Có vi phạm'}\n` +
        `Loại vi phạm: ${result.violationType || 'Không có'}\n` +
        `Từ bị chặn: ${result.blockedWords?.join(', ') || 'Không có'}\n` +
        `Text đã lọc: ${result.filteredText || 'Không có'}`
      );
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể test moderation');
    }
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onClose}
      contentContainerStyle={styles.modalContainer}
    >
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="shield-check" size={24} color="#4CAF50" />
          <Text style={styles.headerTitle}>Cài đặt Kiểm duyệt Nội dung</Text>
        </View>

        {/* Cài đặt chung */}
        <Card style={styles.section}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Cài đặt chung</Text>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Bật kiểm duyệt nội dung</Text>
              <Switch
                value={isEnabled}
                onValueChange={setIsEnabled}
                thumbColor={isEnabled ? "#4CAF50" : "#f4f3f4"}
                trackColor={{false: "#767577", true: "#81b0ff"}}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Chế độ nghiêm ngặt</Text>
              <Switch
                value={strictMode}
                onValueChange={setStrictMode}
                thumbColor={strictMode ? "#FF9800" : "#f4f3f4"}
                trackColor={{false: "#767577", true: "#ffcc80"}}
              />
            </View>

            <Text style={styles.settingDescription}>
              Chế độ nghiêm ngặt sẽ chặn nhiều loại nội dung hơn, bao gồm cả những từ ngữ nhẹ.
            </Text>
          </Card.Content>
        </Card>

        {/* Từ khóa tùy chỉnh */}
        <Card style={styles.section}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Từ khóa tùy chỉnh</Text>
            
            <View style={styles.addWordContainer}>
              <TextInput
                style={styles.wordInput}
                value={newWord}
                onChangeText={setNewWord}
                placeholder="Thêm từ khóa mới..."
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={addCustomWord}
              >
                <MaterialCommunityIcons name="plus" size={20} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.wordsContainer}>
              {customWords.slice(0, 20).map((word, index) => (
                <Chip
                  key={index}
                  style={styles.wordChip}
                  onClose={() => removeCustomWord(word)}
                  textStyle={styles.chipText}
                >
                  {word}
                </Chip>
              ))}
            </View>

            {customWords.length > 20 && (
              <Text style={styles.moreWordsText}>
                Và {customWords.length - 20} từ khóa khác...
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Thống kê */}
        <Card style={styles.section}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Thống kê</Text>
            <Text style={styles.statText}>
              Tổng số từ khóa bị chặn: {customWords.length}
            </Text>
            <Text style={styles.statText}>
              Bao gồm từ khóa tiếng Việt và tiếng Anh
            </Text>
          </Card.Content>
        </Card>

        {/* Hành động */}
        <View style={styles.actionsContainer}>
          <Button
            mode="contained"
            onPress={testModeration}
            style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
            labelStyle={styles.buttonLabel}
          >
            Test Kiểm duyệt
          </Button>

          <Button
            mode="outlined"
            onPress={resetToDefaults}
            style={styles.actionButton}
            labelStyle={styles.buttonLabel}
          >
            Khôi phục mặc định
          </Button>

          <Button
            mode="contained"
            onPress={saveSettings}
            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
            labelStyle={styles.buttonLabel}
          >
            Lưu cài đặt
          </Button>
        </View>

        <View style={styles.closeContainer}>
          <Button mode="text" onPress={onClose}>
            Đóng
          </Button>
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    maxHeight: '90%',
  },
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  addWordContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  wordInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    color: '#333',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordChip: {
    backgroundColor: '#f0f0f0',
    marginBottom: 4,
  },
  chipText: {
    fontSize: 12,
  },
  moreWordsText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  actionsContainer: {
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    borderRadius: 8,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  closeContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
});

export default ContentModerationSettings;
