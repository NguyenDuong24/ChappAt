// utils/fileUpload.js
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
// import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export const pickImage = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Cần quyền truy cập thư viện ảnh');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);

      return {
        uri: asset.uri,
        name: asset.fileName || `image_${Date.now()}.jpg`,
        type: 'image/jpeg',
        size: fileInfo.size || 0,
      };
    }
    return null;
  } catch (error) {
    console.error('Pick image error:', error);
    throw error;
  }
};

export const takePhoto = async () => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Cần quyền truy cập camera');
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);

      return {
        uri: asset.uri,
        name: `photo_${Date.now()}.jpg`,
        type: 'image/jpeg',
        size: fileInfo.size || 0,
      };
    }
    return null;
  } catch (error) {
    console.error('Take photo error:', error);
    throw error;
  }
};

// export const pickDocument = async () => {
//   try {
//     const result = await DocumentPicker.getDocumentAsync({
//       type: '*/*',
//       copyToCacheDirectory: true,
//       multiple: false,
//     });
// 
//     if (!result.canceled && result.assets[0]) {
//       const asset = result.assets[0];
//       return {
//         uri: asset.uri,
//         name: asset.name,
//         type: asset.mimeType || 'application/octet-stream',
//         size: asset.size || 0,
//       };
//     }
//     return null;
//   } catch (error) {
//     console.error('Pick document error:', error);
//     throw error;
//   }
// };

export const uploadFile = async (file, path, onProgress) => {
  try {
    const response = await fetch(file.uri);
    const blob = await response.blob();

    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error) {
    console.error('Upload file error:', error);
    throw error;
  }
};

export const deleteFile = async (path) => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Delete file error:', error);
    throw error;
  }
};