import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, ScrollView, ImageBackground, TouchableOpacity, ActivityIndicator } from 'react-native';
import { TextInput, Button, Text, Card, Avatar, Chip } from 'react-native-paper';
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
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface ProfileForm {
    name: string;
    email: string;
    age: string;
    bio: string;
    icon: string | null;
    interests: string[];
}

const EditProfile = () => {
    const { user, setName, setEmail, setAge, setBio, setIcon, icon, refreshUser } = useAuth();
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
        interests: [],
    });

    // Interest items as { id, label }
    const interestItems = getInterestsArray();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            setProfile({
                name: user.username || '',
                email: user.email || '',
                age: user.age ? user.age.toString() : '',
                bio: user.bio || '',
                icon: icon || null,
                interests: Array.isArray(user.interests) ? user.interests : [],
            });
        }
    }, [user, icon]);

    const handleChange = (field: string, value: any) => {
        setProfile((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const toggleArrayItem = (array: string[], item: string): string[] => {
        return array.includes(item) ? array.filter((i: string) => i !== item) : [...array, item];
    };

    const handleSave = async () => {
        if (!user || !user.uid) {
            setError('Người dùng chưa đăng nhập.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // Cập nhật dữ liệu Firestore
            const docRef = doc(db, 'users', user.uid);
            await updateDoc(docRef, {
                username: profile.name,
                age: Number(profile.age),
                bio: profile.bio,
                profileUrl: profile.icon,
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
        <ImageBackground
            source={{ uri: 'https://i.imgur.com/lhV7JVA.jpg' }}
            style={[styles.background, { backgroundColor: currentThemeColors.background }]}
        >
            <View style={[styles.header, { backgroundColor: currentThemeColors.background }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={currentThemeColors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: currentThemeColors.text }]}>Chỉnh sửa hồ sơ</Text>
                <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color={currentThemeColors.primary} size="small" />
                    ) : (
                        <Text style={[styles.saveText, { color: currentThemeColors.primary }]}>Lưu</Text>
                    )}
                </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.container, { backgroundColor: currentThemeColors.cardBackground }]}>
                <Animated.View entering={FadeInDown.delay(100).duration(600)}>
                    <Card style={[styles.card, { backgroundColor: currentThemeColors.cardBackground }]}>
                        <LinearGradient
                            colors={['#8B5CF6', '#EC4899']}
                            style={styles.avatarGlow}
                        >
                            <View style={[styles.avatarInner, { backgroundColor: currentThemeColors.background }]}>
                                <Avatar.Image
                                    size={100}
                                    source={{ uri: user.profileUrl || profile.icon || 'https://example.com/default-icon.png' }}
                                />
                            </View>
                        </LinearGradient>
                        <TouchableOpacity
                            onPress={() => router.push('/signup/IconSelectionScreen?redirectTo=EditProfile')}
                            style={[styles.changeIconButton]}
                        >
                            <BlurView intensity={30} style={styles.blurButton}>
                                <Text style={[styles.changeIconText, { color: '#fff' }]}>Chọn Avatar</Text>
                            </BlurView>
                        </TouchableOpacity>
                        <Card.Content>
                            <Animated.View entering={FadeInDown.delay(200).duration(600)}>
                                <TextInput
                                    label="Tên"
                                    textColor={currentThemeColors.text}
                                    value={profile.name}
                                    onChangeText={(text) => handleChange('name', text)}
                                    style={[styles.input, { backgroundColor: currentThemeColors.inputBackground }]}
                                    mode="outlined"
                                    theme={{ colors: { primary: currentThemeColors.primary } }}
                                />
                            </Animated.View>
                            <Animated.View entering={FadeInDown.delay(300).duration(600)}>
                                <TextInput
                                    textColor={currentThemeColors.text}
                                    label="Email"
                                    value={profile.email}
                                    style={[styles.input, { backgroundColor: currentThemeColors.inputBackground }]}
                                    mode="outlined"
                                    keyboardType="email-address"
                                    editable={false}
                                    theme={{ colors: { primary: currentThemeColors.primary } }}
                                />
                            </Animated.View>
                            <Animated.View entering={FadeInDown.delay(400).duration(600)}>
                                <TextInput
                                    editable={false}
                                    textColor={currentThemeColors.text}
                                    label="Tuổi"
                                    value={profile.age}
                                    onChangeText={(text) => handleChange('age', text)}
                                    style={[styles.input, { backgroundColor: currentThemeColors.inputBackground }]}
                                    mode="outlined"
                                    keyboardType="numeric"
                                    theme={{ colors: { primary: currentThemeColors.primary } }}
                                />
                            </Animated.View>
                            <Animated.View entering={FadeInDown.delay(500).duration(600)}>
                                <TextInput
                                    textColor={currentThemeColors.text}
                                    label="Tiểu sử"
                                    value={profile.bio}
                                    onChangeText={(text) => handleChange('bio', text)}
                                    style={[styles.input, { backgroundColor: currentThemeColors.inputBackground }]}
                                    mode="outlined"
                                    multiline
                                    numberOfLines={4}
                                    theme={{ colors: { primary: currentThemeColors.primary } }}
                                />
                            </Animated.View>

                            {/* Current Vibe Section */}
                            <Animated.View entering={FadeInDown.delay(600).duration(600)} style={styles.vibeSection}>
                                <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>Vibe hiện tại</Text>
                                <View style={styles.vibeAvatarContainer}>
                                    <VibeAvatar
                                        avatarUrl={profile.icon || undefined}
                                        size={80}
                                        currentVibe={currentVibe}
                                        showAddButton={true}
                                    />
                                    {currentVibe && (
                                        <View style={styles.vibeInfo}>
                                            <Text style={[styles.vibeName, { color: currentThemeColors.text }]}>
                                                {currentVibe.vibe?.name} {currentVibe.vibe?.emoji}
                                            </Text>
                                            {currentVibe.customMessage && (
                                                <Text style={[styles.vibeMessage, { color: currentThemeColors.subtleText }]}>
                                                    "{currentVibe.customMessage}"
                                                </Text>
                                            )}
                                        </View>
                                    )}
                                </View>
                            </Animated.View>

                            <Animated.View entering={FadeInDown.delay(700).duration(600)} style={styles.filterSection}>
                                <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>Sở thích</Text>
                                <View style={styles.tagsContainer}>
                                    {interestItems.map((item: any) => (
                                        <Chip
                                            key={item.id}
                                            selected={profile.interests.includes(item.id)}
                                            onPress={() => setProfile(prev => ({ ...prev, interests: toggleArrayItem(prev.interests || [], item.id) }))}
                                            style={[styles.interestChip, { borderColor: currentThemeColors.primary }, profile.interests.includes(item.id) && styles.selectedChip]}
                                            textStyle={{ color: profile.interests.includes(item.id) ? '#fff' : currentThemeColors.text }}
                                        >
                                            {item.label}
                                        </Chip>
                                    ))}
                                </View>
                            </Animated.View>

                            {error && <Text style={[styles.error, { color: Colors.error }]}>{error}</Text>}
                        </Card.Content>
                    </Card>
                </Animated.View>
            </ScrollView>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    background: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 40,
        paddingBottom: 10,
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    saveButton: {
        marginLeft: 'auto',
        padding: 8,
    },
    saveText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    container: {
        flexGrow: 1,
        padding: 20,
    },
    card: {
        borderRadius: 20,
        elevation: 5,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    avatarGlow: {
        padding: 4,
        borderRadius: 60,
        alignSelf: 'center',
        marginBottom: 16,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
    },
    avatarInner: {
        borderRadius: 56,
        padding: 2,
    },
    changeIconButton: {
        alignSelf: 'center',
        marginBottom: 24,
        borderRadius: 25,
        overflow: 'hidden',
    },
    blurButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    changeIconText: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    input: {
        marginBottom: 16,
        borderRadius: 12,
    },
    vibeSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
    },
    vibeAvatarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    vibeInfo: {
        marginLeft: 16,
        flex: 1,
    },
    vibeName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    vibeMessage: {
        fontSize: 14,
        fontStyle: 'italic',
        marginTop: 4,
    },
    filterSection: {
        marginBottom: 24,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    interestChip: {
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: 'transparent',
        borderWidth: 1,
    },
    selectedChip: {
        backgroundColor: Colors.primary,
    },
    error: {
        marginBottom: 15,
        textAlign: 'center',
    },
});

export default EditProfile;