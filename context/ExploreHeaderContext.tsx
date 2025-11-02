import React, { createContext, useContext } from 'react';
import { Animated } from 'react-native';

export type ExploreHeaderContextType = {
  scrollY: Animated.Value;
};

const ExploreHeaderContext = createContext<ExploreHeaderContextType | undefined>(undefined);

export const ExploreHeaderProvider: React.FC<{ value: ExploreHeaderContextType; children: React.ReactNode; }>
  = ({ value, children }) => (
    <ExploreHeaderContext.Provider value={value}>{children}</ExploreHeaderContext.Provider>
  );

export const useExploreHeader = (): ExploreHeaderContextType => {
  const ctx = useContext(ExploreHeaderContext);
  if (!ctx) {
    throw new Error('useExploreHeader must be used within ExploreHeaderProvider');
  }
  return ctx;
};

export default ExploreHeaderContext;
