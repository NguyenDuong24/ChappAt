import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share, Linking, Platform } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { HotSpot } from '@/types/hotSpots';
import { useRouter } from 'expo-router';

type ActionMenuProps = {
  hotSpot: HotSpot;
};

const ActionMenu = ({ hotSpot }: ActionMenuProps) => {
  const router = useRouter();

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this hot spot: ${hotSpot.title}! Find it on ChappAt.`,
        url: 'https://example.com/hotspot/' + hotSpot.id, // Replace with your app's deep link URL
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
      pathname: '/AddFriend', // Corrected path
      params: { hotSpotId: hotSpot.id, hotSpotTitle: hotSpot.title, context: 'inviteToHotSpot' },
    });
  };

  return (
    <View style={styles.actionsContainer}>
      <TouchableOpacity style={styles.actionButton} onPress={handleGetDirections}>
        <FontAwesome5 name="directions" size={20} color="#4ECDC4" />
        <Text style={styles.actionText}>Chỉ đường</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={handleInviteFriend}>
        <MaterialIcons name="person-add" size={24} color="#4ECDC4" />
        <Text style={styles.actionText}>Mời bạn</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
        <MaterialIcons name="share" size={24} color="#4ECDC4" />
        <Text style={styles.actionText}>Chia sẻ</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    marginTop: 5,
    fontSize: 12,
    color: '#333',
  },
});

export default ActionMenu;
