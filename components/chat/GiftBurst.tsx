import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';

const { width, height } = Dimensions.get('window');

interface GiftBurstProps {
    visible: boolean;
    emoji: string;
    onComplete: () => void;
}

export default function GiftBurst({ visible, emoji, onComplete }: GiftBurstProps) {
    const [particles] = useState(() =>
        Array.from({ length: 15 }).map(() => ({
            x: new Animated.Value(width / 2),
            y: new Animated.Value(height / 2),
            opacity: new Animated.Value(1),
            scale: new Animated.Value(0),
            rotate: new Animated.Value(0),
        }))
    );

    useEffect(() => {
        if (visible) {
            const animations = particles.map((p, i) => {
                const angle = (i / particles.length) * Math.PI * 2;
                const distance = 100 + Math.random() * 150;
                const destX = width / 2 + Math.cos(angle) * distance;
                const destY = height / 2 + Math.sin(angle) * distance;

                return Animated.parallel([
                    Animated.timing(p.x, {
                        toValue: destX,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(p.y, {
                        toValue: destY,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(p.opacity, {
                        toValue: 0,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(p.scale, {
                        toValue: 1.5 + Math.random(),
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(p.rotate, {
                        toValue: Math.random() * 360,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ]);
            });

            Animated.parallel(animations).start(() => {
                // Reset for next time
                particles.forEach(p => {
                    p.x.setValue(width / 2);
                    p.y.setValue(height / 2);
                    p.opacity.setValue(1);
                    p.scale.setValue(0);
                    p.rotate.setValue(0);
                });
                onComplete();
            });
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <View style={styles.container} pointerEvents="none">
            {particles.map((p, i) => (
                <Animated.Text
                    key={i}
                    style={[
                        styles.particle,
                        {
                            opacity: p.opacity,
                            transform: [
                                { translateX: Animated.subtract(p.x, width / 2) },
                                { translateY: Animated.subtract(p.y, height / 2) },
                                { scale: p.scale },
                                {
                                    rotate: p.rotate.interpolate({
                                        inputRange: [0, 360],
                                        outputRange: ['0deg', '360deg']
                                    })
                                }
                            ],
                        },
                    ]}
                >
                    {emoji}
                </Animated.Text>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    particle: {
        position: 'absolute',
        fontSize: 30,
    },
});
