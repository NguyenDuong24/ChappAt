import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';

const FullScreenImage = () => {
  const { imageUri } = useLocalSearchParams();
  const router = useRouter();

  const handleClose = () => {
    router.back();
  };
  console.log(1234, imageUri)

  return (
    
    <TouchableOpacity style={styles.modalContainer} onPress={handleClose} activeOpacity={1}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.fullImage} resizeMode="contain" />
        ) : (
          <Image source={require('../../assets/images/cover.png')} style={styles.fullImage} resizeMode="contain" />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Semi-transparent background for modal effect
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '90%',  // Slight padding to avoid touching edges
    height: '90%',
  },
});

export default FullScreenImage;
