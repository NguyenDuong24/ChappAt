import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Text } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, onSnapshot, orderBy, query, setDoc, Timestamp,serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

export default function CreatePostScreen() {
  const [tag, setTag] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const router = useRouter();

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
    try {
      const newPost = {
        tag,
        content,
        image,
        likes: [],
        comments: [],
        shares: 0,
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, 'posts'), newPost);
      console.log('Post saved successfully');
      router.back();
    } catch (error) {
      console.error('Error adding post: ', error);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        mode="outlined"
        label="Content"
        value={content}
        onChangeText={setContent}
        multiline
        numberOfLines={4}
        style={[styles.input, styles.textArea]}
      />
      <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
        <Text style={styles.imagePickerText}>Pick an image</Text>
      </TouchableOpacity>
      {image && <Image source={{ uri: image }} style={styles.image} resizeMode="contain"/>}
      <Button mode="contained" onPress={handleSave} style={styles.button}>
        Save Post
      </Button>
      <Button mode="outlined" onPress={() => router.back()} color="red" style={styles.button}>
        Cancel
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  input: {
    marginBottom: 10,
  },
  textArea: {
    height: 100,
  },
  imagePicker: {
    backgroundColor: '#eee',
    padding: 10,
    alignItems: 'center',
    marginBottom: 10,
    borderRadius: 4,
  },
  imagePickerText: {
    color: '#555',
  },
  image: {
    height: 200,
    marginBottom: 10,
    borderRadius: 4,
  },
  button: {
    marginTop: 10,
  },
});
