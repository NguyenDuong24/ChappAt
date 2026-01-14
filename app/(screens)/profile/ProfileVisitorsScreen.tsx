import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    Image,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { profileVisitService, ProfileVisit } from '@/services/profileVisitService';
import { useIsPremium } from '@/hooks/useIsPremium';
import { useThemedColors } from '@/hooks/useThemedColors';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { format } from 'date-fns';
import { proximityService } from '@/services/proximityService';

const { width } = Dimensions.get('window');

const ProfileVisitorsScreen = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { isPremium, loading: premiumLoading } = useIsPremium();
    const [visitors, setVisitors] = useState<ProfileVisit[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const colors = useThemedColors();

    useEffect(() => {
        fetchVisitors();
    }, [user?.uid]);

    const fetchVisitors = async () => {
        if (!user?.uid) return;
        try {
            setLoading(true);
            const data = await profileVisitService.getVisitors(user.uid);
            setVisitors(data);
        } catch (error) {
            console.error('Error fetching visitors:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderVisitor = ({ item, index }: { item: ProfileVisit; index: number }) => {
        const visitor = item.visitorData;
        const isBlurred = !isPremium;

        return (
            <Animated.View entering={FadeInDown.delay(index * 100)}>
                <TouchableOpacity
                    style={[styles.visitorCard, { backgroundColor: colors.surface }]}
                    onPress={() => {
                        if (isPremium) {
                            router.push({
                                pathname: '/(screens)/user/UserProfileScreen',
                                params: { userId: item.visitorId }
                            });
                        } else {
                            router.push('/(screens)/store/StoreScreen');
                        }
                    }}
                    activeOpacity={0.7}
                >
                    <View style={styles.avatarContainer}>
                        {visitor?.profileUrl ? (
                            <Image source={{ uri: visitor.profileUrl }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
                                <Feather name="user" size={24} color={colors.subtleText} />
                            </View>
                        )}
                        {isBlurred && (
                            <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
                        )}
                    </View>

                    <View style={styles.visitorInfo}>
                        {isBlurred ? (
                            <View style={styles.blurredNameContainer}>
                                <View style={[styles.blurredNameLine, { backgroundColor: colors.border, width: '60%' }]} />
                            </View>
                        ) : (
                            <Text style={[styles.visitorName, { color: colors.text }]}>
                                {visitor?.username || visitor?.displayName || t('chat.unknown_user')}
                            </Text>
                        )}
                        <View style={styles.visitDetails}>
                            <Text style={[styles.visitTime, { color: colors.subtleText }]}>
                                {format(item.timestamp?.toDate ? item.timestamp.toDate() : item.timestamp, 'HH:mm dd/MM/yyyy')}
                            </Text>
                            {item.distance !== undefined && (
                                <>
                                    <View style={[styles.dot, { backgroundColor: colors.subtleText }]} />
                                    <Text style={[styles.distanceText, { color: colors.subtleText }]}>
                                        {proximityService.formatDistance(item.distance)}
                                    </Text>
                                </>
                            )}
                        </View>
                    </View>

                    {isBlurred && (
                        <View style={styles.lockIconContainer}>
                            <Feather name="lock" size={16} color={colors.primary} />
                        </View>
                    )}
                </TouchableOpacity>
            </Animated.View>
        );
    };

    if (loading || premiumLoading) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('profile.visitors')}</Text>
                <View style={{ width: 40 }} />
            </View>

            {!isPremium && (
                <LinearGradient
                    colors={[colors.primary, '#8B5CF6']}
                    style={styles.premiumBanner}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                >
                    <View style={styles.bannerContent}>
                        <Feather name="star" size={24} color="#fff" />
                        <View style={styles.bannerTextContainer}>
                            <Text style={styles.bannerTitle}>{t('profile.unlock_visitors')}</Text>
                            <Text style={styles.bannerSubTitle}>{t('profile.unlock_visitors_desc')}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.buyButton}
                            onPress={() => router.push('/(screens)/store/StoreScreen')}
                        >
                            <Text style={styles.buyButtonText}>{t('store.buy')}</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
            )}

            <FlatList
                data={visitors}
                renderItem={renderVisitor}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Feather name="users" size={64} color={colors.border} />
                        <Text style={[styles.emptyText, { color: colors.subtleText }]}>
                            {t('profile.no_visitors')}
                        </Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    premiumBanner: {
        margin: 20,
        borderRadius: 16,
        padding: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    bannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    bannerTextContainer: {
        flex: 1,
    },
    bannerTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    bannerSubTitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        marginTop: 2,
    },
    buyButton: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    buyButtonText: {
        color: '#8B5CF6',
        fontWeight: '700',
        fontSize: 13,
    },
    listContent: {
        padding: 20,
        paddingTop: 0,
    },
    visitorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    avatarContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
        position: 'relative',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    visitorInfo: {
        flex: 1,
        marginLeft: 16,
    },
    visitorName: {
        fontSize: 16,
        fontWeight: '600',
    },
    visitTime: {
        fontSize: 12,
    },
    visitDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        marginHorizontal: 6,
    },
    distanceText: {
        fontSize: 12,
    },
    blurredNameContainer: {
        marginBottom: 8,
    },
    blurredNameLine: {
        height: 12,
        borderRadius: 6,
        opacity: 0.3,
    },
    lockIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '500',
    },
});

export default ProfileVisitorsScreen;
