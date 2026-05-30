import React, {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {
    View,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Platform,
    ActivityIndicator,
    Animated,
    Text,
    ScrollView,
} from 'react-native';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import ReplyPreview from './ReplyPreview';
import VoiceRecorder from './VoiceRecorder';

export interface UnifiedChatInputProps {
    value: string;
    onChangeText: (text: string) => void;
    onSend: (textOverride?: string) => void;
    onQuickSend?: (text: string) => void;
    onImagePress?: () => void;
    onGiftPress?: () => void;
    onAudioSend?: (uri: string, duration: number) => void;
    onCancelReply?: () => void;
    replyTo?: any;
    attachedPost?: any;
    onCancelAttachedPost?: () => void;
    placeholder?: string;
    sendDisabled?: boolean;
    sending?: boolean;
    uploadingImage?: boolean;

    showImage?: boolean;
    showGift?: boolean;
    showAudio?: boolean;

    leftIconVariant?: 'add' | 'image' | 'gift';

    themeColors: {
        background: string;
        text: string;
        subtleText: string;
        surface: string;
        border: string;
        tint: string;
        inputBackground?: string;
        appBackground?: string;
        isDark?: boolean;
        isDarkChatTheme?: boolean;
    };

    chatTheme?: any;
    containerStyle?: any;
}

const QUICK_REPLY_SUGGESTIONS = [
    'Dễ thương quá trời 🥺',
    'Nhớ bạn ghê á 💖',
    'Haha mắc cười ghê 😂',
    'Đi cafe không ☕',
    'Ngủ sớm nha 😴',
    'Ôm cái coi 🤗',
    'Tối nay rảnh không 😚',
    'Yêu thế không biết 😳',
    'Ăn uống gì chưa 🍜',
    'Thả thính đó hả 😏',
    'Tự nhiên thấy thích ghê 💕',
    'Drama nữa hả 🍿',
    'Mệt thì nghỉ tí nha 🫶',
    'Chơi game hong 🎮',
    'Huhu cưng xỉu luôn 😭',
];

const normalizeSuggestionText = (text: string) =>
    text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .trim();

const isDarkBackground = (color?: string) => {
    if (!color || !color.startsWith('#')) return false;
    const hex = color.slice(1);
    const fullHex = hex.length === 3
        ? hex.split('').map(char => char + char).join('')
        : hex;
    if (fullHex.length !== 6) return false;

    const r = parseInt(fullHex.slice(0, 2), 16);
    const g = parseInt(fullHex.slice(2, 4), 16);
    const b = parseInt(fullHex.slice(4, 6), 16);
    if ([r, g, b].some(value => Number.isNaN(value))) return false;

    return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 120;
};

const withAlpha = (color: string | undefined, alpha: string, fallback: string) => {
    if (!color || !color.startsWith('#')) return fallback;
    const hex = color.slice(1);
    const fullHex = hex.length === 3
        ? hex.split('').map(char => char + char).join('')
        : hex;
    if (fullHex.length !== 6) return fallback;
    return `#${fullHex}${alpha}`;
};

const UnifiedChatInput: React.FC<UnifiedChatInputProps> = memo(({
    value,
    onChangeText,
    onSend,
    onQuickSend,
    onImagePress,
    onGiftPress,
    onAudioSend,
    onCancelReply,
    replyTo,
    attachedPost,
    onCancelAttachedPost,
    placeholder,
    sendDisabled = false,
    sending = false,
    uploadingImage = false,
    showImage = true,
    showGift = false,
    showAudio = true,
    leftIconVariant = 'image',
    themeColors,
    chatTheme,
    containerStyle,
}) => {

    const { t } = useTranslation();

    const [isFocused, setIsFocused] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    const suggestionAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(suggestionAnim, {
            toValue: isFocused ? 1 : 0,
            damping: 18,
            stiffness: 140,
            mass: 0.8,
            useNativeDriver: true,
        }).start();
    }, [isFocused]);

    const tf = useCallback((key: string, fallback: string) => {
        const translated = t(key);
        return translated !== key ? translated : fallback;
    }, [t]);

    const handleSend = useCallback(() => {
        if (!sendDisabled && !sending) {
            onSend();
        }
    }, [sendDisabled, sending, onSend]);

    const handleQuickReplyPress = useCallback((text: string) => {
        if (onQuickSend) {
            onQuickSend(text);
        } else {
            onChangeText(text);

            requestAnimationFrame(() => {
                onSend(text);
            });
        }
    }, [onQuickSend, onChangeText, onSend]);

    const filteredSuggestions = useMemo(() => {
        const query = normalizeSuggestionText(value);

        if (!query) {
            return QUICK_REPLY_SUGGESTIONS.slice(0, 8);
        }

        const filtered = QUICK_REPLY_SUGGESTIONS.filter(item => {
            const normalized = normalizeSuggestionText(item);

            if (normalized.includes(query)) return true;

            return normalized
                .split(/\s+/)
                .some(word => word.startsWith(query));
        });

        return filtered.length > 0
            ? filtered
            : QUICK_REPLY_SUGGESTIONS.slice(0, 6);

    }, [value]);

    const isDark = Boolean(
        themeColors.isDark ||
        themeColors.isDarkChatTheme ||
        isDarkBackground(themeColors.background) ||
        isDarkBackground(themeColors.appBackground) ||
        isDarkBackground(chatTheme?.backgroundColor) ||
        chatTheme?.textColor === '#FFFFFF' ||
        chatTheme?.textColor === '#E4E6EB'
    );

    const accentColor =
        chatTheme?.sentMessageColor ||
        themeColors.tint ||
        '#8B5CF6';

    const dockBackground = isDark
        ? 'rgba(9, 12, 20, 0.94)'
        : 'rgba(255, 255, 255, 0.96)';

    const dockBorderColor = isFocused
        ? withAlpha(accentColor, '66', isDark ? 'rgba(139,92,246,0.42)' : 'rgba(124,58,237,0.32)')
        : isDark
            ? 'rgba(255,255,255,0.12)'
            : 'rgba(15,23,42,0.10)';

    const controlBackground = isDark
        ? 'rgba(255,255,255,0.07)'
        : 'rgba(15,23,42,0.045)';

    const controlBorder = isDark
        ? 'rgba(255,255,255,0.10)'
        : 'rgba(15,23,42,0.08)';

    const suggestionBackground = isDark
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(255,255,255,0.86)';

    const sendGradient = isDark
        ? [accentColor, '#A855F7', '#06B6D4'] as const
        : [accentColor, '#7C3AED', '#0891B2'] as const;

    const sendDisabledGradient = isDark
        ? ['#2A2F3A', '#20242D'] as const
        : ['#E5E7EB', '#D1D5DB'] as const;

    const textColor =
        chatTheme?.textColor ||
        themeColors.text;

    const placeholderColor =
        chatTheme?.textColor
            ? `${chatTheme.textColor}90`
            : themeColors.subtleText;

    const hasText = value.trim().length > 0;

    return (
        <View
            style={[
                styles.container,
                containerStyle,
            ]}
        >

            {/* REPLY */}
            {replyTo && onCancelReply && (
                <View style={styles.replyWrapper}>
                    <ReplyPreview
                        replyTo={replyTo}
                        onClearReply={onCancelReply}
                        currentThemeColors={themeColors}
                    />
                </View>
            )}

            {/* ATTACHED POST */}
            {attachedPost && onCancelAttachedPost && (
                <View style={styles.replyWrapper}>
                    <ReplyPreview
                        replyTo={{
                            senderName:
                                attachedPost?.username ||
                                'Bài viết được chia sẻ',

                            uid:
                                attachedPost?.uid ||
                                'attached-post',

                            text:
                                attachedPost?.content ||
                                'Đính kèm bài viết',

                            imageUrl:
                                attachedPost?.images?.[0] ||
                                null,
                        }}
                        onClearReply={onCancelAttachedPost}
                        currentThemeColors={themeColors}
                    />
                </View>
            )}

            {/* SMART SUGGESTIONS */}
            {!isRecording && isFocused && (
                <Animated.View
                    style={[
                        styles.suggestionsContainer,
                        {
                            opacity: suggestionAnim,
                            transform: [
                                {
                                    translateY: suggestionAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [12, 0],
                                    }),
                                },
                                {
                                    scale: suggestionAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.97, 1],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <View style={styles.suggestionsHeader}>
                        <View style={[styles.sparkleBadge, { backgroundColor: `${accentColor}15` }]}>
                            <Ionicons name="sparkles" size={11} color={accentColor} />
                            <Text style={[styles.sparkleText, { color: accentColor }]}>Smart Reply</Text>
                        </View>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyboardShouldPersistTaps="always"
                        contentContainerStyle={styles.suggestionsContent}
                    >

                        {filteredSuggestions.map((item, index) => (
                            <TouchableOpacity
                                key={`${item}-${index}`}
                                activeOpacity={0.8}
                                onPress={() => handleQuickReplyPress(item)}
                                style={styles.chipTouchable}
                            >
                                <View
                                    style={[
                                        styles.chipSurface,
                                        {
                                            backgroundColor: suggestionBackground,
                                            borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.08)',
                                        },
                                    ]}
                                >
                                    <LinearGradient
                                        colors={
                                            isDark
                                                ? [withAlpha(accentColor, '22', 'rgba(139,92,246,0.14)'), 'rgba(255,255,255,0.03)']
                                                : [withAlpha(accentColor, '12', 'rgba(124,58,237,0.08)'), 'rgba(255,255,255,0.05)']
                                        }
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={[
                                            styles.suggestionChip,
                                            {
                                                borderColor: withAlpha(accentColor, '24', 'rgba(139,92,246,0.16)'),
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.suggestionText,
                                                {
                                                    color: isDark
                                                        ? 'rgba(255,255,255,0.96)'
                                                        : themeColors.text,
                                                },
                                            ]}
                                        >
                                            {item}
                                        </Text>
                                    </LinearGradient>
                                </View>
                            </TouchableOpacity>
                        ))}

                    </ScrollView>
                </Animated.View>
            )}

            {/* RECORDER */}
            {isRecording ? (
                <VoiceRecorder
                    onSend={(uri, dur) => {
                        setIsRecording(false);
                        onAudioSend?.(uri, dur);
                    }}
                    onCancel={() => setIsRecording(false)}
                    currentThemeColors={themeColors}
                />
            ) : (

                <View style={styles.inputOuterContainer}>

                    <View
                        style={[
                            styles.dockSurface,
                            {
                                backgroundColor: dockBackground,
                                borderColor: dockBorderColor,
                                shadowOpacity: isDark ? 0.26 : 0.12,
                            },
                        ]}
                    >

                        <View style={[
                            styles.inputDock,
                        ]}>

                            {/* LEFT */}
                            <View style={styles.leftActions}>

                                {showImage && onImagePress && (
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        style={[
                                            styles.actionIconButton,
                                            { backgroundColor: controlBackground, borderColor: controlBorder },
                                        ]}
                                        onPress={onImagePress}
                                        disabled={uploadingImage}
                                    >

                                        {uploadingImage ? (
                                            <ActivityIndicator
                                                size="small"
                                                color={accentColor}
                                            />
                                        ) : (
                                            <Ionicons
                                                name={
                                                    leftIconVariant === 'add'
                                                        ? 'add-circle-outline'
                                                        : 'image-outline'
                                                }
                                                size={20}
                                                color={accentColor}
                                            />
                                        )}

                                    </TouchableOpacity>
                                )}

                                {showGift && onGiftPress && (
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        style={[
                                            styles.actionIconButton,
                                            { backgroundColor: controlBackground, borderColor: controlBorder },
                                        ]}
                                        onPress={onGiftPress}
                                    >
                                        <MaterialIcons
                                            name="card-giftcard"
                                            size={20}
                                            color={accentColor}
                                        />
                                    </TouchableOpacity>
                                )}

                            </View>

                            {/* INPUT */}
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    value={value}
                                    onChangeText={onChangeText}
                                    placeholder={
                                        placeholder ||
                                        tf(
                                            'chat.type_message',
                                            'Nhắn gì đó dễ thương đi...',
                                        )
                                    }
                                    placeholderTextColor={placeholderColor}
                                    multiline
                                    maxLength={2000}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => {
                                        setTimeout(() => {
                                            setIsFocused(false);
                                        }, 180);
                                    }}
                                    style={[
                                        styles.textInput,
                                        {
                                            color: textColor,
                                        },
                                    ]}
                                />

                            </View>

                            {/* RIGHT */}
                            {hasText || !showAudio ? (
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={styles.sendButtonWrap}
                                    onPress={handleSend}
                                    disabled={sendDisabled || sending}
                                >

                                    <LinearGradient
                                        colors={(sendDisabled || sending) ? sendDisabledGradient : sendGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={[
                                            styles.sendButton,
                                            (sendDisabled || sending) && {
                                                opacity: 0.6,
                                            },
                                        ]}
                                    >

                                        {sending ? (
                                            <ActivityIndicator
                                                size="small"
                                                color="#FFFFFF"
                                            />
                                        ) : (
                                            <Ionicons
                                                name="paper-plane"
                                                size={18}
                                                color="#FFFFFF"
                                                style={styles.sendIcon}
                                            />
                                        )}

                                    </LinearGradient>

                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    style={[
                                        styles.micIconButton,
                                        { backgroundColor: controlBackground, borderColor: controlBorder },
                                    ]}
                                    onPress={() => setIsRecording(true)}
                                >
                                    <Ionicons
                                        name="mic-outline"
                                        size={20}
                                        color={themeColors.subtleText}
                                    />
                                </TouchableOpacity>
                            )}

                        </View>

                    </View>

                </View>
            )}

        </View>
    );
});

const styles = StyleSheet.create({

    container: {
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    },

    replyWrapper: {
        marginBottom: 12,
        borderRadius: 20,
        overflow: 'hidden',
    },

    suggestionsContainer: {
        marginBottom: 10,
    },

    suggestionsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        marginBottom: 8,
    },

    sparkleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },

    sparkleText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },

    suggestionsContent: {
        paddingHorizontal: 4,
        paddingVertical: 2,
        gap: 8,
    },

    chipTouchable: {
        borderRadius: 20,
    },

    chipSurface: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
    },

    suggestionChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    suggestionText: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.1,
    },

    inputOuterContainer: {
        borderRadius: 28,
    },

    dockSurface: {
        borderRadius: 28,
        overflow: 'hidden',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 18,
        elevation: 8,
    },

    inputDock: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 7,
        gap: 6,
        minHeight: 56,
        borderRadius: 28,
    },

    leftActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },

    actionIconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },

    inputWrapper: {
        flex: 1,
        minHeight: 42,
        maxHeight: 120,
        justifyContent: 'center',
        paddingHorizontal: 2,
    },

    textInput: {
        paddingHorizontal: 8,
        paddingTop: Platform.OS === 'ios' ? 9 : 7,
        paddingBottom: Platform.OS === 'ios' ? 9 : 7,
        minHeight: 42,
        maxHeight: 112,
        fontSize: 15,
        fontWeight: '500',
        lineHeight: 20,
        textAlignVertical: 'center',
    },

    sendButtonWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#8B5CF6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 6,
            },
            android: {
                elevation: 4,
            },
        }),
    },

    sendButton: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.20)',
    },

    sendIcon: {
        marginLeft: 2,
        marginTop: -1,
    },

    micIconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },

});

export default UnifiedChatInput;