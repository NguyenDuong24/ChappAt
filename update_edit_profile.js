const fs = require('fs');
const path = 'c:\\Users\\Admin\\Desktop\\Chat\\ChappAt\\app\\(tabs)\\profile\\EditProfile.tsx';

let content = fs.readFileSync(path, 'utf8');

// Add imports
content = content.replace(
    "import Animated, { FadeInDown } from 'react-native-reanimated';",
    "import Animated, { FadeInDown } from 'react-native-reanimated';\nimport { pickImage, uploadFile } from '@/utils/fileUpload';"
);

// Update ProfileForm interface
content = content.replace(
    "    icon: string | null;\n    interests: string[];",
    "    icon: string | null;\n    coverImage: string | null;\n    interests: string[];"
);

// Update initial state
content = content.replace(
    "        icon: '',\n        interests: [],",
    "        icon: '',\n        coverImage: '',\n        interests: [],"
);

// Update useEffect
content = content.replace(
    "                icon: icon || null,\n                interests: Array.isArray(user.interests) ? user.interests : [],",
    "                icon: icon || user.profileUrl || null,\n                coverImage: user.coverImage || null,\n                interests: Array.isArray(user.interests) ? user.interests : [],"
);

// Add handlePickCoverImage and uploadingCover state
content = content.replace(
    "    const toggleArrayItem = (array: string[], item: string): string[] => {\n        return array.includes(item) ? array.filter((i: string) => i !== item) : [...array, item];\n    };",
    `    const toggleArrayItem = (array: string[], item: string): string[] => {
        return array.includes(item) ? array.filter((i: string) => i !== item) : [...array, item];
    };

    const [uploadingCover, setUploadingCover] = useState(false);

    const handlePickCoverImage = async () => {
        try {
            const result = await pickImage();
            if (result) {
                setUploadingCover(true);
                const path = \`users/\${user.uid}/cover_\${Date.now()}.jpg\`;
                const downloadURL = await uploadFile(result, path);
                setProfile(prev => ({ ...prev, coverImage: downloadURL }));
            }
        } catch (error) {
            console.error('Error picking cover image:', error);
            setError('Không thể tải ảnh bìa lên.');
        } finally {
            setUploadingCover(false);
        }
    };`
);

// Update handleSave
content = content.replace(
    "                bio: profile.bio,\n                profileUrl: profile.icon,\n                interests: profile.interests || [],",
    "                bio: profile.bio,\n                profileUrl: profile.icon,\n                coverImage: profile.coverImage,\n                interests: profile.interests || [],"
);

// Update ImageBackground and add overlay
content = content.replace(
    "<ImageBackground\n            source={{ uri: 'https://i.imgur.com/lhV7JVA.jpg' }}\n            style={[styles.background, { backgroundColor: currentThemeColors.background }]}\n        >",
    `<ImageBackground
            source={profile.coverImage ? { uri: profile.coverImage } : { uri: 'https://i.imgur.com/lhV7JVA.jpg' }}
            style={[styles.background, { backgroundColor: currentThemeColors.background }]}
        >
            <LinearGradient
                colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
                style={StyleSheet.absoluteFill}
            />`
);

// Update header colors to white for better visibility on cover image
content = content.replace(
    "<View style={[styles.header, { backgroundColor: currentThemeColors.background }]}>\n                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>\n                    <Ionicons name=\"arrow-back\" size={28} color={currentThemeColors.text} />\n                </TouchableOpacity>\n                <Text style={[styles.headerTitle, { color: currentThemeColors.text }]}>Chỉnh sửa hồ sơ</Text>\n                <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={loading}>\n                    {loading ? (\n                        <ActivityIndicator color={currentThemeColors.primary} size=\"small\" />\n                    ) : (\n                        <Text style={[styles.saveText, { color: currentThemeColors.primary }]}>Lưu</Text>\n                    )}\n                </TouchableOpacity>\n            </View>",
    `<View style={[styles.header, { backgroundColor: 'transparent' }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: "#fff" }]}>Chỉnh sửa hồ sơ</Text>
                <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={[styles.saveText, { color: "#fff" }]}>Lưu</Text>
                    )}
                </TouchableOpacity>
            </View>`
);

// Add "Đổi ảnh bìa" button
content = content.replace(
    `<TouchableOpacity
                            onPress={() => router.push('/signup/IconSelectionScreen?redirectTo=EditProfile')}
                            style={[styles.changeIconButton]}
                        >
                            <BlurView intensity={30} style={styles.blurButton}>
                                <Text style={[styles.changeIconText, { color: '#fff' }]}>Chọn Avatar</Text>
                            </BlurView>
                        </TouchableOpacity>`,
    `<TouchableOpacity
                            onPress={() => router.push('/signup/IconSelectionScreen?redirectTo=EditProfile')}
                            style={[styles.changeIconButton]}
                        >
                            <BlurView intensity={30} style={styles.blurButton}>
                                <Text style={[styles.changeIconText, { color: '#fff' }]}>Chọn Avatar</Text>
                            </BlurView>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handlePickCoverImage}
                            style={[styles.changeIconButton, { marginTop: -12 }]}
                            disabled={uploadingCover}
                        >
                            <BlurView intensity={30} style={styles.blurButton}>
                                {uploadingCover ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={[styles.changeIconText, { color: '#fff' }]}>Đổi ảnh bìa</Text>
                                )}
                            </BlurView>
                        </TouchableOpacity>`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated EditProfile.tsx');
