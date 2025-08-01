import React, { useState, useRef } from 'react';
import { 
  View, 
  Image, 
  Modal, 
  TouchableOpacity, 
  StyleSheet, 
  Text, 
  Animated,
  Dimensions,
  StatusBar,
  PanResponder
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CustomImage = ({ source, style, type = 'normal' }) => {
  const [modalVisible, setModalVisible] = useState(false);
  
  // Animation values
  const scale = useRef(new Animated.Value(1)).current;
  const pan = useRef(new Animated.ValueXY()).current;
  
  const handleOpenModal = () => {
    setModalVisible(true);
    // Reset values
    scale.setValue(1);
    pan.setValue({ x: 0, y: 0 });
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  // Create pan responder for zoom and pan
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      
      onPanResponderMove: (evt, gestureState) => {
        const { touches } = evt.nativeEvent;
        
        if (touches.length === 2) {
          // Handle pinch zoom
          const touch1 = touches[0];
          const touch2 = touches[1];
          
          const distance = Math.sqrt(
            Math.pow(touch2.pageX - touch1.pageX, 2) + 
            Math.pow(touch2.pageY - touch1.pageY, 2)
          );
          
          if (!gestureState.pinchDistance) {
            gestureState.pinchDistance = distance;
          }
          
          const scaleRatio = distance / gestureState.pinchDistance;
          const newScale = Math.max(0.5, Math.min(3, scaleRatio));
          scale.setValue(newScale);
        } else if (touches.length === 1) {
          // Handle pan
          Animated.event([null, { dx: pan.x, dy: pan.y }], {
            useNativeDriver: false,
          })(evt, gestureState);
        }
      },
      
      onPanResponderRelease: (evt, gestureState) => {
        // Reset pinch distance for next gesture
        gestureState.pinchDistance = null;
        
        // Check for double tap
        if (gestureState.dx === 0 && gestureState.dy === 0) {
          // Toggle zoom
          const currentScale = scale._value;
          const targetScale = currentScale > 1 ? 1 : 2;
          
          Animated.parallel([
            Animated.timing(scale, {
              toValue: targetScale,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(pan, {
              toValue: { x: 0, y: 0 },
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

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
        <View style={styles.modalBackground}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleCloseModal}
            >
              <MaterialIcons name="close" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.instructionText}>Pinch to zoom • Double tap to reset</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Zoomable Image */}
          <View style={styles.imageContainer} {...panResponder.panHandlers}>
            <Animated.Image
              source={imageSource}
              style={[
                styles.fullImage,
                {
                  transform: [
                    { scale },
                    { translateX: pan.x },
                    { translateY: pan.y },
                  ],
                },
              ]}
              resizeMode="contain"
            />
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomContainer}>
            <TouchableOpacity 
              style={styles.resetButton}
              onPress={() => {
                Animated.parallel([
                  Animated.timing(scale, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                  }),
                  Animated.timing(pan, {
                    toValue: { x: 0, y: 0 },
                    duration: 300,
                    useNativeDriver: true,
                  }),
                ]).start();
              }}
            >
              <MaterialIcons name="zoom-out-map" size={20} color="white" />
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    width: screenWidth * 0.9,
    height: screenHeight * 0.7,
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
