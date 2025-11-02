import React, { useState, useContext, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
  Modal,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors, PRIMARY_COLOR } from '@/constants/Colors';
import { Vibe, PREDEFINED_VIBES, VIBE_CATEGORIES } from '@/types/vibe';
import { useAuth } from '@/context/authContext';

const { width } = Dimensions.get('window');

interface VibePickerModalProps {
  visible: boolean;
  onClose: () => void;
  userLocation?: { latitude: number; longitude: number; address?: string };
}

const VibePickerModal: React.FC<VibePickerModalProps> = ({ 
  visible, 
  onClose, 
  userLocation 
}) => {
  const themeContext = useContext(ThemeContext);
  if (!themeContext) {
    throw new Error('VibePickerModal must be used within a ThemeProvider');
  }
  const theme = themeContext.theme || 'light';
  const colors = theme === 'dark' ? Colors.dark : Colors.light;

  const { setUserVibe, settingVibe, currentVibe, removeUserVibe } = useAuth();

  const [selectedVibe, setSelectedVibe] = useState<Vibe | null>(currentVibe?.vibe || null);
  const [customMessage, setCustomMessage] = useState<string>(currentVibe?.customMessage || '');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');

  // Categories for filtering vibes
  const categories = VIBE_CATEGORIES;

  // Filter vibes by category + search
  const displayedVibes = useMemo(() => {
    const base = selectedCategory === 'all' 
      ? PREDEFINED_VIBES 
      : PREDEFINED_VIBES.filter(v => v.category === selectedCategory);
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(v => v.name.toLowerCase().includes(q) || v.emoji.includes(q));
  }, [selectedCategory, search]);

  const handleVibeSelect = (vibe: Vibe) => {
    setSelectedVibe(vibe);
    console.log('🎯 Selected vibe:', vibe.name);
  };

  const handleSave = async () => {
    if (!selectedVibe) {
      Alert.alert('Thông báo', 'Vui lòng chọn một vibe!');
      return;
    }

    try {
      console.log('💾 Saving vibe:', selectedVibe.name);
      await setUserVibe(selectedVibe.id, customMessage, userLocation);
      console.log('✅ Vibe saved successfully');
      onClose();
    } catch (error) {
      console.error('❌ Error saving vibe:', error);
      Alert.alert('Lỗi', 'Không thể lưu vibe. Vui lòng thử lại!');
    }
  };

  const handleRemoveVibe = () => {
    Alert.alert(
      'Xóa vibe',
      'Bạn có chắc muốn xóa vibe hiện tại?',
      [
        {
          text: 'Hủy',
          style: 'cancel'
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            setSelectedVibe(null);
            setCustomMessage('');
          }
        }
      ]
    );
  };

  const renderCategoryTabs = () => (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={categories}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.categoryContent}
      style={styles.categoryList}
      renderItem={({ item: category }) => (
        <TouchableOpacity
          style={[
            styles.categoryTab,
            {
              backgroundColor: selectedCategory === category.id 
                ? PRIMARY_COLOR 
                : colors.border,
            }
          ]}
          onPress={() => setSelectedCategory(category.id)}
        >
          <Text style={{ fontSize: 16, marginRight: 6 }}>
            {category.emoji}
          </Text>
          <Text style={[
            styles.categoryText,
            {
              color: selectedCategory === category.id ? 'white' : colors.text,
            }
          ]}>
            {category.name}
          </Text>
        </TouchableOpacity>
      )}
    />
  );

  const renderVibeItem = ({ item: vibe }: { item: Vibe }) => (
    <TouchableOpacity
      style={[
        styles.vibeItem,
        {
          backgroundColor: colors.cardBackground,
          borderColor: selectedVibe?.id === vibe.id ? vibe.color : colors.border,
          borderWidth: selectedVibe?.id === vibe.id ? 3 : 1,
        }
      ]}
      onPress={() => handleVibeSelect(vibe)}
    >
      <LinearGradient
        colors={[vibe.color + '20', vibe.color + '40']}
        style={styles.vibeBackground}
      >
        <Text style={styles.vibeEmoji}>{vibe.emoji}</Text>
        <Text style={[styles.vibeName, { color: colors.text }]}>
          {vibe.name}
        </Text>
        {selectedVibe?.id === vibe.id && (
          <View style={[styles.selectedIndicator, { backgroundColor: vibe.color }]}>
            <MaterialIcons name="check" size={16} color="white" />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderVibeGrid = () => (
    <FlatList
      data={displayedVibes}
      keyExtractor={(item) => item.id}
      renderItem={renderVibeItem}
      numColumns={2}
      columnWrapperStyle={styles.vibeRow}
      showsVerticalScrollIndicator={false}
      style={styles.vibeGrid}
      keyboardShouldPersistTaps="handled"
    />
  );

  const renderSearchBar = () => (
    <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}> 
      <MaterialIcons name="search" size={18} color={colors.text + '80'} style={styles.searchIcon} />
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Tìm hoạt động hoặc tâm trạng..."
        placeholderTextColor={colors.text + '60'}
        style={[styles.searchInput, { color: colors.text }]}
        returnKeyType="search"
      />
      {!!search && (
        <TouchableOpacity onPress={() => setSearch('')} style={styles.clearSearchBtn}>
          <MaterialIcons name="close" size={16} color={colors.text + '70'} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderCustomMessage = () => (
    <View style={styles.messageContainer}>
      <Text style={[styles.messageLabel, { color: colors.text }]}>
        Tin nhắn tùy chỉnh (tùy chọn)
      </Text>
      <TextInput
        style={[
          styles.messageInput,
          {
            backgroundColor: colors.inputBackground,
            borderColor: colors.border,
            color: colors.text,
          }
        ]}
        placeholder="Chia sẻ cảm xúc của bạn..."
        placeholderTextColor={colors.text + '60'}
        value={customMessage}
        onChangeText={setCustomMessage}
        maxLength={100}
        multiline
      />
      <Text style={[styles.messageCounter, { color: colors.text + '60' }]}>
        {customMessage.length}/100
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}> 
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}> 
            Chọn Vibe của bạn
          </Text>
          <TouchableOpacity 
            onPress={handleSave} 
            style={[
              styles.saveButton,
              { 
                backgroundColor: selectedVibe ? PRIMARY_COLOR : colors.border,
                opacity: settingVibe ? 0.5 : 1
              }
            ]}
            disabled={settingVibe}
          >
            {settingVibe ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Lưu</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}> 
          {renderSearchBar()}

          {/* Current Selection */}
          {selectedVibe && (
            <View style={[styles.currentSelection, { backgroundColor: colors.cardBackground }]}> 
              <LinearGradient
                colors={[selectedVibe.color + '20', selectedVibe.color + '40']}
                style={styles.currentVibePreview}
              >
                <Text style={styles.currentVibeEmoji}>
                  {selectedVibe.emoji}
                </Text>
                <View style={styles.currentVibeInfo}>
                  <Text style={[styles.currentVibeName, { color: colors.text }]}>
                    {selectedVibe.name}
                  </Text>
                  <Text style={[styles.currentVibeDesc, { color: colors.text + '80' }]}>
                    {selectedVibe.description}
                  </Text>
                </View>
              </LinearGradient>
              <TouchableOpacity onPress={handleRemoveVibe} style={styles.removeButton}>
                <MaterialIcons name="close" size={20} color={colors.text + '60'} />
              </TouchableOpacity>
            </View>
          )}

          {/* Category Tabs */}
          {renderCategoryTabs()}

          {/* Vibe Grid */}
          {renderVibeGrid()}

          {/* Custom Message */}
          {renderCustomMessage()}

          {currentVibe && (
            <TouchableOpacity
              onPress={() => {
                Alert.alert('Gỡ vibe', 'Bạn có chắc muốn gỡ vibe hiện tại?', [
                  { text: 'Hủy', style: 'cancel' },
                  { text: 'Gỡ', style: 'destructive', onPress: async () => { 
                      try { 
                        await removeUserVibe(); 
                        onClose();
                      } catch (e) { 
                        Alert.alert('Lỗi', 'Không thể gỡ vibe, thử lại sau.');
                      }
                    }
                  }
                ]);
              }}
              disabled={settingVibe}
              style={[styles.removeCurrentButton, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}
              activeOpacity={0.7}
            >
              <MaterialIcons name="delete-outline" size={18} color={Colors.error} />
              <Text style={styles.removeCurrentText}>Gỡ vibe hiện tại</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  currentSelection: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  currentVibePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currentVibeEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  currentVibeInfo: {
    flex: 1,
  },
  currentVibeName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  currentVibeDesc: {
    fontSize: 14,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryContent: {
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  categoryList: {
    maxHeight: 44,
    marginBottom: 10,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 16,
  },
  vibeGrid: {
    flex: 1,
    marginBottom: 20,
  },
  vibeRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  vibeItem: {
    width: (width - 48) / 2,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 2, // Added shadow for better UI
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  vibeBackground: {
    padding: 16,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
    position: 'relative',
  },
  vibeEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  vibeName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageContainer: {
    marginTop: 'auto',
  },
  messageLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  messageCounter: {
    textAlign: 'right',
    fontSize: 12,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  clearSearchBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeCurrentButton: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  removeCurrentText: {
    color: Colors.error,
    fontWeight: '600',
  },
});

export default VibePickerModal;

