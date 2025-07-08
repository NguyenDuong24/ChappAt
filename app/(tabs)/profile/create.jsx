import React, { useState, useContext } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Image, ActivityIndicator, ScrollView } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { 
  addDoc, collection, serverTimestamp, getDoc, setDoc, updateDoc, doc, increment, arrayUnion 
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/context/authContext';
import { LocationContext } from '@/context/LocationContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { MaterialIcons } from '@expo/vector-icons';

const storage = getStorage();

// Hàm tách các hashtag từ nội dung bài viết
const extractHashtags = (text) => {
  const regex = /#[a-zA-Z0-9_]+/g;
  return text.match(regex) || [];
};

const CreatePostScreen = () => {
  const [tag, setTag] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { location, errorMsg, loading: locationLoading, address } = useContext(LocationContext);
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      aspect: [4, 3],
      quality: 1,
      selectionLimit: 4,
      allowsMultipleSelection: true,
    });

    if (!result.canceled) {
      const selectedImages = result.assets.map((asset) => asset.uri);
      setImage(selectedImages);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let imageUrls = [];
  
      if (image.length > 0) {
        // Tải lên tất cả ảnh và lấy URL
        const uploadPromises = image.map(async (uri) => {
          const storageRef = ref(storage, `images/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`);
          const response = await fetch(uri);
          const blob = await response.blob();
          await uploadBytes(storageRef, blob);
          return getDownloadURL(storageRef);
        });
  
        imageUrls = await Promise.all(uploadPromises);
      }
  
      // Tạo bài viết mới
      const newPost = {
        tag,
        content,
        images: imageUrls, // Lưu danh sách URL ảnh
        location: location ? { latitude: location.coords.latitude, longitude: location.coords.longitude } : null,
        address: address || null,
        likes: [],
        comments: [],
        shares: 0,
        timestamp: serverTimestamp(),
        userID: user?.uid,
        username: user?.username,
      };
  
      // Thêm bài viết vào collection 'posts' và lấy postRef để cập nhật hashtag
      const postRef = await addDoc(collection(db, 'posts'), newPost);
  
      // Tách các hashtag từ nội dung bài viết
      const hashtags = extractHashtags(content);
  
      // Cập nhật hoặc tạo mới document cho từng hashtag trong collection 'hashtags'
      for (const tagItem of hashtags) {
        // Sử dụng tagItem làm document id (lưu ý: cần xử lý nếu tag có ký tự đặc biệt)
        const tagDocRef = doc(collection(db, 'hashtags'), tagItem);
        const tagDocSnap = await getDoc(tagDocRef);
  
        if (tagDocSnap.exists()) {
          // Nếu đã tồn tại, tăng count và thêm postId
          await updateDoc(tagDocRef, {
            count: increment(1),
            posts: arrayUnion(postRef.id),
          });
        } else {
          // Nếu chưa tồn tại, tạo document mới
          await setDoc(tagDocRef, {
            count: 1,
            posts: [postRef.id],
          });
        }
      }
  
      router.back();
    } catch (error) {
      console.error('Lỗi khi thêm bài viết: ', error);
    } finally {
      setLoading(false);
    }
  };

  const isButtonDisabled = !content && !image;

  return (
    <ScrollView style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: currentThemeColors.text }]}>Tạo bài viết</Text>
        <TouchableOpacity onPress={handleSave} disabled={isButtonDisabled || loading}>
          <Text style={[styles.headerButton, { color: isButtonDisabled || loading ? Colors.info : Colors.info }]}>
            {loading ? 'Đang đăng...' : 'Đăng'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        <TextInput
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={4}
          textColor={currentThemeColors.text}
          placeholder="Bạn đang nghĩ gì?"
          placeholderTextColor={Colors.text}
          activeUnderlineColor="transparent"
          underlineColor="transparent"
          style={[styles.textArea, { backgroundColor: currentThemeColors.background }]}
        />

        <View style={styles.imageContainer}>
          {image.length === 1 ? (
            <Image source={{ uri: image[0] }} style={styles.singleImage} resizeMode="cover" />
          ) : (
            <View style={styles.imageGrid}>
              {image.slice(0, 4).map((uri, index) => (
                <View key={index} style={[styles.gridItem]}>
                  <Image source={{ uri }} style={styles.image} resizeMode="cover" />
                  {index === 3 && image.length > 4 && (
                    <View style={styles.overlay}>
                      <Text style={styles.overlayText}>+{image.length - 4}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.imagePicker} onPress={pickImage} disabled={loading}>
          <FontAwesome5 name="image" size={24} color={currentThemeColors.icon} />
          <Text style={[styles.imagePickerText, { color: currentThemeColors.text }]}>
            {loading ? 'Đang chọn ảnh...' : 'Thêm ảnh'}
          </Text>
        </TouchableOpacity>

        {locationLoading ? (
          <Text style={{ color: currentThemeColors.text }}>Đang lấy vị trí...</Text>
        ) : address ? (
          <Text style={{ color: currentThemeColors.text }}>Vị trí: {address}</Text>
        ) : errorMsg ? (
          <Text style={{ color: currentThemeColors.text }}>Lỗi: {errorMsg}</Text>
        ) : (
          <Text style={{ color: currentThemeColors.text }}>Không có vị trí</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 35
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  textArea: {
    fontSize: 16,
    marginBottom: 16,
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  imagePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginBottom: 16,
  },
  imagePickerText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  singleImage: {
    width: "100%",
    height: 250,
    borderRadius: 10,
    marginBottom: 16,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginBottom: 16,
  },
  gridItem: {
    width: "48%",
    height: 120,
    borderRadius: 10,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  overlayText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
});

export default CreatePostScreen;
