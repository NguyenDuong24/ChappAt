import React, { useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

interface MessageActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onReply: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  onPin: () => void;
  onCopy?: () => void;
  onReaction: (emoji: string) => void;
  isCurrentUser: boolean;
  isPinned?: boolean;
  message: any;
  onReport?: () => void;
}

const REACTIONS = ['❤️', '👍', '👎', '😂', '😮', '😢', '😡', '🔥', '👏', '💯'];

const MessageActionSheet: React.FC<MessageActionSheetProps> = ({
  visible,
  onClose,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onCopy,
  onReaction,
  isCurrentUser,
  isPinned = false,
  message,
  onReport,
}) => {
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  const actions = [
    {
      id: 'reply',
      icon: 'reply',
      title: 'Trả lời',
      onPress: onReply,
      show: true,
    },
    {
      id: 'copy',
      icon: 'content-copy',
      title: 'Sao chép',
      onPress: onCopy,
      show: message?.text && !message?.imageUrl,
    },
    {
      id: 'edit',
      icon: 'edit',
      title: 'Chỉnh sửa',
      onPress: onEdit,
      show: isCurrentUser && message?.text && !message?.imageUrl,
    },
    {
      id: 'pin',
      icon: isPinned ? 'push-pin' : 'push-pin',
      title: isPinned ? 'Bỏ ghim' : 'Ghim tin nhắn',
      onPress: onPin,
      show: true,
    },
    {
      id: 'report',
      icon: 'flag',
      title: 'Báo cáo',
      onPress: onReport,
      show: !!onReport && !isCurrentUser,
      danger: true,
    },
    {
      id: 'delete',
      icon: 'delete',
      title: isCurrentUser ? 'Thu hồi' : 'Xóa',
      onPress: onDelete,
      show: true,
      danger: true,
    },
  ];

  const visibleActions = actions.filter(action => action.show);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint={theme === 'dark' ? 'dark' : 'light'} />
        ) : (
          <View style={[styles.androidOverlay, { backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)' }]} />
        )}

        <View style={[styles.container, { backgroundColor: currentThemeColors.surface }]}>
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: currentThemeColors.border }]} />
          </View>

          {/* Reactions */}
          <View style={styles.reactionsSection}>
            <Text style={[styles.sectionTitle, { color: currentThemeColors.subtleText }]}>
              Thả cảm xúc
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reactionsScrollContent}
            >
              {REACTIONS.map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.reactionButton,
                    { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                  ]}
                  onPress={() => {
                    onReaction(emoji);
                    onClose();
                  }}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={[styles.divider, { backgroundColor: currentThemeColors.border }]} />

          {/* Actions */}
          <View style={styles.actionsContainer}>
            {visibleActions.map((action, index) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionButton}
                onPress={() => {
                  action.onPress?.();
                  onClose();
                }}
              >
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: action.danger ? 'rgba(239, 68, 68, 0.1)' : (theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') }
                ]}>
                  <MaterialIcons
                    name={action.icon as any}
                    size={22}
                    color={action.danger ? '#EF4444' : currentThemeColors.text}
                  />
                </View>
                <Text
                  style={[
                    styles.actionText,
                    { color: action.danger ? '#EF4444' : currentThemeColors.text }
                  ]}
                >
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  androidOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.5,
  },
  reactionsSection: {
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reactionsScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  reactionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  reactionEmoji: {
    fontSize: 26,
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
    marginVertical: 8,
    opacity: 0.5,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default MessageActionSheet;
