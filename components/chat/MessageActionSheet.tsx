import React, { useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';

const { width, height } = Dimensions.get('window');

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
  onReport?: () => void; // optional to avoid breaking existing callers
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
      show: !!onReport, // only show when handler is provided
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
        <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
          {/* Reactions */}
          <View style={[styles.reactionsContainer, { backgroundColor: currentThemeColors.surface }]}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reactionsScrollContent}
            >
              {REACTIONS.map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.reactionButton, { backgroundColor: currentThemeColors.background }]}
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

          {/* Actions */}
          <View style={[styles.actionsContainer, { backgroundColor: currentThemeColors.surface }]}>
            {visibleActions.map((action, index) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.actionButton,
                  index !== visibleActions.length - 1 && styles.actionButtonBorder,
                  { borderBottomColor: currentThemeColors.border }
                ]}
                onPress={() => {
                  action.onPress?.();
                  onClose();
                }}
              >
                <MaterialIcons
                  name={action.icon as any}
                  size={24}
                  color={action.danger ? '#EF4444' : currentThemeColors.text}
                />
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

          {/* Cancel Button */}
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: currentThemeColors.surface }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelText, { color: currentThemeColors.text }]}>
              Hủy
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    paddingBottom: 34,
    paddingHorizontal: 16,
  },
  reactionsContainer: {
    marginBottom: 8,
    borderRadius: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  reactionsScrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  reactionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  reactionEmoji: {
    fontSize: 24,
  },
  actionsContainer: {
    borderRadius: 16,
    marginBottom: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  actionButtonBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionText: {
    fontSize: 16,
    marginLeft: 16,
    fontWeight: '500',
  },
  cancelButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MessageActionSheet;
