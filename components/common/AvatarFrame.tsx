import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Image as RNImage } from 'expo-image';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import Svg, {
    Circle,
    Defs,
    LinearGradient,
    RadialGradient,
    Stop,
    G,
    Path,
    Mask,
    Rect,
    Filter,
    FeColorMatrix,
    Image as SvgImage
} from 'react-native-svg';
import Animated, {
    useSharedValue,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
    useAnimatedStyle,
} from 'react-native-reanimated';

// Import frame assets
const FRAME_ASSETS: Record<string, any> = {
    money: require('../../assets/images/frames/frame_money.png'),
    ocean: require('../../assets/images/frames/frame_ocean.png'),
    devil: require('../../assets/images/frames/frame_devil_v2.png'),
    ufo: require('../../assets/images/frames/frame_ufo.png'),
    elegant: require('../../assets/images/frames/frame_elegant.png'),
    japan: require('../../assets/images/frames/frame_japan.png'),
    dragon: require('../../assets/images/frames/frame_dragon_v2.png'),
    phoenix: require('../../assets/images/frames/frame_phoenix_v2.png'),
    cyberpunk: require('../../assets/images/frames/frame_cyberpunk_v2.png'),
    galaxy: require('../../assets/images/frames/frame_galaxy_v2.png'),
};

interface AvatarFrameProps {
    avatarUrl: string;
    frameType?: string;
    size?: number;
    onPress?: () => void;
}

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

const AvatarFrame: React.FC<AvatarFrameProps> = ({
    avatarUrl,
    frameType,
    size = 100,
    onPress,
}) => {
    const rotation = useSharedValue(0);
    const pulse = useSharedValue(1);
    const maskId = useMemo(() => `mask-${Math.random().toString(36).substr(2, 9)}`, []);
    const filterId = useMemo(() => `filter-${Math.random().toString(36).substr(2, 9)}`, []);

    useEffect(() => {
        const normalizedFrame = (frameType || '').toLowerCase();
        if (['ocean', 'ufo', 'gamer', 'cyberpunk', 'galaxy'].includes(normalizedFrame)) {
            rotation.value = withRepeat(
                withTiming(360, { duration: 4000, easing: Easing.linear }),
                -1,
                false
            );
        }

        if (['money', 'devil', 'elegant', 'japan', 'dragon', 'phoenix'].includes(normalizedFrame)) {
            pulse.value = withRepeat(
                withSequence(
                    withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                false
            );
        }
    }, [frameType]);

    const animatedRotationStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    const animatedPulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
    }));

    const strokeWidth = size * 0.15;
    const hasFrame = !!frameType;
    const normalizedFrame = (frameType || '').toLowerCase();

    // Increase size for frames with large decorative elements
    const isLargeFrame = ['devil', 'dragon', 'phoenix', 'galaxy'].includes(normalizedFrame);
    const extraPadding = isLargeFrame ? size * 0.4 : 0;
    const totalSize = hasFrame ? (size + strokeWidth * 2 + extraPadding) : size;
    const offset = (totalSize - size) / 2;
    const center = totalSize / 2;

    const renderFrame = () => {
        if (!frameType) return null;

        if (FRAME_ASSETS[normalizedFrame]) {
            const isAnimatedRotation = ['ocean', 'ufo', 'cyberpunk', 'galaxy'].includes(normalizedFrame);
            const animatedStyle = isAnimatedRotation ? animatedRotationStyle : animatedPulseStyle;

            // Frames with black background that need transparency filter
            const needsFilter = ['devil', 'dragon', 'phoenix', 'cyberpunk', 'galaxy'].includes(normalizedFrame);

            return (
                <AnimatedSvg width={totalSize} height={totalSize} style={[styles.frameSvg, animatedStyle]}>
                    <Defs>
                        <Filter id={filterId}>
                            {/* Make black background transparent by using color values as alpha */}
                            <FeColorMatrix
                                type="matrix"
                                values="1 0 0 0 0
                                        0 1 0 0 0
                                        0 0 1 0 0
                                        2 2 2 0 0"
                            />
                        </Filter>
                        <Mask id={maskId}>
                            {/* Outer circle to hide anything outside totalSize */}
                            <Circle cx={center} cy={center} r={totalSize / 2} fill="white" />
                            {/* Inner hole for the avatar */}
                            <Circle
                                cx={center}
                                cy={center}
                                r={size / 2}
                                fill="black"
                            />
                        </Mask>
                    </Defs>
                    <SvgImage
                        href={FRAME_ASSETS[normalizedFrame]}
                        width={totalSize}
                        height={totalSize}
                        preserveAspectRatio="xMidYMid slice"
                        mask={`url(#${maskId})`}
                        filter={needsFilter ? `url(#${filterId})` : undefined}
                    />
                </AnimatedSvg>
            );
        }

        if (normalizedFrame === 'gamer') {
            return (
                <AnimatedSvg width={totalSize} height={totalSize} style={[styles.frameSvg, animatedRotationStyle]}>
                    <Defs>
                        <LinearGradient id="gamerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <Stop offset="0%" stopColor="#00FFFF" />
                            <Stop offset="100%" stopColor="#FF00FF" />
                        </LinearGradient>
                    </Defs>
                    <Circle cx={center} cy={center} r={(size + strokeWidth) / 2} stroke="url(#gamerGrad)" strokeWidth={strokeWidth} fill="none" strokeDasharray="20,10" />
                </AnimatedSvg>
            );
        }

        return null;
    };

    const Container = onPress ? TouchableOpacity : View;

    return (
        <Container
            style={[
                styles.container,
                {
                    width: totalSize,
                    height: totalSize,
                    // Remove overflow: 'hidden' to allow wings to extend beyond the circle
                }
            ]}
            onPress={onPress}
            activeOpacity={0.8}
            disabled={!onPress}
        >
            {/* Avatar Image */}
            <RNImage
                source={{ uri: avatarUrl || 'https://via.placeholder.com/150' }}
                style={[
                    styles.avatar,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        top: offset,
                        left: offset,
                    }
                ]}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
            />

            {/* Frame Layer */}
            {hasFrame && (
                <View style={{ position: 'absolute', width: totalSize, height: totalSize, pointerEvents: 'none' }}>
                    {renderFrame()}
                </View>
            )}
        </Container>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        position: 'absolute',
    },
    frameSvg: {
        position: 'absolute',
    },
});

export default AvatarFrame;
