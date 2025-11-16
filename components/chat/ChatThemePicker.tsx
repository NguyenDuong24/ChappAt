import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useChatTheme, ChatTheme } from '@/context/ChatThemeContext';
import { Colors } from '@/constants/Colors';
import { ThemeContext } from '@/context/ThemeContext';

interface ChatThemePickerProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
}

const ChatThemePicker: React.FC<ChatThemePickerProps> = ({ visible, onClose, roomId }) => {
  const { themes, currentTheme, setTheme } = useChatTheme();
  const { theme: appTheme } = React.useContext(ThemeContext) || { theme: 'light' };
  const currentThemeColors = appTheme === 'dark' ? Colors.dark : Colors.light;

  const handleThemeSelect = async (theme: ChatTheme) => {
    await setTheme(theme.id, roomId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={styles.backdrop}
      />
      <View style={[styles.container, { backgroundColor: currentThemeColors.surface }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: currentThemeColors.text }]}>
            Chọn chủ đề chat
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={currentThemeColors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.themesGrid}
          showsVerticalScrollIndicator={false}
        >
          {themes.map((theme) => (
            <TouchableOpacity
              key={theme.id}
              onPress={() => handleThemeSelect(theme)}
              style={[
                styles.themeItem,
                currentTheme.id === theme.id && styles.selectedTheme,
                { borderColor: currentThemeColors.border }
              ]}
            >
              {/* Theme Preview */}
              <View
                style={[
                  styles.themePreview,
                  { backgroundColor: theme.backgroundColor }
                ]}
              >
                {/* Mock Messages */}
                <View style={styles.mockMessages}>
                  {/* Sent Message */}
                  <View style={styles.mockMessageRow}>
                    <View style={styles.mockMessageSpacer} />
                    <View
                      style={[
                        styles.mockMessage,
                        {
                          backgroundColor: theme.sentMessageColor,
                          borderTopLeftRadius: 12,
                          borderTopRightRadius: 4,
                          borderBottomLeftRadius: 12,
                          borderBottomRightRadius: 12,
                        }
                      ]}
                    >
                      <Text style={[styles.mockMessageText, { color: '#FFFFFF' }]}>
                        Hello!
                      </Text>
                    </View>
                  </View>

                  {/* Received Message */}
                  <View style={styles.mockMessageRow}>
                    <View
                      style={[
                        styles.mockMessage,
                        {
                          backgroundColor: theme.receivedMessageColor,
                          borderTopLeftRadius: 4,
                          borderTopRightRadius: 12,
                          borderBottomLeftRadius: 12,
                          borderBottomRightRadius: 12,
                        }
                      ]}
                    >
                      <Text style={[styles.mockMessageText, { color: theme.textColor }]}>
                        Hi there!
                      </Text>
                    </View>
                    <View style={styles.mockMessageSpacer} />
                  </View>
                </View>

                {/* Theme Icon */}
                <View style={styles.themeIcon}>
                  <Text style={styles.themeIconText}>{theme.preview}</Text>
                </View>
              </View>

              {/* Theme Name */}
              <Text style={[styles.themeName, { color: currentThemeColors.text }]}>
                {theme.name}
              </Text>

              {/* Selected Indicator */}
              {currentTheme.id === theme.id && (
                <View style={styles.selectedIndicator}>
                  <MaterialIcons name="check" size={16} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  themeItem: {
    width: '48%',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    position: 'relative',
  },
  selectedTheme: {
    borderColor: '#0084FF',
  },
  themePreview: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  mockMessages: {
    flex: 1,
    padding: 8,
    justifyContent: 'space-around',
  },
  mockMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mockMessage: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: '70%',
    borderRadius: 12,
  },
  mockMessageText: {
    fontSize: 10,
    fontWeight: '500',
  },
  mockMessageSpacer: {
    flex: 1,
  },
  themeIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeIconText: {
    fontSize: 12,
  },
  themeName: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0084FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ChatThemePicker;
