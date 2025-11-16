import React, { useContext, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { Text, Avatar, Button, Surface } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

interface GroupPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  group: any;
  onJoinGroup?: (groupId: string) => void;
  currentUser: any;
}

const GroupPreviewModal = ({
  visible,
  onClose,
  group,
  onJoinGroup,
  currentUser
}: GroupPreviewModalProps) => {
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const [joining, setJoining] = useState(false);

  if (!group) return null;

  const getGroupAvatar = () => {
    return group?.avatarUrl || 'https://via.placeholder.com/80x80/667eea/ffffff?text=G';
  };

  const getMemberCount = () => {
    return group?.members ? group.members.length : 0;
  };

  const handleJoin = async () => {
    if (!onJoinGroup || !group?.id) return;

    setJoining(true);
    try {
      await onJoinGroup(group.id);
      onClose(); // Close modal after joining
    } catch (error) {
      console.error('Error joining group:', error);
    } finally {
      setJoining(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView
        style={styles.blurContainer}
        intensity={20}
        tint={theme === 'dark' ? 'dark' : 'light'}
      >
        <View style={styles.overlay}>
          <Surface style={[styles.modalContent, { backgroundColor: currentThemeColors.cardBackground }]}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={currentThemeColors.text}
                />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Group Avatar and Basic Info */}
              <View style={styles.groupHeader}>
                <LinearGradient
                  colors={theme === 'dark' ? ['#667EEA', '#764BA2'] : ['#4facfe', '#00f2fe']}
                  style={styles.avatarContainer}
                >
                  <Avatar.Image
                    size={80}
                    source={{ uri: getGroupAvatar() }}
                    style={styles.avatar}
                  />
                </LinearGradient>

                <View style={styles.groupInfo}>
                  <Text style={[styles.groupName, { color: currentThemeColors.text }]}>
                    {group.name || 'Nhóm chưa đặt tên'}
                  </Text>

                  <View style={styles.groupMeta}>
                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons
                        name="account-group"
                        size={16}
                        color={currentThemeColors.subtleText}
                      />
                      <Text style={[styles.metaText, { color: currentThemeColors.subtleText }]}>
                        {getMemberCount()} thành viên
                      </Text>
                    </View>

                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons
                        name="earth"
                        size={16}
                        color="#667EEA"
                      />
                      <Text style={[styles.metaText, { color: '#667EEA' }]}>
                        Nhóm công khai
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Group Description */}
              {group.description && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                    Mô tả nhóm
                  </Text>
                  <Text style={[styles.description, { color: currentThemeColors.subtleText }]}>
                    {group.description}
                  </Text>
                </View>
              )}

              {/* Preview Notice */}
              <View style={styles.previewNotice}>
                <MaterialCommunityIcons
                  name="eye"
                  size={20}
                  color="#667EEA"
                />
                <Text style={[styles.previewText, { color: currentThemeColors.subtleText }]}>
                  Bạn đang xem trước nhóm này. Tham gia để có thể chat và xem tin nhắn.
                </Text>
              </View>

              {/* Sample Members (first few) */}
              {group.members && group.members.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                    Thành viên ({Math.min(getMemberCount(), 5)})
                  </Text>
                  <Text style={[styles.membersNote, { color: currentThemeColors.subtleText }]}>
                    Tham gia nhóm để xem tất cả thành viên
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Join Button */}
            <View style={styles.footer}>
              <Button
                mode="contained"
                onPress={handleJoin}
                loading={joining}
                disabled={joining}
                style={styles.joinButton}
                contentStyle={styles.joinButtonContent}
                labelStyle={styles.joinButtonLabel}
              >
                {joining ? 'Đang tham gia...' : 'Tham gia nhóm'}
              </Button>
            </View>
          </Surface>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: height * 0.8,
    borderRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: 8,
  },
  closeButton: {
    padding: 4,
  },
  groupHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    backgroundColor: 'transparent',
  },
  groupInfo: {
    alignItems: 'center',
  },
  groupName: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  groupMeta: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  previewNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    marginHorizontal: 24,
    marginVertical: 8,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 12,
  },
  previewText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  membersNote: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  footer: {
    padding: 24,
    paddingTop: 16,
  },
  joinButton: {
    borderRadius: 12,
  },
  joinButtonContent: {
    paddingVertical: 4,
  },
  joinButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GroupPreviewModal;
