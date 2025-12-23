import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

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
        style={[
          styles.interactionButton,
          isInterested && styles.interestedButtonActive
        ]}
        onPress={() => onInteract('interested')}
        activeOpacity={0.8}
      >
        <FontAwesome
          name={isInterested ? 'star' : 'star-o'}
          size={20}
          color={isInterested ? '#fff' : Colors.text}
        />
        <Text style={[
          styles.interactionText,
          isInterested && styles.interestedTextActive
        ]}>
          {isInterested ? 'Đã quan tâm' : 'Quan tâm'}
        </Text>
      </TouchableOpacity>

      {/* Hiển thị trạng thái check-in nếu đã check-in (chỉ hiển thị, không cho click) */}
      {isCheckedIn && (
        <View style={[styles.interactionButton, styles.checkedInButton]}>
          <FontAwesome name="check-circle" size={20} color="#fff" />
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
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  interactionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  interactionText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  interestedButtonActive: {
    backgroundColor: '#FFB703', // Warm yellow/orange
    borderColor: '#FFB703',
  },
  interestedTextActive: {
    color: '#fff',
  },
  checkedInButton: {
    backgroundColor: '#10B981', // Emerald green
    borderColor: '#10B981',
  },
  checkedInText: {
    color: '#fff',
  },
});

export default InteractionButtons;
