import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { Text } from 'react-native-paper';
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
import Animated, { FadeInDown, FadeInUp, FadeIn, SlideInRight } from 'react-native-reanimated';
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
    job: string;
    university: string;
    city: string;
    address: string;
    birthday: string;
}

const EditProfile = () => {
    const { user, setName, setEmail, setAge, setBio, setIcon, icon, refreshUser, activeFrame } = useAuth();
    const router = useRouter();
    const themeContext = useContext(ThemeContext);
    const theme = themeContext?.theme || 'light';
    const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
    const { currentVibe } = useAuth();

    const [profile, setProfile] = useState<ProfileForm>({
        name: '', email: '', age: '', bio: '', icon: '',
        coverImage: '', interests: [], job: '', university: '',
        city: '', address: '', birthday: '',
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
                    if (typeof user.age === 'object' && user.age.seconds) return (new Date().getFullYear() - new Date(user.age.seconds * 1000).getFullYear()).toString();
                    if (typeof user.age === 'number' && user.age > 10000) return (new Date().getFullYear() - new Date(user.age).getFullYear()).toString();
                    return user.age.toString();
                })(),
                bio: user.bio || '',
                icon: icon || user.profileUrl || null,
                coverImage: user.coverImage || null,
                interests: Array.isArray(user.interests) ? user.interests : [],
                job: user.job || '',
                university: user.university || '',
                city: user.city || '',
                address: user.address || '',
                birthday: user.birthday || '',
            });
        }
    }, [user?.uid]);

    const handleChange = (field: string, value: any) => setProfile((prev) => ({ ...prev, [field]: value }));
    const toggleArrayItem = (array: string[], item: string) => array.includes(item) ? array.filter((i) => i !== item) : [...array, item];

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
            setError('Không thể tải ảnh bìa.');
        } finally {
            setUploadingCover(false);
        }
    };

    const handleSave = async () => {
        if (!user || !user.uid) return setError('Lỗi đăng nhập.');
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
                job: profile.job,
                university: profile.university,
                city: profile.city,
                address: profile.address,
                birthday: profile.birthday,
            });
            setName(profile.name);
            setEmail(profile.email);
            setAge(Number(profile.age));
            setBio(profile.bio);
            refreshUser();
            router.back();
        } catch (error) {
            setError('Lỗi khi lưu.');
        } finally {
            setLoading(false);
        }
    };

    const InputRow = ({ label, value, field, placeholder, iconName }: { label: string, value: string, field: string, placeholder?: string, iconName: string }) => (
        <View style={styles.inputRow}>
            <View style={styles.inputIconBox}>
                <Ionicons name={iconName as any} size={20} color={currentThemeColors.subtleText} />
            </View>
            <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>{label}</Text>
                <TextInput
                    value={value}
                    onChangeText={(val) => handleChange(field, val)}
                    placeholder={placeholder}
                    placeholderTextColor={currentThemeColors.subtleText}
                    style={[styles.inputField, { color: currentThemeColors.text }]}
                />
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
            {/* Elegant Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                    <Ionicons name="close-outline" size={30} color={currentThemeColors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chỉnh sửa</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveBtn}>
                    {loading ? <ActivityIndicator color={Colors.primary} size="small" /> : <Text style={styles.saveBtnText}>Xong</Text>}
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
                {/* Media Hero Section */}
                <View style={styles.mediaHero}>
                    <TouchableOpacity onPress={handlePickCoverImage} style={styles.coverWrapper}>
                        {profile.coverImage ? (
                            <Image source={{ uri: profile.coverImage }} style={styles.coverImg} contentFit="cover" />
                        ) : (
                            <View style={[styles.coverPlaceholder, { backgroundColor: theme === 'dark' ? '#1E1E1E' : '#F5F5F7' }]}>
                                <Ionicons name="images-outline" size={32} color={currentThemeColors.subtleText} />
                                <Text style={styles.placeholderLabel}>Tải ảnh bìa</Text>
                            </View>
                        )}
                        <View style={styles.coverEditBadge}>
                            <Ionicons name="camera" size={16} color="#fff" />
                        </View>
                    </TouchableOpacity>

                    <View style={styles.avatarFloating}>
                        <VibeAvatar
                            avatarUrl={profile.icon || undefined}
                            size={110}
                            onPress={() => router.push('/signup/IconSelectionScreen?redirectTo=EditProfile&isEditing=true')}
                            showAddButton={true}
                            onAddPress={() => router.push('/signup/IconSelectionScreen?redirectTo=EditProfile&isEditing=true')}
                            frameType={activeFrame}
                        />
                    </View>
                </View>

                {/* Form Sections */}
                <View style={styles.formBody}>
                    <Animated.View entering={FadeInDown.delay(200).duration(600)}>
                        <Text style={styles.sectionHeading}>THÔNG TIN CÁ NHÂN</Text>
                        <View style={[styles.cardGroup, { backgroundColor: theme === 'dark' ? '#111' : '#fff' }]}>
                            <InputRow label="Họ tên" value={profile.name} field="name" placeholder="Tên của bạn" iconName="person-outline" />
                            <View style={styles.line} />
                            <View style={{ flexDirection: 'row' }}>
                                <View style={{ flex: 1 }}>
                                    <InputRow label="Tuổi" value={profile.age} field="age" placeholder="20" iconName="calendar-clear-outline" />
                                </View>
                                <View style={{ width: 1, backgroundColor: '#8E8E93', opacity: 0.08, marginVertical: 10 }} />
                                <View style={{ flex: 1.5 }}>
                                    <InputRow label="Ngày sinh" value={profile.birthday} field="birthday" placeholder="DD/MM/YYYY" iconName="calendar-outline" />
                                </View>
                            </View>
                            <View style={styles.line} />
                            <InputRow label="Nghề nghiệp" value={profile.job} field="job" placeholder="VD: Nhà thiết kế" iconName="briefcase-outline" />
                            <View style={styles.line} />
                            <InputRow label="Học vấn" value={profile.university} field="university" placeholder="Tên trường học" iconName="school-outline" />
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(400).duration(600)}>
                        <Text style={styles.sectionHeading}>CÂU CHUYỆN CỦA BẠN</Text>
                        <View style={[styles.cardGroup, { backgroundColor: theme === 'dark' ? '#111' : '#fff' }]}>
                            <View style={styles.bioContainer}>
                                <TextInput
                                    value={profile.bio}
                                    onChangeText={(text) => handleChange('bio', text)}
                                    style={[styles.bioInput, { color: currentThemeColors.text }]}
                                    multiline
                                    placeholder="Viết vài dòng giới thiệu bản thân..."
                                    placeholderTextColor={currentThemeColors.subtleText}
                                />
                            </View>
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(600).duration(600)}>
                        <Text style={styles.sectionHeading}>SỞ THÍCH & VIBE</Text>
                        <View style={styles.interestsCloud}>
                            {interestItems.map((item) => {
                                const isSelected = profile.interests.includes(item.id);
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        onPress={() => handleChange('interests', toggleArrayItem(profile.interests, item.id))}
                                        style={[styles.interestBubble, isSelected && styles.interestBubbleActive, { backgroundColor: isSelected ? Colors.primary : (theme === 'dark' ? '#1A1A1A' : '#F0F0F0') }]}
                                    >
                                        <Text style={[styles.interestLabel, { color: isSelected ? '#fff' : currentThemeColors.text }]}>{item.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </Animated.View>
                </View>

                {error && <Text style={styles.errorText}>{error}</Text>}

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 15,
    },
    headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
    iconBtn: { width: 44, height: 44, justifyContent: 'center' },
    saveBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
    },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    scrollBody: { paddingBottom: 50 },
    mediaHero: {
        height: 280,
        width: '100%',
        paddingHorizontal: 20,
        marginTop: 10,
    },
    coverWrapper: {
        height: 200,
        borderRadius: 30,
        overflow: 'hidden',
        position: 'relative',
    },
    coverImg: { width: '100%', height: '100%' },
    coverPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    placeholderLabel: { fontSize: 13, fontWeight: '600', opacity: 0.6 },
    coverEditBadge: {
        position: 'absolute',
        bottom: 15,
        right: 15,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarFloating: {
        position: 'absolute',
        bottom: 0,
        left: 45,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    formBody: { paddingHorizontal: 20, marginTop: 30 },
    sectionHeading: {
        fontSize: 11,
        fontWeight: '800',
        color: '#8E8E93',
        letterSpacing: 1.2,
        marginBottom: 12,
        marginLeft: 4,
    },
    cardGroup: {
        borderRadius: 24,
        paddingVertical: 4,
        marginBottom: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    inputIconBox: { width: 40, alignItems: 'flex-start' },
    inputContent: { flex: 1 },
    inputLabel: { fontSize: 12, fontWeight: '600', color: '#8E8E93', marginBottom: 2 },
    inputField: { fontSize: 16, fontWeight: '600', padding: 0 },
    line: { height: 1, backgroundColor: '#8E8E93', opacity: 0.08, marginLeft: 56 },
    bioContainer: { padding: 18, minHeight: 100 },
    bioInput: { fontSize: 16, lineHeight: 24, fontWeight: '500', textAlignVertical: 'top' },
    interestsCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    interestBubble: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 18,
    },
    interestBubbleActive: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    interestLabel: { fontSize: 14, fontWeight: '600' },
    errorText: { color: '#FF3B30', textAlign: 'center', marginTop: 10, fontWeight: '600' },
});

export default EditProfile;