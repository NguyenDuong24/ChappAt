import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { TextInput, Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/authContext';
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Colors } from '@/constants/Colors';
import { ThemeContext } from '@/context/ThemeContext';
import VibeAvatar from '@/components/vibe/VibeAvatar';
import { getInterestsArray } from '@/utils/interests';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { pickImage, uploadFile } from '@/utils/fileUpload';

const { width } = Dimensions.get('window');

interface ProfileForm {
    name: string;
    email: string;
    age: string;
    bio: string;
    icon: string | null;
    coverImage: string | null;
    interests: string[];
}

const EditProfile = () => {
    const { user, setName, setEmail, setAge, setBio, setIcon, icon, refreshUser, activeFrame } = useAuth();
    const router = useRouter();
    const themeContext = useContext(ThemeContext);
    const theme = themeContext?.theme || 'light';
    const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
    const { currentVibe } = useAuth();

    const [profile, setProfile] = useState<ProfileForm>({
        name: '',
        email: '',
        age: '',
        bio: '',
        icon: '',
        coverImage: '',
        interests: [],
    });

    const interestItems = getInterestsArray();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadingCover, setUploadingCover] = useState(false);

    useEffect(() => {
        if (user) {
            setProfile({
                name: user.username || '',
                email: user.email || '',
                age: (() => {
                    if (!user.age) return '';
                    if (typeof user.age === 'object' && user.age.seconds) {
                        return (new Date().getFullYear() - new Date(user.age.seconds * 1000).getFullYear()).toString();
                    }
                    if (typeof user.age === 'number' && user.age > 10000) {
                        return (new Date().getFullYear() - new Date(user.age).getFullYear()).toString();
                    }
                    return user.age.toString();
                })(),
                bio: user.bio || '',
                icon: icon || user.profileUrl || null,
                coverImage: user.coverImage || null,
                interests: Array.isArray(user.interests) ? user.interests : [],
            });
        }
    }, [user?.uid]);

    useEffect(() => {
        if (icon) {
            setProfile(prev => ({ ...prev, icon }));
        }
    }, [icon]);

    const handleChange = (field: string, value: any) => {
        setProfile((prev) => ({ ...prev, [field]: value }));
    };

    const toggleArrayItem = (array: string[], item: string): string[] => {
        return array.includes(item)
            ? array.filter((i: string) => i !== item)
            : [...array, item];
    };

    const handlePickCoverImage = async () => {
        try {
            const result = await pickImage();
            if (result) {
                setUploadingCover(true);
                const path = `users/${user.uid}/cover_${Date.now()}.jpg`;
                const downloadURL = await uploadFile(result, path);
                setProfile(prev => ({ ...prev, coverImage: downloadURL }));
            }
        } catch (error) {
            console.error('Error picking cover image:', error);
            setError('Không thể tải ảnh bìa lên.');
        } finally {
            setUploadingCover(false);
        }
    };

    const handleSave = async () => {
        if (!user || !user.uid) {
            setError('Người dùng chưa đăng nhập.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const docRef = doc(db, 'users', user.uid);
            await updateDoc(docRef, {
                username: profile.name,
                age: Number(profile.age),
                bio: profile.bio,
                profileUrl: profile.icon,
                coverImage: profile.coverImage,
                interests: profile.interests || [],
            });

            setName(profile.name);
            setEmail(profile.email);
            setAge(Number(profile.age));
            setBio(profile.bio);
            refreshUser();
            router.back();
        } catch (error) {
            console.error('Không thể lưu hồ sơ:', error);
            setError('Không thể lưu hồ sơ. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
            {/* Header */}
            <Animated.View entering={FadeInUp.delay(100).duration(500)}>
                <View style={[styles.header, { backgroundColor: currentThemeColors.surface }]}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={[styles.headerButton, { backgroundColor: currentThemeColors.cardBackground }]}
                    >
                        <Ionicons name="arrow-back" size={24} color={currentThemeColors.text} />
                    </TouchableOpacity>

                    <Text style={[styles.headerTitle, { color: currentThemeColors.text }]}>
                        Chỉnh sửa hồ sơ
                    </Text>

                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={loading}
                        style={[styles.headerButton, { backgroundColor: currentThemeColors.cardBackground }]}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.primary} size="small" />
                        ) : (
                            <Ionicons name="checkmark" size={24} color={Colors.primary} />
                        )}
                    </TouchableOpacity>
                </View>
            </Animated.View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Cover & Avatar Section */}
                <Animated.View entering={FadeInDown.delay(200).springify()}>
                    <View style={styles.coverAvatarSection}>
                        {/* Cover Image */}
                        <TouchableOpacity
                            onPress={handlePickCoverImage}
                            disabled={uploadingCover}
                            style={styles.coverContainer}
                        >
                            {profile.coverImage ? (
                                <>
                                    <Image
                                        source={{ uri: profile.coverImage }}
                                        style={styles.coverImage}
                                        contentFit="cover"
                                        transition={200}
                                        cachePolicy="memory-disk"
                                    />
                                    <LinearGradient
                                        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
                                        style={styles.coverOverlay}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 0, y: 1 }}
                                    >
                                        <View style={styles.coverContent}>
                                            {uploadingCover ? (
                                                <ActivityIndicator color="#fff" size="large" />
                                            ) : (
                                                <>
                                                    <Ionicons name="camera-outline" size={32} color="#fff" />
                                                    <Text style={styles.coverText}>Thay đổi ảnh bìa</Text>
                                                </>
                                            )}
                                        </View>
                                    </LinearGradient>
                                </>
                            ) : (
                                <LinearGradient
                                    colors={[Colors.primary, '#EC4899']}
                                    style={styles.coverPlaceholder}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    {uploadingCover ? (
                                        <ActivityIndicator color="#fff" size="large" />
                                    ) : (
                                        <>
                                            <Ionicons name="image-outline" size={60} color="#fff" />
                                            <Text style={[styles.placeholderText, { color: '#fff' }]}>
                                                Thêm ảnh bìa
                                            </Text>
                                        </>
                                    )}
                                </LinearGradient>
                            )}
                        </TouchableOpacity>

                        {/* Avatar Section */}
                        <View style={styles.avatarSection}>
                            <View style={styles.avatarTouchable}>
                                <LinearGradient
                                    colors={activeFrame ? ['transparent', 'transparent'] : ['#fff', currentThemeColors.surface]}
                                    style={styles.avatarGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <View style={[styles.avatarInner, { backgroundColor: activeFrame ? 'transparent' : currentThemeColors.surface }]}>
                                        <VibeAvatar
                                            key={activeFrame || 'no-frame'}
                                            avatarUrl={profile.icon || undefined}
                                            size={100}
                                            onPress={() => router.push('/signup/IconSelectionScreen?redirectTo=EditProfile&isEditing=true')}
                                            showAddButton={true}
                                            frameType={activeFrame}
                                        />
                                    </View>
                                </LinearGradient>

                                <TouchableOpacity
                                    onPress={() => router.push('/signup/IconSelectionScreen?redirectTo=EditProfile&isEditing=true')}
                                    style={styles.editBadge}
                                >
                                    <LinearGradient
                                        colors={[Colors.primary, '#EC4899']}
                                        style={styles.badgeGradient}
                                    >
                                        <Ionicons name="camera-outline" size={18} color="#fff" />
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                onPress={() => router.push({ pathname: '/(screens)/store/StoreScreen', params: { initialTab: 'my-items', initialCategory: 'frames' } } as any)}
                                style={styles.changeFrameButton}
                            >
                                <LinearGradient
                                    colors={['#8A2BE2', '#4B0082']}
                                    style={styles.changeFrameGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <Ionicons name="shapes-outline" size={16} color="#fff" />
                                    <Text style={styles.changeFrameText}>Đổi khung</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>

                {/* Form Content */}
                <View style={styles.formContent}>
                    {/* Basic Info Card */}
                    <Animated.View entering={FadeInDown.delay(300).springify()}>
                        <View style={[styles.card, {
                            backgroundColor: currentThemeColors.surface,
                            borderColor: currentThemeColors.border,
                        }]}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="person-outline" size={26} color={Colors.primary} />
                                <Text style={[styles.cardTitle, { color: currentThemeColors.text }]}>
                                    Thông tin cơ bản
                                </Text>
                            </View>

                            <View style={styles.cardContent}>
                                <View style={[styles.inputWrapper, { borderColor: currentThemeColors.border }]}>
                                    <TextInput
                                        label="Họ và tên"
                                        value={profile.name}
                                        onChangeText={(text) => handleChange('name', text)}
                                        style={styles.textInput}
                                        mode="outlined"
                                        outlineColor={currentThemeColors.border}
                                        activeOutlineColor={Colors.primary}
                                        textColor={currentThemeColors.text}
                                        placeholderTextColor={currentThemeColors.subtleText}
                                        left={<TextInput.Icon icon="account-outline" color={Colors.primary} />}
                                        theme={{
                                            roundness: 16,
                                            colors: {
                                                background: currentThemeColors.background,
                                            }
                                        }}
                                    />
                                </View>

                                <View style={[styles.inputWrapper, { borderColor: currentThemeColors.border }]}>
                                    <TextInput
                                        label="Tuổi"
                                        value={profile.age}
                                        onChangeText={(text) => handleChange('age', text)}
                                        style={styles.textInput}
                                        mode="outlined"
                                        keyboardType="numeric"
                                        outlineColor={currentThemeColors.border}
                                        activeOutlineColor={Colors.primary}
                                        textColor={currentThemeColors.text}
                                        placeholderTextColor={currentThemeColors.subtleText}
                                        left={<TextInput.Icon icon="calendar-outline" color={Colors.primary} />}
                                        theme={{
                                            roundness: 16,
                                            colors: {
                                                background: currentThemeColors.background,
                                            }
                                        }}
                                    />
                                </View>

                                <View style={[styles.inputWrapper, { borderColor: currentThemeColors.border }]}>
                                    <TextInput
                                        label="Giới thiệu bản thân"
                                        value={profile.bio}
                                        onChangeText={(text) => handleChange('bio', text)}
                                        style={[styles.textInput, styles.textArea]}
                                        mode="outlined"
                                        multiline
                                        numberOfLines={4}
                                        outlineColor={currentThemeColors.border}
                                        activeOutlineColor={Colors.primary}
                                        textColor={currentThemeColors.text}
                                        placeholderTextColor={currentThemeColors.subtleText}
                                        theme={{
                                            roundness: 16,
                                            colors: {
                                                background: currentThemeColors.background,
                                            }
                                        }}
                                    />
                                </View>
                            </View>
                        </View>
                    </Animated.View>

                    {/* Current Vibe */}
                    {currentVibe && (
                        <Animated.View entering={FadeInDown.delay(400).springify()}>
                            <LinearGradient
                                colors={[Colors.primary, '#EC4899']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.vibeContainer}
                            >
                                <Ionicons name={currentVibe.icon as any} size={32} color="#fff" />
                                <View style={styles.vibeDetails}>
                                    <Text style={[styles.vibeName, { color: '#fff' }]}>{currentVibe.label}</Text>
                                    <Text style={[styles.vibeMessage, { color: '#fff' }]}>{currentVibe.message}</Text>
                                </View>
                            </LinearGradient>
                        </Animated.View>
                    )}

                    {/* Interests */}
                    <Animated.View entering={FadeInDown.delay(500).springify()}>
                        <View style={[styles.card, {
                            backgroundColor: currentThemeColors.surface,
                            borderColor: currentThemeColors.border,
                        }]}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="heart-outline" size={26} color={Colors.primary} />
                                <Text style={[styles.cardTitle, { color: currentThemeColors.text }]}>
                                    Sở thích
                                </Text>
                            </View>

                            <View style={styles.interestsGrid}>
                                {interestItems.map((item) => {
                                    const isSelected = profile.interests.includes(item.id);
                                    return (
                                        <TouchableOpacity
                                            key={item.id}
                                            onPress={() => handleChange('interests', toggleArrayItem(profile.interests, item.id))}
                                            style={[
                                                styles.interestTag,
                                                isSelected && styles.interestTagSelected,
                                                { borderColor: isSelected ? Colors.primary : currentThemeColors.border }
                                            ]}
                                        >
                                            <Text style={[
                                                styles.interestText,
                                                { color: isSelected ? '#fff' : currentThemeColors.text }
                                            ]}>
                                                {item.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </Animated.View>

                    {/* Error Message */}
                    {error && (
                        <Animated.View entering={FadeIn}>
                            <View style={[styles.errorCard, { borderColor: '#EF4444' }]}>
                                <Ionicons name="alert-circle" size={24} color="#EF4444" />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        </Animated.View>
                    )}

                    {/* Save Button */}
                    <Animated.View entering={FadeInDown.delay(600).springify()}>
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={[Colors.primary, '#EC4899']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.saveButton}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
                                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </ScrollView>
        </View>
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
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    headerButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 50,
    },
    coverAvatarSection: {
        marginBottom: 40,
    },
    coverContainer: {
        height: 220,
        width: '100%',
        overflow: 'hidden',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    coverOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    coverContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    coverText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    coverPlaceholder: {
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
    },
    placeholderText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    avatarSection: {
        alignSelf: 'center',
        marginTop: -60,
    },
    avatarTouchable: {
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
    avatarGradient: {
        borderRadius: 60,
        padding: 4,
    },
    avatarInner: {
        borderRadius: 56,
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        left: 8,
    },
    changeFrameButton: {
        marginTop: 16,
        borderRadius: 20,
        overflow: 'hidden',
        alignSelf: 'center',
    },
    changeFrameGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 6,
    },
    changeFrameText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    badgeGradient: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    formContent: {
        paddingHorizontal: 24,
        gap: 24,
    },
    card: {
        borderRadius: 32,
        padding: 28,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 28,
        gap: 14,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 0.4,
    },
    cardContent: {
        gap: 20,
    },
    inputWrapper: {
        borderRadius: 16,
    },
    textInput: {
        fontSize: 16,
    },
    textArea: {
        height: 140,
    },
    vibeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 24,
        gap: 18,
    },
    vibeDetails: {
        flex: 1,
    },
    vibeName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    vibeMessage: {
        fontSize: 15,
        lineHeight: 22,
        opacity: 0.8,
    },
    interestsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 14,
    },
    interestTag: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: Colors.primary,
        backgroundColor: 'transparent',
    },
    interestTagSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    interestText: {
        fontSize: 15,
        fontWeight: '600',
    },
    errorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239,68,68,0.1)',
        padding: 20,
        borderRadius: 24,
        gap: 14,
        borderWidth: 1,
    },
    errorText: {
        flex: 1,
        color: '#EF4444',
        fontSize: 15,
        fontWeight: '600',
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        borderRadius: 32,
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
});

export default EditProfile;