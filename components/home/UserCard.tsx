import React, { useCallback, useRef, memo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Animated } from 'react-native';
import { Card, Chip } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/Colors';
import { calculateDistance } from '@/utils/calculateDistance';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import VibeAvatar from '@/components/vibe/VibeAvatar';

// Helper function moved outside component for optimization
const isExpired = (expiresAt: any): boolean => {
    if (!expiresAt) return false;
    const now = new Date();
    const expiry = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
    return expiry.getTime() <= now.getTime();
};

// Get gradient colors based on gender
const getGradientColors = (gender: string): [string, string] => {
    switch (gender) {
        case 'male':
            return ['#667eea', '#764ba2'];
        case 'female':
            return ['#f093fb', '#f5576c'];
        default:
            return ['#4facfe', '#00f2fe'];
    }
};

interface UserCardProps {
    item: any;
    index: number;
    location: any;
    activeTab: string;
    currentThemeColors: any;
    viewerShowOnline: boolean;
}

const UserCard = memo(({
    item,
    index,
    location,
    activeTab,
    currentThemeColors,
    viewerShowOnline
}: UserCardProps) => {
    const router = useRouter();
    const scaleRef = useRef(new Animated.Value(1));

    const ageColor = item.gender === 'male'
        ? Colors.secondary
        : item.gender === 'female'
            ? Colors.primary
            : currentThemeColors.subtleText;

    const genderIconColor = item.gender === 'male'
        ? Colors.primary
        : item.gender === 'female'
            ? Colors.secondary
            : currentThemeColors.subtleText;

    const gradientColors = getGradientColors(item.gender);

    const distance = location ? calculateDistance(location.coords, item?.location) : 0;

    // Prepare current vibe (if available on user item)
    const currentVibeRaw = item?.currentVibe?.vibe ? item.currentVibe : null;
    const currentVibe = (currentVibeRaw && !isExpired(currentVibeRaw.expiresAt)) ? currentVibeRaw : null;
    const vibe = currentVibe?.vibe;

    const handlePressIn = useCallback(() => {
        Animated.spring(scaleRef.current, {
            toValue: 0.98,
            useNativeDriver: true,
            speed: 20,
            bounciness: 6
        }).start();
    }, []);

    const handlePressOut = useCallback(() => {
        Animated.spring(scaleRef.current, {
            toValue: 1,
            useNativeDriver: true,
            speed: 20,
            bounciness: 6
        }).start();
    }, []);

    const handleNavigateToProfile = useCallback(() => {
        router.push({
            pathname: "/(screens)/user/UserProfileScreen",
            params: { userId: item.id }
        });
    }, [item.id, router]);

    const handleNavigateToChat = useCallback(() => {
        const dest = activeTab === 'chat'
            ? `/(tabs)/chat/${item.id}`
            : activeTab === 'home'
                ? `/(tabs)/home/chat/${item.id}`
                : `/chat/${item.id}`;
        router.push(dest as any);
    }, [activeTab, item.id, router]);

    return (
        <Card style={[styles.userCard, { backgroundColor: currentThemeColors.surface || currentThemeColors.background }]}>
            <TouchableOpacity
                style={styles.userContainer}
                onPress={handleNavigateToProfile}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.85}
            >
                <Animated.View style={{ transform: [{ scale: scaleRef.current }] }}>
                    <LinearGradient
                        colors={gradientColors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradientBorder}
                    >
                        <View style={[styles.cardContent, { backgroundColor: currentThemeColors.surface || currentThemeColors.background }]}>
                            {/* Avatar Section */}
                            <View style={styles.avatarSection}>
                                <View style={styles.avatarContainer}>
                                    <View style={[styles.avatarBorder, { borderColor: vibe ? vibe.color : 'white' }]}>
                                        <VibeAvatar
                                            avatarUrl={item.profileUrl}
                                            size={50}
                                            currentVibe={item.currentVibe || null}
                                            showAddButton={false}
                                            storyUser={{ id: item.id, username: item.username, profileUrl: item.profileUrl }}
                                        />
                                    </View>
                                    {/* Online Status Indicator */}
                                    {viewerShowOnline && (
                                        <View style={[
                                            styles.statusIndicator,
                                            item.isOnline ? styles.online : styles.offline
                                        ]}>
                                            <View style={[styles.statusDot, item.isOnline ? styles.onlineDot : styles.offlineDot]} />
                                        </View>
                                    )}
                                    {/* Vibe emoji badge on avatar */}
                                    {vibe && (
                                        <View style={[styles.vibeEmojiBadge, { backgroundColor: vibe.color }]}>
                                            <Text style={styles.vibeEmojiBadgeText}>{vibe.emoji}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* User Info Section */}
                            <View style={styles.userInfo}>
                                <View style={styles.textContainer}>
                                    {/* Header row: name only */}
                                    <View style={styles.headerRow}>
                                        <View style={styles.nameRowLeft}>
                                            <Text style={[styles.userName, { color: currentThemeColors.text }]} numberOfLines={1}>
                                                {item.username}
                                            </Text>
                                            <MaterialCommunityIcons
                                                name={item.gender === 'male' ? "gender-male" : item.gender === 'female' ? "gender-female" : "account"}
                                                size={16}
                                                color={genderIconColor}
                                            />
                                        </View>
                                    </View>

                                    {/* Bio */}
                                    <Text style={[styles.bio, { color: currentThemeColors.subtleText }]} numberOfLines={1}>
                                        {item.bio || "Chưa có thông tin giới thiệu"}
                                    </Text>

                                    {/* Vibe row (if user has a current vibe) */}
                                    {vibe && (
                                        <View style={styles.vibeRow}>
                                            <LinearGradient
                                                colors={[vibe.color + 'CC', vibe.color + '99']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={styles.vibePill}
                                            >
                                                <Text style={styles.vibePillEmoji}>{vibe.emoji}</Text>
                                                <Text style={styles.vibePillText} numberOfLines={1}>{vibe.name}</Text>
                                            </LinearGradient>
                                            {currentVibe?.customMessage ? (
                                                <Text
                                                    numberOfLines={1}
                                                    style={[styles.vibeMessage, { color: currentThemeColors.subtleText }]}
                                                >
                                                    {`"${currentVibe.customMessage}"`}
                                                </Text>
                                            ) : null}
                                        </View>
                                    )}

                                    {/* Tags Section (age and distance) */}
                                    <View style={styles.tagsContainer}>
                                        <Chip
                                            compact
                                            style={[styles.ageChip, { backgroundColor: ageColor + '15' }]}
                                            textStyle={[styles.chipText, { color: ageColor }]}
                                            icon="calendar"
                                        >
                                            {typeof item.age === 'number' ? `${item.age} tuổi` : 'N/A'}
                                        </Chip>
                                        {distance !== null && !isNaN(distance) && (
                                            <Chip
                                                compact
                                                style={[styles.distanceChipSmall, { backgroundColor: currentThemeColors.tint + '15' }]}
                                                textStyle={[styles.chipText, { color: currentThemeColors.tint }]}
                                                icon="map-marker"
                                            >
                                                {distance.toFixed(1)} km
                                            </Chip>
                                        )}
                                    </View>
                                </View>

                                {/* Action Button */}
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={handleNavigateToChat}
                                >
                                    <LinearGradient
                                        colors={gradientColors}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.actionGradient}
                                    >
                                        <MaterialIcons name="chat" size={18} color="white" />
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>
            </TouchableOpacity>
        </Card>
    );
}, (prevProps, nextProps) => {
    // Custom comparison for memo - only re-render if these props change
    return (
        prevProps.item.id === nextProps.item.id &&
        prevProps.item.isOnline === nextProps.item.isOnline &&
        prevProps.item.currentVibe?.vibe?.name === nextProps.item.currentVibe?.vibe?.name &&
        prevProps.item.profileUrl === nextProps.item.profileUrl &&
        prevProps.activeTab === nextProps.activeTab &&
        prevProps.currentThemeColors.text === nextProps.currentThemeColors.text &&
        prevProps.viewerShowOnline === nextProps.viewerShowOnline &&
        prevProps.location?.coords?.latitude === nextProps.location?.coords?.latitude &&
        prevProps.location?.coords?.longitude === nextProps.location?.coords?.longitude
    );
});

const styles = StyleSheet.create({
    userCard: {
        marginHorizontal: 16,
        marginVertical: 4,
        borderRadius: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        overflow: 'visible',
    },
    userContainer: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    gradientBorder: {
        padding: 2,
        borderRadius: 16,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        paddingBottom: 8,
        borderRadius: 14,
    },
    avatarSection: {
        width: 62,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarContainer: {
        position: 'relative',
    },
    avatarBorder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        overflow: 'hidden',
    },
    statusIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    onlineDot: { backgroundColor: Colors.success },
    offlineDot: { backgroundColor: Colors.warning },
    online: { backgroundColor: Colors.success },
    offline: { backgroundColor: Colors.warning },
    vibeEmojiBadge: {
        position: 'absolute',
        top: -6,
        left: -6,
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    vibeEmojiBadgeText: { fontSize: 12 },
    userInfo: {
        flex: 1,
        marginLeft: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    textContainer: { flex: 1 },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginBottom: 1,
    },
    nameRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 6,
        maxWidth: '95%',
    },
    vibeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    vibePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        minHeight: 20,
    },
    vibePillEmoji: { fontSize: 12, marginRight: 4, color: 'white' },
    vibePillText: { fontSize: 10, fontWeight: '700', color: 'white', maxWidth: 100 },
    vibeMessage: { fontSize: 10, fontStyle: 'italic', flexShrink: 1 },
    bio: { fontSize: 12, marginBottom: 4, lineHeight: 18 },
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 2 },
    ageChip: {
        borderRadius: 20,
        marginRight: 4,
        alignSelf: 'flex-start',
    },
    distanceChipSmall: {
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    chipText: { fontSize: 12, fontWeight: '500' },
    actionButton: { marginLeft: 8 },
    actionGradient: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default UserCard;
