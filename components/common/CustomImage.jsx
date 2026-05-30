import React, {
    useState,
    useRef,
    useEffect,
    useCallback,
    useMemo,
} from 'react';

import {
    View,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Text,
    Dimensions,
    StatusBar,
    FlatList,
} from 'react-native';

import { Image } from 'expo-image';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from 'react-native-gesture-handler';

import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    runOnJS,
} from 'react-native-reanimated';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const AnimatedImage = Animated.createAnimatedComponent(Image);

const MIN_SCALE = 0.5;
const MAX_SCALE = 5;
const ZOOM_THRESHOLD = 1.1;

// Hàm clamp (worklet)
const clamp = (value, min, max) => {
    'worklet';
    return Math.min(Math.max(value, min), max);
};

const ZoomableImage = ({ source, onZoomChange }) => {
    const [containerHeight, setContainerHeight] = useState(screenHeight * 0.7);
    const [panEnabled, setPanEnabled] = useState(false); // 👈 boolean state cho gesture

    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    const originScale = useSharedValue(1);
    const originX = useSharedValue(0);
    const originY = useSharedValue(0);

    const focalRelX = useSharedValue(0);
    const focalRelY = useSharedValue(0);

    // Shared value vẫn giữ lại để dùng nội bộ
    const isZoomed = useSharedValue(false);

    useEffect(() => {
        scale.value = 1;
        translateX.value = 0;
        translateY.value = 0;
        isZoomed.value = false;
        runOnJS(onZoomChange)(false);
        runOnJS(setPanEnabled)(false);
    }, [source]);

    const reportZoom = (zoomed) => {
        onZoomChange?.(zoomed);
    };

    const updateZoomState = (newScale) => {
        'worklet';
        const zoomed = newScale > 1;
        isZoomed.value = zoomed;
        runOnJS(setPanEnabled)(zoomed);
        runOnJS(reportZoom)(zoomed);
    };

    const clampTranslation = () => {
        'worklet';
        const viewWidth = screenWidth;
        const viewHeight = containerHeight;
        const scaledWidth = screenWidth * scale.value;
        const scaledHeight = containerHeight * scale.value;

        const maxTx = Math.max(0, (scaledWidth - viewWidth) / 2 / scale.value);
        const maxTy = Math.max(0, (scaledHeight - viewHeight) / 2 / scale.value);

        translateX.value = clamp(translateX.value, -maxTx, maxTx);
        translateY.value = clamp(translateY.value, -maxTy, maxTy);
    };

    // Pan gesture: enabled dùng boolean state thay vì SharedValue
    const pan = Gesture.Pan()
        .enabled(panEnabled)  // ✅ boolean
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
            clampTranslation();
        });

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
            scale.value = clamp(originScale.value * delta, MIN_SCALE, MAX_SCALE);

            translateX.value =
                originX.value * delta + focalRelX.value * (1 - delta);
            translateY.value =
                originY.value * delta + focalRelY.value * (1 - delta);

            updateZoomState(scale.value);
        })
        .onEnd(() => {
            if (scale.value < ZOOM_THRESHOLD) {
                scale.value = withSpring(1);
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
                isZoomed.value = false;
                runOnJS(setPanEnabled)(false);
                runOnJS(reportZoom)(false);
            } else {
                clampTranslation();
                updateZoomState(scale.value);
            }
        });

    const doubleTap = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd((g) => {
            const currentScale = scale.value;
            const targetScale = currentScale > 1 ? 1 : 2.5;
            const delta = targetScale / currentScale;

            const tapFocalX = g.x - screenWidth / 2;
            const tapFocalY = g.y - containerHeight / 2;

            let newTransX = translateX.value * delta + tapFocalX * (1 - delta);
            let newTransY = translateY.value * delta + tapFocalY * (1 - delta);

            const viewWidth = screenWidth;
            const viewHeight = containerHeight;
            const scaledWidth = screenWidth * targetScale;
            const scaledHeight = containerHeight * targetScale;
            const maxTx = Math.max(0, (scaledWidth - viewWidth) / 2 / targetScale);
            const maxTy = Math.max(0, (scaledHeight - viewHeight) / 2 / targetScale);

            newTransX = clamp(newTransX, -maxTx, maxTx);
            newTransY = clamp(newTransY, -maxTy, maxTy);

            translateX.value = withSpring(newTransX);
            translateY.value = withSpring(newTransY);
            scale.value = withSpring(targetScale);

            updateZoomState(targetScale);
        });

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
                onLayout={(e) => {
                    const { height } = e.nativeEvent.layout;
                    setContainerHeight(height);
                }}
            >
                <AnimatedImage
                    source={source}
                    style={[styles.fullImage, animatedStyle]}
                    contentFit="contain"
                />
            </View>
        </GestureDetector>
    );
};

const CustomImage = ({
    source,
    style,
    type = 'normal',
    onLongPress,
    images = null,
    initialIndex = 0,
}) => {
    const insets = useSafeAreaInsets();
    const [modalVisible, setModalVisible] = useState(false);
    const [scrollEnabled, setScrollEnabled] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const flatListRef = useRef(null);

    const handleOpenModal = useCallback(() => {
        setModalVisible(true);
        setCurrentIndex(initialIndex);
    }, [initialIndex]);

    const handleCloseModal = useCallback(() => {
        setModalVisible(false);
    }, []);

    const galleryData = useMemo(() => {
        if (images && images.length > 0) return images;
        if (source) return [source];
        if (type === 'cover') return [null];
        return [];
    }, [images, source, type]);

    const resolveSource = (img) => {
        if (img == null) return require('../../assets/images/cover.webp');
        if (typeof img === 'string') return { uri: img };
        return img;
    };

    const thumbnailSource = useMemo(() => {
        if (type === 'cover') {
            return source && typeof source === 'string' && source.trim()
                ? { uri: source }
                : require('../../assets/images/cover.webp');
        }
        return resolveSource(source);
    }, [source, type]);

    const renderItem = useCallback(
        ({ item }) => {
            const itemSource = type === 'cover' && !item
                ? require('../../assets/images/cover.webp')
                : resolveSource(item);

            return (
                <ZoomableImage
                    source={itemSource}
                    onZoomChange={(isZoomed) => setScrollEnabled(!isZoomed)}
                />
            );
        },
        [type]
    );

    const getItemLayout = useCallback(
        (_, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
        }),
        []
    );

    const keyExtractor = useCallback(
        (item, index) => `${item || 'cover'}-${index}`,
        []
    );

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index ?? 0);
        }
    }).current;

    const viewabilityConfig = useRef({
        viewAreaCoveragePercentThreshold: 50,
    }).current;

    const handleNext = useCallback(() => {
        if (currentIndex < galleryData.length - 1) {
            const nextIndex = currentIndex + 1;
            flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
            setCurrentIndex(nextIndex);
        }
    }, [currentIndex, galleryData.length]);

    const handlePrev = useCallback(() => {
        if (currentIndex > 0) {
            const prevIndex = currentIndex - 1;
            flatListRef.current?.scrollToIndex({ index: prevIndex, animated: true });
            setCurrentIndex(prevIndex);
        }
    }, [currentIndex]);

    return (
        <View style={[style, { overflow: 'hidden' }]}>
            <TouchableOpacity
                activeOpacity={0.95}
                onPress={handleOpenModal}
                onLongPress={onLongPress}
                style={styles.thumbnail}
            >
                <Image
                    source={thumbnailSource}
                    style={styles.thumbnailImage}
                    contentFit="cover"
                    transition={100}
                    cachePolicy="memory-disk"
                    recyclingKey={source || 'cover'}
                />
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={handleCloseModal}
                statusBarTranslucent
            >
                <GestureHandlerRootView style={styles.modalBackground}>
                    <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
                        <TouchableOpacity style={styles.closeButton} onPress={handleCloseModal}>
                            <MaterialIcons name="close" size={28} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.instructionText}>
                            {galleryData.length > 1
                                ? `${currentIndex + 1} / ${galleryData.length}`
                                : ''}
                        </Text>
                        <View style={styles.placeholder} />
                    </View>

                    <FlatList
                        ref={flatListRef}
                        data={galleryData}
                        horizontal
                        pagingEnabled
                        scrollEnabled={scrollEnabled}
                        initialScrollIndex={Math.min(initialIndex, galleryData.length - 1)}
                        getItemLayout={getItemLayout}
                        keyExtractor={keyExtractor}
                        renderItem={renderItem}
                        onViewableItemsChanged={onViewableItemsChanged}
                        viewabilityConfig={viewabilityConfig}
                        initialNumToRender={1}
                        maxToRenderPerBatch={1}
                        windowSize={3}
                        removeClippedSubviews
                        showsHorizontalScrollIndicator={false}
                    />

                    {galleryData.length > 1 && (
                        <>
                            {currentIndex > 0 && (
                                <TouchableOpacity
                                    style={[styles.navButton, styles.leftNavButton]}
                                    onPress={handlePrev}
                                >
                                    <MaterialIcons name="chevron-left" size={40} color="#fff" />
                                </TouchableOpacity>
                            )}
                            {currentIndex < galleryData.length - 1 && (
                                <TouchableOpacity
                                    style={[styles.navButton, styles.rightNavButton]}
                                    onPress={handleNext}
                                >
                                    <MaterialIcons name="chevron-right" size={40} color="#fff" />
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                </GestureHandlerRootView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
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
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    closeButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    instructionText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        fontWeight: '600',
    },
    placeholder: {
        width: 42,
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
    navButton: {
        position: 'absolute',
        top: '50%',
        marginTop: -26,
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.35)',
        zIndex: 5,
    },
    leftNavButton: {
        left: 12,
    },
    rightNavButton: {
        right: 12,
    },
    thumbnail: {
        width: '100%',
        height: '100%',
        flex: 1,
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
        flex: 1,
    },
});

export default React.memo(CustomImage);