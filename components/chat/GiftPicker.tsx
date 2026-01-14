import React, { useState, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Animated,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { GiftItem } from '@/services/giftService';

const { width, height } = Dimensions.get('window');

interface GiftPickerProps {
    visible: boolean;
    onClose: () => void;
    onSend: (giftId: string) => void;
    gifts: GiftItem[];
    coins: number;
    banhMi: number;
    themeColors: any;
    loading?: boolean;
}

const CATEGORIES = [
    { id: 'all', name: 'Tất cả', icon: 'apps' },
    { id: 'popular', name: 'Phổ biến', icon: 'trending-up' },
    { id: 'love', name: 'Tình yêu', icon: 'favorite' },
    { id: 'funny', name: 'Hài hước', icon: 'mood' },
    { id: 'luxury', name: 'Sang trọng', icon: 'diamond' },
    { id: 'special', name: 'Đặc biệt', icon: 'stars' },
];

export default function GiftPicker({
    visible,
    onClose,
    onSend,
    gifts,
    coins,
    banhMi,
    themeColors,
    loading = false,
}: GiftPickerProps) {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);
    const [fadeAnim] = useState(new Animated.Value(0));
    const [slideAnim] = useState(new Animated.Value(height));

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: 50,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: height,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const filteredGifts = useMemo(() => {
        if (selectedCategory === 'all') return gifts;
        return gifts.filter((gift) => {
            const name = gift.name.toLowerCase();
            if (selectedCategory === 'special') return gift.currencyType === 'coins';
            if (selectedCategory === 'love') return name.includes('tim') || name.includes('hoa') || name.includes('love') || gift.icon === '❤️' || gift.icon === '🌹';
            if (selectedCategory === 'funny') return name.includes('hài') || name.includes('vui') || gift.icon === '😂' || gift.icon === '💩';
            if (selectedCategory === 'luxury') return gift.price >= 500 || name.includes('kim cương') || gift.icon === '💎' || gift.icon === '🏰';
            if (selectedCategory === 'popular') return gift.price < 100;
            return true;
        });
    }, [gifts, selectedCategory]);

    if (!visible && fadeAnim._value === 0) return null;

    const handleSelectGift = (id: string) => {
        setSelectedGiftId(id === selectedGiftId ? null : id);
    };

    const selectedGift = gifts.find(g => g.id === selectedGiftId);
    const canAfford = selectedGift ? (
        selectedGift.currencyType === 'coins' ? coins >= selectedGift.price : banhMi >= selectedGift.price
    ) : true;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
            <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>

            <Animated.View
                style={[
                    styles.container,
                    {
                        backgroundColor: themeColors.surface,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                <BlurView intensity={80} tint={themeColors.text === '#FFFFFF' ? 'dark' : 'light'} style={styles.blurContainer}>
                    <View style={styles.header}>
                        <View style={styles.headerIndicator} />
                        <View style={styles.headerContent}>
                            <Text style={[styles.title, { color: themeColors.text }]}>Tặng quà</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <MaterialIcons name="close" size={24} color={themeColors.subtleText} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.categoryContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    onPress={() => setSelectedCategory(cat.id)}
                                    style={[
                                        styles.categoryItem,
                                        selectedCategory === cat.id && { backgroundColor: themeColors.tint + '20' },
                                    ]}
                                >
                                    <MaterialIcons
                                        name={cat.icon as any}
                                        size={18}
                                        color={selectedCategory === cat.id ? themeColors.tint : themeColors.subtleText}
                                    />
                                    <Text
                                        style={[
                                            styles.categoryName,
                                            { color: selectedCategory === cat.id ? themeColors.tint : themeColors.subtleText },
                                            selectedCategory === cat.id && styles.categoryNameActive,
                                        ]}
                                    >
                                        {cat.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={themeColors.tint} />
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={styles.giftGrid}>
                            {filteredGifts.length > 0 ? (
                                filteredGifts.map((gift) => (
                                    <TouchableOpacity
                                        key={gift.id}
                                        onPress={() => handleSelectGift(gift.id)}
                                        style={[
                                            styles.giftCard,
                                            selectedGiftId === gift.id && { borderColor: themeColors.tint, borderWidth: 2 },
                                        ]}
                                    >
                                        <View style={styles.giftIconContainer}>
                                            <Text style={styles.giftEmoji}>{gift.icon || '🎁'}</Text>
                                        </View>
                                        <Text style={[styles.giftName, { color: themeColors.text }]} numberOfLines={1}>
                                            {gift.name}
                                        </Text>
                                        <View style={styles.priceRow}>
                                            {gift.currencyType === 'coins' ? (
                                                <MaterialCommunityIcons name="database" size={12} color="#FFD700" />
                                            ) : (
                                                <MaterialCommunityIcons name="bread-slice" size={12} color="#F59E0B" />
                                            )}
                                            <Text style={[styles.giftPrice, { color: gift.currencyType === 'coins' ? '#FFD700' : themeColors.tint }]}>
                                                {gift.price}
                                            </Text>
                                        </View>
                                        {selectedGiftId === gift.id && (
                                            <View style={[styles.selectedBadge, { backgroundColor: themeColors.tint }]}>
                                                <MaterialIcons name="check" size={12} color="white" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <View style={styles.emptyContainer}>
                                    <MaterialIcons name="sentiment-dissatisfied" size={48} color={themeColors.subtleText} />
                                    <Text style={[styles.emptyText, { color: themeColors.subtleText }]}>Không tìm thấy quà nào</Text>
                                </View>
                            )}
                        </ScrollView>
                    )}

                    <View style={[styles.footer, { borderTopColor: themeColors.border }]}>
                        <View style={styles.balanceContainer}>
                            <View style={styles.balanceItem}>
                                <Text style={[styles.balanceLabel, { color: themeColors.subtleText }]}>Bánh mì:</Text>
                                <View style={styles.balanceValue}>
                                    <MaterialCommunityIcons name="bread-slice" size={16} color="#F59E0B" />
                                    <Text style={[styles.balanceText, { color: themeColors.text }]}>{banhMi}</Text>
                                </View>
                            </View>
                            <View style={styles.balanceItem}>
                                <Text style={[styles.balanceLabel, { color: themeColors.subtleText }]}>Coin:</Text>
                                <View style={styles.balanceValue}>
                                    <MaterialCommunityIcons name="database" size={16} color="#FFD700" />
                                    <Text style={[styles.balanceText, { color: themeColors.text }]}>{coins}</Text>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity
                            disabled={!selectedGiftId || !canAfford}
                            onPress={() => selectedGiftId && onSend(selectedGiftId)}
                            style={[
                                styles.sendButton,
                                (!selectedGiftId || !canAfford) && styles.sendButtonDisabled,
                                selectedGiftId && canAfford && { backgroundColor: themeColors.tint },
                            ]}
                        >
                            {selectedGiftId ? (
                                <LinearGradient
                                    colors={canAfford ? [themeColors.tint, themeColors.tint + 'CC'] : ['#94A3B8', '#64748B']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.sendButtonGradient}
                                >
                                    <Text style={styles.sendButtonText}>
                                        {canAfford ? `Gửi ${selectedGift?.name}` : 'Không đủ số dư'}
                                    </Text>
                                </LinearGradient>
                            ) : (
                                <Text style={[styles.sendButtonText, { color: 'rgba(255,255,255,0.5)' }]}>Chọn quà để gửi</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: height * 0.65,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
    },
    blurContainer: {
        flex: 1,
    },
    header: {
        paddingTop: 12,
        paddingBottom: 16,
        alignItems: 'center',
    },
    headerIndicator: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 3,
        marginBottom: 16,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    categoryContainer: {
        marginBottom: 16,
    },
    categoryList: {
        paddingHorizontal: 16,
        gap: 8,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.05)',
        gap: 6,
    },
    categoryName: {
        fontSize: 14,
        fontWeight: '500',
    },
    categoryNameActive: {
        fontWeight: 'bold',
    },
    giftGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
        paddingBottom: 120,
    },
    giftCard: {
        width: (width - 48) / 3,
        aspectRatio: 0.85,
        margin: 6,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    giftIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(0,0,0,0.03)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    giftEmoji: {
        fontSize: 36,
    },
    giftName: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    giftPrice: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    selectedBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        backgroundColor: 'transparent',
        borderTopWidth: 1,
    },
    balanceContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    balanceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    balanceLabel: {
        fontSize: 12,
    },
    balanceValue: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    balanceText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    sendButton: {
        height: 54,
        borderRadius: 27,
        overflow: 'hidden',
    },
    sendButtonDisabled: {
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    sendButtonGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        flex: 1,
        width: width - 24,
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    emptyText: {
        fontSize: 16,
        fontStyle: 'italic',
    },
});
