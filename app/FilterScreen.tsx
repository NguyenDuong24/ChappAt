import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface FilterSettings {
  ageRange: { min: number; max: number };
  distance: number;
  showOnlineOnly: boolean;
  interests: string[];
  education: string[];
  occupation: string[];
  height: { min: number; max: number };
  lookingFor: string[];
}

const FilterScreen = () => {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterSettings>({
    ageRange: { min: 18, max: 35 },
    distance: 50,
    showOnlineOnly: false,
    interests: [],
    education: [],
    occupation: [],
    height: { min: 150, max: 200 },
    lookingFor: [],
  });

  const availableInterests = [
    'Travel', 'Coffee', 'Photography', 'Music', 'Sports', 'Reading',
    'Movies', 'Art', 'Cooking', 'Dancing', 'Gaming', 'Fitness'
  ];

  const educationLevels = [
    'High School', 'Bachelor\'s', 'Master\'s', 'PhD', 'Other'
  ];

  const occupationCategories = [
    'Technology', 'Healthcare', 'Education', 'Business', 'Arts',
    'Engineering', 'Finance', 'Marketing', 'Student', 'Other'
  ];

  const relationshipTypes = [
    'Casual dating', 'Long-term relationship', 'Marriage', 'Friendship'
  ];

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  const resetFilters = () => {
    setFilters({
      ageRange: { min: 18, max: 35 },
      distance: 50,
      showOnlineOnly: false,
      interests: [],
      education: [],
      occupation: [],
      height: { min: 150, max: 200 },
      lookingFor: [],
    });
  };

  const applyFilters = () => {
    // Logic to apply filters and navigate back
    router.back();
  };

  const renderToggleSection = (
    title: string,
    items: string[],
    selectedItems: string[],
    onToggle: (item: string) => void
  ) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.tagsContainer}>
        {items.map((item) => (
          <TouchableOpacity
            key={item}
            style={[
              styles.tagItem,
              selectedItems.includes(item) && styles.tagItemSelected,
            ]}
            onPress={() => onToggle(item)}
          >
            <Text
              style={[
                styles.tagText,
                selectedItems.includes(item) && styles.tagTextSelected,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0F001A', '#2D0A4E']} style={StyleSheet.absoluteFill} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="close" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Filters</Text>
        <TouchableOpacity onPress={resetFilters}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Age Range */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Age Range: {filters.ageRange.min} - {filters.ageRange.max}
          </Text>
          <View style={styles.rangeContainer}>
            <TouchableOpacity style={styles.rangeButton}>
              <Text style={styles.rangeText}>{filters.ageRange.min}</Text>
            </TouchableOpacity>
            <Text style={styles.rangeLabel}>to</Text>
            <TouchableOpacity style={styles.rangeButton}>
              <Text style={styles.rangeText}>{filters.ageRange.max}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Distance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Distance: {filters.distance} km</Text>
          <View style={styles.rangeContainer}>
            <TouchableOpacity style={styles.rangeButton}>
              <Text style={styles.rangeText}>{filters.distance} km</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Height Range */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Height: {filters.height.min}cm - {filters.height.max}cm
          </Text>
          <View style={styles.rangeContainer}>
            <TouchableOpacity style={styles.rangeButton}>
              <Text style={styles.rangeText}>{filters.height.min}cm</Text>
            </TouchableOpacity>
            <Text style={styles.rangeLabel}>to</Text>
            <TouchableOpacity style={styles.rangeButton}>
              <Text style={styles.rangeText}>{filters.height.max}cm</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Online Only */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <Text style={styles.sectionTitle}>Show Online Only</Text>
            <Switch
              value={filters.showOnlineOnly}
              onValueChange={(value) =>
                setFilters({ ...filters, showOnlineOnly: value })
              }
              trackColor={{ false: 'rgba(255,255,255,0.3)', true: '#8A4AF3' }}
              thumbColor={filters.showOnlineOnly ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Interests */}
        {renderToggleSection(
          'Interests',
          availableInterests,
          filters.interests,
          (item) =>
            setFilters({
              ...filters,
              interests: toggleArrayItem(filters.interests, item),
            })
        )}

        {/* Education */}
        {renderToggleSection(
          'Education',
          educationLevels,
          filters.education,
          (item) =>
            setFilters({
              ...filters,
              education: toggleArrayItem(filters.education, item),
            })
        )}

        {/* Occupation */}
        {renderToggleSection(
          'Occupation',
          occupationCategories,
          filters.occupation,
          (item) =>
            setFilters({
              ...filters,
              occupation: toggleArrayItem(filters.occupation, item),
            })
        )}

        {/* Looking For */}
        {renderToggleSection(
          'Looking For',
          relationshipTypes,
          filters.lookingFor,
          (item) =>
            setFilters({
              ...filters,
              lookingFor: toggleArrayItem(filters.lookingFor, item),
            })
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Apply Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
          <LinearGradient
            colors={['#8A4AF3', '#5D3FD3']}
            style={styles.applyButtonGradient}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F001A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  resetText: {
    fontSize: 16,
    color: '#8A4AF3',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
  },
  rangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rangeButton: {
    backgroundColor: 'rgba(138,74,243,0.3)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#8A4AF3',
  },
  rangeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  rangeLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginHorizontal: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagItem: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tagItemSelected: {
    backgroundColor: '#8A4AF3',
    borderColor: '#8A4AF3',
  },
  tagText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  tagTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  applyButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSpace: {
    height: 40,
  },
});

export default FilterScreen;
