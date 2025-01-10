import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, ScrollView, ImageBackground, TouchableOpacity } from 'react-native';
import { TextInput, Button, RadioButton, Text, Card, Avatar } from 'react-native-paper';
import { useAuth } from '@/context/authContext';
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Colors } from '@/constants/Colors';
import { ThemeContext } from '@/context/ThemeContext'; // Import the ThemeContext

const EditProfile = () => {
    const { user, setName, setEmail, setAge, setGender, setBio, setIcon, icon, refreshUser } = useAuth();
    const router = useRouter();
    
    const { theme } = useContext(ThemeContext); // Truy cập vào theme hiện tại
    const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light; // Chọn màu sắc theo theme

    const [profile, setProfile] = useState({
        name: '',
        email: '',
        age: '',
        gender: 'male',
        bio: '',
        icon: '',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (user) {
            setProfile({
                name: user.username || '',
                email: user.email || '',
                age: user.age ? user.age.toString() : '',
                gender: user.gender || 'male',
                bio: user.bio || '',
                icon: icon || null,
            });
        }
    }, [user, icon]);

    const handleChange = (field, value) => {
        setProfile((prev) => ({
            ...prev,
            [field]: value,
        }));
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
                gender: profile.gender,
                bio: profile.bio,
                profileUrl: profile.icon,
            });
            setName(profile.name);
            setEmail(profile.email);
            setAge(Number(profile.age));
            setGender(profile.gender);
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
            style={[styles.background, { backgroundColor: currentThemeColors.background }]} // Đặt màu nền động
        >
            <ScrollView contentContainerStyle={[styles.container, { backgroundColor: currentThemeColors.cardBackground }]}>
                <Card style={[styles.card, { backgroundColor: currentThemeColors.cardBackground }]}>
                    <Card.Title title="Chỉnh sửa hồ sơ" titleStyle={[styles.cardTitle, { color: currentThemeColors.text }]} />
                    <View style={[styles.icon]}>
                      <Avatar.Image
                          size={80}
                          source={{ uri: user.profileUrl || profile.icon || 'https://example.com/default-icon.png' }}
                      />
                      <TouchableOpacity
                          onPress={() => router.push('signup/IconSelectionScreen?redirectTo=EditProfile')}
                          style={[styles.changeIconButton]}
                      >
                          <Text style={[styles.changeIconText, { color: currentThemeColors.addressText }]}>Chọn Avatar</Text>
                      </TouchableOpacity>
                    </View>
                    <Card.Content>
                        <TextInput
                            label="Tên"
                            textColor={currentThemeColors.text}
                            value={profile.name}
                            onChangeText={(text) => handleChange('name', text)}
                            style={[styles.input, { backgroundColor: currentThemeColors.inputBackground, color: 'white' }]}
                            mode="outlined"
                            theme={{ colors: { primary: currentThemeColors.text }}}
                        />
                        <TextInput
                            textColor={currentThemeColors.text}
                            label="Email"
                            value={profile.email}
                            style={[styles.input, { backgroundColor: currentThemeColors.inputBackground }]}
                            mode="outlined"
                            keyboardType="email-address"
                            editable={false}
                            theme={{ colors: { primary: currentThemeColors.text }}}
                        />
                        <TextInput
                            editable={false}
                            textColor={currentThemeColors.text}
                            label="Tuổi"
                            value={profile.age}
                            onChangeText={(text) => handleChange('age', text)}
                            style={[styles.input, { backgroundColor: currentThemeColors.inputBackground }]}
                            mode="outlined"
                            keyboardType="numeric"
                            theme={{ colors: { primary: currentThemeColors.text }}}
                        />
                        <TextInput
                            textColor={currentThemeColors.text}
                            label="Tiểu sử"
                            value={profile.bio}
                            onChangeText={(text) => handleChange('bio', text)}
                            style={[styles.input, { backgroundColor: currentThemeColors.inputBackground }]}
                            mode="outlined"
                            multiline
                            numberOfLines={4}
                            theme={{ colors: { primary: currentThemeColors.text } }}
                        />
                        <View style={styles.radioGroup}>
                            <Text style={[styles.radioTitle, { color: currentThemeColors.text }]}>Giới tính</Text>
                            <RadioButton.Group
                                onValueChange={(value) => handleChange('gender', value)}
                                value={profile.gender}
                            >
                                <View style={styles.radioOption}>
                                    <RadioButton value="male" />
                                    <Text style={{ color: currentThemeColors.text }}>Nam</Text>
                                </View>
                                <View style={styles.radioOption}>
                                    <RadioButton value="female" />
                                    <Text style={{ color: currentThemeColors.text }}>Nữ</Text>
                                </View>
                            </RadioButton.Group>
                        </View>
                        {error && <Text style={[styles.error, { color: currentThemeColors.error }]}>{error}</Text>}
                        <Button
                            mode="contained"
                            onPress={handleSave}
                            style={[styles.button, { backgroundColor: Colors.primary }]}
                            loading={loading}
                            disabled={loading}
                        >
                            Lưu thay đổi
                        </Button>
                    </Card.Content>
                </Card>
            </ScrollView>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    background: {
        flex: 1,
        justifyContent: 'center',
    },
    container: {
        flexGrow: 1,
        padding: 20,
        justifyContent: 'center',
    },
    card: {
        borderRadius: 12,
        elevation: 5,
        padding: 10,
    },
    cardTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    input: {
        marginBottom: 15,
    },
    radioGroup: {
        marginBottom: 20,
    },
    radioTitle: {
        fontSize: 16,
        marginBottom: 10,
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    button: {
        marginTop: 20,
    },
    error: {
        marginBottom: 15,
        textAlign: 'center',
    },
    changeIconButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
        marginTop: 20,
    },
    changeIconText: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    icon: {
      alignItems: 'center'
    }
});

export default EditProfile;
