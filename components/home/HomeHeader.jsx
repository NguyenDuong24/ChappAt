import React, { useState, useContext } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Appbar, Avatar, Button, Drawer, RadioButton, TextInput } from 'react-native-paper';
import { useAuth } from '@/context/authContext';
import { FontAwesome } from 'react-native-vector-icons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import useHome from '../../app/(tabs)/home/useHome';
import { useStateCommon } from '../../context/stateCommon.jsx';
import Entypo from '@expo/vector-icons/Entypo';
import { useRouter } from 'expo-router';

const HomeHeader = () => {
  const router = useRouter();
  const { stateCommon, setStateCommon } = useStateCommon();
  const { user } = useAuth();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedGender, setSelectedGender] = useState('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');

  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  const toggleDrawer = () => {
    setDrawerVisible(!drawerVisible);
  };

    const clearFilters = () => {
    setSelectedGender('');
    setMinAge('');
    setMaxAge('');
    setStateCommon((prev) => ({
      ...prev,
      filter: {
        gender: '',
        minAge: '',
        maxAge: '',
      },
    }));
    toggleDrawer();
  };

  const applyFilters = () => {
    setStateCommon((prev) => ({
      ...prev,
      filter: {
        gender: selectedGender,
        minAge: minAge,
        maxAge: maxAge,
      },
    }));
    console.log(`Lọc theo: Giới tính = ${selectedGender}, Tuổi = ${minAge}-${maxAge}`);
    toggleDrawer();
  };

  return (
    <View>
      
      <Appbar.Header style={[styles.header, { backgroundColor: currentThemeColors.backgroundHeader }]}>
        <Appbar.Action icon="tune" onPress={toggleDrawer} color={currentThemeColors.text} />
        <Appbar.Content title="Chat App" titleStyle={[styles.title, { color: currentThemeColors.text }]} />
        <View style={styles.rightContainer}>
          <TouchableOpacity
            onPress={() => {
              router.push({ pathname: '/DeviceScan' });
            }}
            style={{ marginRight: 20 }}
          >
            <Entypo name="rss" size={24} color={currentThemeColors.text} />
          </TouchableOpacity>
        </View>
      </Appbar.Header>
      {drawerVisible && (
        <Drawer.Section style={[styles.drawerSection, { backgroundColor: currentThemeColors.background }]}>
          <View style={styles.drawerHeader}>
            <Drawer.Item label="Lọc theo giới tính" />
            <TouchableOpacity onPress={toggleDrawer} style={styles.closeButton}>
              <Entypo name="cross" size={24} color={currentThemeColors.text} />
            </TouchableOpacity>
          </View>
          <RadioButton.Group onValueChange={(value) => setSelectedGender(value)} value={selectedGender}>
            <RadioButton.Item label="Nam" value="male" />
            <RadioButton.Item label="Nữ" value="female" />
            <RadioButton.Item label="Cả 2" value="all" />
          </RadioButton.Group>
          <Drawer.Item label="Lọc theo tuổi" />
          <View style={styles.ageInputs}>
            <TextInput
              value={minAge}
              placeholder="Tuổi tối thiểu"
              onChangeText={setMinAge}
              keyboardType="numeric"
              style={styles.ageInput}
              mode="outlined"
              theme={{ colors: { primary: currentThemeColors.accent } }}
            />
            <TextInput
              value={maxAge}
              placeholder="Tuổi tối đa"
              onChangeText={setMaxAge}
              keyboardType="numeric"
              style={styles.ageInput}
              mode="outlined"
              theme={{ colors: { primary: currentThemeColors.accent } }}
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button mode="contained" onPress={applyFilters} color={currentThemeColors.accent}>
              Áp dụng bộ lọc
            </Button>
            <Button style={styles.buttonClear} mode="outlined" onPress={clearFilters} color={currentThemeColors.text}>
              Xóa bộ lọc
            </Button>
          </View>
        </Drawer.Section>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  drawerHeader: {
    marginTop: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 8,
  },
  closeButton: {
    padding: 12,
    backgroundColor: "transparent", // Làm nền nút đóng trong suốt
    borderWidth: 1, // Thêm viền để nút đóng dễ nhận diện
    borderRadius: 50, // Làm nút đóng tròn
    alignSelf: 'flex-end',
  },
  header: {
    justifyContent: 'space-between',
    height: 56, // Tăng chiều cao để Appbar có không gian thoáng
  },
  title: {
    fontWeight: 'bold',
    fontSize: 18, // Tăng kích thước chữ để tiêu đề nổi bật
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerSection: {
    position: 'absolute',
    top: 25,
    left: 0,
    right: 0,
    paddingTop: 20,
    zIndex: 1,
    elevation: 5,
  },
  ageInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginVertical: 10,
  },
  ageInput: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: 'transparent', // Làm nền input trong suốt
  },
  buttonContainer: {
    padding: 20,
  },
  buttonClear: {
    marginTop: 10,
    backgroundColor: 'transparent', // Làm nền nút xóa bộ lọc trong suốt
    borderColor: Colors.primary, // Thêm viền cho nút xóa bộ lọc
    borderWidth: 1,
  }
});

export default HomeHeader;
