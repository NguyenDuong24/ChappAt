import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';
import { useLogoState } from '@/context/LogoStateContext';

const IconSelectionScreen = () => {
  const { setIcon } = useAuth();
  const router = useRouter();
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
        console.error("Error fetching icons: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchIcons();
  }, []);

  const handleIconSelect = useCallback((icon) => {
    setSelectedIcon(icon);
    setIcon(icon);
  }, [setIcon]);

  const handleNext = useCallback(() => {
    router.push('signup/EmailInputScreen');
  }, [router]);

  const memoizedIcons = useMemo(() => icons, [icons]);

  const renderItem = useCallback(({ item }) => (
    <TouchableOpacity onPress={() => handleIconSelect(item)}>
      <Image
        source={{ uri: item }}
        style={[
          styles.icon,
          selectedIcon === item && styles.selectedIcon,
        ]}
      />
    </TouchableOpacity>
  ), [selectedIcon, handleIconSelect]);

  const getItemLayout = (data, index) => ({
    length: 100,
    offset: 100 * index,
    index,
  });

  return (
    <View style={styles.container}>
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={styles.logo} />
      ) : (
        <Text>Loading...</Text>
      )}
      <Text style={styles.title}>Choose an Icon</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#1e90ff" />
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fd',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
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
    borderWidth: 2,
    borderColor: '#ccc',
  },
  selectedIcon: {
    borderColor: '#1e90ff',
    borderWidth: 3,
  },
  nextButton: {
    backgroundColor: '#1e90ff',
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
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default IconSelectionScreen;
