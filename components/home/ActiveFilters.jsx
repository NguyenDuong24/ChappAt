import React, { useContext } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Chip } from 'react-native-paper';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const ActiveFilters = ({ filters, onClearFilter, onClearAll }) => {
  const theme = useContext(ThemeContext)?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  const hasActiveFilters = filters?.gender || filters?.minAge || filters?.maxAge;

  if (!hasActiveFilters) return null;

  const getGenderDisplayName = (gender) => {
    switch (gender) {
      case 'male': return 'Nam';
      case 'female': return 'Nữ';
      case 'all': return 'Tất cả';
      default: return '';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: currentThemeColors.text }]}>
          Bộ lọc đang áp dụng
        </Text>
        <Chip
          mode="outlined"
          onPress={onClearAll}
          textStyle={{ fontSize: 12 }}
          style={styles.clearAllChip}
          icon="close"
        >
          Xóa tất cả
        </Chip>
      </View>
      
      <View style={styles.filtersContainer}>
        {filters?.gender && filters.gender !== 'all' && (
          <Chip
            mode="flat"
            onClose={() => onClearFilter('gender')}
            style={[styles.filterChip, { backgroundColor: currentThemeColors.primary + '20' }]}
            textStyle={{ color: currentThemeColors.primary }}
            icon="account"
          >
            {getGenderDisplayName(filters.gender)}
          </Chip>
        )}
        
        {filters?.minAge && (
          <Chip
            mode="flat"
            onClose={() => onClearFilter('minAge')}
            style={[styles.filterChip, { backgroundColor: currentThemeColors.accent + '20' }]}
            textStyle={{ color: currentThemeColors.accent }}
            icon="numeric"
          >
            Từ {filters.minAge} tuổi
          </Chip>
        )}
        
        {filters?.maxAge && (
          <Chip
            mode="flat"
            onClose={() => onClearFilter('maxAge')}
            style={[styles.filterChip, { backgroundColor: currentThemeColors.accent + '20' }]}
            textStyle={{ color: currentThemeColors.accent }}
            icon="numeric"
          >
            Đến {filters.maxAge} tuổi
          </Chip>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearAllChip: {
    height: 28,
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    height: 32,
  },
});

export default ActiveFilters;
