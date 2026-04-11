import React, { createContext, useContext } from 'react';
import { Platform } from 'react-native';

export const HEADER_HEIGHT = Platform.OS === 'ios' ? 280 : 260;
export const COLLAPSED_HEADER_HEIGHT = Platform.OS === 'ios' ? 70 : 60;
export const SCROLL_DISTANCE = HEADER_HEIGHT - COLLAPSED_HEADER_HEIGHT;

// Create context with default values
export const ExploreHeaderContext = createContext({
  scrollY: null,
  handleScroll: null,
  scrollValues: {
    latest: null,
    trending: null,
    following: null
  },
  headerHeight: HEADER_HEIGHT,
  effectiveHeaderHeight: HEADER_HEIGHT,
  collapsedHeaderHeight: COLLAPSED_HEADER_HEIGHT,
});

// Custom hook with error handling
export const useExploreHeader = () => {
  const context = useContext(ExploreHeaderContext);

  if (context === undefined) {
    console.warn('useExploreHeader must be used within ExploreHeaderProvider');
    return null;
  }

  return context;
};

export const ExploreHeaderProvider = ExploreHeaderContext.Provider;
