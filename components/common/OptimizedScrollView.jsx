import React, { useContext } from 'react';
import { ScrollView, Platform } from 'react-native';
import { ExploreHeaderContext } from '@/context/ExploreHeaderContext';

const OptimizedScrollView = ({ children, style, contentContainerStyle, ...props }) => {
  const { scrollY, handleScroll } = useContext(ExploreHeaderContext) || {};

  return (
    <ScrollView
      style={style}
      contentContainerStyle={contentContainerStyle}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={Platform.OS === 'android'}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={8}
      windowSize={10}
      getItemLayout={undefined}
      bounces={true}
      bouncesZoom={false}
      alwaysBounceVertical={false}
      decelerationRate="normal"
      {...props}
    >
      {children}
    </ScrollView>
  );
};

export default OptimizedScrollView;
