import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import hotSpotInviteService from '@/services/hotSpotInviteService';
import { HotSpotInvite } from '@/types/hotSpotInvites';

interface GoTogetherConfirmProps {
  inviteId: string;
  userId: string;
  chatRoomId: string;
}

const GoTogetherConfirm: React.FC<GoTogetherConfirmProps> = ({
  inviteId,
  userId,
  chatRoomId,
}) => {
  const [invite, setInvite] = useState<HotSpotInvite | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!inviteId) return;

    const unsubscribe = onSnapshot(doc(db, 'hotSpotInvites', inviteId), (snapshot) => {
      if (snapshot.exists()) {
        setInvite({ id: snapshot.id, ...snapshot.data() } as HotSpotInvite);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [inviteId]);

  const handleConfirmGoing = async () => {
    if (!invite) return;

    setConfirming(true);
    try {
      await hotSpotInviteService.confirmGoingTogether(inviteId, userId);
      
      const isSender = invite.senderId === userId;
      const otherConfirmed = isSender
        ? invite.meetupDetails?.receiverConfirmed
        : invite.meetupDetails?.senderConfirmed;

      if (otherConfirmed) {
        Alert.alert(
          '🎉 Tuyệt vời!',
          'Cả hai đã xác nhận đi cùng! Hãy chuẩn bị cho buổi gặp mặt nhé!',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          '✅ Đã xác nhận',
          'Đang chờ người kia xác nhận...',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể xác nhận');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#8B5CF6" />
      </View>
    );
  }

  if (!invite || invite.status !== 'accepted') return null;

  const isSender = invite.senderId === userId;
  const userConfirmed = isSender
    ? invite.meetupDetails?.senderConfirmed
    : invite.meetupDetails?.receiverConfirmed;
  const otherConfirmed = isSender
    ? invite.meetupDetails?.receiverConfirmed
    : invite.meetupDetails?.senderConfirmed;
  const bothConfirmed = invite.meetupDetails?.senderConfirmed && invite.meetupDetails?.receiverConfirmed;

  if (bothConfirmed) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={styles.confirmedBanner}
        >
          <Ionicons name="checkmark-circle" size={24} color="white" />
          <View style={styles.textContainer}>
            <Text style={styles.confirmedTitle}>✨ Đã xác nhận đi cùng</Text>
            <Text style={styles.confirmedSubtitle}>
              Khi cả hai đến gần {invite.hotSpotTitle}, hệ thống sẽ tự động check-in
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(139, 92, 246, 0.1)', 'rgba(236, 72, 153, 0.1)']}
        style={styles.banner}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="people" size={32} color="#8B5CF6" />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Xác nhận đi cùng?</Text>
          <Text style={styles.subtitle}>
            Hãy xác nhận rằng bạn sẽ đi đến {invite.hotSpotTitle}
          </Text>

          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <MaterialIcons
                name={userConfirmed ? 'check-circle' : 'radio-button-unchecked'}
                size={20}
                color={userConfirmed ? '#10B981' : '#9CA3AF'}
              />
              <Text style={[styles.statusText, userConfirmed && styles.statusTextActive]}>
                Bạn
              </Text>
            </View>

            <View style={styles.statusDivider} />

            <View style={styles.statusItem}>
              <MaterialIcons
                name={otherConfirmed ? 'check-circle' : 'radio-button-unchecked'}
                size={20}
                color={otherConfirmed ? '#10B981' : '#9CA3AF'}
              />
              <Text style={[styles.statusText, otherConfirmed && styles.statusTextActive]}>
                Bạn bè
              </Text>
            </View>
          </View>

          {!userConfirmed && (
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirmGoing}
              disabled={confirming}
            >
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                style={styles.confirmButtonGradient}
              >
                {confirming ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="white" />
                    <Text style={styles.confirmButtonText}>Xác nhận đi cùng</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {userConfirmed && !otherConfirmed && (
            <View style={styles.waitingContainer}>
              <ActivityIndicator size="small" color="#8B5CF6" />
              <Text style={styles.waitingText}>Đang chờ bạn bè xác nhận...</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  banner: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 18,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  statusTextActive: {
    color: '#10B981',
  },
  statusDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
  },
  confirmButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
  },
  waitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  waitingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  confirmedBanner: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textContainer: {
    flex: 1,
  },
  confirmedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  confirmedSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
});

export default GoTogetherConfirm;
