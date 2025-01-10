import React, { useState, useContext } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Appbar, Avatar, Button, Drawer, RadioButton, TextInput } from 'react-native-paper';
import { useAuth } from '@/context/authContext';
import { FontAwesome } from 'react-native-vector-icons';
import { ThemeContext } from '@/context/ThemeContext'; 
import { Colors } from '@/constants/Colors'; 
import useHome from '../../app/(tabs)/home/useHome';
import { useStateCommon } from '../../context/stateCommon.jsx';

const HomeHeader = () => {
  const { stateCommon, setStateCommon } = useStateCommon()
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
        <Appbar.Action icon="filter" onPress={toggleDrawer} color={currentThemeColors.text} />
        <Appbar.Content title="Chat App" titleStyle={[styles.title, { color: currentThemeColors.text }]} />
        <View style={styles.rightContainer}>
          <Text style={[styles.greeting, { color: currentThemeColors.text }]}>
            Chào, {user ? user.displayName : ''}!
          </Text>
          {user && user.photoURL ? (
            <Avatar.Image size={40} source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <FontAwesome name="user-circle" size={40} color={currentThemeColors.text} style={styles.avatar} />
          )}
        </View>
      </Appbar.Header>
      {drawerVisible && (
        <Drawer.Section style={[styles.drawerSection, { backgroundColor: currentThemeColors.background }]}>
          <Drawer.Item label="Lọc theo giới tính" />
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
            />
            <TextInput
              value={maxAge}
              placeholder="Tuổi tối đa"
              onChangeText={setMaxAge}
              keyboardType="numeric"
              style={styles.ageInput}
              mode="outlined"
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button mode="contained" onPress={applyFilters} color={currentThemeColors.accent}>
              Áp dụng bộ lọc
            </Button>
          </View>
        </Drawer.Section>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    justifyContent: 'space-between',
    paddingTop: 0,
    height: 50,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 20,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    marginRight: 10,
  },
  avatar: {
    marginRight: 10,
  },
  drawerSection: {
    position: 'absolute',
    top: 56,
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
  },
  buttonContainer: {
    padding: 20,
  },
});

export default HomeHeader;
