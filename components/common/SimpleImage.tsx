import React from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SimpleImageProps {
  source: string;
  style: any;
  fallbackIcon?: string;
}

const SimpleImage: React.FC<SimpleImageProps> = ({ 
  source, 
  style, 
  fallbackIcon = 'image-outline' 
}) => {
  const [hasError, setHasError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  const handleError = () => {
    console.log('SimpleImage error loading:', source);
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    console.log('SimpleImage loaded successfully:', source);
    setIsLoading(false);
    setHasError(false);
  };

  if (!source || hasError) {
    return (
      <View style={[style, styles.fallbackContainer]}>
        <Ionicons name={fallbackIcon as any} size={40} color="#ccc" />
      </View>
    );
  }

  return (
    <View style={style}>
      {isLoading && (
        <View style={[StyleSheet.absoluteFill, styles.loadingContainer]}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#ccc" />
        </View>
      )}
      <Image
        source={{ uri: source }}
        style={[StyleSheet.absoluteFill, { opacity: isLoading ? 0 : 1 }]}
        onError={handleError}
        onLoad={handleLoad}
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  fallbackContainer: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SimpleImage;
