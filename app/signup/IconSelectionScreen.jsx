import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, FlatList, ActivityIndicator, ImageBackground } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';
import { useLogoState } from '@/context/LogoStateContext';
import { Colors } from '@/constants/Colors';

const IconSelectionScreen = () => {
  const { setIcon } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const logoUrl = useLogoState();

  const [icons, setIcons] = useState([]);
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIcons = async () => {
      const storage = getStorage();
      const iconRef = ref(storage, 'Icons/');
      try {
        const iconList = await listAll(iconRef);
        const urls = await Promise.all(iconList.items.map((item) => getDownloadURL(item)));
        setIcons(urls);
      } catch (error) {
        console.error('Error fetching icons: ', error);
      } finally {
        setLoading(false);
      }
    };
    fetchIcons();
  }, []);

  const handleIconSelect = useCallback(
    (icon) => {
      setSelectedIcon(icon);
      setIcon(icon);
    },
    [setIcon]
  );

  const handleNext = useCallback(() => {
    if (params.redirectTo === 'EditProfile') {
      router.back();
    } else {
      router.push('signup/EmailInputScreen');
    }
  }, [router, params.redirectTo]);

  const memoizedIcons = useMemo(() => icons, [icons]);

  const renderItem = useCallback(
    ({ item }) => (
      <TouchableOpacity onPress={() => handleIconSelect(item)}>
        <Image
          source={{ uri: item }}
          style={[
            styles.icon,
            selectedIcon === item && styles.selectedIcon,
          ]}
        />
      </TouchableOpacity>
    ),
    [selectedIcon, handleIconSelect]
  );

  const getItemLayout = (data, index) => ({
    length: 100,
    offset: 100 * index,
    index,
  });

  return (
    <ImageBackground
      source={require('../../assets/images/cover.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.container}>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logo} />
        ) : (
          <Text style={styles.loadingText}>Loading...</Text>
        )}
        <Text style={styles.title}>Choose an Icon</Text>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} />
        ) : (
          <FlatList
            data={memoizedIcons}
            keyExtractor={(item) => item}
            numColumns={3}
            renderItem={renderItem}
            getItemLayout={getItemLayout}
            contentContainerStyle={styles.iconContainer}
            extraData={selectedIcon}
          />
        )}
        <TouchableOpacity
          style={[styles.nextButton, !selectedIcon && styles.disabledButton]}
          onPress={handleNext}
          disabled={!selectedIcon}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.0)',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    color: Colors.gray,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  iconContainer: {
    marginVertical: 20,
  },
  icon: {
    width: 80,
    height: 80,
    margin: 10,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: 'rgba(156, 167, 44, 0.0)',
  },
  selectedIcon: {
    borderColor: Colors.primary, 
    borderWidth: 5,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    width: '100%',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default IconSelectionScreen;
