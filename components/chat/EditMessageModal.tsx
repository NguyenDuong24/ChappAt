import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';

interface EditMessageModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (newText: string) => Promise<void>;
  originalText: string;
  loading?: boolean;
}

const EditMessageModal: React.FC<EditMessageModalProps> = ({
  visible,
  onClose,
  onSave,
  originalText,
  loading = false,
}) => {
  const themeCtx = useContext(ThemeContext);
  const theme = (themeCtx && typeof themeCtx === 'object' && 'theme' in themeCtx) ? themeCtx.theme : 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const [editedText, setEditedText] = useState(originalText);

  const handleSave = () => {
    if (!editedText.trim()) {
      Alert.alert('Lỗi', 'Tin nhắn không thể để trống');
      return;
    }
    
    if (editedText.trim() === originalText.trim()) {
      onClose();
      return;
    }
    
    onSave(editedText.trim());
  };

  const handleClose = () => {
    setEditedText(originalText);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.container, { backgroundColor: currentThemeColors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: currentThemeColors.text }]}>
              Chỉnh sửa tin nhắn
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={currentThemeColors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: currentThemeColors.text,
                  backgroundColor: currentThemeColors.background,
                  borderColor: currentThemeColors.border,
                }
              ]}
              value={editedText}
              onChangeText={setEditedText}
              multiline
              placeholder="Nhập tin nhắn..."
              placeholderTextColor={currentThemeColors.icon}
              autoFocus
              maxLength={1000}
            />
            
            <Text style={[styles.characterCount, { color: currentThemeColors.icon }]}>
              {editedText.length}/1000
            </Text>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: currentThemeColors.text }]}>
                Hủy
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                { backgroundColor: currentThemeColors.tint },
                loading && styles.buttonDisabled
              ]}
              onPress={handleSave}
              disabled={loading || !editedText.trim()}
            >
              {loading ? (
                <MaterialIcons name="hourglass-empty" size={20} color="white" />
              ) : (
                <Text style={[styles.buttonText, { color: 'white' }]}>
                  Lưu
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  textInput: {
    minHeight: 100,
    maxHeight: 200,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 12,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  saveButton: {
    // backgroundColor will be set dynamically
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EditMessageModal;
