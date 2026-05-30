import React, { useState, useContext, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    TextInput,
    SafeAreaView,
    Alert,
    ActivityIndicator,
    StatusBar,
    ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, {
    FadeInDown,
    FadeIn,
    ZoomIn,
} from 'react-native-reanimated';
import { ThemeContext } from '@/context/ThemeContext';
import { useThemedColors } from '@/hooks/useThemedColors';
import { Vibe, PREDEFINED_VIBES, VIBE_CATEGORIES } from '@/types/vibe';
import { useAuth } from '@/context/authContext';
import { useTranslation } from 'react-i18next';
import { BlurView } from 'expo-blur';
import { LiquidGlassBackground, LiquidSurface } from '@/components/liquid';
import VibeAvatar from '@/components/vibe/VibeAvatar';

const { width } = Dimensions.get('window');

const VibeScreen = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const themeContext = useContext(ThemeContext);
    const theme = themeContext?.theme || 'dark';
    const colors = useThemedColors();
    const isDark = colors.isDark;

    const { user, setUserVibe, settingVibe, currentVibe, removeUserVibe, activeFrame } = useAuth();

    const [selectedVibe, setSelectedVibe] = useState<Vibe | null>(currentVibe?.vibe || null);
    const [customMessage, setCustomMessage] = useState<string>(currentVibe?.customMessage || '');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [search, setSearch] = useState('');

    const categories = VIBE_CATEGORIES;

    const displayedVibes = useMemo(() => {
        const base = selectedCategory === 'all'
            ? PREDEFINED_VIBES
            : PREDEFINED_VIBES.filter(v => v.category === selectedCategory);
        const q = search.trim().toLowerCase();
        if (!q) return base;
        return base.filter(v => v.name.toLowerCase().includes(q) || v.emoji.includes(q));
    }, [selectedCategory, search]);

    const handleSave = async () => {
        if (!selectedVibe) {
            Alert.alert(t('common.info', { defaultValue: 'Thông tin' }), t('vibe_screen.select_required', { defaultValue: 'Vui lòng chọn một trạng thái cảm xúc!' }));
            return;
        }
        try {
            await setUserVibe(selectedVibe.id, customMessage);
            router.back();
        } catch (error) {
            console.error('Error saving vibe:', error);
            Alert.alert(t('common.error', { defaultValue: 'Lỗi' }), t('vibe_screen.save_error', { defaultValue: 'Không thể lưu trạng thái cảm xúc' }));
        }
    };

    const handleRemoveVibe = () => {
        Alert.alert(
            t('vibe_screen.remove_title', { defaultValue: 'Gỡ cảm xúc' }),
            t('vibe_screen.remove_confirm', { defaultValue: 'Bạn có chắc chắn muốn gỡ trạng thái cảm xúc hiện tại?' }),
            [
                { text: t('common.cancel', { defaultValue: 'Hủy' }), style: 'cancel' },
                {
                    text: t('common.delete', { defaultValue: 'Xóa' }),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await removeUserVibe();
                            router.back();
                        } catch (e) {
                            Alert.alert(t('common.error', { defaultValue: 'Lỗi' }), t('vibe_screen.remove_error', { defaultValue: 'Không thể gỡ trạng thái cảm xúc' }));
                        }
                    }
                }
            ]
        );
    };

    const renderVibeItem = (vibe: Vibe, index: number) => {
        const isSelected = selectedVibe?.id === vibe.id;
        const cardBorderColor = isSelected ? vibe.color : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)');
        return (
            <Animated.View
                key={vibe.id}
                entering={FadeInDown.delay(index * 15)}
                style={styles.vibeCardWrapper}
            >
                <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                        styles.vibeCard,
                        {
                            borderColor: cardBorderColor,
                            borderWidth: isSelected ? 2 : 1,
                        }
                    ]}
                    onPress={() => setSelectedVibe(vibe)}
                >
                    <LiquidSurface
                        themeMode={theme}
                        borderRadius={24}
                        intensity={isSelected ? 24 : 12}
                        style={styles.vibeCardSurface}
                    >
                        <View style={[styles.emojiCircle, { backgroundColor: vibe.color + '20' }]}>
                            <Text style={styles.vibeEmoji}>{vibe.emoji}</Text>
                        </View>
                        <Text style={[styles.vibeName, { color: colors.text }]}>{vibe.name}</Text>
                        {isSelected && (
                            <Animated.View entering={ZoomIn} style={[styles.checkBadge, { backgroundColor: vibe.color, borderColor: isDark ? '#000' : '#FFF' }]}>
                                <Ionicons name="checkmark" size={12} color="#FFF" />
                            </Animated.View>
                        )}
                    </LiquidSurface>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <LiquidGlassBackground themeMode={theme} style={StyleSheet.absoluteFillObject} />

            <SafeAreaView style={styles.safeHeader}>
                <BlurView intensity={24} tint={isDark ? "dark" : "light"} style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                        <Ionicons name="chevron-back" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>{t('vibe_screen.title', { defaultValue: 'Cảm xúc lúc này' })}</Text>
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={settingVibe}
                        style={styles.saveBtn}
                    >
                        {settingVibe ? (
                            <ActivityIndicator size="small" color={colors.text} />
                        ) : (
                            <LinearGradient
                                colors={colors.palette?.sphereGradient || ['#8A4AF3', '#5D3FD3']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.saveBtnGradient}
                            >
                                <Text style={[styles.saveBtnText, { color: '#FFF' }]}>{t('common.done', { defaultValue: 'Xong' })}</Text>
                            </LinearGradient>
                        )}
                    </TouchableOpacity>
                </BlurView>
            </SafeAreaView>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <Animated.View entering={FadeIn.duration(600)} style={styles.previewSection}>
                    <LiquidSurface themeMode={theme} borderRadius={32} intensity={24} style={[styles.previewCard, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
                        <View style={styles.previewRow}>
                            <View style={styles.previewAvatar}>
                                <VibeAvatar
                                    avatarUrl={user?.profileUrl}
                                    size={80}
                                    frameType={selectedVibe?.id || activeFrame}
                                />
                                {selectedVibe && (
                                    <View style={[styles.previewEmojiBadge, { backgroundColor: selectedVibe.color, borderColor: isDark ? '#000' : '#FFF' }]}>
                                        <Text style={styles.previewEmojiText}>{selectedVibe.emoji}</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.previewInfo}>
                                <Text style={[styles.previewTitle, { color: colors.text }]} numberOfLines={1}>{user?.username || 'Username'}</Text>
                                <View style={[styles.statusBubble, { backgroundColor: selectedVibe ? selectedVibe.color + '15' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.035)') }]}>
                                    <Text style={[styles.statusText, { color: selectedVibe ? colors.text : colors.subtleText }]}>
                                        {customMessage || (selectedVibe ? `${selectedVibe.emoji} đang cảm thấy ${selectedVibe.name.toLowerCase()}` : 'Bạn đang làm gì thế?')}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </LiquidSurface>
                </Animated.View>

                <View style={styles.formSection}>
                    <Text style={[styles.sectionLabel, { color: colors.subtleText }]}>{t('vibe_screen.status_label', { defaultValue: 'Trạng thái tùy chỉnh' })}</Text>
                    <View style={[styles.inputBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.035)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                        <TextInput
                            style={[styles.messageInput, { color: colors.text }]}
                            placeholder={t('vibe_screen.status_placeholder', { defaultValue: 'Nhập điều bạn đang nghĩ...' })}
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)'}
                            value={customMessage}
                            onChangeText={setCustomMessage}
                            maxLength={80}
                            multiline
                        />
                        <View style={styles.charCountBox}>
                            <Text style={[styles.charCount, { color: colors.subtleText }]}>{customMessage.length}/80</Text>
                        </View>
                    </View>

                    <View style={[styles.searchBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.035)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                        <Ionicons name="search" size={20} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} />
                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            placeholder={t('vibe_screen.search_placeholder', { defaultValue: 'Tìm kiếm cảm xúc...' })}
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)'}
                            style={[styles.searchInput, { color: colors.text }]}
                        />
                    </View>
                </View>

                <View style={styles.categoryWrap}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                style={[
                                    styles.categorySlot,
                                    {
                                        backgroundColor: selectedCategory === cat.id ? colors.primary : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.035)'),
                                        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
                                    }
                                ]}
                                onPress={() => setSelectedCategory(cat.id)}
                            >
                                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                                <Text style={[styles.categoryName, { color: selectedCategory === cat.id ? '#FFF' : colors.subtleText }]}>
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.gridContainer}>
                    {displayedVibes.map((vibe, index) => renderVibeItem(vibe, index))}
                </View>

                {currentVibe && (
                    <TouchableOpacity onPress={handleRemoveVibe} style={styles.clearBtn}>
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        <Text style={[styles.clearText, { color: '#EF4444' }]}>{t('vibe_screen.remove_action', { defaultValue: 'Xóa cảm xúc hiện tại' })}</Text>
                    </TouchableOpacity>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    safeHeader: { zIndex: 100 },
    headerContent: {
        height: 64,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '900' },
    saveBtn: { borderRadius: 20, overflow: 'hidden' },
    saveBtnGradient: { paddingHorizontal: 20, paddingVertical: 10, alignItems: 'center' },
    saveBtnText: { fontWeight: '800', fontSize: 14 },
    scrollContent: { paddingTop: 20 },
    previewSection: { paddingHorizontal: 16, marginBottom: 24 },
    previewCard: { padding: 16, borderWidth: 1 },
    previewRow: { flexDirection: 'row', alignItems: 'center' },
    previewAvatar: { position: 'relative' },
    previewEmojiBadge: { position: 'absolute', bottom: -5, right: -5, width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    previewEmojiText: { fontSize: 15 },
    previewInfo: { flex: 1, marginLeft: 16 },
    previewTitle: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
    statusBubble: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, alignSelf: 'flex-start' },
    statusText: { fontSize: 13, fontWeight: '600' },
    formSection: { paddingHorizontal: 16, gap: 12, marginBottom: 20 },
    sectionLabel: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginLeft: 4 },
    inputBox: { height: 100, borderRadius: 24, padding: 16, borderWidth: 1 },
    messageInput: { flex: 1, fontSize: 15, fontWeight: '600', textAlignVertical: 'top', padding: 0 },
    charCountBox: { alignItems: 'flex-end' },
    charCount: { fontSize: 11, fontWeight: '700' },
    searchBox: { flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: 24, paddingHorizontal: 16, borderWidth: 1 },
    searchInput: { flex: 1, marginLeft: 10, fontWeight: '600', fontSize: 14, padding: 0 },
    categoryWrap: { marginBottom: 20 },
    categoryScroll: { paddingHorizontal: 16, gap: 10 },
    categorySlot: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
    categoryEmoji: { fontSize: 15, marginRight: 6 },
    categoryName: { fontSize: 13, fontWeight: '800' },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16 },
    vibeCardWrapper: { width: (width - 44) / 2, marginBottom: 12 },
    vibeCard: { borderRadius: 26, overflow: 'hidden' },
    vibeCardSurface: { padding: 16, alignItems: 'center', minHeight: 120 },
    emojiCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    vibeEmoji: { fontSize: 32 },
    vibeName: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
    checkBadge: { position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
    clearBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, paddingVertical: 12, gap: 8 },
    clearText: { fontWeight: '700', fontSize: 15 },
});

export default VibeScreen;