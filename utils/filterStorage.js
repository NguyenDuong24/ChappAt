import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key for filter preferences
export const FILTER_STORAGE_KEY = '@user_filter_preferences';

// Default filter structure
export const DEFAULT_FILTER = {
  gender: '',
  minAge: '',
  maxAge: '',
};

/**
 * Save filter preferences to AsyncStorage
 * @param {Object} filterData - Filter object with gender, minAge, maxAge
 */
export const saveFilterPreferences = async (filterData) => {
  try {
    const filterToSave = { ...DEFAULT_FILTER, ...filterData };
    await AsyncStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filterToSave));
    console.log('💾 Filter preferences saved:', filterToSave);
    return true;
  } catch (error) {
    console.error('❌ Error saving filter preferences:', error);
    return false;
  }
};

/**
 * Load filter preferences from AsyncStorage
 * @returns {Object} Filter object or default filter if not found
 */
export const loadFilterPreferences = async () => {
  try {
    const savedFilters = await AsyncStorage.getItem(FILTER_STORAGE_KEY);
    if (savedFilters) {
      const filterData = JSON.parse(savedFilters);
      console.log('📱 Loaded saved filters:', filterData);
      return { ...DEFAULT_FILTER, ...filterData };
    } else {
      console.log('📱 No saved filters found, using defaults');
      return DEFAULT_FILTER;
    }
  } catch (error) {
    console.error('❌ Error loading filter preferences:', error);
    return DEFAULT_FILTER;
  }
};

/**
 * Clear all filter preferences from AsyncStorage
 */
export const clearFilterPreferences = async () => {
  try {
    await AsyncStorage.removeItem(FILTER_STORAGE_KEY);
    console.log('🗑️ Filter preferences cleared from storage');
    return true;
  } catch (error) {
    console.error('❌ Error clearing filter preferences:', error);
    return false;
  }
};

/**
 * Get filter summary for display
 * @param {Object} filter - Filter object
 * @returns {string} Human readable filter summary
 */
export const getFilterSummary = (filter) => {
  const parts = [];
  
  if (filter.gender) {
    const genderText = filter.gender === 'male' ? 'Nam' : 
                     filter.gender === 'female' ? 'Nữ' : 'Tất cả';
    parts.push(`Giới tính: ${genderText}`);
  }
  
  if (filter.minAge || filter.maxAge) {
    const ageText = `Tuổi: ${filter.minAge || 'Không giới hạn'} - ${filter.maxAge || 'Không giới hạn'}`;
    parts.push(ageText);
  }
  
  return parts.length > 0 ? parts.join(' • ') : 'Chưa chọn bộ lọc nào';
};

/**
 * Check if filter has any active values
 * @param {Object} filter - Filter object
 * @returns {boolean} True if filter has active values
 */
export const hasActiveFilters = (filter) => {
  return !!(filter.gender || filter.minAge || filter.maxAge);
};

/**
 * Count active filter criteria
 * @param {Object} filter - Filter object
 * @returns {number} Number of active filter criteria
 */
export const getActiveFiltersCount = (filter) => {
  let count = 0;
  if (filter.gender && filter.gender !== 'all') count++;
  if (filter.minAge) count++;
  if (filter.maxAge) count++;
  return count;
};
