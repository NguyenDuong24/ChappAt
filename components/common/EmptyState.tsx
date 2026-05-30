import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface EmptyStateProps {
    icon?: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
    icon = 'chatbubbles-outline',
    title,
    description,
    actionLabel,
    onAction
}) => {
    return (
        <Animated.View
            entering={FadeInUp.delay(200).duration(600)}
            style={styles.container}
        >
            <BlurView intensity={30} tint="dark" style={styles.card}>
                <View style={styles.iconContainer}>
                    <Ionicons name={icon} size={64} color="#FF2D55" />
                    <View style={styles.iconRing} />
                </View>

                <Text style={styles.title}>{title}</Text>
                <Text style={styles.description}>{description}</Text>

                {actionLabel && (
                    <TouchableOpacity style={styles.button} onPress={onAction}>
                        <Text style={styles.buttonText}>{actionLabel}</Text>
                    </TouchableOpacity>
                )}
            </BlurView>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    card: {
        width: width * 0.85,
        padding: 32,
        borderRadius: 30,
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    iconContainer: {
        marginBottom: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconRing: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: 'rgba(255, 45, 85, 0.2)',
        transform: [{ scale: 1.2 }],
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    button: {
        backgroundColor: '#FF2D55',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 20,
        shadowColor: '#FF2D55',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
    },
});

export default EmptyState;
