import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing, Text, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
    | 'sunlight'      // New: Nắng vàng
    | 'halloween';    // New: Halloween icons

interface ChatBackgroundEffectsProps {
    effect: EffectType;
    themeId?: string;
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
            return ['rgba(255, 255, 255, 0.8)', 'rgba(255, 236, 139, 0.6)', 'rgba(255, 215, 0, 0.4)', 'rgba(255, 165, 0, 0.3)'];

        default:
            return [themeColor];
    }
};

const getBackgroundGradient = (effect: EffectType): string[] | null => {
    switch (effect) {
        case 'stars': return ['#000000', '#0B0D17', '#1B1E2E'];
        case 'snow': return ['#E8F4FF', '#FFFFFF', '#F0F8FF'];
        case 'hearts': return ['#FFF0F3', '#FFE5EC', '#FFC8DD'];
        case 'bubbles': return ['#E0F2F1', '#B2DFDB', '#80CBC4'];
        case 'fireflies': return ['#050505', '#0A0A0A', '#1A1A1A'];
        case 'sakura': return ['#FFF5F7', '#FFE4E9', '#FFDDE1'];
        case 'sparkles': return ['#FFF9C4', '#FFF176', '#FFEE58'];
        case 'rain': return ['#ECEFF1', '#CFD8DC', '#B0BEC5'];
        case 'leaves': return ['#FFF3E0', '#FFE0B2', '#FFCC80'];
        case 'butterflies': return ['#F1F8E9', '#DCEDC8', '#C5E1A5'];
        case 'neon': return ['#000000', '#050505', '#0A0A0A'];
        case 'galaxy': return ['#10002B', '#240046', '#3C096C'];
        case 'balloons': return ['#E3F2FD', '#BBDEFB', '#90CAF9'];
        case 'fireworks': return ['#000000', '#0B0D17', '#1B1E2E'];
        case 'music': return ['#FAFAFA', '#F5F5F5', '#EEEEEE'];
        case 'sunlight': return ['#FFF9C4', '#FFF176', '#FFEE58'];
        default: return null;
    }
};

const getBackgroundIcons = (type: string): string[] => {
    switch (type) {
        case 'stars':
        case 'galaxy_premium': return ['✨', '⭐', '🌟', '🌌'];
        case 'hearts':
        case 'love': return ['❤️', '💖', '💗', '💓'];
        case 'sakura':
        case 'pastel_soft': return ['🌸', '💮', '🌺'];
        case 'galaxy': return ['🪐', '☄️', '🌠', '🌑'];
        case 'leaves': return ['🍂', '🍁', '🍃'];
        case 'butterflies': return ['🦋', '🧚'];
        case 'balloons': return ['🎈', '🎊'];
        case 'music': return ['🎵', '🎶', '🎼'];
        case 'sunlight':
        case 'sunlight_premium': return ['☀️', '🌤️'];
        case 'snow': return ['❄️', '☃️'];
        case 'fireworks': return ['🎆', '🎇'];
        case 'halloween': return ['🎃', '💀', '👻', '🦇', '🕸️'];
        case 'underwater': return ['🧜‍♂️', '🐠', '🐡', '🐚', '🌊'];
        case 'steampunk': return ['⚙️', '🕰️', '📜', '🔧', '🎩'];
        case 'nature_zen': return ['🧘', '🎋', '🪨', '🍃', '🍵'];
        case 'neon_night': return ['🌃', '🏮', '🎆', '⚡', '🌆'];
        case 'blue': return ['☁️', '💧', '🌊'];
        case 'green': return ['🌿', '🍃', '🌳'];
        case 'purple': return ['✨', '💜', '🔮'];
        case 'orange': return ['☀️', '🍊', '🍁'];
        case 'pink': return ['🌸', '💖', '🎀'];
        case 'teal': return ['💎', '❄️', '🌊'];
        case 'lavender': return ['🪻', '🌿', '✨'];
        case 'ocean': return ['🌊', '🐬', '🐚'];
        case 'sunset': return ['🌇', '🌅', '☁️'];
        case 'forest': return ['🌲', '🌳', '🍃'];
        case 'indigo': return ['🌌', '🌑', '🌊'];
        case 'brown': return ['☕', '🪵', '🍂'];
        case 'messenger_blue': return ['💬', '⚡', '✨'];
        case 'messenger_dark': return ['💬', '⚡', '🌑'];
        default: return [];
    }
};

const BackgroundDecorations: React.FC<{ effect: EffectType, themeId?: string, backgroundColor: string }> = ({ effect, themeId, backgroundColor }) => {
    const icons = useMemo(() => {
        const effectIcons = getBackgroundIcons(effect);
        const themeIcons = themeId ? getBackgroundIcons(themeId) : [];
        // Combine and remove duplicates
        return Array.from(new Set([...effectIcons, ...themeIcons]));
    }, [effect, themeId]);

    const isDark = useMemo(() => !isLightColor(backgroundColor), [backgroundColor]);
    const iconColor = isDark ? '#FFFFFF' : '#000000';

    const decorations = useMemo(() => {
        if (icons.length === 0) return [];
        return Array.from({ length: 4 }).map((_, i) => ({
            icon: icons[i % icons.length],
            size: 100 + Math.random() * 80,
            left: Math.random() * SCREEN_WIDTH - 40,
            top: Math.random() * SCREEN_HEIGHT - 40,
            rotate: `${Math.random() * 360}deg`,
            scale: 0.8 + Math.random() * 0.3,
        }));
    }, [icons]);

    if (decorations.length === 0) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {decorations.map((dec, i) => (
                <Text
                    key={i}
                    style={{
                        position: 'absolute',
                        fontSize: dec.size,
                        opacity: isDark ? 0.12 : 0.08,
                        left: dec.left,
                        top: dec.top,
                        transform: [
                            { rotate: dec.rotate },
                            { scale: dec.scale }
                        ],
                        color: iconColor,
                    }}
                >
                    {dec.icon}
                </Text>
            ))}
        </View>
    );
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

const ParticleComponent: React.FC<ParticleProps> = ({ delay, duration, color, size, startX, startY, effect, index }) => {
    const animValue = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0.5)).current;
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mainAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
    const glowAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

    useEffect(() => {
        timeoutRef.current = setTimeout(() => {
            // Main animation loop
            mainAnimationRef.current = Animated.loop(
                Animated.timing(animValue, {
                    toValue: 1,
                    duration,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            );

            // Glow/pulse animation for certain effects
            glowAnimationRef.current = Animated.loop(
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

            mainAnimationRef.current.start();
            glowAnimationRef.current.start();
        }, delay);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            mainAnimationRef.current?.stop();
            glowAnimationRef.current?.stop();
            animValue.stopAnimation();
            glowAnim.stopAnimation();
        };
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
                const isMote = index >= 12; // First 12 are rays, rest are bokeh/motes
                if (isMote) {
                    return {
                        transform: [
                            {
                                translateY: animValue.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, -SCREEN_HEIGHT * 0.5],
                                })
                            },
                            {
                                translateX: animValue.interpolate({
                                    inputRange: [0, 0.5, 1],
                                    outputRange: [0, 30 * (index % 2 === 0 ? 1 : -1), 0],
                                })
                            },
                            {
                                scale: glowAnim.interpolate({
                                    inputRange: [0.3, 1],
                                    outputRange: [0.8, 1.2],
                                })
                            }
                        ],
                        opacity: glowAnim.interpolate({
                            inputRange: [0.3, 1],
                            outputRange: [0.2, 0.6],
                        }),
                    };
                }
                return {
                    transform: [
                        {
                            rotate: `${(index - 6) * 15}deg` // Radial fan from center
                        },
                        {
                            scaleY: glowAnim.interpolate({
                                inputRange: [0.3, 1],
                                outputRange: [1, 1.3],
                            })
                        },
                    ],
                    opacity: glowAnim.interpolate({
                        inputRange: [0.3, 1],
                        outputRange: [0.1, 0.4],
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
                const starIcons = ['★', '⭐', '🌟', '✨', '✧'];
                return (
                    <Animated.Text style={[{
                        fontSize: size,
                        color,
                        textShadowColor: color,
                        textShadowRadius: 10,
                    }, getAnimatedStyle()]}>
                        {starIcons[index % starIcons.length]}
                    </Animated.Text>
                );

            case 'snow':
                const snowIcons = ['❄️', '🌨️', '❅', '❆'];
                return (
                    <Animated.Text style={[{
                        fontSize: size,
                        color,
                        textShadowColor: '#FFFFFF',
                        textShadowRadius: 5,
                    }, getAnimatedStyle()]}>
                        {snowIcons[index % snowIcons.length]}
                    </Animated.Text>
                );

            case 'hearts':
                const heartIcons = ['❤️', '💖', '💗', '💓', '💕', '💘'];
                return (
                    <Animated.Text style={[{
                        fontSize: size,
                        color,
                        textShadowColor: color,
                        textShadowRadius: 8,
                    }, getAnimatedStyle()]}>
                        {heartIcons[index % heartIcons.length]}
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
                const sakuraIcons = ['🌸', '💮', '🏵️', '🌺'];
                return (
                    <Animated.Text style={[{
                        fontSize: size,
                        color,
                        textShadowColor: '#FFB7C5',
                        textShadowRadius: 5,
                    }, getAnimatedStyle()]}>
                        {sakuraIcons[index % sakuraIcons.length]}
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
                const leafIcons = ['🍂', '🍁', '🍃', '🌿'];
                return (
                    <Animated.Text style={[{
                        fontSize: size,
                        color,
                    }, getAnimatedStyle()]}>
                        {leafIcons[index % leafIcons.length]}
                    </Animated.Text>
                );

            case 'butterflies':
                const butterflyIcons = ['🦋', '🧚', '✨'];
                return (
                    <Animated.Text style={[{
                        fontSize: size,
                        color,
                        textShadowColor: color,
                        textShadowRadius: 5,
                    }, getAnimatedStyle()]}>
                        {butterflyIcons[index % butterflyIcons.length]}
                    </Animated.Text>
                );

            case 'neon':
                const neonIcons = ['⚡', '✨', '🌟', '💫', '🔥'];
                if (index % 2 === 0) {
                    return (
                        <Animated.Text style={[{
                            fontSize: size,
                            color,
                            textShadowColor: color,
                            textShadowRadius: 20,
                        }, getAnimatedStyle()]}>
                            {neonIcons[index % neonIcons.length]}
                        </Animated.Text>
                    );
                }
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
                const galaxyIcons = ['🌌', '🪐', '☄️', '🌠', '✨', '🌑'];
                if (index % 3 === 0) {
                    return (
                        <Animated.Text style={[{
                            fontSize: size * 2,
                            color,
                            textShadowColor: color,
                            textShadowRadius: 10,
                        }, getAnimatedStyle()]}>
                            {galaxyIcons[index % galaxyIcons.length]}
                        </Animated.Text>
                    );
                }
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
                const balloonIcons = ['🎈', '🎊', '🥳', '🎁', '✨'];
                return (
                    <Animated.Text style={[{ fontSize: size }, getAnimatedStyle()]}>
                        {balloonIcons[index % balloonIcons.length]}
                    </Animated.Text>
                );

            case 'fireworks':
                const fireworkIcons = ['🎆', '🎇', '✨', '💥', '🌟'];
                if (index % 2 === 0) {
                    return (
                        <Animated.Text style={[{
                            fontSize: size * 3,
                            color,
                            textShadowColor: color,
                            textShadowRadius: 15,
                        }, getAnimatedStyle()]}>
                            {fireworkIcons[index % fireworkIcons.length]}
                        </Animated.Text>
                    );
                }
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
                const notes = ['🎵', '🎶', '🎼', '🎹', '🎸', '🎻', '🎺', '🎷', '🎧', '📻'];
                return (
                    <Animated.Text style={[{
                        fontSize: size,
                        color,
                        textShadowColor: color,
                        textShadowRadius: 5,
                    }, getAnimatedStyle()]}>
                        {notes[index % notes.length]}
                    </Animated.Text>
                );

            case 'sunlight':
                const isBokeh = index >= 12;
                if (isBokeh) {
                    const bokehSize = 15 + (index % 35);
                    return (
                        <Animated.View style={[
                            {
                                width: bokehSize,
                                height: bokehSize,
                                borderRadius: bokehSize / 2,
                                backgroundColor: color,
                                shadowColor: color,
                                shadowRadius: bokehSize,
                                shadowOpacity: 0.4,
                            },
                            getAnimatedStyle()
                        ]} />
                    );
                }
                return (
                    <Animated.View style={[getAnimatedStyle(), { position: 'absolute', top: 0, left: SCREEN_WIDTH / 2 }]}>
                        <LinearGradient
                            colors={[color, 'transparent']}
                            style={{
                                width: SCREEN_WIDTH * 0.15,
                                height: SCREEN_HEIGHT * 1.5,
                                borderRadius: SCREEN_WIDTH * 0.075,
                            }}
                            start={{ x: 0.5, y: 0 }}
                            end={{ x: 0.5, y: 1 }}
                        />
                    </Animated.View>
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
};

const Particle = React.memo(ParticleComponent);

const getBaseParticleCount = (effect: EffectType): number => {
    switch (effect) {
        case 'stars': return 25;
        case 'snow': return 30;
        case 'hearts': return 15;
        case 'confetti': return 35;
        case 'bubbles': return 15;
        case 'fireflies': return 20;
        case 'sakura': return 20;
        case 'sparkles': return 25;
        case 'rain': return 40;
        case 'leaves': return 15;
        case 'butterflies': return 10;
        case 'neon': return 15;
        case 'galaxy': return 30;
        case 'balloons': return 10;
        case 'fireworks': return 8;
        case 'music': return 12;
        case 'sunlight': return 30; // 8 rays + 22 bokeh motes
        default: return 0;
    }
};

const getParticleCount = (effect: EffectType): number => {
    const base = getBaseParticleCount(effect);
    if (Platform.OS !== 'android') return base;

    // Keep effects smooth on most Android devices by lowering particle density.
    const highCostEffects = new Set<EffectType>(['rain', 'confetti', 'sparkles', 'galaxy', 'sunlight']);
    const factor = highCostEffects.has(effect) ? 0.5 : 0.65;
    return Math.max(6, Math.round(base * factor));
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
    sunContainer: {
        position: 'absolute',
        top: -50,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1,
    },
    sunGlow: {
        width: SCREEN_WIDTH * 0.8,
        height: SCREEN_WIDTH * 0.8,
        borderRadius: SCREEN_WIDTH * 0.4,
    },
});

const ChatBackgroundEffectsComponent: React.FC<ChatBackgroundEffectsProps> = ({
    effect,
    themeId,
    themeColor = '#0084FF',
    backgroundColor = '#FFFFFF'
}) => {
    if (effect === 'none') return null;

    const particles = useMemo(() => {
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
                case 'sunlight':
                    if (i < 12) {
                        // Rays radiating from top-center
                        startY = -50;
                        startX = SCREEN_WIDTH / 2;
                    } else {
                        // Bokeh particles scattered
                        startY = Math.random() * SCREEN_HEIGHT;
                        startX = Math.random() * SCREEN_WIDTH;
                    }
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

    const bgGradient = getBackgroundGradient(effect) || (themeId ? getBackgroundGradient(themeId as EffectType) : null);

    return (
        <View style={styles.container} pointerEvents="none">
            {bgGradient && (
                <LinearGradient
                    colors={bgGradient as [string, string, ...string[]]}
                    style={[StyleSheet.absoluteFill, { opacity: 0.3 }]}
                />
            )}
            <BackgroundDecorations effect={effect} themeId={themeId} backgroundColor={backgroundColor} />
            {effect === 'sunlight' && (
                <View style={styles.sunContainer}>
                    <LinearGradient
                        colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 236, 139, 0.4)', 'transparent']}
                        style={styles.sunGlow}
                    />
                </View>
            )}
            {particles.map((particle, index) => (
                <Particle key={`${effect}-${index}`} {...particle} />
            ))}
        </View>
    );
};

const ChatBackgroundEffects = React.memo(ChatBackgroundEffectsComponent);

export default ChatBackgroundEffects;
