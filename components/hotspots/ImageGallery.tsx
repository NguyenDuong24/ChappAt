import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');

type ImageGalleryProps = {
  images: string[];
  thumbnail: string;
};

const ImageGallery = ({ images, thumbnail }: ImageGalleryProps) => {
  const [selectedImage, setSelectedImage] = useState(thumbnail);

  // Combine thumbnail with additional images, remove duplicates
  const allImages = [thumbnail, ...images.filter(img => img !== thumbnail)];

  if (allImages.length <= 1) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: selectedImage }} style={styles.mainImage} contentFit="cover" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image source={{ uri: selectedImage }} style={styles.mainImage} contentFit="cover" />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.thumbnailScroll}
        contentContainerStyle={styles.thumbnailContainer}
      >
        {allImages.map((image, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => setSelectedImage(image)}
            style={[
              styles.thumbnailWrapper,
              selectedImage === image && styles.selectedThumbnail
            ]}
          >
            <Image source={{ uri: image }} style={styles.thumbnail} contentFit="cover" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
  },
  mainImage: {
    width: '100%',
    height: 250,
  },
  thumbnailScroll: {
    marginTop: 10,
  },
  thumbnailContainer: {
    paddingHorizontal: 15,
  },
  thumbnailWrapper: {
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedThumbnail: {
    borderColor: '#4ECDC4',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
});

export default ImageGallery;
