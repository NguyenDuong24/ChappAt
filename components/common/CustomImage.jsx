import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Image,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Text,
  Dimensions,
  StatusBar,
  FlatList
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, runOnJS } from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ZoomableImage = ({ source, onZoomChange }) => {
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

  useEffect(() => {
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
  }, [source]);

  const reportZoom = (isZoomed) => {
    if (onZoomChange) {
      onZoomChange(isZoomed);
    }
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

      if (scale.value > 1.1) {
        runOnJS(reportZoom)(true);
      }
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        runOnJS(reportZoom)(false);
      } else if (scale.value === 1) {
        runOnJS(reportZoom)(false);
      }
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
      const imageWidth = screenWidth;
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

      if (targetScale > 1) {
        runOnJS(reportZoom)(true);
      } else {
        runOnJS(reportZoom)(false);
      }
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

  return (
    <GestureDetector gesture={composedGestures}>
      <View
        style={[styles.imageContainer, { width: screenWidth }]}
        onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
      >
        <Animated.Image
          source={source}
          style={[styles.fullImage, animatedStyle]}
          resizeMode="contain"
        />
      </View>
    </GestureDetector>
  );
};

const CustomImage = ({ source, style, type = 'normal', onLongPress, images = null, initialIndex = 0 }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef(null);

  const handleOpenModal = () => {
    setModalVisible(true);
    setCurrentIndex(initialIndex);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  const handleNext = () => {
    if (currentIndex < galleryData.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      flatListRef.current?.scrollToIndex({ index: prevIndex, animated: true });
      setCurrentIndex(prevIndex);
    }
  };

  let thumbnailSource;
  if (type === 'cover') {
    thumbnailSource = source
      ? { uri: source }
      : require('../../assets/images/cover.png');
  } else {
    thumbnailSource = { uri: source };
  }

  // Prepare gallery data
  const galleryData = images && images.length > 0
    ? images
    : (source ? [source] : (type === 'cover' ? [null] : []));

  const renderItem = ({ item }) => {
    const itemSource = type === 'cover' && !item
      ? require('../../assets/images/cover.png')
      : { uri: item };

    return (
      <ZoomableImage
        source={itemSource}
        onZoomChange={(isZoomed) => setScrollEnabled(!isZoomed)}
      />
    );
  };

  return (
    <View style={style}>
      <TouchableOpacity
        onPress={handleOpenModal}
        onLongPress={onLongPress}
        style={{ width: '100%', height: '100%' }}
      >
        <Image source={thumbnailSource} style={{ width: '100%', height: '100%' }} />
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
            <Text style={styles.instructionText}>
              {galleryData.length > 1
                ? `${currentIndex + 1} / ${galleryData.length}`
                : ""}
            </Text>
            <View style={styles.placeholder} />
          </View>

          {/* Gallery */}
          <FlatList
            ref={flatListRef}
            data={galleryData}
            horizontal
            pagingEnabled
            scrollEnabled={scrollEnabled}
            initialScrollIndex={initialIndex}
            getItemLayout={(data, index) => (
              { length: screenWidth, offset: screenWidth * index, index }
            )}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderItem}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
              setCurrentIndex(newIndex);
            }}
            showsHorizontalScrollIndicator={false}
          />

          {/* Navigation Buttons */}
          {galleryData.length > 1 && (
            <>
              {currentIndex > 0 && (
                <TouchableOpacity style={[styles.navButton, styles.leftNavButton]} onPress={handlePrev}>
                  <MaterialIcons name="chevron-left" size={40} color="white" />
                </TouchableOpacity>
              )}
              {currentIndex < galleryData.length - 1 && (
                <TouchableOpacity style={[styles.navButton, styles.rightNavButton]} onPress={handleNext}>
                  <MaterialIcons name="chevron-right" size={40} color="white" />
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Bottom Controls */}
          <View style={styles.bottomContainer}>
            {/* Optional: Add indicators or other controls */}
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
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
    height: screenHeight,
  },
  fullImage: {
    width: screenWidth,
    height: screenHeight * 0.8,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 20,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 25,
    zIndex: 5,
  },
  leftNavButton: {
    left: 10,
  },
  rightNavButton: {
    right: 10,
  },
});

export default CustomImage;