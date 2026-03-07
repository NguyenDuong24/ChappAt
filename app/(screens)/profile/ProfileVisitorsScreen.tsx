import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    Platform,
} from 'react-native';
import { Image } from 'expo-image';
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
            const data = await profileVisitService.getVisitors(user.uid, 100);

            // Group visitors by visitorId to avoid duplicates
            const groupedVisitors: { [key: string]: ProfileVisit & { visitCount: number } } = {};

            data.forEach(visit => {
                if (!groupedVisitors[visit.visitorId]) {
                    groupedVisitors[visit.visitorId] = { ...visit, visitCount: 1 };
                } else {
                    groupedVisitors[visit.visitorId].visitCount += 1;
                    // Ensure we keep the latest timestamp (they are already sorted by desc timestamp from service)
                }
            });

            setVisitors(Object.values(groupedVisitors));
        } catch (error) {
            console.error('Error fetching visitors:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderVisitor = ({ item, index }: { item: ProfileVisit & { visitCount?: number }; index: number }) => {
        const visitor = item.visitorData;
        const isBlurred = !isPremium;

        return (
            <Animated.View entering={FadeInDown.delay(index * 80).duration(600)}>
                <TouchableOpacity
                    style={[
                        styles.visitorCard,
                        {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            borderWidth: 1,
                        }
                    ]}
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
                    <View style={styles.avatarWrapper}>
                        <View style={styles.avatarContainer}>
                            {visitor?.profileUrl ? (
                                <Image
                                    source={{ uri: visitor.profileUrl }}
                                    style={styles.avatar}
                                    contentFit="cover"
                                    transition={200}
                                />
                            ) : (
                                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border + '40' }]}>
                                    <Feather name="user" size={24} color={colors.subtleText} />
                                </View>
                            )}
                            {isBlurred && (
                                <BlurView intensity={25} style={StyleSheet.absoluteFill} tint={colors.theme === 'dark' ? 'dark' : 'light'} />
                            )}
                        </View>
                        {isBlurred && (
                            <View style={styles.lockBadge}>
                                <Feather name="lock" size={10} color="#fff" />
                            </View>
                        )}
                    </View>

                    <View style={styles.visitorInfo}>
                        <View style={styles.nameRow}>
                            {isBlurred ? (
                                <View style={styles.blurredNameContainer}>
                                    <View style={[styles.blurredNameLine, { backgroundColor: colors.border, width: 100 }]} />
                                </View>
                            ) : (
                                <Text style={[styles.visitorName, { color: colors.text }]} numberOfLines={1}>
                                    {visitor?.username || visitor?.displayName || t('chat.unknown_user')}
                                </Text>
                            )}

                            {!isBlurred && item.visitCount && item.visitCount > 1 && (
                                <View style={[styles.visitCountBadge, { backgroundColor: colors.primary + '15' }]}>
                                    <Text style={[styles.visitCountText, { color: colors.primary }]}>
                                        {t('profile.visit_count', { count: item.visitCount })}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.visitDetails}>
                            <Feather name="clock" size={12} color={colors.subtleText} style={{ marginRight: 4 }} />
                            <Text style={[styles.visitTime, { color: colors.subtleText }]}>
                                {format(item.timestamp?.toDate ? item.timestamp.toDate() : item.timestamp, 'HH:mm • dd/MM')}
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

                    <View style={styles.actionIcon}>
                        <Feather name="chevron-right" size={18} color={colors.border} />
                    </View>
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
                <TouchableOpacity
                    onPress={() => router.push('/(screens)/store/StoreScreen')}
                    activeOpacity={0.9}
                >
                    <LinearGradient
                        colors={[colors.primary, '#9333EA', '#7C3AED']}
                        style={styles.premiumBanner}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.bannerContent}>
                            <View style={[styles.bannerIconCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                <Feather name="award" size={24} color="#fff" />
                            </View>
                            <View style={styles.bannerTextContainer}>
                                <Text style={styles.bannerTitle}>{t('profile.unlock_visitors')}</Text>
                                <Text style={styles.bannerSubTitle}>{t('profile.unlock_visitors_desc')}</Text>
                            </View>
                            <Feather name="chevron-right" size={20} color="#fff" />
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
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
        paddingTop: Platform.OS === 'ios' ? 75 : 40,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    premiumBanner: {
        marginHorizontal: 20,
        marginTop: 10,
        marginBottom: 20,
        borderRadius: 24,
        padding: 20,
        elevation: 8,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    bannerIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    bannerTextContainer: {
        flex: 1,
    },
    bannerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
    },
    bannerSubTitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        marginTop: 2,
        lineHeight: 18,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    visitorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 24,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        overflow: 'hidden',
        backgroundColor: '#f1f1f1',
    },
    lockBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#8B5CF6',
        borderWidth: 2,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
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
        marginLeft: 18,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    visitorName: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    visitCountBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    visitCountText: {
        fontSize: 11,
        fontWeight: '800',
    },
    visitTime: {
        fontSize: 13,
        fontWeight: '500',
    },
    visitDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        marginHorizontal: 8,
    },
    distanceText: {
        fontSize: 13,
        fontWeight: '500',
    },
    blurredNameContainer: {
        marginBottom: 4,
    },
    blurredNameLine: {
        height: 12,
        borderRadius: 6,
        opacity: 0.15,
    },
    actionIcon: {
        marginLeft: 10,
        opacity: 0.3,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        paddingHorizontal: 40,
    },
    emptyText: {
        marginTop: 20,
        fontSize: 17,
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default ProfileVisitorsScreen;
