import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useTranslation } from 'react-i18next';

type OptionVariant = 'default' | 'danger';

export interface ConversationOption {
  key: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  variant?: OptionVariant;
  onPress: () => void | Promise<void>;
}

interface ConversationOptionsModalProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  options: ConversationOption[];
  onClose: () => void;
}

const ConversationOptionsModal: React.FC<ConversationOptionsModalProps> = ({
  visible,
  title = 'Options',
  subtitle,
  options,
  onClose,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const currentThemeColors = Colors[theme] || Colors.light;

  const styles = useMemo(() => StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: currentThemeColors.backdrop || 'rgba(0,0,0,0.5)',
    },
    sheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 12,
      paddingHorizontal: 16,
      paddingBottom: 24,
      backgroundColor: currentThemeColors.cardBackground,
      borderTopWidth: 1,
      borderColor: currentThemeColors.border,
    },
    handle: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 99,
      marginBottom: 10,
      backgroundColor: currentThemeColors.borderDark,
      opacity: 0.7,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: currentThemeColors.text,
    },
    subtitle: {
      marginTop: 4,
      fontSize: 13,
      color: currentThemeColors.subtleText,
    },
    optionsWrap: {
      marginTop: 14,
      gap: 10,
    },
    optionButton: {
      minHeight: 52,
      borderRadius: 14,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme === 'dark' ? '#1f2937' : '#f8fafc',
      borderWidth: 1,
      borderColor: currentThemeColors.border,
    },
    optionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    optionLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: currentThemeColors.text,
    },
    dangerLabel: {
      color: currentThemeColors.error,
    },
    dangerIcon: {
      color: currentThemeColors.error,
    },
    closeButton: {
      marginTop: 14,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme === 'dark' ? '#334155' : '#e2e8f0',
    },
    closeText: {
      fontSize: 15,
      fontWeight: '700',
      color: currentThemeColors.text,
    },
  }), [theme, currentThemeColors]);

  const handleOptionPress = async (option: ConversationOption) => {
    onClose();
    try {
      await option.onPress();
    } catch (error) {
      console.error('Conversation option failed:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => { }}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          <View style={styles.optionsWrap}>
            {options.map((option) => {
              const isDanger = option.variant === 'danger';
              return (
                <TouchableOpacity
                  key={option.key}
                  activeOpacity={0.9}
                  style={styles.optionButton}
                  onPress={() => handleOptionPress(option)}
                >
                  <View style={styles.optionLeft}>
                    <MaterialCommunityIcons
                      name={option.icon}
                      size={20}
                      color={isDanger ? Colors.error : currentThemeColors.tint}
                      style={isDanger ? styles.dangerIcon : undefined}
                    />
                    <Text style={[styles.optionLabel, isDanger && styles.dangerLabel]}>
                      {option.label}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={18}
                    color={currentThemeColors.subtleText}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ConversationOptionsModal;

