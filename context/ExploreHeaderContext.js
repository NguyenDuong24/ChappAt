import React, { createContext, useContext } from 'react';

// Create context with default values
export const ExploreHeaderContext = createContext({
  scrollY: null,
  handleScroll: null,
});

// Custom hook with error handling
export const useExploreHeader = () => {
  const context = useContext(ExploreHeaderContext);
  
  // Return context if available, otherwise return null
  if (context === undefined) {
    console.warn('useExploreHeader must be used within ExploreHeaderProvider');
    return null;
  }
  
  return context;
};

export const ExploreHeaderProvider = ExploreHeaderContext.Provider;
