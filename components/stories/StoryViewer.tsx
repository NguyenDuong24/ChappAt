import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    SafeAreaView,
    ActivityIndicator,
    StatusBar,
    Platform,
    Dimensions
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemedColors } from '@/hooks/useThemedColors';
import encounterService, { Encounter } from '@/services/encounterService';
import { formatDistanceToNow } from 'date-fns';
import { vi as viLocale, enUS as enLocale } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

const CrossingPathsScreen = () => {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const { user } = useAuth();
    const colors = useThemedColors();

    const [encounters, setEncounters] = useState<Encounter[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadEncounters = useCallback(async () => {
        if (!user?.uid) return;
        try {
            setLoading(true);
            const data = await encounterService.getEncounters(user.uid);
            setEncounters(data);
        } catch (error) {
            console.error('Error loading encounters:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.uid]);

    useEffect(() => {
        loadEncounters();
    }, [loadEncounters]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadEncounters();
        setRefreshing(false);
    };

    const formatEncounterTime = (timestamp: any) => {
        if (!timestamp) return '';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            const currentLocale = i18n.language === 'vi' ? viLocale : enLocale;
            return formatDistanceToNow(date, { addSuffix: true, locale: currentLocale });
        } catch (e) {
            return '';
        }
    };

    const renderEncounterItem = ({ item }: { item: Encounter }) => (
        <TouchableOpacity
            style={[styles.itemContainer, { backgroundColor: colors.surface }]}
            onPress={() => router.push({
                pathname: '/(screens)/user/UserProfileScreen',
                params: { userId: item.otherUserId }
            })}
        >
            <View style={styles.avatarContainer}>
                <Image
                    source={{ uri: item.userData?.photoURL || 'https://ui-avatars.com/api/?name=' + item.userData?.name }}
                    style={styles.avatar}
                />
                <LinearGradient
                    colors={['#00ffff', '#0099ff']}
                    style={styles.activePulse}
                />
            </View>

            <View style={styles.infoContainer}>
                <View style={styles.infoHeader}>
                    <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                        {item.userData?.name || t('chat.unknown_user')}
                    </Text>
                    <Text style={[styles.timeText, { color: colors.subtleText }]}>
                        {formatEncounterTime(item.timestamp)}
                    </Text>
                </View>

                <View style={styles.locationContainer}>
                    <MaterialIcons name="person-pin-circle" size={14} color="#00ffff" />
                    <Text style={[styles.locationText, { color: colors.subtleText }]} numberOfLines={1}>
                        {t('crossing_paths.crossed_distance', { distance: Math.round(item.distance) })}
                    </Text>
                </View>

                {item.userData?.bio && (
                    <Text style={[styles.bioText, { color: colors.subtleText }]} numberOfLines={1}>
                        {item.userData.bio}
                    </Text>
                )}
            </View>

            <TouchableOpacity
                style={[styles.chatButton, { backgroundColor: colors.primary + '20' }]}
                onPress={() => router.push(`/chat/${item.otherUserId}`)}
            >
                <Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <LinearGradient
                colors={['#1a1a2e', '#16213e']}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color="white" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>{t('crossing_paths.title')}</Text>
                        <Text style={styles.headerSubtitle}>{t('crossing_paths.subtitle')}</Text>
                    </View>
                </View>
            </LinearGradient>

            {loading && !refreshing ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : encounters.length === 0 ? (
                <View style={styles.centerContainer}>
                    <MaterialIcons name="directions-walk" size={80} color={colors.border} />
                    <Text style={[styles.emptyText, { color: colors.subtleText }]}>
                        {t('crossing_paths.empty_title')}
                    </Text>
                    <Text style={[styles.emptySubText, { color: colors.subtleText }]}>
                        {t('crossing_paths.empty_desc')}
                    </Text>
                    <TouchableOpacity
                        style={[styles.radarButton, { backgroundColor: colors.primary }]}
                        onPress={() => router.push('/ProximityRadar')}
                    >
                        <Text style={styles.radarButtonText}>{t('crossing_paths.open_radar')}</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={encounters}
                    renderItem={renderEncounterItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    backButton: {
        marginRight: 15,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
    },
    listContent: {
        padding: 16,
    },
    itemContainer: {
        flexDirection: 'row',
        padding: 12,
        borderRadius: 16,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#00ffff',
    },
    activePulse: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: 'white',
    },
    infoContainer: {
        flex: 1,
        marginLeft: 15,
    },
    infoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
    },
    timeText: {
        fontSize: 12,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    locationText: {
        fontSize: 13,
        marginLeft: 4,
    },
    bioText: {
        fontSize: 12,
        fontStyle: 'italic',
    },
    chatButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    separator: {
        height: 12,
        backgroundColor: 'transparent',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 20,
    },
    emptySubText: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
    },
    radarButton: {
        marginTop: 30,
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 25,
    },
    radarButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    }
});

export default CrossingPathsScreen;

