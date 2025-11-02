import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { EventInvite } from '@/types/eventInvites';
import { eventInviteService } from '@/services/eventInviteService';
import { useAuth } from '@/context/authContext';

interface EventChatHeaderProps {
  invite: EventInvite;
  onInviteUpdate: () => void;
}

const EventChatHeader: React.FC<EventChatHeaderProps> = ({
  invite,
  onInviteUpdate
}) => {
  const { user } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  const isInviter = user?.uid === invite.inviterId;
  const userConfirmed = isInviter ? invite.inviterConfirmed : invite.inviteeConfirmed;
  const otherConfirmed = isInviter ? invite.inviteeConfirmed : invite.inviterConfirmed;
  const bothConfirmed = invite.mutualConfirmed;

  // Calculate time left until event
  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date();
      const eventTime = new Date(invite.expiresAt);
      const diff = eventTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft('Đã hết hạn');
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(`${days} ngày ${hours % 24} giờ`);
      } else {
        setTimeLeft(`${hours} giờ ${minutes} phút`);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [invite.expiresAt]);

  const handleConfirmGoing = async () => {
    if (!user?.uid) return;
    
    setConfirming(true);
    try {
      const isMutualConfirmed = await eventInviteService.confirmGoing(invite.id, user.uid);
      
      if (isMutualConfirmed) {
        Alert.alert(
          '🎉 Hoàn tất!',
          'Cả hai bạn đã xác nhận sẽ đi cùng nhau! Giờ bạn sẽ không xuất hiện trong danh sách "quan tâm" nữa.',
          [{ text: 'Tuyệt vời!', onPress: onInviteUpdate }]
        );
      } else {
        Alert.alert(
          '✅ Đã xác nhận!',
          'Bạn đã xác nhận sẽ đi. Đang chờ người kia xác nhận...',
          [{ text: 'OK', onPress: onInviteUpdate }]
        );
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể xác nhận');
    } finally {
      setConfirming(false);
    }
  };

  const getStatusText = () => {
    if (bothConfirmed) {
      return '🎉 Cả hai đã xác nhận sẽ đi cùng!';
    } else if (userConfirmed && otherConfirmed) {
      return '⏳ Đang xử lý xác nhận...';
    } else if (userConfirmed) {
      return '✅ Bạn đã xác nhận. Đang chờ người kia...';
    } else if (otherConfirmed) {
      return '⏰ Người kia đã xác nhận. Bạn có đi không?';
    } else {
      return '💬 Hãy trò chuyện và quyết định có đi cùng nhau không!';
    }
  };

  const getStatusColor = (): [string, string, ...string[]] => {
    if (bothConfirmed) return ['#10B981', '#059669'];
    if (userConfirmed || otherConfirmed) return ['#F59E0B', '#D97706'];
    return ['#6B7280', '#4B5563'];
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={getStatusColor()}
        style={styles.statusBar}
      >
        <View style={styles.statusContent}>
          <MaterialIcons 
            name={bothConfirmed ? "check-circle" : "schedule"} 
            size={20} 
            color="white" 
          />
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
      </LinearGradient>

      <View style={styles.infoRow}>
        <View style={styles.timeLeftContainer}>
          <MaterialIcons name="schedule" size={16} color="#666" />
          <Text style={styles.timeLeftText}>Còn {timeLeft} đến sự kiện</Text>
        </View>
      </View>

      {!bothConfirmed && (
        <TouchableOpacity 
          style={[styles.confirmButton, userConfirmed && styles.confirmButtonDisabled]}
          onPress={handleConfirmGoing}
          disabled={userConfirmed || confirming}
        >
          <LinearGradient
            colors={userConfirmed ? ['#ccc', '#999'] : ['#EC4899', '#8B5CF6']}
            style={styles.confirmButtonGradient}
          >
            {confirming ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <MaterialIcons 
                  name={userConfirmed ? "check-circle" : "confirmation-number"} 
                  size={18} 
                  color="white" 
                />
                <Text style={styles.confirmButtonText}>
                  {userConfirmed ? "Đã xác nhận" : "🎟 Xác nhận sẽ đi cùng"}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      )}

      {bothConfirmed && (
        <View style={styles.matchedContainer}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.matchedBadge}
          >
            <MaterialIcons name="favorite" size={16} color="white" />
            <Text style={styles.matchedText}>💜 Đã có cặp</Text>
          </LinearGradient>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statusBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  infoRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
  },
  timeLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeLeftText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  confirmButton: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  matchedContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  matchedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  matchedText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});

export default EventChatHeader;
