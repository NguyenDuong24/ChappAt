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
      {/* Chỉ hiển thị nút Quan tâm - user không thể tự check-in hay join */}
      <TouchableOpacity
        style={[styles.interactionButton, isInterested && styles.interestedButton]}
        onPress={() => onInteract('interested')}
      >
        <FontAwesome name={isInterested ? 'star' : 'star-o'} size={20} color={isInterested ? '#fff' : '#FFC300'} />
        <Text style={[styles.interactionText, isInterested && styles.interestedText]}>
          {isInterested ? 'Đã quan tâm' : 'Quan tâm'}
        </Text>
      </TouchableOpacity>

      {/* Hiển thị trạng thái check-in nếu đã check-in (chỉ hiển thị, không cho click) */}
      {isCheckedIn && (
        <View style={[styles.interactionButton, styles.checkedInButton]}>
          <FontAwesome name="check-circle" size={24} color="#fff" />
          <Text style={[styles.interactionText, styles.checkedInText]}>
            Đã Check-in
          </Text>
        </View>
      )}
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
