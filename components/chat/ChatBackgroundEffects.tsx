import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';

export type EffectType =
    | 'none'
    | 'stars'
    | 'snow'
    | 'hearts'
    | 'confetti'
    | 'bubbles'
    | 'fireflies'
    | 'sakura'
    | 'sparkles'      // New: Lấp lánh ánh kim tuyến
    | 'rain'          // New: Mưa rơi
    | 'leaves'        // New: Lá rơi mùa thu
    | 'butterflies'   // New: Bướm bay
    | 'neon'          // New: Neon glow
    | 'galaxy'        // New: Thiên hà
    | 'balloons'      // New: Bóng bay
    | 'fireworks'     // New: Pháo hoa
    | 'music'         // New: Âm nhạc
    | 'sunlight';     // New: Nắng vàng

interface ChatBackgroundEffectsProps {
    effect: EffectType;
    themeColor?: string;
    backgroundColor?: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Helper function to adjust color brightness
const adjustColor = (hex: string, percent: number): string => {
    try {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(Math.min((num >> 16) + amt, 255), 0);
        const G = Math.max(Math.min(((num >> 8) & 0x00FF) + amt, 255), 0);
        const B = Math.max(Math.min((num & 0x0000FF) + amt, 255), 0);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    } catch {
        return hex;
    }
};

// Helper to determine if color is light or dark
const isLightColor = (hex: string): boolean => {
    try {
        const num = parseInt(hex.replace('#', ''), 16);
        const R = num >> 16;
        const G = (num >> 8) & 0x00FF;
        const B = num & 0x0000FF;
        const luminance = (0.299 * R + 0.587 * G + 0.114 * B) / 255;
        return luminance > 0.5;
    } catch {
        return true;
    }
};

// Generate colors based on theme
const getEffectColors = (effect: EffectType, themeColor: string, backgroundColor: string): string[] => {
    const isLightBg = isLightColor(backgroundColor);

    switch (effect) {
        case 'stars':
            return isLightBg
                ? ['#FFD700', '#FFA500', themeColor, '#FFEC8B', '#F0E68C']
                : ['#FFD700', '#FFFFFF', '#FFA500', '#FFEC8B', adjustColor(themeColor, 50)];

        case 'snow':
            return ['#FFFFFF', '#E8F4FF', '#B8D4E8', '#DCE9F5', '#F0F8FF'];

        case 'hearts':
            return ['#FF6B8A', '#FF1493', '#FF69B4', '#FF85A2', '#FFB6C1', themeColor];

        case 'confetti':
            return ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', themeColor];

        case 'bubbles':
            return ['#87CEEB', '#00BFFF', '#1E90FF', '#6495ED', '#7EC8E3', adjustColor(themeColor, 40)];

        case 'fireflies':
            return ['#FFFF00', '#FFD700', '#FFA500', '#ADFF2F', '#7FFF00'];

        case 'sakura':
            return ['#FFB7C5', '#FFC1CC', '#FFDDE1', '#FFE4E9', '#FFF0F3'];

        case 'sparkles':
            return ['#FFD700', '#FFFFFF', '#FFC0CB', '#87CEEB', themeColor, '#E6E6FA'];

        case 'rain':
            return isLightBg
                ? ['#4A90D9', '#5BA0E9', '#6BB0F9', '#7BC0FF']
                : ['#87CEEB', '#ADD8E6', '#B0C4DE', '#E0FFFF'];

        case 'leaves':
            return ['#FF6347', '#FF7F50', '#FFA500', '#FFD700', '#8B4513', '#D2691E'];

        case 'butterflies':
            return ['#FF69B4', '#87CEEB', '#DDA0DD', '#FFB6C1', '#E6E6FA', themeColor];

        case 'neon':
            return ['#FF00FF', '#00FFFF', '#FF1493', '#00FF00', '#FF6600', '#9400D3'];

        case 'galaxy':
            return ['#9B59B6', '#3498DB', '#E74C3C', '#F39C12', '#1ABC9C', '#FFFFFF'];

        case 'balloons':
            return ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

        case 'fireworks':
            return ['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#FF00FF', '#FFFFFF'];

        case 'music':
            return ['#000000', '#333333', '#666666', themeColor];

        case 'sunlight':
            return ['#FFD700', '#FFFACD', '#FAFAD2', '#FFFFE0'];

        default:
            return [themeColor];
    }
};

interface ParticleProps {
    delay: number;
    duration: number;
    color: string;
    size: number;
    startX: number;
    startY: number;
    effect: EffectType;
    index: number;
}

const Particle: React.FC<ParticleProps> = React.memo(({ delay, duration, color, size, startX, startY, effect, index }) => {
    const animValue = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        const timeout = setTimeout(() => {
            // Main animation loop
            const mainAnimation = Animated.loop(
                Animated.timing(animValue, {
                    toValue: 1,
                    duration,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            );

            // Glow/pulse animation for certain effects
            const glowAnimation = Animated.loop(
                Animated.sequence([
                    Animated.timing(glowAnim, {
                        toValue: 1,
                        duration: duration * 0.3,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(glowAnim, {
                        toValue: 0.3,
                        duration: duration * 0.3,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            );

            mainAnimation.start();
            glowAnimation.start();

            return () => {
                mainAnimation.stop();
                glowAnimation.stop();
            };
        }, delay);

        return () => clearTimeout(timeout);
    }, [animValue, glowAnim, delay, duration]);

    const getAnimatedStyle = () => {
        const swayAmount = 30 + (index % 3) * 15;
        const swayDirection = index % 2 === 0 ? 1 : -1;

        switch (effect) {
            case 'stars':
                return {
                    transform: [
                        {
                            scale: animValue.interpolate({
                                inputRange: [0, 0.25, 0.5, 0.75, 1],
                                outputRange: [0.5, 1.2, 0.8, 1.3, 0.5],
                            })
                        },
                        {
                            rotate: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '360deg'],
                            })
                        },
                    ],
                    opacity: glowAnim,
                };

            case 'snow':
                return {
                    transform: [
                        {
                            translateY: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, SCREEN_HEIGHT + 50],
                            })
                        },
                        {
                            translateX: animValue.interpolate({
                                inputRange: [0, 0.25, 0.5, 0.75, 1],
                                outputRange: [0, swayAmount * swayDirection, 0, -swayAmount * swayDirection, 0],
                            })
                        },
                        {
                            rotate: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '360deg'],
                            })
                        },
                    ],
                    opacity: glowAnim.interpolate({
                        inputRange: [0.3, 1],
                        outputRange: [0.6, 1],
                    }),
                };

            case 'hearts':
                return {
                    transform: [
                        {
                            translateY: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -(SCREEN_HEIGHT + 100)],
                            })
                        },
                        {
                            translateX: animValue.interpolate({
                                inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
                                outputRange: [0, swayAmount, -swayAmount * 0.5, swayAmount * 0.8, -swayAmount * 0.3, 0],
                            })
                        },
                        {
                            scale: animValue.interpolate({
                                inputRange: [0, 0.3, 0.6, 1],
                                outputRange: [0.6, 1.2, 1, 0.8],
                            })
                        },
                        {
                            rotate: animValue.interpolate({
                                inputRange: [0, 0.5, 1],
                                outputRange: ['-15deg', '15deg', '-15deg'],
                            })
                        },
                    ],
                    opacity: animValue.interpolate({
                        inputRange: [0, 0.1, 0.8, 1],
                        outputRange: [0.8, 1, 1, 0],
                    }),
                };

            case 'confetti':
                return {
                    transform: [
                        {
                            translateY: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, SCREEN_HEIGHT + 50],
                            })
                        },
                        {
                            translateX: animValue.interpolate({
                                inputRange: [0, 0.25, 0.5, 0.75, 1],
                                outputRange: [0, swayAmount * 1.5, -swayAmount, swayAmount * 0.5, 0],
                            })
                        },
                        {
                            rotate: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '1080deg'],
                            })
                        },
                        {
                            rotateX: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '720deg'],
                            })
                        },
                    ],
                    opacity: animValue.interpolate({
                        inputRange: [0, 0.1, 0.9, 1],
                        outputRange: [0.8, 1, 1, 0],
                    }),
                };

            case 'bubbles':
                return {
                    transform: [
                        {
                            translateY: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -(SCREEN_HEIGHT + 100)],
                            })
                        },
                        {
                            translateX: animValue.interpolate({
                                inputRange: [0, 0.25, 0.5, 0.75, 1],
                                outputRange: [0, swayAmount * 0.8, -swayAmount * 0.5, swayAmount * 0.3, 0],
                            })
                        },
                        {
                            scale: glowAnim.interpolate({
                                inputRange: [0.3, 1],
                                outputRange: [0.9, 1.15],
                            })
                        },
                    ],
                    opacity: animValue.interpolate({
                        inputRange: [0, 0.05, 0.85, 1],
                        outputRange: [0.7, 0.9, 0.9, 0],
                    }),
                };

            case 'fireflies':
                return {
                    transform: [
                        {
                            translateX: animValue.interpolate({
                                inputRange: [0, 0.25, 0.5, 0.75, 1],
                                outputRange: [0, 40, -20, 30, 0],
                            })
                        },
                        {
                            translateY: animValue.interpolate({
                                inputRange: [0, 0.25, 0.5, 0.75, 1],
                                outputRange: [0, -30, 20, -10, 0],
                            })
                        },
                        {
                            scale: glowAnim.interpolate({
                                inputRange: [0.3, 1],
                                outputRange: [0.4, 1.5],
                            })
                        },
                    ],
                    opacity: glowAnim,
                };

            case 'sakura':
                return {
                    transform: [
                        {
                            translateY: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, SCREEN_HEIGHT + 50],
                            })
                        },
                        {
                            translateX: animValue.interpolate({
                                inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
                                outputRange: [0, 40, 20, 60, 40, 80],
                            })
                        },
                        {
                            rotate: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '720deg'],
                            })
                        },
                        {
                            rotateY: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '360deg'],
                            })
                        },
                    ],
                    opacity: animValue.interpolate({
                        inputRange: [0, 0.1, 0.9, 1],
                        outputRange: [0.7, 1, 0.9, 0],
                    }),
                };

            case 'sparkles':
                return {
                    transform: [
                        {
                            scale: animValue.interpolate({
                                inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
                                outputRange: [0, 1.5, 0.5, 1.2, 0.3, 0],
                            })
                        },
                        {
                            rotate: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '180deg'],
                            })
                        },
                    ],
                    opacity: animValue.interpolate({
                        inputRange: [0, 0.2, 0.5, 0.8, 1],
                        outputRange: [0, 1, 0.8, 1, 0],
                    }),
                };

            case 'rain':
                return {
                    transform: [
                        {
                            translateY: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, SCREEN_HEIGHT + 30],
                            })
                        },
                        {
                            translateX: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -20],
                            })
                        },
                    ],
                    opacity: 0.7,
                };

            case 'leaves':
                return {
                    transform: [
                        {
                            translateY: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, SCREEN_HEIGHT + 50],
                            })
                        },
                        {
                            translateX: animValue.interpolate({
                                inputRange: [0, 0.25, 0.5, 0.75, 1],
                                outputRange: [0, swayAmount * 2, -swayAmount, swayAmount * 1.5, swayAmount],
                            })
                        },
                        {
                            rotate: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '540deg'],
                            })
                        },
                        {
                            rotateY: animValue.interpolate({
                                inputRange: [0, 0.5, 1],
                                outputRange: ['0deg', '180deg', '360deg'],
                            })
                        },
                    ],
                    opacity: animValue.interpolate({
                        inputRange: [0, 0.1, 0.9, 1],
                        outputRange: [0.7, 1, 0.9, 0],
                    }),
                };

            case 'butterflies':
                return {
                    transform: [
                        {
                            translateY: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -(SCREEN_HEIGHT + 200)],
                            })
                        },
                        {
                            translateX: animValue.interpolate({
                                inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
                                outputRange: [0, 100, -50, 120, -30, 80],
                            })
                        },
                        {
                            scaleX: glowAnim.interpolate({
                                inputRange: [0.3, 1],
                                outputRange: [0.3, 1],
                            })
                        },
                        {
                            rotate: animValue.interpolate({
                                inputRange: [0, 0.5, 1],
                                outputRange: ['-20deg', '20deg', '-20deg'],
                            })
                        }
                    ],
                    opacity: animValue.interpolate({
                        inputRange: [0, 0.1, 0.9, 1],
                        outputRange: [0, 1, 1, 0],
                    }),
                };

            case 'balloons':
                return {
                    transform: [
                        {
                            translateY: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -(SCREEN_HEIGHT + 200)],
                            })
                        },
                        {
                            translateX: animValue.interpolate({
                                inputRange: [0, 0.25, 0.5, 0.75, 1],
                                outputRange: [0, swayAmount, -swayAmount, swayAmount, 0],
                            })
                        },
                        {
                            rotate: animValue.interpolate({
                                inputRange: [0, 0.5, 1],
                                outputRange: ['-10deg', '10deg', '-10deg'],
                            })
                        }
                    ],
                    opacity: animValue.interpolate({
                        inputRange: [0, 0.1, 0.9, 1],
                        outputRange: [0, 1, 1, 0],
                    }),
                };

            case 'fireworks':
                return {
                    transform: [
                        {
                            scale: animValue.interpolate({
                                inputRange: [0, 0.1, 0.8, 1],
                                outputRange: [0, 1.5, 1.2, 0],
                            })
                        },
                        {
                            translateY: animValue.interpolate({
                                inputRange: [0, 0.1, 1],
                                outputRange: [0, -20, -40],
                            })
                        }
                    ],
                    opacity: animValue.interpolate({
                        inputRange: [0, 0.1, 0.8, 1],
                        outputRange: [0, 1, 0.8, 0],
                    }),
                };

            case 'music':
                return {
                    transform: [
                        {
                            translateY: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -(SCREEN_HEIGHT + 100)],
                            })
                        },
                        {
                            translateX: animValue.interpolate({
                                inputRange: [0, 0.3, 0.6, 1],
                                outputRange: [0, swayAmount * 1.5, -swayAmount, 0],
                            })
                        },
                        {
                            rotate: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '360deg'],
                            })
                        }
                    ],
                    opacity: animValue.interpolate({
                        inputRange: [0, 0.1, 0.8, 1],
                        outputRange: [0, 1, 1, 0],
                    }),
                };

            case 'sunlight':
                return {
                    transform: [
                        {
                            scale: glowAnim.interpolate({
                                inputRange: [0.3, 1],
                                outputRange: [1, 1.5],
                            })
                        },
                        {
                            rotate: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '45deg'],
                            })
                        }
                    ],
                    opacity: glowAnim.interpolate({
                        inputRange: [0.3, 1],
                        outputRange: [0.2, 0.5],
                    }),
                };

            case 'neon':
                return {
                    transform: [
                        {
                            scale: glowAnim.interpolate({
                                inputRange: [0.3, 1],
                                outputRange: [0.8, 1.3],
                            })
                        },
                    ],
                    opacity: glowAnim,
                };

            case 'galaxy':
                return {
                    transform: [
                        {
                            rotate: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '360deg'],
                            })
                        },
                        {
                            scale: glowAnim.interpolate({
                                inputRange: [0.3, 1],
                                outputRange: [0.5, 1.2],
                            })
                        },
                    ],
                    opacity: glowAnim.interpolate({
                        inputRange: [0.3, 1],
                        outputRange: [0.4, 1],
                    }),
                };

            default:
                return {};
        }
    };

    const getShape = () => {
        switch (effect) {
            case 'stars':
                return (
                    <Animated.Text style={[{ fontSize: size, color, textShadowColor: color, textShadowRadius: 10 }, getAnimatedStyle()]}>
                        ★
                    </Animated.Text>
                );

            case 'snow':
                return (
                    <Animated.View style={[
                        {
                            width: size,
                            height: size,
                            borderRadius: size / 2,
                            backgroundColor: color,
                            shadowColor: '#FFFFFF',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.8,
                            shadowRadius: size / 2,
                        },
                        getAnimatedStyle(),
                    ]} />
                );

            case 'hearts':
                return (
                    <Animated.Text style={[{
                        fontSize: size,
                        color,
                        textShadowColor: color,
                        textShadowRadius: 8,
                    }, getAnimatedStyle()]}>
                        ❤️
                    </Animated.Text>
                );

            case 'confetti':
                return (
                    <Animated.View style={[
                        {
                            width: size,
                            height: size * 2.5,
                            backgroundColor: color,
                            borderRadius: 2,
                        },
                        getAnimatedStyle(),
                    ]} />
                );

            case 'bubbles':
                return (
                    <Animated.View style={[
                        {
                            width: size,
                            height: size,
                            borderRadius: size / 2,
                            backgroundColor: color + '30',
                            borderWidth: 2,
                            borderColor: color,
                            shadowColor: color,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.5,
                            shadowRadius: size / 3,
                        },
                        getAnimatedStyle(),
                    ]} />
                );

            case 'fireflies':
                return (
                    <Animated.View style={[
                        {
                            width: size,
                            height: size,
                            borderRadius: size / 2,
                            backgroundColor: color,
                            shadowColor: color,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 1,
                            shadowRadius: size * 2,
                            elevation: 10,
                        },
                        getAnimatedStyle(),
                    ]} />
                );

            case 'sakura':
                return (
                    <Animated.Text style={[{
                        fontSize: size,
                        color,
                        textShadowColor: '#FFB7C5',
                        textShadowRadius: 5,
                    }, getAnimatedStyle()]}>
                        🌸
                    </Animated.Text>
                );

            case 'sparkles':
                return (
                    <Animated.Text style={[{
                        fontSize: size,
                        color,
                        textShadowColor: color,
                        textShadowRadius: 15,
                    }, getAnimatedStyle()]}>
                        ✨
                    </Animated.Text>
                );

            case 'rain':
                return (
                    <Animated.View style={[
                        {
                            width: 2,
                            height: size,
                            backgroundColor: color,
                            borderRadius: 1,
                        },
                        getAnimatedStyle(),
                    ]} />
                );

            case 'leaves':
                return (
                    <Animated.Text style={[{
                        fontSize: size,
                        color,
                    }, getAnimatedStyle()]}>
                        🍂
                    </Animated.Text>
                );

            case 'butterflies':
                return (
                    <Animated.Text style={[{
                        fontSize: size,
                        color,
                        textShadowColor: color,
                        textShadowRadius: 5,
                    }, getAnimatedStyle()]}>
                        🦋
                    </Animated.Text>
                );

            case 'neon':
                return (
                    <Animated.View style={[
                        {
                            width: size,
                            height: size,
                            borderRadius: size / 2,
                            backgroundColor: color,
                            shadowColor: color,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 1,
                            shadowRadius: size,
                            elevation: 15,
                        },
                        getAnimatedStyle(),
                    ]} />
                );

            case 'galaxy':
                return (
                    <Animated.View style={[
                        {
                            width: size,
                            height: size,
                            borderRadius: size / 2,
                            backgroundColor: color,
                            shadowColor: color,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 1,
                            shadowRadius: size / 2,
                        },
                        getAnimatedStyle(),
                    ]} />
                );

            case 'balloons':
                return (
                    <Animated.Text style={[{ fontSize: size }, getAnimatedStyle()]}>
                        🎈
                    </Animated.Text>
                );

            case 'fireworks':
                return (
                    <Animated.View style={[
                        {
                            width: size,
                            height: size,
                            borderRadius: size / 2,
                            backgroundColor: color,
                            shadowColor: color,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 1,
                            shadowRadius: size * 2,
                            elevation: 10,
                        },
                        getAnimatedStyle(),
                    ]} />
                );

            case 'music':
                const notes = ['🎵', '🎶', '🎼', '🎹', '🎸'];
                return (
                    <Animated.Text style={[{ fontSize: size, color }, getAnimatedStyle()]}>
                        {notes[index % notes.length]}
                    </Animated.Text>
                );

            case 'sunlight':
                return (
                    <Animated.View style={[
                        {
                            width: SCREEN_WIDTH * 0.2,
                            height: SCREEN_HEIGHT * 1.5,
                            backgroundColor: color,
                            transform: [{ rotate: '25deg' }],
                        },
                        getAnimatedStyle(),
                    ]} />
                );

            default:
                return null;
        }
    };

    return (
        <View style={[styles.particle, { left: startX, top: startY }]} pointerEvents="none">
            {getShape()}
        </View>
    );
});

const ChatBackgroundEffects: React.FC<ChatBackgroundEffectsProps> = ({
    effect,
    themeColor = '#0084FF',
    backgroundColor = '#FFFFFF'
}) => {
    const particles = useMemo(() => {
        if (effect === 'none') return [];

        const colors = getEffectColors(effect, themeColor, backgroundColor);
        const count = getParticleCount(effect);
        const result: ParticleProps[] = [];

        for (let i = 0; i < count; i++) {
            const size = getParticleSize(effect);
            let startY: number;
            let startX: number = Math.random() * (SCREEN_WIDTH - size);

            // Position particles based on effect type
            switch (effect) {
                case 'stars':
                case 'fireflies':
                case 'neon':
                case 'galaxy':
                case 'sparkles':
                    // Distribute across entire screen
                    startY = Math.random() * SCREEN_HEIGHT;
                    break;
                case 'hearts':
                case 'bubbles':
                case 'butterflies':
                case 'balloons':
                case 'music':
                    // Start from bottom, staggered to ensure continuous flow
                    startY = SCREEN_HEIGHT + (i * (SCREEN_HEIGHT / count));
                    break;
                case 'fireworks':
                case 'sunlight':
                    // Random positions
                    startY = Math.random() * SCREEN_HEIGHT;
                    startX = Math.random() * SCREEN_WIDTH;
                    break;
                case 'snow':
                case 'confetti':
                case 'sakura':
                case 'rain':
                case 'leaves':
                    // Start from above, staggered
                    startY = -50 - (i * (SCREEN_HEIGHT / count));
                    break;
                default:
                    startY = Math.random() * SCREEN_HEIGHT;
            }

            result.push({
                delay: (i * 100) % 2000, // Staggered start
                duration: getDuration(effect),
                color: colors[i % colors.length],
                size,
                startX,
                startY,
                effect,
                index: i,
            });
        }

        return result;
    }, [effect, themeColor, backgroundColor]);

    if (effect === 'none') return null;

    return (
        <View style={styles.container} pointerEvents="none">
            {particles.map((particle, index) => (
                <Particle key={`${effect}-${index}`} {...particle} />
            ))}
        </View>
    );
};

const getParticleCount = (effect: EffectType): number => {
    switch (effect) {
        case 'stars': return 40;
        case 'snow': return 50;
        case 'hearts': return 20;
        case 'confetti': return 60;
        case 'bubbles': return 25;
        case 'fireflies': return 30;
        case 'sakura': return 35;
        case 'sparkles': return 45;
        case 'rain': return 80;
        case 'leaves': return 25;
        case 'butterflies': return 15;
        case 'neon': return 25;
        case 'galaxy': return 50;
        case 'balloons': return 15;
        case 'fireworks': return 10;
        case 'music': return 20;
        case 'sunlight': return 5;
        default: return 0;
    }
};

const getParticleSize = (effect: EffectType): number => {
    switch (effect) {
        case 'stars': return 18 + Math.random() * 14;
        case 'snow': return 6 + Math.random() * 10;
        case 'hearts': return 22 + Math.random() * 16;
        case 'confetti': return 5 + Math.random() * 6;
        case 'bubbles': return 25 + Math.random() * 35;
        case 'fireflies': return 6 + Math.random() * 10;
        case 'sakura': return 18 + Math.random() * 14;
        case 'sparkles': return 20 + Math.random() * 16;
        case 'rain': return 15 + Math.random() * 20;
        case 'leaves': return 20 + Math.random() * 14;
        case 'butterflies': return 24 + Math.random() * 16;
        case 'neon': return 10 + Math.random() * 15;
        case 'galaxy': return 4 + Math.random() * 8;
        case 'balloons': return 30 + Math.random() * 20;
        case 'fireworks': return 4 + Math.random() * 6;
        case 'music': return 20 + Math.random() * 10;
        case 'sunlight': return 1; // Not used for sunlight
        default: return 10;
    }
};

const getDuration = (effect: EffectType): number => {
    switch (effect) {
        case 'stars': return 2500 + Math.random() * 1500;
        case 'snow': return 4000 + Math.random() * 3000;
        case 'hearts': return 3500 + Math.random() * 2000;
        case 'confetti': return 3000 + Math.random() * 2000;
        case 'bubbles': return 5000 + Math.random() * 3000;
        case 'fireflies': return 3000 + Math.random() * 2000;
        case 'sakura': return 5000 + Math.random() * 3000;
        case 'sparkles': return 1500 + Math.random() * 1000;
        case 'rain': return 1500 + Math.random() * 500;
        case 'leaves': return 6000 + Math.random() * 4000;
        case 'butterflies': return 8000 + Math.random() * 4000;
        case 'neon': return 2000 + Math.random() * 1500;
        case 'galaxy': return 4000 + Math.random() * 3000;
        case 'balloons': return 7000 + Math.random() * 3000;
        case 'fireworks': return 2000 + Math.random() * 1000;
        case 'music': return 5000 + Math.random() * 2000;
        case 'sunlight': return 4000 + Math.random() * 2000;
        default: return 3000;
    }
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 999,
    },
    particle: {
        position: 'absolute',
    },
});

export default ChatBackgroundEffects;
