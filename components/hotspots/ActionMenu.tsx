import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share, Linking, Platform, Alert } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { HotSpot } from '@/types/hotSpots';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import LiquidSurface from '@/components/liquid/LiquidSurface';

type ActionMenuProps = {
  hotSpot: HotSpot;
};

const ActionMenu = ({ hotSpot }: ActionMenuProps) => {
  const router = useRouter();
  const { theme } = useTheme();

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this hot spot: ${hotSpot.title}! Find it on ChappAt.`,
        url: `https://example.com/hotspot/${hotSpot.id}`,
      });
    } catch (error) {
      console.error('Error sharing hot spot:', error);
    }
  };

  const handleGetDirections = () => {
    const { latitude, longitude } = hotSpot.location.coordinates;
    const scheme = Platform.OS === 'ios' ? 'maps:0,0?q=' : 'geo:0,0?q=';
    const latLng = `${latitude},${longitude}`;
    const label = hotSpot.title;
    const url = Platform.OS === 'ios' ? `${scheme}${label}@${latLng}` : `${scheme}${latLng}(${label})`;
    Linking.openURL(url);
  };

  const handleInviteFriend = () => {
    router.push({
      pathname: '/AddFriend',
      params: { hotSpotId: hotSpot.id, hotSpotTitle: hotSpot.title, context: 'inviteToHotSpot' },
    });
  };

  const handleViewReviews = () => {
    Alert.alert('Feature in progress', 'Review screen will be added in a coming update.');
  };

  return (
    <LiquidSurface themeMode={theme} style={styles.actionsContainer} intensity={16} borderRadius={18}>
      <TouchableOpacity style={styles.actionButton} onPress={handleGetDirections}>
        <FontAwesome5 name="directions" size={20} color="#4ECDC4" />
        <Text style={styles.actionText}>Directions</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={handleInviteFriend}>
        <MaterialIcons name="person-add" size={24} color="#4ECDC4" />
        <Text style={styles.actionText}>Invite</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={handleViewReviews}>
        <MaterialIcons name="star" size={24} color="#4ECDC4" />
        <Text style={styles.actionText}>Reviews</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
        <MaterialIcons name="share" size={24} color="#4ECDC4" />
        <Text style={styles.actionText}>Share</Text>
      </TouchableOpacity>
    </LiquidSurface>
  );
};

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    marginHorizontal: 12,
    marginVertical: 8,
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(152, 214, 198, 0.35)',
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  actionText: {
    marginTop: 5,
    fontSize: 12,
    color: '#1A3A34',
    fontWeight: '600',
  },
});

export default ActionMenu;

