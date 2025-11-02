import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import { Button, Chip, IconButton } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import contentModerationService from '../services/contentModerationService';
import type { BadWordDocument } from '../services/contentModerationService';

const BadWordsManager: React.FC = () => {
  const [badWords, setBadWords] = useState<BadWordDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newCategory, setNewCategory] = useState<'profanity' | 'custom' | 'spam' | 'adult' | 'violence' | 'other'>('profanity');
  const [newSeverity, setNewSeverity] = useState<'low' | 'medium' | 'high'>('medium');

  const categories = [
    { value: 'all', label: 'Tất cả', icon: 'filter-variant', color: '#9E9E9E' },
    { value: 'profanity', label: 'Chửi thề', icon: 'emoticon-angry', color: '#F44336' },
    { value: 'adult', label: 'Người lớn', icon: 'eye-off', color: '#E91E63' },
    { value: 'violence', label: 'Bạo lực', icon: 'sword', color: '#FF5722' },
    { value: 'spam', label: 'Spam', icon: 'email-alert', color: '#FF9800' },
    { value: 'custom', label: 'Tùy chỉnh', icon: 'cog', color: '#2196F3' },
    { value: 'other', label: 'Khác', icon: 'dots-horizontal', color: '#607D8B' },
  ];

  const severities = [
    { value: 'all', label: 'Tất cả', color: '#9E9E9E' },
    { value: 'low', label: 'Thấp', color: '#4CAF50' },
    { value: 'medium', label: 'Trung bình', color: '#FF9800' },
    { value: 'high', label: 'Cao', color: '#F44336' },
  ];

  useEffect(() => {
    loadBadWords();
  }, []);

  const loadBadWords = async () => {
    try {
      setLoading(true);
      const words = contentModerationService.getCustomBadWords();
      setBadWords(words);
    } catch (error) {
      console.error('Error loading bad words:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách từ khóa');
    } finally {
      setLoading(false);
    }
  };

  const filteredWords = badWords.filter(word => {
    const matchesSearch = word.word.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || word.category === selectedCategory;
    const matchesSeverity = selectedSeverity === 'all' || word.severity === selectedSeverity;
    
    return matchesSearch && matchesCategory && matchesSeverity;
  });

  const handleAddWord = async () => {
    if (!newWord.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập từ khóa');
      return;
    }

    try {
      await contentModerationService.addCustomBadWords([newWord.trim()], newCategory, newSeverity);
      setNewWord('');
      setShowAddModal(false);
      loadBadWords();
      Alert.alert('Thành công', 'Đã thêm từ khóa mới');
    } catch (error) {
      console.error('Error adding word:', error);
      Alert.alert('Lỗi', 'Không thể thêm từ khóa');
    }
  };

  const handleRemoveWord = async (word: BadWordDocument) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc muốn xóa từ khóa "${word.word}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await contentModerationService.removeCustomBadWords([word.word]);
              loadBadWords();
              Alert.alert('Thành công', 'Đã xóa từ khóa');
            } catch (error) {
              console.error('Error removing word:', error);
              Alert.alert('Lỗi', 'Không thể xóa từ khóa');
            }
          }
        }
      ]
    );
  };

  const handleToggleStatus = async (word: BadWordDocument) => {
    try {
      await contentModerationService.toggleBadWordStatus(word.id, !word.isActive);
      loadBadWords();
    } catch (error) {
      console.error('Error toggling word status:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái từ khóa');
    }
  };

  const getCategoryInfo = (category: string) => {
    return categories.find(cat => cat.value === category) || categories[0];
  };

  const getSeverityColor = (severity: string) => {
    return severities.find(sev => sev.value === severity)?.color || '#9E9E9E';
  };

  const renderWordItem = ({ item }: { item: BadWordDocument }) => {
    const categoryInfo = getCategoryInfo(item.category);
    const severityColor = getSeverityColor(item.severity);

    return (
      <View style={[styles.wordItem, !item.isActive && styles.inactiveItem]}>
        <View style={styles.wordInfo}>
          <View style={styles.wordHeader}>
            <Text style={[styles.wordText, !item.isActive && styles.inactiveText]}>
              {item.word}
            </Text>
            <Switch
              value={item.isActive}
              onValueChange={() => handleToggleStatus(item)}
              trackColor={{ false: '#f4f3f4', true: '#81b0ff' }}
              thumbColor={item.isActive ? '#f5dd4b' : '#f4f3f4'}
            />
          </View>
          
          <View style={styles.wordMetadata}>
            <Chip
              icon={categoryInfo.icon}
              style={[styles.categoryChip, { backgroundColor: categoryInfo.color + '20' }]}
              textStyle={[styles.chipText, { color: categoryInfo.color }]}
              compact
            >
              {categoryInfo.label}
            </Chip>
            
            <Chip
              style={[styles.severityChip, { backgroundColor: severityColor + '20' }]}
              textStyle={[styles.chipText, { color: severityColor }]}
              compact
            >
              {item.severity}
            </Chip>
            
            <Text style={styles.languageText}>{item.language.toUpperCase()}</Text>
          </View>
        </View>
        
        <IconButton
          icon="delete"
          iconColor="#F44336"
          size={20}
          onPress={() => handleRemoveWord(item)}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🛡️ Quản lý từ khóa nhạy cảm</Text>
        <Text style={styles.subtitle}>
          Tổng: {badWords.length} từ | Đang hiển thị: {filteredWords.length}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm từ khóa..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <MaterialCommunityIcons name="plus" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filterLabel}>Danh mục:</Text>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedCategory === item.value && { backgroundColor: item.color + '30' }
              ]}
              onPress={() => setSelectedCategory(item.value)}
            >
              <MaterialCommunityIcons name={item.icon as any} size={16} color={item.color} />
              <Text style={[styles.filterText, { color: item.color }]}>{item.label}</Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      <View style={styles.filtersContainer}>
        <Text style={styles.filterLabel}>Mức độ:</Text>
        <FlatList
          horizontal
          data={severities}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedSeverity === item.value && { backgroundColor: item.color + '30' }
              ]}
              onPress={() => setSelectedSeverity(item.value)}
            >
              <Text style={[styles.filterText, { color: item.color }]}>{item.label}</Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {/* Words List */}
      <FlatList
        data={filteredWords}
        keyExtractor={(item) => item.id}
        renderItem={renderWordItem}
        style={styles.wordsList}
        contentContainerStyle={styles.wordsListContent}
        refreshing={loading}
        onRefresh={loadBadWords}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="magnify" size={48} color="#9E9E9E" />
            <Text style={styles.emptyText}>
              {searchTerm ? 'Không tìm thấy từ khóa nào' : 'Chưa có từ khóa nào'}
            </Text>
          </View>
        }
      />

      {/* Add Word Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Thêm từ khóa mới</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Nhập từ khóa..."
              value={newWord}
              onChangeText={setNewWord}
              autoFocus
            />

            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Danh mục:</Text>
              <FlatList
                horizontal
                data={categories.filter(cat => cat.value !== 'all')}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalChip,
                      newCategory === item.value && { backgroundColor: item.color + '30' }
                    ]}
                    onPress={() => setNewCategory(item.value as any)}
                  >
                    <MaterialCommunityIcons name={item.icon as any} size={14} color={item.color} />
                    <Text style={[styles.modalChipText, { color: item.color }]}>{item.label}</Text>
                  </TouchableOpacity>
                )}
                showsHorizontalScrollIndicator={false}
              />
            </View>

            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Mức độ:</Text>
              <FlatList
                horizontal
                data={severities.filter(sev => sev.value !== 'all')}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalChip,
                      newSeverity === item.value && { backgroundColor: item.color + '30' }
                    ]}
                    onPress={() => setNewSeverity(item.value as any)}
                  >
                    <Text style={[styles.modalChipText, { color: item.color }]}>{item.label}</Text>
                  </TouchableOpacity>
                )}
                showsHorizontalScrollIndicator={false}
              />
            </View>

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setShowAddModal(false)}>
                Hủy
              </Button>
              <Button mode="contained" onPress={handleAddWord}>
                Thêm
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    elevation: 1,
  },
  addButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    gap: 4,
    elevation: 1,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  wordsList: {
    flex: 1,
  },
  wordsListContent: {
    padding: 16,
  },
  wordItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
  },
  inactiveItem: {
    opacity: 0.6,
    backgroundColor: '#f9f9f9',
  },
  wordInfo: {
    flex: 1,
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  wordText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  inactiveText: {
    color: '#999',
  },
  wordMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryChip: {
    height: 24,
  },
  severityChip: {
    height: 24,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '500',
  },
  languageText: {
    fontSize: 10,
    color: '#999',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  modalRow: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    gap: 4,
  },
  modalChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
});

export default BadWordsManager;
