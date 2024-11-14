import React, { useState } from 'react';
import { View, Image, Modal, TouchableOpacity, StyleSheet } from 'react-native';

const CustomImage = ({ source, style, type = 'nomal' }) => {
  const [modalVisible, setModalVisible] = useState(false);
    console.log(123456, source)
  const handleOpenModal = () => setModalVisible(true);
  const handleCloseModal = () => setModalVisible(false);

  return (
    <View>
        <Image
            source={
            type === 'cover'
                ? require(source)  // If it's a 'cover' type, use a local image
                : { uri: source }  // Otherwise, use a URL
            }
            style={style} 
        />
    </View>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '90%',
    height: '90%',
    resizeMode: 'contain',
  },
  closeButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CustomImage;
