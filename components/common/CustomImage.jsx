import React, { useState, useRef } from 'react';
import { 
  View, 
  Image, 
  Modal, 
  TouchableOpacity, 
  StyleSheet, 
  Text, 
  Dimensions,
  StatusBar
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CustomImage = ({ source, style, type = 'normal' }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const containerRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(screenHeight * 0.7);

  // Gesture values
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Temporary values for gestures
  const originScale = useSharedValue(1);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const focalRelX = useSharedValue(0);
  const focalRelY = useSharedValue(0);

  const handleOpenModal = () => {
    setModalVisible(true);
    // Reset values
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  // Pinch gesture
  const pinch = Gesture.Pinch()
    .onStart((g) => {
      originScale.value = scale.value;
      originX.value = translateX.value;
      originY.value = translateY.value;
      focalRelX.value = g.focalX - screenWidth / 2;
      focalRelY.value = g.focalY - containerHeight / 2;
    })
    .onUpdate((g) => {
      const delta = g.scale;
      scale.value = Math.max(0.5, Math.min(5, originScale.value * delta));
      translateX.value = originX.value * delta + focalRelX.value * (1 - delta);
      translateY.value = originY.value * delta + focalRelY.value * (1 - delta);
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
      // Optional: clamp translations here if needed
    });

  // Pan gesture
  const pan = Gesture.Pan()
    .onStart(() => {
      originX.value = translateX.value;
      originY.value = translateY.value;
    })
    .onUpdate((g) => {
      if (g.numberOfPointers !== 1) return;
      translateX.value = originX.value + g.translationX / scale.value;
      translateY.value = originY.value + g.translationY / scale.value;
    })
    .onEnd(() => {
      // Clamp to bounds
      const viewWidth = screenWidth;
      const viewHeight = containerHeight;
      const imageWidth = screenWidth; // Assuming full width for contain
      const imageHeight = containerHeight;
      const scaledWidth = imageWidth * scale.value;
      const scaledHeight = imageHeight * scale.value;
      const maxTx = Math.max(0, (scaledWidth - viewWidth) / 2 / scale.value);
      const maxTy = Math.max(0, (scaledHeight - viewHeight) / 2 / scale.value);
      translateX.value = Math.max(-maxTx, Math.min(maxTx, translateX.value));
      translateY.value = Math.max(-maxTy, Math.min(maxTy, translateY.value));
    });

  // Double tap gesture
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((g) => {
      const currentScale = scale.value;
      const targetScale = currentScale > 1 ? 1 : 2.5;
      const delta = targetScale / currentScale;
      const tapFocalX = g.x - screenWidth / 2;
      const tapFocalY = g.y - containerHeight / 2;
      translateX.value = withSpring(translateX.value * delta + tapFocalX * (1 - delta));
      translateY.value = withSpring(translateY.value * delta + tapFocalY * (1 - delta));
      scale.value = withSpring(targetScale);
    });

  // Compose gestures: pinch simultaneous with (doubleTap or pan)
  const composedGestures = Gesture.Simultaneous(
    pinch,
    Gesture.Race(doubleTap, pan)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  let imageSource;
  if (type === 'cover') {
    imageSource = source
      ? { uri: source }
      : require('../../assets/images/cover.png');
  } else {
    imageSource = { uri: source };
  }

  return (
    <View>
      <TouchableOpacity onPress={handleOpenModal}>
        <Image source={imageSource} style={style} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <StatusBar backgroundColor="rgba(0, 0, 0, 0.9)" barStyle="light-content" />
        <GestureHandlerRootView style={styles.modalBackground}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleCloseModal}
            >
              <MaterialIcons name="close" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.instructionText}>Pinch or double tap to zoom</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Zoomable Image */}
          <GestureDetector gesture={composedGestures}>
            <View 
              style={styles.imageContainer} 
              ref={containerRef}
              onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
            >
              <Animated.Image
                source={imageSource}
                style={[styles.fullImage, animatedStyle]}
                resizeMode="contain"
              />
            </View>
          </GestureDetector>

          {/* Bottom Controls */}
          <View style={styles.bottomContainer}>
            <TouchableOpacity 
              style={styles.resetButton}
              onPress={() => {
                scale.value = withSpring(1);
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
              }}
            >
              <MaterialIcons name="zoom-out-map" size={20} color="white" />
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  placeholder: {
    width: 40,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: screenWidth,
    height: screenHeight * 0.8, // Adjusted for better fit
  },
  bottomContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  resetText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default CustomImage;