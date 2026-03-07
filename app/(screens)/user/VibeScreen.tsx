import React, { useState, useContext, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    TextInput,
    SafeAreaView,
    Alert,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors, PRIMARY_COLOR } from '@/constants/Colors';
import { Vibe, PREDEFINED_VIBES, VIBE_CATEGORIES } from '@/types/vibe';
import { useAuth } from '@/context/authContext';

const { width } = Dimensions.get('window');

const VibeScreen = () => {
    const router = useRouter();
    const themeContext = useContext(ThemeContext);
    const theme = themeContext?.theme || 'light';
    const colors = theme === 'dark' ? Colors.dark : Colors.light;

    const { setUserVibe, settingVibe, currentVibe, removeUserVibe } = useAuth();

    const [selectedVibe, setSelectedVibe] = useState<Vibe | null>(currentVibe?.vibe || null);
    const [customMessage, setCustomMessage] = useState<string>(currentVibe?.customMessage || '');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [search, setSearch] = useState('');

    // Categories for filtering vibes
    const categories = VIBE_CATEGORIES;

    // Filter vibes by category + search
    const displayedVibes = useMemo(() => {
        const base = selectedCategory === 'all'
            ? PREDEFINED_VIBES
            : PREDEFINED_VIBES.filter(v => v.category === selectedCategory);
        const q = search.trim().toLowerCase();
        if (!q) return base;
        return base.filter(v => v.name.toLowerCase().includes(q) || v.emoji.includes(q));
    }, [selectedCategory, search]);

    const handleVibeSelect = (vibe: Vibe) => {
        setSelectedVibe(vibe);
    };

    const handleSave = async () => {
        if (!selectedVibe) {
            Alert.alert('Thông báo', 'Vui lòng chọn một vibe!');
            return;
        }

        try {
            await setUserVibe(selectedVibe.id, customMessage);
            router.back();
        } catch (error) {
            console.error('Error saving vibe:', error);
            Alert.alert('Lỗi', 'Không thể lưu vibe. Vui lòng thử lại!');
        }
    };

    const handleRemoveVibe = () => {
        Alert.alert(
            'Xóa vibe',
            'Bạn có chắc muốn xóa vibe hiện tại?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await removeUserVibe();
                            router.back();
                        } catch (e) {
                            Alert.alert('Lỗi', 'Không thể xóa vibe.');
                        }
                    }
                }
            ]
        );
    };

    const renderCategoryTabs = () => (
        <View style={styles.categoryContainer}>
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={categories}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.categoryContent}
                renderItem={({ item: category }) => (
                    <TouchableOpacity
                        style={[
                            styles.categoryTab,
                            {
                                backgroundColor: selectedCategory === category.id
                                    ? PRIMARY_COLOR
                                    : colors.cardBackground,
                                borderColor: colors.border,
                                borderWidth: 1,
                            }
                        ]}
                        onPress={() => setSelectedCategory(category.id)}
                    >
                        <Text style={{ fontSize: 16, marginRight: 6 }}>
                            {category.emoji}
                        </Text>
                        <Text style={[
                            styles.categoryText,
                            {
                                color: selectedCategory === category.id ? 'white' : colors.text,
                            }
                        ]}>
                            {category.name}
                        </Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );

    const renderVibeItem = ({ item: vibe }: { item: Vibe }) => (
        <TouchableOpacity
            style={[
                styles.vibeItem,
                {
                    backgroundColor: colors.cardBackground,
                    borderColor: selectedVibe?.id === vibe.id ? vibe.color : colors.border,
                    borderWidth: selectedVibe?.id === vibe.id ? 3 : 1,
                }
            ]}
            onPress={() => handleVibeSelect(vibe)}
        >
            <LinearGradient
                colors={[vibe.color + '15', vibe.color + '30']}
                style={styles.vibeBackground}
            >
                <Text style={styles.vibeEmoji}>{vibe.emoji}</Text>
                <Text style={[styles.vibeName, { color: colors.text }]}>
                    {vibe.name}
                </Text>
                {selectedVibe?.id === vibe.id && (
                    <View style={[styles.selectedIndicator, { backgroundColor: vibe.color }]}>
                        <MaterialIcons name="check" size={14} color="white" />
                    </View>
                )}
            </LinearGradient>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>
                    Chọn Vibe của bạn
                </Text>
                <TouchableOpacity
                    onPress={handleSave}
                    style={[
                        styles.saveButton,
                        {
                            backgroundColor: selectedVibe ? PRIMARY_COLOR : colors.border,
                            opacity: settingVibe ? 0.6 : 1
                        }
                    ]}
                    disabled={settingVibe}
                >
                    {settingVibe ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <Text style={styles.saveButtonText}>Lưu</Text>
                    )}
                </TouchableOpacity>
            </View>

            <FlatList
                ListHeaderComponent={
                    <View style={styles.headerComponent}>
                        {/* Search */}
                        <View style={[styles.searchContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                            <MaterialIcons name="search" size={20} color={colors.text + '80'} style={styles.searchIcon} />
                            <TextInput
                                value={search}
                                onChangeText={setSearch}
                                placeholder="Tìm cảm hứng, tâm trạng..."
                                placeholderTextColor={colors.text + '50'}
                                style={[styles.searchInput, { color: colors.text }]}
                            />
                            {!!search && (
                                <TouchableOpacity onPress={() => setSearch('')}>
                                    <MaterialIcons name="cancel" size={20} color={colors.text + '50'} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Selected Vibe Preview */}
                        {selectedVibe && (
                            <Animated.View style={[styles.selectedPreview, { backgroundColor: colors.cardBackground, borderColor: selectedVibe.color + '40' }]}>
                                <View style={[styles.previewEmojiContainer, { backgroundColor: selectedVibe.color + '20' }]}>
                                    <Text style={styles.previewEmoji}>{selectedVibe.emoji}</Text>
                                </View>
                                <View style={styles.previewInfo}>
                                    <Text style={[styles.previewName, { color: colors.text }]}>{selectedVibe.name}</Text>
                                    <Text style={[styles.previewDesc, { color: colors.text + '70' }]} numberOfLines={1}>
                                        {selectedVibe.description}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setSelectedVibe(null)} style={styles.clearBadge}>
                                    <MaterialIcons name="close" size={18} color={colors.text + '60'} />
                                </TouchableOpacity>
                            </Animated.View>
                        )}

                        {renderCategoryTabs()}
                    </View>
                }
                data={displayedVibes}
                renderItem={renderVibeItem}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.row}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={
                    <View style={styles.footerComponent}>
                        <Text style={[styles.messageLabel, { color: colors.text }]}>Chia sẻ cảm nghĩ</Text>
                        <TextInput
                            style={[
                                styles.messageInput,
                                {
                                    backgroundColor: colors.cardBackground,
                                    borderColor: colors.border,
                                    color: colors.text,
                                }
                            ]}
                            placeholder="Bạn đang thấy thế nào?"
                            placeholderTextColor={colors.text + '40'}
                            value={customMessage}
                            onChangeText={setCustomMessage}
                            maxLength={100}
                            multiline
                        />
                        <Text style={[styles.charCount, { color: colors.text + '40' }]}>{customMessage.length}/100</Text>

                        {currentVibe && (
                            <TouchableOpacity onPress={handleRemoveVibe} style={styles.removeBtn}>
                                <MaterialIcons name="delete-outline" size={20} color={Colors.error} />
                                <Text style={styles.removeText}>Xóa vibe hiện tại</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 42,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    saveButton: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 70,
        alignItems: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontWeight: '700',
    },
    headerComponent: {
        padding: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 16,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
    },
    selectedPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    previewEmojiContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    previewEmoji: {
        fontSize: 24,
    },
    previewInfo: {
        flex: 1,
    },
    previewName: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    previewDesc: {
        fontSize: 13,
    },
    clearBadge: {
        padding: 4,
    },
    categoryContainer: {
        marginBottom: 8,
    },
    categoryContent: {
        paddingRight: 16,
    },
    categoryTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: 30,
    },
    row: {
        paddingHorizontal: 16,
        justifyContent: 'space-between',
    },
    vibeItem: {
        width: (width - 44) / 2,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
    },
    vibeBackground: {
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 110,
    },
    vibeEmoji: {
        fontSize: 36,
        marginBottom: 8,
    },
    vibeName: {
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
    },
    selectedIndicator: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerComponent: {
        padding: 16,
    },
    messageLabel: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 10,
    },
    messageInput: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        fontSize: 15,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    charCount: {
        textAlign: 'right',
        fontSize: 12,
        marginTop: 6,
    },
    removeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        paddingVertical: 12,
        gap: 8,
    },
    removeText: {
        color: Colors.error,
        fontWeight: '600',
        fontSize: 15,
    },
});

export default VibeScreen;
