import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type RatingDisplayProps = {
  rating: number;
  reviewCount: number;
};

const RatingDisplay = ({ rating, reviewCount }: RatingDisplayProps) => {
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <MaterialIcons key={i} name="star" size={16} color="#FFC300" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <MaterialIcons key={i} name="star-half" size={16} color="#FFC300" />
        );
      } else {
        stars.push(
          <MaterialIcons key={i} name="star-outline" size={16} color="#FFC300" />
        );
      }
    }

    return stars;
  };

  return (
    <View style={styles.ratingContainer}>
      <View style={styles.starsContainer}>
        {renderStars()}
      </View>
      <Text style={styles.ratingText}>
        {rating.toFixed(1)} ({reviewCount} đánh giá)
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});

export default RatingDisplay;
