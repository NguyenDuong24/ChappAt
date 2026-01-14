import React, { memo, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { ChatTheme } from '@/context/ChatThemeContext';
import ReplyPreview from './ReplyPreview';
import VoiceRecorder from './VoiceRecorder';

interface OptimizedChatInputProps {
    newMessage: string;
    onChangeText: (text: string) => void;
    onSend: () => void;
    onImagePress: () => void;
    onGiftPress: () => void;
    sendDisabled?: boolean;
    currentTheme?: ChatTheme;
    currentThemeColors: {
        background: string;
        text: string;
        subtleText: string;
        surface: string;
        border: string;
        tint: string;
    };
    replyTo?: {
        text?: string;
        imageUrl?: string;
        senderName: string;
        uid: string;
        messageId: string;
    } | null;
    onCancelReply?: () => void;
    onAudioSend?: (uri: string, duration: number) => void;
}

const OptimizedChatInput: React.FC<OptimizedChatInputProps> = memo(({
    newMessage,
    onChangeText,
    onSend,
    onImagePress,
    onGiftPress,
    sendDisabled = false,
    currentTheme,
    currentThemeColors = {
        background: '#FFFFFF',
        text: '#000000',
        subtleText: '#64748B',
        surface: '#F8FAFC',
        border: '#E2E8F0',
        tint: '#6366F1',
    },
    replyTo,
    onCancelReply,
    onAudioSend,
}) => {
    const [isRecording, setIsRecording] = React.useState(false);

    const handleSend = useCallback(() => {
        if (!sendDisabled) {
            onSend();
        }
    }, [onSend, sendDisabled]);

    const inputBackgroundColor = currentTheme?.receivedMessageColor || currentThemeColors.surface;
    const textColor = currentTheme?.textColor || currentThemeColors.text;
    const placeholderColor = currentTheme?.textColor
        ? `${currentTheme.textColor}80` // 50% opacity
        : currentThemeColors.subtleText;
    const sendButtonColor = currentTheme?.sentMessageColor || '#6366F1';
    const iconColor = currentTheme?.textColor || currentThemeColors.subtleText;

    return (
        <View style={[
            styles.container,
            {
                backgroundColor: currentTheme?.backgroundColor || currentThemeColors.background,
                borderTopColor: currentTheme?.receivedMessageColor || currentThemeColors.border
            }
        ]}>
            {replyTo && onCancelReply && (
                <View style={styles.replyContainer}>
                    <ReplyPreview
                        replyTo={replyTo}
                        onClearReply={onCancelReply}
                        currentThemeColors={currentThemeColors}
                    />
                </View>
            )}

            {isRecording ? (
                <VoiceRecorder
                    onSend={(uri, duration) => {
                        setIsRecording(false);
                        onAudioSend?.(uri, duration);
                    }}
                    onCancel={() => setIsRecording(false)}
                    currentThemeColors={currentThemeColors}
                />
            ) : (
                <View style={styles.inputContainer}>
                    {/* Image Picker Button */}
                    <TouchableOpacity
                        style={[styles.iconButton, { backgroundColor: inputBackgroundColor }]}
                        onPress={onImagePress}
                    >
                        <Ionicons name="image-outline" size={22} color={iconColor} />
                    </TouchableOpacity>

                    {/* Gift Button */}
                    <TouchableOpacity
                        style={[styles.iconButton, { backgroundColor: inputBackgroundColor }]}
                        onPress={onGiftPress}
                    >
                        <MaterialIcons name="card-giftcard" size={22} color={iconColor} />
                    </TouchableOpacity>

                    {/* Text Input */}
                    <View style={[styles.inputWrapper, { backgroundColor: inputBackgroundColor }]}>
                        <TextInput
                            style={[styles.textInput, { color: textColor }]}
                            placeholder="Type a message"
                            placeholderTextColor={placeholderColor}
                            value={newMessage}
                            onChangeText={onChangeText}
                            multiline
                            maxLength={2000}
                        />
                    </View>

                    {/* Send Button or Mic Button */}
                    {newMessage.trim().length > 0 ? (
                        <TouchableOpacity
                            style={[
                                styles.sendButton,
                                { backgroundColor: sendDisabled ? currentThemeColors.border : sendButtonColor }
                            ]}
                            onPress={handleSend}
                            disabled={sendDisabled}
                        >
                            <Ionicons
                                name="send"
                                size={20}
                                color={sendDisabled ? currentThemeColors.subtleText : '#FFFFFF'}
                            />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.iconButton, { backgroundColor: inputBackgroundColor }]}
                            onPress={() => setIsRecording(true)}
                        >
                            <MaterialIcons name="mic" size={24} color={iconColor} />
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        width: '100%',
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    replyContainer: {
        paddingHorizontal: 12,
        paddingTop: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 8,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputWrapper: {
        flex: 1,
        minHeight: 40,
        maxHeight: 120,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 10 : 8,
        justifyContent: 'center',
    },
    textInput: {
        fontSize: 16,
        lineHeight: 20,
        maxHeight: 100,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

OptimizedChatInput.displayName = 'OptimizedChatInput';

export default OptimizedChatInput;
