import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/authContext';
import { useRouter } from 'expo-router';

interface VibeSectionProps {
  userLocation?: { latitude: number; longitude: number; address?: string };
}

const VibeSection: React.FC<VibeSectionProps> = ({ userLocation }) => {
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const colors = theme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const { currentVibe, removeUserVibe, settingVibe } = useAuth();
  const [fadeAnim] = useState(new Animated.Value(1));

  const handleRemoveVibe = async () => {
    try {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();

      await removeUserVibe();

      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }, 300);
    } catch (error) {
      console.error('Error removing vibe:', error);
      // Reset animation if error
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const formatTimeAgo = (createdAt: any) => {
    if (!createdAt) return '';

    const now = new Date();
    const created = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const diff = now.getTime() - created.getTime();

    if (diff < 0) return 'Vừa xong';

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours > 0) {
      return `${hours} giờ trước`;
    } else if (minutes > 0) {
      return `${minutes} phút trước`;
    } else {
      return 'Vừa xong';
    }
  };

  const isExpired = (expiresAt: any) => {
    if (!expiresAt) return false;
    const now = new Date();
    const expiry = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
    return expiry.getTime() <= now.getTime();
  };

  if (currentVibe && currentVibe.isActive && !isExpired(currentVibe.expiresAt)) {
    return (
      <Animated.View style={[styles.vibeContainer, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={[currentVibe.vibe.color + '20', currentVibe.vibe.color + '10']}
          style={[styles.vibeGradient, { borderColor: currentVibe.vibe.color + '40' }]}
        >
          <View style={styles.vibeContent}>
            <View style={styles.vibeHeader}>
              <View style={styles.vibeInfo}>
                <Text style={[styles.vibeEmoji, { fontSize: 24 }]}>
                  {currentVibe.vibe.emoji}
                </Text>
                <View style={styles.vibeTextContainer}>
                  <Text style={[styles.vibeName, { color: colors.text }]}>
                    {currentVibe.vibe.name}
                  </Text>
                  {currentVibe.customMessage && (
                    <Text style={[styles.vibeMessage, { color: colors.text + '80' }]}>
                      "{currentVibe.customMessage}"
                    </Text>
                  )}
                  <Text style={[styles.vibeTime, { color: colors.text + '60' }]}>
                    {formatTimeAgo(currentVibe.createdAt)}
                  </Text>
                </View>
              </View>

              <View style={styles.vibeActions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.background + '80' }]}
                  onPress={() => router.push('/VibeScreen')}
                  disabled={settingVibe}
                >
                  <MaterialIcons name="edit" size={16} color={colors.text} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.background + '80' }]}
                  onPress={handleRemoveVibe}
                  disabled={settingVibe}
                >
                  <MaterialIcons name="close" size={16} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </LinearGradient>


      </Animated.View>
    );
  }

  // Show add vibe button when no current vibe
  return (
    <View style={styles.addVibeContainer}>
      <TouchableOpacity
        style={[styles.addVibeButton, {
          borderColor: colors.text + '30',
          backgroundColor: colors.background
        }]}
        onPress={() => router.push('/VibeScreen')}
        disabled={settingVibe}
      >
        <View style={styles.addVibeContent}>
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={Colors.primary}
          />
          <Text style={[styles.addVibeText, { color: colors.text }]}>
            Chia sẻ tâm trạng của bạn
          </Text>
        </View>
      </TouchableOpacity>


    </View>
  );
};

const styles = StyleSheet.create({
  vibeContainer: {
    marginVertical: 12,
  },
  vibeGradient: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  vibeContent: {
    padding: 16,
  },
  vibeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vibeInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  vibeEmoji: {
    marginRight: 12,
  },
  vibeTextContainer: {
    flex: 1,
  },
  vibeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  vibeMessage: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  vibeTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  vibeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addVibeContainer: {
    marginVertical: 12,
  },
  addVibeButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 16,
  },
  addVibeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addVibeText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default VibeSection;
