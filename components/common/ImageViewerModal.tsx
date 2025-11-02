import React, { useState, useEffect } from 'react';
import {
  View,
  Image,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Text,
  Dimensions,
  StatusBar,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ImageViewerModalProps {
  images: string[];
  visible: boolean;
  initialIndex?: number;
  onClose: () => void;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  images,
  visible,
  initialIndex = 0,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    setCurrentIndex(index);
  };

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      console.log('ImageViewerModal opened with images:', images.length, 'initialIndex:', initialIndex);
    }
  }, [visible, initialIndex]);

  if (!visible || !images || images.length === 0) {
    console.log('ImageViewerModal not showing - visible:', visible, 'images length:', images?.length);
    return null;
  }

  console.log('ImageViewerModal rendering with', images.length, 'images');

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.95)" />
      <View style={styles.container}>
        <View style={styles.background}>
          <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>
              <Text style={styles.counter}>
                {currentIndex + 1} / {images.length}
              </Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Image Gallery */}
            <View style={styles.imageContainer}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScroll}
                contentOffset={{ x: currentIndex * screenWidth, y: 0 }}
                style={styles.scrollView}
              >
                {images.map((imageUri, index) => {
                  console.log('Rendering image in modal:', index, imageUri);
                  return (
                    <View key={index} style={styles.imageWrapper}>
                      <TouchableOpacity 
                        style={styles.gestureContainer}
                        activeOpacity={1}
                        onPress={() => {}}
                      >
                        <Image
                          source={{ uri: imageUri }}
                          style={styles.image}
                          resizeMode="contain"
                          onLoad={() => console.log('Modal image loaded:', index)}
                          onError={(error) => console.log('Modal image error:', index, error.nativeEvent)}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            {/* Indicators */}
            {images.length > 1 && (
              <View style={styles.indicators}>
                {images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.indicator,
                      index === currentIndex && styles.activeIndicator
                    ]}
                  />
                ))}
              </View>
            )}
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    height: 60,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  counter: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  imageWrapper: {
    width: screenWidth,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gestureContainer: {
    width: screenWidth,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(50, 50, 50, 0.3)', // Debug background
  },
  image: {
    width: screenWidth - 40,
    height: screenHeight * 0.7,
    backgroundColor: 'transparent',
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: 'white',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default ImageViewerModal;
