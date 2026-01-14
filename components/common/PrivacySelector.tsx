import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemedColors } from '@/hooks/useThemedColors';
import { PRIVACY_OPTIONS, PrivacyLevel } from '@/utils/postPrivacyUtils';

interface PrivacySelectorProps {
  visible: boolean;
  currentPrivacy: PrivacyLevel;
  onClose: () => void;
  onSelect: (privacy: PrivacyLevel) => void;
}

const PrivacySelector: React.FC<PrivacySelectorProps> = ({
  visible,
  currentPrivacy,
  onClose,
  onSelect
}) => {
  const colors = useThemedColors();

  const handleSelect = (privacy: PrivacyLevel) => {
    onSelect(privacy);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>
              Ai có thể xem bài viết này?
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Privacy Options */}
          <ScrollView style={styles.optionsContainer}>
            {PRIVACY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.optionItem,
                  { borderBottomColor: colors.border },
                  currentPrivacy === option.key && { backgroundColor: colors.primary + '10' }
                ]}
                onPress={() => handleSelect(option.key)}
              >
                <View style={styles.optionContent}>
                  <View style={[
                    styles.iconContainer,
                    { backgroundColor: currentPrivacy === option.key ? colors.primary : colors.surface }
                  ]}>
                    <MaterialIcons
                      name={option.icon as any}
                      size={20}
                      color={currentPrivacy === option.key ? 'white' : colors.text}
                    />
                  </View>

                  <View style={styles.textContainer}>
                    <Text style={[
                      styles.optionLabel,
                      { color: colors.text },
                      currentPrivacy === option.key && { fontWeight: '600' }
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.optionDescription, { color: colors.subtleText }]}>
                      {option.description}
                    </Text>
                  </View>

                  {currentPrivacy === option.key && (
                    <MaterialIcons
                      name="check-circle"
                      size={20}
                      color={colors.primary}
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Text style={[styles.footerText, { color: colors.subtleText }]}>
              Bạn có thể thay đổi quyền riêng tư bất cứ lúc nào
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  optionsContainer: {
    maxHeight: 400,
  },
  optionItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default PrivacySelector;
