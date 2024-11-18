import React, { useState, useContext } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/context/authContext';
import { LocationContext } from '@/context/LocationContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

const storage = getStorage();

const CreatePostScreen = () => {
  const [tag, setTag] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { location, errorMsg, loading: locationLoading, address } = useContext(LocationContext);
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let imageUrl = null;

      if (image) {
        const storageRef = ref(storage, `images/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`);
        const response = await fetch(image);
        const blob = await response.blob();

        await uploadBytes(storageRef, blob);
        imageUrl = await getDownloadURL(storageRef);
      }

      const newPost = {
        tag,
        content,
        image: imageUrl,
        location: location ? { latitude: location.coords.latitude, longitude: location.coords.longitude } : null,
        address: address || null,
        likes: [],
        comments: [],
        shares: 0,
        timestamp: serverTimestamp(),
        userID: user?.uid,
        username: user?.username,
      };

      await addDoc(collection(db, 'posts'), newPost);
      router.back();
    } catch (error) {
      console.error('Lỗi khi thêm bài viết: ', error);
    } finally {
      setLoading(false);
    }
  };

  const isButtonDisabled = !content && !image;

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <TextInput
        value={content}
        onChangeText={setContent}
        multiline
        numberOfLines={4}
        textColor={currentThemeColors.text}
        placeholder="Nội dung"
        activeUnderlineColor={currentThemeColors.text}
        style={[styles.textArea, { backgroundColor: currentThemeColors.background, borderBottomWidth: 0, elevation: 0 }]}
      />
      <TouchableOpacity
        style={[styles.imagePicker]}
        onPress={pickImage}
        disabled={loading}
      >
        <FontAwesome5 name="image" size={24} color={currentThemeColors.icon} />
        <Text style={[styles.imagePickerText, { color: currentThemeColors.text }]}>
          {loading ? 'Đang chọn ảnh...' : 'Chọn một ảnh'}
        </Text>
      </TouchableOpacity>
      {image && <Image source={{ uri: image }} style={styles.image} resizeMode="contain" />}

      {locationLoading ? (
        <Text style={{ color: currentThemeColors.text }}>Đang lấy vị trí...</Text>
      ) : address ? (
        <Text style={{ color: currentThemeColors.text }}>Vị trí: {address}</Text>
      ) : errorMsg ? (
        <Text style={{ color: currentThemeColors.text }}>Lỗi: {errorMsg}</Text>
      ) : (
        <Text style={{ color: currentThemeColors.text }}>Không có vị trí</Text>
      )}

      <Button
        mode="contained"
        onPress={handleSave}
        style={[styles.button, { backgroundColor: currentThemeColors.inputBackground }]}
        disabled={isButtonDisabled}
      >
        <Text style={[styles.buttonText, {color: currentThemeColors.text}]}> {loading ? <ActivityIndicator size="small"  /> : 'Lưu bài viết'}</Text>
      </Button>

      <Button
        onPress={() => router.back()}
        style={[styles.button]}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Hủy</Text>
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    justifyContent: 'flex-start',
  },
  textArea: {
    fontSize: 18,
  },
  imagePicker: {
    width: '40%',
    marginLeft : 'auto',
    marginRight: 'auto',
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 15,
  },
  imagePickerText: {
    fontSize: 16,
    fontWeight: '500',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 15,
  },
  button: {
    marginVertical: 10,
    borderRadius: 8,
    paddingVertical: 12,
  },
  buttonText: {
    fontSize:  20,
    fontWeight: '600'
  }
});

export default CreatePostScreen;
