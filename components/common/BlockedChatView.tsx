import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useTranslation } from 'react-i18next';

interface BlockedChatViewProps {
    reason: string;
    onBack: () => void;
}

export const BlockedChatView: React.FC<BlockedChatViewProps> = ({ reason, onBack }) => {
    const { t } = useTranslation();
    const themeContext = useContext(ThemeContext);
    const theme = themeContext?.theme || 'light';
    const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

    const isBlockedByUser = reason === 'chat.blocked_subtitle';

    const title = isBlockedByUser ? t('chat.blocked_title') : t('chat.blocked_by_title');
    const subtitle = t(reason);
    const suggestion = isBlockedByUser ? t('chat.blocked_suggestion') : '';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color={currentThemeColors.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={[styles.iconContainer, { backgroundColor: currentThemeColors.surface }]}>
                    <MaterialIcons name="block" size={64} color={Colors.error} />
                </View>

                <Text style={[styles.title, { color: currentThemeColors.text }]}>
                    {title}
                </Text>

                <Text style={[styles.subtitle, { color: currentThemeColors.subtleText }]}>
                    {subtitle}
                </Text>

                {suggestion ? (
                    <Text style={[styles.suggestion, { color: currentThemeColors.subtleText }]}>
                        {suggestion}
                    </Text>
                ) : null}

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: currentThemeColors.tint }]}
                    onPress={onBack}
                >
                    <Text style={styles.buttonText}>{t('common.back')}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingBottom: 100,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 22,
    },
    suggestion: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 32,
        opacity: 0.8,
    },
    button: {
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 24,
        marginTop: 20,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
