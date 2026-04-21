import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useThemedColors } from '@/hooks/useThemedColors';

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
  const colors = useThemedColors();
  const hs = colors.hotSpots;
  
  return (
    <View style={styles.interactionContainer}>
      {/* Chỉ hiển thị nút Quan tâm - user không thể tự check-in hay join */}
      <TouchableOpacity
        style={[
          styles.interactionButton,
          { borderColor: hs.primary, backgroundColor: hs.surface },
          isInterested && { backgroundColor: hs.primary, borderColor: hs.primary }
        ]}
        onPress={() => onInteract('interested')}
        activeOpacity={0.8}
      >
        <FontAwesome
          name={isInterested ? 'star' : 'star-o'}
          size={20}
          color={isInterested ? '#fff' : hs.textSecondary}
        />
        <Text style={[
          styles.interactionText,
          { color: isInterested ? '#fff' : hs.text }
        ]}>
          {isInterested ? 'Đã quan tâm' : 'Quan tâm'}
        </Text>
      </TouchableOpacity>

      {/* Hiển thị trạng thái check-in nếu đã check-in (chỉ hiển thị, không cho click) */}
      {isCheckedIn && (
        <View style={[styles.interactionButton, { backgroundColor: hs.secondary, borderColor: hs.secondary }]}>
          <FontAwesome name="check-circle" size={20} color="#fff" />
          <Text style={[styles.interactionText, { color: '#fff' }]}>
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
    borderWidth: 1.5,
    // Theme colors applied dynamically
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  interactionText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
    // Color applied dynamically
  },
  interestedButtonActive: {
    // Styles applied dynamically
  },
  interestedTextActive: {
    // Color applied dynamically
  },
  checkedInButton: {
    // Styles applied dynamically
  },
  checkedInText: {
    // Color applied dynamically
  },
});

export default InteractionButtons;
