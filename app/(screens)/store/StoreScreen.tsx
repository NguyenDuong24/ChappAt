import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    FlatList,
    StatusBar,
    Platform,
    ScrollView,
} from 'react-native';
import { useAuth } from '@/context/authContext';
import { coinServerApi, getErrorMessage } from '@/src/services/coinServerApi';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import AvatarFrame from '@/components/common/AvatarFrame';
import { useUserContext } from '@/context/UserContext';
import Animated, {
    FadeInDown,
    FadeInRight,
    Layout,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const ITEM_WIDTH = (width - 48) / COLUMN_COUNT;

const ITEM_ICONS: { [key: string]: any } = {
    vip_1m: require('@/assets/images/store/vip_badge.png'),
    vip_3m: require('@/assets/images/store/vip_badge.png'),
    vip_badge: require('@/assets/images/store/vip_badge.png'),
    boost_24h: require('@/assets/images/store/profile_boost.png'),
    profile_boost: require('@/assets/images/store/profile_boost.png'),
    super_like_10: require('@/assets/images/store/super_like.png'),
    super_like_pack: require('@/assets/images/store/super_like.png'),
    incognito_mode: require('@/assets/images/store/incognito.png'),
};

const StoreScreen = () => {
    const { t, i18n } = useTranslation();
    const { user, coins, banhMi, refreshBalance, activeFrame, setActiveFrame } = useAuth();
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [items, setItems] = useState<any[]>([]);
    const [myItems, setMyItems] = useState<any[]>([]);
    const params = useLocalSearchParams();
    const [activeTab, setActiveTab] = useState<'shop' | 'my-items'>((params.initialTab as 'shop' | 'my-items') || 'shop');
    const [selectedCategory, setSelectedCategory] = useState<string>((params.initialCategory as string) || 'all');

    const router = useRouter();
    const themeContext = useContext(ThemeContext);
    const theme = themeContext?.theme || 'light';
    const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
    const { invalidateUserCache } = useUserContext();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [shopData, myItemsData] = await Promise.all([
                coinServerApi.getShopItems(),
                coinServerApi.getMyItems()
            ]);

            setItems(shopData.items || []);
            setMyItems(myItemsData.items || []);
        } catch (error) {
            console.error('Error fetching store data:', error);
            Alert.alert(t('common.error'), t('store.error_fetch'));
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (item: any) => {
        const currencyType = item.currencyType || 'coins';
        const userBalance = currencyType === 'coins' ? coins : banhMi;
        const currencyLabel = currencyType === 'coins' ? t('wallet.coins') : t('wallet.banhMi');

        if (userBalance < item.price) {
            Alert.alert(
                currencyType === 'coins' ? t('store.insufficient_coins') : t('chat.gift_insufficient'),
                currencyType === 'coins' ? t('store.insufficient_coins_desc') : t('chat.gift_insufficient_desc'),
                [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('wallet.topup'), onPress: () => router.push('/(screens)/wallet/CoinWalletScreen') }
                ]
            );
            return;
        }

        Alert.alert(
            t('store.confirm_purchase'),
            t('store.confirm_purchase_desc', { name: item.name, price: item.price }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('store.buy'),
                    onPress: async () => {
                        try {
                            setPurchasing(item.id);
                            const result = await coinServerApi.purchaseItem(item.id);
                            Alert.alert(t('common.success'), t('store.purchase_success'));
                            refreshBalance();
                            fetchData(); // Refresh items and my items
                        } catch (error: any) {
                            Alert.alert(t('common.error'), getErrorMessage(error));
                        } finally {
                            setPurchasing(null);
                        }
                    }
                }
            ]
        );
    };

    const handleUseItem = async (item: any) => {
        if (item.item?.category === 'avatar_frame' || item.category === 'avatar_frame') {
            const frameType = item.item?.frameType || item.frameType;
            if (!frameType) return;

            if (activeFrame === frameType) {
                // Already equipped, maybe offer to unequip?
                Alert.alert(
                    t('common.info'),
                    t('store.frame_already_equipped'),
                    [
                        { text: t('common.ok') },
                        {
                            text: t('store.unequip'),
                            onPress: async () => {
                                try {
                                    await coinServerApi.equipFrame('', null);
                                    setActiveFrame(null);
                                    if (user?.uid) invalidateUserCache(user.uid);
                                    Alert.alert(t('common.success'), t('store.unequip_success'));
                                } catch (error: any) {
                                    Alert.alert(t('common.error'), getErrorMessage(error));
                                }
                            }
                        }
                    ]
                );
                return;
            }

            try {
                await coinServerApi.equipFrame(frameType, item.id);
                setActiveFrame(frameType);
                if (user?.uid) invalidateUserCache(user.uid);
                Alert.alert(t('common.success'), t('store.equip_success'));
            } catch (error: any) {
                Alert.alert(t('common.error'), getErrorMessage(error));
            }
            return;
        }

        // For other items
        Alert.alert(t('common.success'), t('store.item_active_desc', { name: item.item?.name || item.name }));
    };

    const renderShopItem = ({ item, index }: { item: any, index: number }) => {
        const isOwned = myItems.some(myI => myI.itemId === item.id);
        const currencyType = item.currencyType || 'coins';

        return (
            <Animated.View
                entering={FadeInDown.delay(index * 100).springify()}
                style={[styles.itemCardContainer]}
            >
                <TouchableOpacity
                    style={[styles.itemCard, { backgroundColor: currentThemeColors.cardBackground }]}
                    onPress={() => !isOwned && handlePurchase(item)}
                    disabled={isOwned || purchasing === item.id}
                    activeOpacity={0.8}
                >
                    <View style={styles.itemImageContainer}>
                        {item.category === 'avatar_frame' ? (
                            <View style={styles.framePreviewContainer}>
                                <AvatarFrame
                                    avatarUrl={user?.profileUrl || user?.icon}
                                    frameType={item.frameType}
                                    size={ITEM_WIDTH * 0.6}
                                />
                            </View>
                        ) : ITEM_ICONS[item.id] ? (
                            <Image source={ITEM_ICONS[item.id]} style={styles.itemImage} />
                        ) : item.imageUrl ? (
                            <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                        ) : (
                            <LinearGradient
                                colors={theme === 'dark' ? ['#333', '#111'] : ['#F8F9FA', '#E9ECEF']}
                                style={styles.itemPlaceholder}
                            >
                                <View style={styles.emojiContainer}>
                                    <Text style={styles.itemEmoji}>{item.emoji || '🎁'}</Text>
                                </View>
                            </LinearGradient>
                        )}
                        {isOwned && (
                            <BlurView intensity={80} style={styles.ownedBadge}>
                                <Feather name="check" size={12} color="#4CAF50" />
                                <Text style={[styles.ownedText, { color: '#4CAF50' }]}>{t('store.owned')}</Text>
                            </BlurView>
                        )}
                    </View>

                    <View style={styles.itemInfo}>
                        <Text style={[styles.itemName, { color: currentThemeColors.text }]} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <Text style={[styles.itemDesc, { color: currentThemeColors.subtleText }]} numberOfLines={2}>
                            {item.description || t('store.special_item')}
                        </Text>

                        <View style={styles.priceRow}>
                            <View style={styles.priceTag}>
                                {currencyType === 'coins' ? (
                                    <Text style={styles.coinIcon}>🪙</Text>
                                ) : (
                                    <MaterialCommunityIcons name="baguette" size={16} color="#FFD700" />
                                )}
                                <Text style={styles.priceText}>{item.price}</Text>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.buyButton,
                                    isOwned && styles.buyButtonDisabled,
                                    { backgroundColor: isOwned ? 'rgba(76, 175, 80, 0.1)' : '#8A2BE2' }
                                ]}
                                onPress={() => !isOwned && handlePurchase(item)}
                                disabled={isOwned || purchasing === item.id}
                            >
                                {purchasing === item.id ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={[styles.buyButtonText, { color: isOwned ? '#4CAF50' : '#fff' }]}>
                                        {isOwned ? t('store.owned') : t('store.buy')}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderMyItem = ({ item, index }: { item: any, index: number }) => {
        const isFrame = item.item?.category === 'avatar_frame' || item.category === 'avatar_frame';
        const frameType = item.item?.frameType || item.frameType;
        const isEquipped = isFrame && activeFrame === frameType;

        return (
            <Animated.View
                entering={FadeInDown.delay(index * 100).springify()}
                style={styles.itemCardContainer}
            >
                <View style={[styles.itemCard, { backgroundColor: currentThemeColors.cardBackground }]}>
                    <View style={styles.itemImageContainer}>
                        {isFrame ? (
                            <View style={styles.framePreviewContainer}>
                                <AvatarFrame
                                    avatarUrl={user?.profileUrl || user?.icon}
                                    frameType={frameType}
                                    size={ITEM_WIDTH * 0.6}
                                />
                            </View>
                        ) : ITEM_ICONS[item.itemId] ? (
                            <Image source={ITEM_ICONS[item.itemId]} style={styles.itemImage} />
                        ) : item.item?.imageUrl ? (
                            <Image source={{ uri: item.item.imageUrl }} style={styles.itemImage} />
                        ) : (
                            <LinearGradient
                                colors={theme === 'dark' ? ['#2A2A2A', '#1A1A1A'] : ['#F5F5F5', '#E0E0E0']}
                                style={styles.itemPlaceholder}
                            >
                                <Text style={styles.itemEmoji}>{item.item?.emoji || '🎁'}</Text>
                            </LinearGradient>
                        )}
                        {isEquipped && (
                            <BlurView intensity={80} style={styles.ownedBadge}>
                                <Feather name="star" size={12} color="#8A2BE2" />
                                <Text style={[styles.ownedText, { color: '#8A2BE2' }]}>{t('store.active')}</Text>
                            </BlurView>
                        )}
                    </View>
                    <View style={styles.itemInfo}>
                        <Text style={[styles.itemName, { color: currentThemeColors.text }]} numberOfLines={1}>
                            {item.item?.name || item.itemName || t('store.item')}
                        </Text>
                        <Text style={[styles.itemDesc, { color: currentThemeColors.subtleText }]}>
                            {t('store.purchased_on')}: {new Date(item.purchasedAt).toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')}
                        </Text>

                        {item.expiresAt && (
                            <Text style={[styles.expiryText, { color: '#FF6347' }]}>
                                {t('store.expires_at')}: {new Date(item.expiresAt).toLocaleDateString()}
                            </Text>
                        )}

                        <TouchableOpacity
                            style={[
                                styles.useButton,
                                isEquipped && { backgroundColor: 'rgba(138, 43, 226, 0.1)', borderWidth: 1, borderColor: '#8A2BE2' }
                            ]}
                            onPress={() => handleUseItem(item)}
                        >
                            <Text style={[styles.useButtonText, isEquipped && { color: '#8A2BE2' }]}>
                                {isEquipped ? t('store.active') : (isFrame ? t('store.equip') : t('store.use'))}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
        );
    };

    const filteredItems = (activeTab === 'shop' ? items : myItems).filter(item => {
        const category = activeTab === 'shop' ? item.category : (item.item?.category || item.category);

        if (selectedCategory === 'all') return true;
        if (selectedCategory === 'frames') return category === 'avatar_frame';
        if (selectedCategory === 'vip') return category === 'vip';
        if (selectedCategory === 'boosts') return category === 'boost';
        return true;
    });

    const categories = [
        { id: 'all', label: t('common.all') },
        { id: 'frames', label: t('store.avatar_frames') },
        { id: 'vip', label: 'VIP' },
        { id: 'boosts', label: t('store.boosts') },
    ];

    return (
        <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
            <StatusBar barStyle="light-content" />
            {/* Header */}
            <LinearGradient
                colors={['#8A2BE2', '#4B0082']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Feather name="arrow-left" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('store.title')}</Text>
                    <TouchableOpacity
                        style={styles.historyButton}
                        onPress={() => router.push('/(screens)/wallet/CoinWalletScreen')}
                    >
                        <Feather name="clock" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.balanceContainer}>
                    <BlurView intensity={30} tint="light" style={styles.balanceBlur}>
                        <Text style={styles.balanceLabel}>{t('wallet.balance')}</Text>
                        <View style={styles.balancesWrapper}>
                            <View style={styles.balanceItem}>
                                <Text style={styles.balanceCoinIcon}>🪙</Text>
                                <Text style={styles.balanceValue}>{Number(coins || 0).toLocaleString()}</Text>
                            </View>

                            <View style={styles.balanceDivider} />

                            <View style={styles.balanceItem}>
                                <MaterialCommunityIcons name="baguette" size={24} color="#FFD700" style={{ marginRight: 4 }} />
                                <Text style={styles.balanceValue}>{Number(banhMi || 0).toLocaleString()}</Text>
                            </View>

                            <TouchableOpacity
                                style={styles.addCoinsButton}
                                onPress={() => router.push('/(screens)/wallet/CoinWalletScreen')}
                            >
                                <LinearGradient
                                    colors={['#FFD700', '#FFA500']}
                                    style={styles.plusIconGradient}
                                >
                                    <Feather name="plus" size={16} color="#fff" />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </BlurView>
                </Animated.View>
            </LinearGradient>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'shop' && styles.activeTab]}
                    onPress={() => setActiveTab('shop')}
                >
                    <Text style={[styles.tabText, activeTab === 'shop' && styles.activeTabText, { color: activeTab === 'shop' ? '#8A2BE2' : currentThemeColors.text }]}>
                        {t('store.shop')}
                    </Text>
                    {activeTab === 'shop' && <Animated.View layout={Layout} style={styles.tabIndicator} />}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'my-items' && styles.activeTab]}
                    onPress={() => setActiveTab('my-items')}
                >
                    <Text style={[styles.tabText, activeTab === 'my-items' && styles.activeTabText, { color: activeTab === 'my-items' ? '#8A2BE2' : currentThemeColors.text }]}>
                        {t('store.my_items')} ({myItems.length})
                    </Text>
                    {activeTab === 'my-items' && <Animated.View layout={Layout} style={styles.tabIndicator} />}
                </TouchableOpacity>
            </View>

            {/* Category Filter */}
            <View style={styles.categoryContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                    {categories.map(cat => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.categoryTab,
                                selectedCategory === cat.id && styles.activeCategoryTab,
                                { backgroundColor: selectedCategory === cat.id ? '#8A2BE2' : 'transparent' }
                            ]}
                            onPress={() => setSelectedCategory(cat.id)}
                        >
                            <Text style={[
                                styles.categoryTabText,
                                { color: selectedCategory === cat.id ? '#fff' : currentThemeColors.subtleText }
                            ]}>
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.loadingCenter}>
                    <ActivityIndicator size="large" color="#8A2BE2" />
                    <Text style={[styles.loadingText, { color: currentThemeColors.subtleText }]}>{t('common.loading')}</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredItems}
                    renderItem={activeTab === 'shop' ? renderShopItem : renderMyItem}
                    keyExtractor={(item) => item.id}
                    numColumns={COLUMN_COUNT}
                    contentContainerStyle={styles.listContent}
                    columnWrapperStyle={styles.columnWrapper}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <Animated.View entering={FadeInDown} style={styles.emptyContainer}>
                            <Text style={styles.emptyEmoji}>{activeTab === 'shop' ? '🏪' : '📦'}</Text>
                            <Text style={[styles.emptyText, { color: currentThemeColors.subtleText }]}>
                                {activeTab === 'shop' ? t('store.empty_shop') : t('store.empty_my_items')}
                            </Text>
                            {activeTab === 'shop' && (
                                <TouchableOpacity style={styles.refreshButton} onPress={fetchData}>
                                    <Text style={styles.refreshButtonText}>{t('common.retry')}</Text>
                                </TouchableOpacity>
                            )}
                        </Animated.View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        elevation: 10,
        shadowColor: '#4B0082',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 25,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.5,
    },
    balanceContainer: {
        borderRadius: 24,
        overflow: 'hidden',
    },
    balanceBlur: {
        padding: 20,
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    balanceLabel: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 6,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    balancesWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 15,
    },
    balanceItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    balanceDivider: {
        width: 1,
        height: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    balanceCoinIcon: {
        fontSize: 24,
        marginRight: 4,
    },
    balanceValue: {
        fontSize: 24,
        fontWeight: '900',
        color: '#fff',
    },
    addCoinsButton: {
        marginLeft: 12,
    },
    plusIconGradient: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginTop: 25,
        marginBottom: 15,
        gap: 15,
    },
    tab: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 25,
        position: 'relative',
    },
    activeTab: {
        backgroundColor: 'rgba(138, 43, 226, 0.08)',
    },
    tabText: {
        fontSize: 15,
        fontWeight: '700',
        opacity: 0.5,
    },
    activeTabText: {
        opacity: 1,
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        left: '50%',
        marginLeft: -10,
        width: 20,
        height: 3,
        backgroundColor: '#8A2BE2',
        borderRadius: 2,
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    itemCardContainer: {
        width: ITEM_WIDTH,
    },
    itemCard: {
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    itemImageContainer: {
        width: '100%',
        height: ITEM_WIDTH,
        position: 'relative',
    },
    itemImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    itemPlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emojiContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    framePreviewContainer: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    itemEmoji: {
        fontSize: 64,
    },
    ownedBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 15,
        gap: 4,
        overflow: 'hidden',
    },
    ownedText: {
        fontSize: 11,
        fontWeight: '800',
    },
    itemInfo: {
        padding: 15,
    },
    itemName: {
        fontSize: 17,
        fontWeight: '800',
        marginBottom: 6,
    },
    itemDesc: {
        fontSize: 12,
        marginBottom: 15,
        lineHeight: 18,
        height: 36,
    },
    categoryContainer: {
        marginBottom: 15,
    },
    categoryScroll: {
        paddingHorizontal: 20,
        gap: 10,
    },
    categoryTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(138, 43, 226, 0.2)',
    },
    activeCategoryTab: {
        borderColor: '#8A2BE2',
    },
    categoryTabText: {
        fontSize: 13,
        fontWeight: '700',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 'auto',
    },
    priceTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    coinIcon: {
        fontSize: 16,
    },
    priceText: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFD700',
    },
    buyButton: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 14,
        minWidth: 70,
        alignItems: 'center',
    },
    buyButtonDisabled: {
        borderWidth: 1,
        borderColor: 'rgba(76, 175, 80, 0.3)',
    },
    buyButtonText: {
        fontSize: 13,
        fontWeight: '800',
    },
    useButton: {
        marginTop: 10,
        backgroundColor: '#8A2BE2',
        paddingVertical: 8,
        borderRadius: 12,
        alignItems: 'center',
    },
    useButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    expiryText: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
    },
    loadingCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 15,
        fontSize: 15,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 80,
        paddingHorizontal: 40,
    },
    emptyEmoji: {
        fontSize: 80,
        marginBottom: 20,
    },
    emptyText: {
        fontSize: 17,
        textAlign: 'center',
        fontWeight: '600',
        lineHeight: 24,
    },
    refreshButton: {
        marginTop: 25,
        paddingHorizontal: 30,
        paddingVertical: 12,
        backgroundColor: '#8A2BE2',
        borderRadius: 25,
    },
    refreshButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },
});

export default StoreScreen;

