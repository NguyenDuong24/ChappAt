import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';

type InteractionButtonsProps = {
  isInterested: boolean;
  isJoined: boolean;
  isCheckedIn: boolean;
  checkingIn: boolean;
  onInteract: (type: 'interested' | 'joined') => void;
  onCheckIn: () => void;
};

const InteractionButtons = ({
  isInterested,
  isJoined,
  isCheckedIn,
  checkingIn,
  onInteract,
  onCheckIn,
}: InteractionButtonsProps) => {
  return (
    <View style={styles.interactionContainer}>
      <TouchableOpacity
        style={[styles.interactionButton, isInterested && styles.interestedButton]}
        onPress={() => onInteract('interested')}
      >
        <FontAwesome name={isInterested ? 'star' : 'star-o'} size={20} color={isInterested ? '#fff' : '#FFC300'} />
        <Text style={[styles.interactionText, isInterested && styles.interestedText]}>
          Quan tâm
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.interactionButton, isJoined && styles.joinedButton]}
        onPress={() => onInteract('joined')}
      >
        <MaterialIcons name={isJoined ? 'event-available' : 'event'} size={24} color={isJoined ? '#fff' : '#4ECDC4'} />
        <Text style={[styles.interactionText, isJoined && styles.joinedText]}>
          {isJoined ? 'Đã tham gia' : 'Tham gia'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.interactionButton, isCheckedIn && styles.checkedInButton]}
        onPress={onCheckIn}
        disabled={isCheckedIn || checkingIn}
      >
        {checkingIn ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <FontAwesome name="check-circle" size={24} color={isCheckedIn ? '#fff' : '#45B8AC'} />
        )}
        <Text style={[styles.interactionText, isCheckedIn && styles.checkedInText]}>
          {isCheckedIn ? 'Đã Check-in' : 'Check-in'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  interactionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#F9F9F9',
  },
  interactionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  interactionText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  interestedButton: {
    backgroundColor: '#FFC300',
    borderColor: '#FFC300',
  },
  interestedText: {
    color: '#fff',
  },
  joinedButton: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  joinedText: {
    color: '#fff',
  },
  checkedInButton: {
    backgroundColor: '#45B8AC',
    borderColor: '#45B8AC',
  },
  checkedInText: {
    color: '#fff',
  },
});

export default InteractionButtons;
