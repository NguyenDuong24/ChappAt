import React, { memo, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Animated,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

interface OptimizedGroupInputProps {
  newMessage: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onImagePress: () => void;
  sendDisabled?: boolean;
  currentThemeColors: {
    background: string;
    text: string;
    subtleText: string;
    surface: string;
    border: string;
    tint: string;
  };
  placeholder?: string;
}

const OptimizedGroupInput: React.FC<OptimizedGroupInputProps> = memo(({
  newMessage,
  onChangeText,
  onSend,
  onImagePress,
  sendDisabled = false,
  currentThemeColors,
  placeholder
}) => {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handleSend = useCallback(() => {
    if (!sendDisabled && newMessage.trim()) {
      // Animate button press
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      onSend();
    }
  }, [onSend, sendDisabled, newMessage, scaleAnim]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // Dynamic colors
  const inputBgColor = currentThemeColors.surface;
  const textColor = currentThemeColors.text;
  const placeholderColor = currentThemeColors.subtleText;
  const iconColor = currentThemeColors.subtleText;
  const activeIconColor = currentThemeColors.tint;
  const activeBorderColor = currentThemeColors.tint;
  const inactiveBorderColor = 'transparent';

  // Gradient colors for send button
  const sendGradient = sendDisabled
    ? [currentThemeColors.border, currentThemeColors.border]
    : ['#6366F1', '#8B5CF6'];

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: currentThemeColors.background,
        borderTopColor: currentThemeColors.border
      }
    ]}>
      {/* Input container with inline icons */}
      <View style={[
        styles.inputWrapper,
        {
          backgroundColor: inputBgColor,
          borderColor: isFocused ? activeBorderColor : inactiveBorderColor,
        }
      ]}>
        {/* Image picker icon - inside input */}
        <TouchableOpacity
          style={styles.inlineIconButton}
          onPress={onImagePress}
          activeOpacity={0.7}
        >
          <Ionicons
            name="image-outline"
            size={24}
            color={isFocused ? activeIconColor : iconColor}
          />
        </TouchableOpacity>

        {/* Text Input */}
        <TextInput
          style={[styles.textInput, { color: textColor }]}
          placeholder={placeholder || t('chat.type_message')}
          placeholderTextColor={placeholderColor}
          value={newMessage}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          multiline
          maxLength={2000}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />

      </View>

      {/* Send button with gradient */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          onPress={handleSend}
          disabled={sendDisabled}
          activeOpacity={0.8}
          style={styles.sendButtonContainer}
        >
          <LinearGradient
            colors={sendGradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.sendButton,
              sendDisabled && styles.sendButtonDisabled
            ]}
          >
            <Ionicons
              name="send"
              size={18}
              color={sendDisabled ? currentThemeColors.subtleText : '#FFFFFF'}
              style={{ marginLeft: 2 }}
            />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: 6,
    paddingVertical: Platform.OS === 'ios' ? 6 : 4,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inlineIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 100,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
  },
  sendButtonContainer: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
});

OptimizedGroupInput.displayName = 'OptimizedGroupInput';

export default OptimizedGroupInput;
