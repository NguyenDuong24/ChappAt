import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface NotificationModalProps {
  visible: boolean;
  notification: {
    id: string;
    type: string;
    title: string;
    body: string;
    data?: any;
    senderAvatar?: string;
    senderName?: string;
  } | null;
  onClose: () => void;
  onAction: (action: string) => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  notification,
  onClose,
  onAction,
}) => {
  const router = useRouter();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!notification) return null;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like': return 'favorite';
      case 'comment': return 'comment';
      case 'follow': return 'person-add';
      case 'mention': return 'alternate-email';
      case 'message': return 'message';
      case 'group_message': return 'group';
      case 'friend_request': return 'person-add';
      default: return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'like': return ['#E91E63', '#FF4081'];
      case 'comment': return ['#FF9800', '#FFB74D'];
      case 'follow': return ['#4CAF50', '#66BB6A'];
      case 'mention': return ['#9C27B0', '#BA68C8'];
      case 'message': return ['#2196F3', '#42A5F5'];
      case 'group_message': return ['#FF5722', '#FF7043'];
      case 'friend_request': return ['#00BCD4', '#26C6DA'];
      default: return ['#6366F1', '#8B5CF6'];
    }
  };

  const handleViewContent = () => {
    onAction('view');
    onClose();
  };

  const handleViewProfile = () => {
    if (notification.data?.senderId || notification.data?.userId) {
      const userId = notification.data.senderId || notification.data.userId;
      router.push(`/(screens)/user/UserProfileScreen?userId=${userId}` as any);
      onClose();
    } else {
      Alert.alert('Lỗi', 'Không thể mở profile người dùng');
    }
  };

  const renderActionButtons = () => {
    switch (notification.type) {
      case 'like':
      case 'comment':
        return (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleViewContent}
            >
              <MaterialIcons name="visibility" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Xem bài viết</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handleViewProfile}
            >
              <MaterialIcons name="person" size={16} color="#666" />
              <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Xem profile</Text>
            </TouchableOpacity>
          </View>
        );

      case 'follow':
      case 'friend_request':
        return (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleViewProfile}
            >
              <MaterialIcons name="person" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Xem profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => onAction('follow_back')}
            >
              <MaterialIcons name="person-add" size={16} color="#666" />
              <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Theo dõi lại</Text>
            </TouchableOpacity>
          </View>
        );

      case 'message':
      case 'group_message':
        return (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => onAction('reply')}
            >
              <MaterialIcons name="reply" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Trả lời</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => onAction('mark_read')}
            >
              <MaterialIcons name="done" size={16} color="#666" />
              <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Đánh dấu đã đọc</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleViewContent}
          >
            <MaterialIcons name="open-in-new" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Mở</Text>
          </TouchableOpacity>
        );
    }
  };

  const colors = getNotificationColor(notification.type);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={[colors[0], colors[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <View style={styles.iconContainer}>
                <MaterialIcons
                  name={getNotificationIcon(notification.type) as any}
                  size={24}
                  color="#fff"
                />
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <View style={styles.content}>
            <View style={styles.senderInfo}>
              {notification.senderAvatar ? (
                <Image
                  source={{ uri: notification.senderAvatar }}
                  style={styles.avatar}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <MaterialIcons name="person" size={24} color="#666" />
                </View>
              )}
              <View style={styles.textContent}>
                <Text style={styles.senderName}>
                  {notification.senderName || 'Unknown User'}
                </Text>
                <Text style={styles.title}>{notification.title}</Text>
              </View>
            </View>

            <Text style={styles.message}>{notification.body}</Text>

            {renderActionButtons()}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: width - 40,
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  header: {
    padding: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContent: {
    flex: 1,
  },
  senderName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    color: '#666',
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
    color: '#333',
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  primaryButton: {
    backgroundColor: '#007bff',
  },
  secondaryButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButtonText: {
    color: '#666',
  },
});

export default NotificationModal;
