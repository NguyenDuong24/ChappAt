import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, addDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useChatTheme, ChatTheme, ChatEffect } from '@/context/ChatThemeContext';
import { Colors } from '@/constants/Colors';
import { ThemeContext } from '@/context/ThemeContext';

interface ChatThemePickerProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  currentUser: any;
}

const ChatThemePicker: React.FC<ChatThemePickerProps> = ({ visible, onClose, roomId, currentUser }) => {
  const { themes, currentTheme, setTheme, effects, currentEffect, setEffect } = useChatTheme();
  const { theme: appTheme } = React.useContext(ThemeContext) || { theme: 'light' };
  const currentThemeColors = (appTheme === 'dark' ? Colors.dark : Colors.light) || {
    surface: '#F8FAFC',
    text: '#0F172A',
    subtleText: '#64748B',
    border: '#E2E8F0',
    backgroundHeader: '#F1F5F9',
  };
  const [activeTab, setActiveTab] = useState<'theme' | 'effect'>('theme');

  const handleThemeSelect = async (theme: ChatTheme) => {
    if (theme.id === currentTheme.id) return;
    await setTheme(theme.id, roomId);

    // Send system message
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const messagesRef = collection(roomRef, 'messages');
      await addDoc(messagesRef, {
        type: 'system',
        text: `${currentUser?.username || 'Người dùng'} đã đổi chủ đề thành ${theme.name}`,
        createdAt: Timestamp.fromDate(new Date()),
        uid: 'system'
      });
    } catch (error) {
      console.error('Error sending system message for theme:', error);
    }
  };

  const handleEffectSelect = async (effect: ChatEffect) => {
    if (effect.id === currentEffect) return;
    await setEffect(effect.id, roomId);

    // Send system message
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const messagesRef = collection(roomRef, 'messages');
      await addDoc(messagesRef, {
        type: 'system',
        text: `${currentUser?.username || 'Người dùng'} đã đổi hiệu ứng thành ${effect.name}`,
        createdAt: Timestamp.fromDate(new Date()),
        uid: 'system'
      });
    } catch (error) {
      console.error('Error sending system message for effect:', error);
    }
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
            Tùy chỉnh phòng chat
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={currentThemeColors.text} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={[styles.tabsContainer, { borderBottomColor: currentThemeColors.border }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'theme' && styles.activeTab,
              { borderBottomColor: activeTab === 'theme' ? Colors.primary : 'transparent' }
            ]}
            onPress={() => setActiveTab('theme')}
          >
            <MaterialIcons
              name="palette"
              size={20}
              color={activeTab === 'theme' ? Colors.primary : currentThemeColors.subtleText}
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'theme' ? Colors.primary : currentThemeColors.subtleText }
            ]}>
              Chủ đề
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'effect' && styles.activeTab,
              { borderBottomColor: activeTab === 'effect' ? Colors.primary : 'transparent' }
            ]}
            onPress={() => setActiveTab('effect')}
          >
            <MaterialIcons
              name="auto-awesome"
              size={20}
              color={activeTab === 'effect' ? Colors.primary : currentThemeColors.subtleText}
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'effect' ? Colors.primary : currentThemeColors.subtleText }
            ]}>
              Hiệu ứng
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'theme' ? (
            // Themes Grid
            <View style={styles.grid}>
              {themes.map((theme) => (
                <TouchableOpacity
                  key={theme.id}
                  onPress={() => handleThemeSelect(theme)}
                  style={[
                    styles.gridItem,
                    currentTheme.id === theme.id && styles.selectedItem,
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
                    <View style={styles.previewIcon}>
                      <Text style={styles.previewIconText}>{theme.preview}</Text>
                    </View>
                  </View>

                  {/* Theme Name */}
                  <Text style={[styles.itemName, { color: currentThemeColors.text }]}>
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
            </View>
          ) : (
            // Effects Grid
            <View style={styles.grid}>
              {effects.map((effect) => (
                <TouchableOpacity
                  key={effect.id}
                  onPress={() => handleEffectSelect(effect)}
                  style={[
                    styles.gridItem,
                    currentEffect === effect.id && styles.selectedItem,
                    { borderColor: currentThemeColors.border }
                  ]}
                >
                  {/* Effect Preview */}
                  <View style={[styles.effectPreview, { backgroundColor: currentThemeColors.backgroundHeader }]}>
                    <Text style={styles.effectPreviewEmoji}>{effect.preview}</Text>
                  </View>

                  {/* Effect Name */}
                  <Text style={[styles.itemName, { color: currentThemeColors.text }]}>
                    {effect.name}
                  </Text>

                  {/* Effect Description */}
                  <Text style={[styles.effectDescription, { color: currentThemeColors.subtleText }]}>
                    {effect.description}
                  </Text>

                  {/* Selected Indicator */}
                  {currentEffect === effect.id && (
                    <View style={styles.selectedIndicator}>
                      <MaterialIcons name="check" size={16} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
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
    maxHeight: '75%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 2,
  },
  activeTab: {
    // Active styles handled inline
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    paddingTop: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  gridItem: {
    width: '48%',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    position: 'relative',
  },
  selectedItem: {
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
  previewIcon: {
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
  previewIconText: {
    fontSize: 12,
  },
  effectPreview: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  effectPreviewEmoji: {
    fontSize: 40,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  effectDescription: {
    fontSize: 11,
    marginTop: 4,
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
