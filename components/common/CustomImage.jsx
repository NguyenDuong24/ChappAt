import React, { useState } from 'react';
import { View, Image, Modal, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const CustomImage = ({ source, style, type = 'normal' }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleOpenModal = () => setModalVisible(true);
  const handleCloseModal = () => setModalVisible(false);

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
        onRequestClose={handleCloseModal} // Đóng modal khi nhấn nút back
      >
        <View style={styles.modalBackground}>
          <View style={styles.closeButtonContainer}>
            <TouchableOpacity onPress={handleCloseModal}>
              <MaterialIcons name="close" size={30} color="white" />
            </TouchableOpacity>
          </View>
          <Image source={imageSource} style={styles.fullImage} />
        </View>
      </Modal>
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
  closeButtonContainer: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
  },
  fullImage: {
    width: '90%',
    height: '90%',
    resizeMode: 'contain',
  },
});

export default CustomImage;
